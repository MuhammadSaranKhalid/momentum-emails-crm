-- ============================================================================
-- EMAIL WORKER TRIGGERS
-- ============================================================================
-- Automatically invokes the Supabase Edge Function when campaigns are started
-- ============================================================================

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- CORE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_campaign_email_worker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger when status changes to 'sending'
  IF NEW.status = 'sending' AND (OLD.status IS NULL OR OLD.status != 'sending') THEN
    
    -- Get configuration from database settings
    edge_function_url := current_setting('app.settings.edge_function_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Validate configuration
    IF edge_function_url IS NULL OR service_role_key IS NULL THEN
      RAISE WARNING 'Edge function not configured. Set app.settings.edge_function_url and app.settings.service_role_key';
      RETURN NEW;
    END IF;
    
    -- Invoke Edge Function via HTTP
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'campaign_id', NEW.id
      ),
      timeout_milliseconds := 30000
    ) INTO request_id;
    
    RAISE NOTICE 'Invoked email worker for campaign: % (request_id: %)', NEW.id, request_id;
    
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to invoke email worker: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS invoke_email_worker_on_status_change ON email_campaigns;

CREATE TRIGGER invoke_email_worker_on_status_change
  AFTER UPDATE ON email_campaigns
  FOR EACH ROW
  WHEN (NEW.status = 'sending')
  EXECUTE FUNCTION trigger_campaign_email_worker();

COMMENT ON TRIGGER invoke_email_worker_on_status_change ON email_campaigns IS
'Automatically invokes email worker when campaign status changes to sending';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Start sending a campaign
CREATE OR REPLACE FUNCTION send_campaign_emails(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_data RECORD;
  recipient_count INTEGER;
BEGIN
  -- Verify ownership and get campaign
  SELECT * INTO campaign_data
  FROM email_campaigns
  WHERE id = campaign_id_param
  AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;
  
  -- Validate campaign can be sent
  IF campaign_data.status NOT IN ('draft', 'scheduled', 'paused') THEN
    RAISE EXCEPTION 'Campaign cannot be sent. Current status: %', campaign_data.status;
  END IF;
  
  -- Verify campaign has user_token_id
  IF campaign_data.user_token_id IS NULL THEN
    RAISE EXCEPTION 'Campaign has no Microsoft account selected';
  END IF;
  
  -- Count recipients
  SELECT COUNT(*) INTO recipient_count
  FROM campaign_recipients
  WHERE campaign_id = campaign_id_param;
  
  IF recipient_count = 0 THEN
    RAISE EXCEPTION 'Campaign has no recipients';
  END IF;
  
  -- Update status to 'sending' (trigger will invoke worker automatically)
  UPDATE email_campaigns
  SET status = 'sending',
      started_at = COALESCE(started_at, NOW())
  WHERE id = campaign_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Campaign started successfully',
    'campaign_id', campaign_id_param,
    'total_recipients', recipient_count
  );
END;
$$;

COMMENT ON FUNCTION send_campaign_emails IS
'Start sending a campaign (must be campaign owner)';

-- Retry failed recipients
CREATE OR REPLACE FUNCTION retry_failed_recipients(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM email_campaigns
    WHERE id = campaign_id_param
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;
  
  -- Reset failed recipients
  UPDATE campaign_recipients
  SET status = 'pending',
      next_retry_at = NOW(),
      error_message = NULL
  WHERE campaign_id = campaign_id_param
  AND status = 'failed'
  AND retry_count < max_retries;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Update campaign status if recipients were reset
  IF updated_count > 0 THEN
    UPDATE email_campaigns
    SET status = 'sending'
    WHERE id = campaign_id_param
    AND status != 'cancelled';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Queued %s recipients for retry', updated_count),
    'recipients_queued', updated_count
  );
END;
$$;

COMMENT ON FUNCTION retry_failed_recipients IS
'Retry sending emails to all failed recipients in a campaign';

-- Pause a campaign
CREATE OR REPLACE FUNCTION pause_campaign(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_campaigns
  SET status = 'paused'
  WHERE id = campaign_id_param
  AND user_id = auth.uid()
  AND status = 'sending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found, access denied, or not currently sending';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Campaign paused successfully',
    'campaign_id', campaign_id_param
  );
END;
$$;

COMMENT ON FUNCTION pause_campaign IS
'Pause an active campaign (must be campaign owner)';

