-- =============================================================================
-- OPTIMIZED EMAIL CAMPAIGN SCHEMA
-- =============================================================================

-- Drop existing tables (if recreating)
-- DROP TABLE IF EXISTS campaign_events CASCADE;
-- DROP TABLE IF EXISTS campaign_recipients CASCADE;
-- DROP TABLE IF EXISTS email_campaigns CASCADE;

-- =============================================================================
-- 1. EMAIL CAMPAIGNS TABLE (Master Campaign Records)
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Campaign Details
    name TEXT NOT NULL DEFAULT 'New Campaign',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- CC/BCC as JSON arrays for better flexibility
    cc JSONB DEFAULT '[]'::jsonb,  -- ["email1@example.com", "email2@example.com"]
    bcc JSONB DEFAULT '[]'::jsonb,
    
    -- Campaign Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- References
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_token_id UUID REFERENCES user_tokens(id) ON DELETE SET NULL,
    
    -- Optional reply-to override
    reply_to TEXT,
    
  -- Campaign Metadata
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft Delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for email_campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_token_id ON email_campaigns(user_token_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON email_campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_deleted_at ON email_campaigns(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- 2. CAMPAIGN RECIPIENTS TABLE (Individual Email Status Tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    
  -- Email Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Queued for sending
    'sending',      -- Currently being sent
    'sent',         -- Successfully sent
    'delivered',    -- Confirmed delivered
    'failed',       -- Failed to send
    'bounced'       -- Email bounced
  )),
    
    -- Recipient Email (denormalized for performance and history)
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    
    -- Timestamps
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
  -- Error Handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Bounce Information
  bounced_at TIMESTAMP WITH TIME ZONE,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
  bounce_reason TEXT,
    
    -- Provider Tracking (for deliverability monitoring)
    message_id TEXT,  -- Provider's message ID
    provider_name TEXT, -- e.g., 'sendgrid', 'ses', 'resend'
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate sends
    UNIQUE(campaign_id, member_id)
);

-- Indexes for campaign_recipients
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_member_id ON campaign_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_recipients_sent_at ON campaign_recipients(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_next_retry ON campaign_recipients(next_retry_at) WHERE next_retry_at IS NOT NULL AND status = 'failed';
CREATE INDEX IF NOT EXISTS idx_recipients_email ON campaign_recipients(recipient_email);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status ON campaign_recipients(campaign_id, status);

-- =============================================================================
-- 3. CAMPAIGN EVENTS TABLE (Detailed Event Tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS campaign_events (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    
  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'queued',
    'sent',
    'delivered',
    'bounced',
    'failed',
    'deferred'
  )),
  
  -- Event Data
  event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Provider event ID
    provider_event_id TEXT
);

-- Indexes for campaign_events
CREATE INDEX IF NOT EXISTS idx_events_campaign_id ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_events_recipient_id ON campaign_events(recipient_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON campaign_events(created_at DESC);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_events_campaign_type_created ON campaign_events(campaign_id, event_type, created_at DESC);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at
    BEFORE UPDATE ON campaign_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update campaign statistics when recipient status changes
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sent count
    IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
        UPDATE email_campaigns 
        SET sent_count = sent_count + 1
        WHERE id = NEW.campaign_id;
    END IF;
    
    -- Update delivered count
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        UPDATE email_campaigns 
        SET delivered_count = delivered_count + 1
        WHERE id = NEW.campaign_id;
    END IF;
    
    -- Update failed count
    IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
        UPDATE email_campaigns 
        SET failed_count = failed_count + 1
        WHERE id = NEW.campaign_id;
    END IF;
    
    -- Update bounced count
    IF NEW.status = 'bounced' AND (OLD.status IS NULL OR OLD.status != 'bounced') THEN
        UPDATE email_campaigns 
        SET bounced_count = bounced_count + 1
        WHERE id = NEW.campaign_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_statistics
    AFTER UPDATE ON campaign_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_stats();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;

-- Policies for email_campaigns
CREATE POLICY "Users can view their own campaigns"
    ON email_campaigns FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
    ON email_campaigns FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
    ON email_campaigns FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
    ON email_campaigns FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for campaign_recipients (access through campaign ownership)
CREATE POLICY "Users can view recipients of their campaigns"
    ON campaign_recipients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE id = campaign_recipients.campaign_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recipients for their campaigns"
    ON campaign_recipients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE id = campaign_recipients.campaign_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update recipients of their campaigns"
    ON campaign_recipients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE id = campaign_recipients.campaign_id 
            AND user_id = auth.uid()
        )
    );

-- Policies for campaign_events
CREATE POLICY "Users can view events of their campaigns"
    ON campaign_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM email_campaigns 
            WHERE id = campaign_events.campaign_id 
            AND user_id = auth.uid()
        )
    );

-- =============================================================================
-- USEFUL VIEWS FOR ANALYTICS
-- =============================================================================

-- Campaign Performance Summary
CREATE OR REPLACE VIEW campaign_performance AS
SELECT 
    c.id,
    c.subject,
    c.status,
    c.created_at,
    c.started_at,
    c.completed_at,
    c.total_recipients,
    c.sent_count,
    c.delivered_count,
    c.failed_count,
    c.bounced_count,
    -- Calculate rates
    CASE WHEN c.sent_count > 0 
        THEN ROUND((c.delivered_count::DECIMAL / c.sent_count) * 100, 2)
        ELSE 0 
    END AS delivery_rate,
    CASE WHEN c.sent_count > 0 
        THEN ROUND((c.failed_count::DECIMAL / c.sent_count) * 100, 2)
        ELSE 0 
    END AS failure_rate,
    CASE WHEN c.sent_count > 0 
        THEN ROUND((c.bounced_count::DECIMAL / c.sent_count) * 100, 2)
        ELSE 0 
    END AS bounce_rate
FROM email_campaigns c
WHERE c.deleted_at IS NULL;

-- Recent Campaign Activity
CREATE OR REPLACE VIEW recent_campaign_activity AS
SELECT 
    ce.campaign_id,
    ce.event_type,
    ce.created_at,
    cr.recipient_email,
    ec.subject AS campaign_subject
FROM campaign_events ce
JOIN campaign_recipients cr ON ce.recipient_id = cr.id
JOIN email_campaigns ec ON ce.campaign_id = ec.id
WHERE ec.deleted_at IS NULL
ORDER BY ce.created_at DESC
LIMIT 100;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE email_campaigns IS 'Master records for email campaigns with status tracking and analytics';
COMMENT ON TABLE campaign_recipients IS 'Individual recipient status and engagement tracking for each campaign';
COMMENT ON TABLE campaign_events IS 'Detailed event log for all campaign interactions';

COMMENT ON COLUMN email_campaigns.cc IS 'CC recipients stored as JSON array of email addresses';
COMMENT ON COLUMN email_campaigns.bcc IS 'BCC recipients stored as JSON array of email addresses';
COMMENT ON COLUMN email_campaigns.status IS 'Current campaign status: draft, scheduled, sending, sent, paused, cancelled';
COMMENT ON COLUMN email_campaigns.user_token_id IS 'Microsoft account (from user_tokens) to use for sending this campaign';
COMMENT ON COLUMN campaign_recipients.status IS 'Current delivery status for this recipient';
COMMENT ON COLUMN campaign_recipients.recipient_email IS 'Denormalized email for performance and historical tracking';