-- Cancel a campaign
CREATE OR REPLACE FUNCTION cancel_campaign(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM email_campaigns
    WHERE id = campaign_id_param
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;
  
  -- Update campaign status
  UPDATE email_campaigns
  SET status = 'cancelled',
      completed_at = NOW()
  WHERE id = campaign_id_param;
  
  -- Mark pending recipients as failed
  UPDATE campaign_recipients
  SET status = 'failed',
      error_message = 'Campaign cancelled by user',
      failed_at = NOW()
  WHERE campaign_id = campaign_id_param
  AND status IN ('pending', 'sending');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Campaign cancelled successfully',
    'campaign_id', campaign_id_param
  );
END;
$$;

COMMENT ON FUNCTION cancel_campaign IS
'Cancel a campaign and mark all pending recipients as failed';

-- Get campaign progress
CREATE OR REPLACE FUNCTION get_campaign_progress(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_data RECORD;
  status_breakdown jsonb;
  progress_percent NUMERIC;
BEGIN
  -- Get campaign data
  SELECT * INTO campaign_data
  FROM email_campaigns
  WHERE id = campaign_id_param
  AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;
  
  -- Get status breakdown
  SELECT jsonb_object_agg(status, count) INTO status_breakdown
  FROM (
    SELECT status, COUNT(*) as count
    FROM campaign_recipients
    WHERE campaign_id = campaign_id_param
    GROUP BY status
  ) sub;
  
  -- Calculate progress percentage
  progress_percent := CASE 
    WHEN campaign_data.total_recipients > 0 
    THEN ROUND((campaign_data.sent_count::NUMERIC / campaign_data.total_recipients) * 100, 2)
    ELSE 0 
  END;
  
  RETURN jsonb_build_object(
    'campaign_id', campaign_id_param,
    'status', campaign_data.status,
    'total_recipients', campaign_data.total_recipients,
    'sent_count', campaign_data.sent_count,
    'delivered_count', campaign_data.delivered_count,
    'failed_count', campaign_data.failed_count,
    'bounced_count', campaign_data.bounced_count,
    'progress_percent', progress_percent,
    'status_breakdown', status_breakdown,
    'started_at', campaign_data.started_at,
    'completed_at', campaign_data.completed_at
  );
END;
$$;

COMMENT ON FUNCTION get_campaign_progress IS
'Get detailed progress information for a campaign';

-- ============================================================================
-- SETUP INSTRUCTIONS
-- ============================================================================

/*
SETUP:

1. Enable pg_net extension (Supabase Dashboard > Database > Extensions)

2. Configure database settings (run in SQL Editor):
   
   ALTER DATABASE postgres SET app.settings.edge_function_url TO 
     'https://your-project.supabase.co/functions/v1/send-email-worker';
   
   ALTER DATABASE postgres SET app.settings.service_role_key TO 
     'your-service-role-key';

3. Deploy edge function:
   
   supabase functions deploy send-email-worker

4. Set edge function secrets:
   
   supabase secrets set MICROSOFT_CLIENT_ID=xxx
   supabase secrets set MICROSOFT_CLIENT_SECRET=xxx
   supabase secrets set SUPABASE_URL=xxx
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx

USAGE:

-- Start a campaign
SELECT send_campaign_emails('campaign-uuid');

-- Check progress
SELECT get_campaign_progress('campaign-uuid');

-- Pause campaign
SELECT pause_campaign('campaign-uuid');

-- Retry failed sends
SELECT retry_failed_recipients('campaign-uuid');

-- Cancel campaign
SELECT cancel_campaign('campaign-uuid');

HOW IT WORKS:

1. Call send_campaign_emails() → Updates status to 'sending'
2. Trigger automatically fires → Invokes Edge Function via HTTP
3. Edge Function processes all pending recipients
4. Campaign status updates to 'sent' when complete

MONITORING:

-- Active campaigns
SELECT id, name, status, sent_count, total_recipients,
       ROUND((sent_count::NUMERIC / NULLIF(total_recipients, 0)) * 100, 2) as progress
FROM email_campaigns
WHERE status IN ('sending', 'sent')
ORDER BY started_at DESC;

-- Failed sends
SELECT cr.recipient_email, cr.error_message, cr.retry_count
FROM campaign_recipients cr
JOIN email_campaigns ec ON cr.campaign_id = ec.id
WHERE ec.user_id = auth.uid()
AND cr.status = 'failed'
ORDER BY cr.updated_at DESC;
*/
