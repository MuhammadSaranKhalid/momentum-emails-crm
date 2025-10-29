-- ============================================================================
-- EMAIL CAMPAIGN WORKER TRIGGER - PRODUCTION MIGRATION
-- ============================================================================
-- This migration sets up automatic triggering of the email worker edge function
-- when a campaign status changes to 'sending'
-- ============================================================================
-- Version: 1.0.0
-- Created: 2025-10-29
-- Dependencies: email_campaigns table, pg_net extension
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Required Extensions
-- ============================================================================

-- Enable http extension for making HTTP requests to edge functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

COMMENT ON EXTENSION http IS 'HTTP client extension for making RESTful requests to Supabase Edge Functions';

-- ============================================================================
-- STEP 2: Create Trigger Function
-- ============================================================================

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS trigger_campaign_email_worker() CASCADE;

CREATE OR REPLACE FUNCTION trigger_campaign_email_worker()
RETURNS TRIGGER AS $$
DECLARE
  http_response RECORD;
BEGIN
  -- Log everything for debugging
  RAISE NOTICE '=== TRIGGER FIRED ===';
  RAISE NOTICE 'NEW.id: %', NEW.id;
  RAISE NOTICE 'NEW.status: %', NEW.status;
  RAISE NOTICE 'NEW.name: %', NEW.name;
  RAISE NOTICE 'OLD.status: %', COALESCE(OLD.status, 'NULL');
  RAISE NOTICE 'TG_OP: %', TG_OP;
  RAISE NOTICE 'TG_TABLE_NAME: %', TG_TABLE_NAME;
  
  -- Only trigger when status changes to 'sending'
  IF NEW.status = 'sending' AND (OLD.status IS NULL OR OLD.status != 'sending') THEN
    
    RAISE NOTICE '✓ Condition met - status is changing to sending';
    RAISE NOTICE '  Calling edge function...';
    
    -- Invoke Edge Function via HTTP POST
    SELECT status, content::text
    INTO http_response
    FROM extensions.http((
      'POST',
      'https://srjfclplxoonrzczpfyz.supabase.co/functions/v1/send-email',
      ARRAY[
        extensions.http_header('Content-Type', 'application/json'),
        extensions.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyamZjbHBseG9vbnJ6Y3pwZnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgyNzcxNiwiZXhwIjoyMDY3NDAzNzE2fQ.640IuE9zg60gZ7GYV974n-M5qoYodKNFevAr3LcPaqw')
      ],
      'application/json',
      jsonb_build_object('campaign_id', NEW.id)::text
    )::extensions.http_request);
    
    RAISE NOTICE '✓ HTTP request completed (status: %)', http_response.status;
    
  ELSE
    RAISE NOTICE '✗ Condition NOT met - skipping edge function call';
    RAISE NOTICE '  NEW.status = %', NEW.status;
    RAISE NOTICE '  OLD.status = %', COALESCE(OLD.status, 'NULL');
  END IF;
  
  RAISE NOTICE '=== TRIGGER END ===';
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the update
    RAISE WARNING '✗✗✗ EXCEPTION in trigger: %', SQLERRM;
    RAISE WARNING '  SQLSTATE: %', SQLSTATE;
    RAISE WARNING '  Campaign ID: %', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_campaign_email_worker IS 
'Automatically invokes send-email-worker edge function when campaign status changes to sending';

-- ============================================================================
-- STEP 3: Create Trigger on email_campaigns Table
-- ============================================================================

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS invoke_email_worker_on_status_change ON email_campaigns;

CREATE TRIGGER invoke_email_worker_on_status_change
    AFTER UPDATE ON email_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION trigger_campaign_email_worker();

COMMENT ON TRIGGER invoke_email_worker_on_status_change ON email_campaigns IS
'Triggers after update to automatically invoke email worker edge function when status changes to sending';

-- ============================================================================
-- STEP 4: Helper Functions for Campaign Management
-- ============================================================================

-- Function: Start sending a campaign
-- This function validates and initiates campaign sending
DROP FUNCTION IF EXISTS send_campaign_emails(UUID);

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
  AND user_id = auth.uid()
  AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign not found or access denied'
    );
  END IF;
  
  -- Validate campaign can be sent
  IF campaign_data.status NOT IN ('draft', 'scheduled', 'paused') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Campaign cannot be sent. Current status: %s', campaign_data.status)
    );
  END IF;
  
  -- Verify campaign has user_token_id (Microsoft account)
  IF campaign_data.user_token_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign has no Microsoft account selected'
    );
  END IF;
  
  -- Count recipients
  SELECT COUNT(*) INTO recipient_count
  FROM campaign_recipients
  WHERE campaign_id = campaign_id_param
  AND status IN ('pending', 'failed');
  
  IF recipient_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign has no recipients to send to'
    );
  END IF;
  
  -- Update campaign status to 'sending'
  -- This will automatically trigger the email worker via the trigger
  UPDATE email_campaigns
  SET 
    status = 'sending',
    started_at = COALESCE(started_at, NOW()),
    updated_at = NOW()
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
'Validates and starts sending a campaign. Must be called by campaign owner. Triggers email worker automatically.';

-- Function: Pause a campaign
DROP FUNCTION IF EXISTS pause_campaign(UUID);

CREATE OR REPLACE FUNCTION pause_campaign(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE email_campaigns
  SET 
    status = 'paused',
    updated_at = NOW()
  WHERE id = campaign_id_param
  AND user_id = auth.uid()
  AND status = 'sending'
  AND deleted_at IS NULL;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign not found, access denied, or not currently sending'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Campaign paused successfully',
    'campaign_id', campaign_id_param
  );
END;
$$;

COMMENT ON FUNCTION pause_campaign IS
'Pauses an active campaign. Must be called by campaign owner.';

-- Function: Retry failed recipients
DROP FUNCTION IF EXISTS retry_failed_recipients(UUID);

CREATE OR REPLACE FUNCTION retry_failed_recipients(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_exists BOOLEAN;
  updated_count INTEGER;
BEGIN
  -- Verify ownership
  SELECT EXISTS (
    SELECT 1 FROM email_campaigns
    WHERE id = campaign_id_param
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  ) INTO campaign_exists;
  
  IF NOT campaign_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign not found or access denied'
    );
  END IF;
  
  -- Reset failed recipients that haven't exceeded max retries
  UPDATE campaign_recipients
  SET 
    status = 'pending',
    next_retry_at = NOW(),
    error_message = NULL,
    updated_at = NOW()
  WHERE campaign_id = campaign_id_param
  AND status = 'failed'
  AND retry_count < max_retries;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- If recipients were reset, set campaign status back to 'sending'
  -- This will trigger the email worker via the trigger
  IF updated_count > 0 THEN
    UPDATE email_campaigns
    SET 
      status = 'sending',
      updated_at = NOW()
    WHERE id = campaign_id_param
    AND status IN ('paused', 'sent')
    AND deleted_at IS NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Queued %s recipients for retry', updated_count),
    'recipients_queued', updated_count
  );
END;
$$;

COMMENT ON FUNCTION retry_failed_recipients IS
'Resets failed recipients to pending and restarts the campaign. Automatically triggers email worker.';

-- Function: Cancel a campaign
DROP FUNCTION IF EXISTS cancel_campaign(UUID);

CREATE OR REPLACE FUNCTION cancel_campaign(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_exists BOOLEAN;
  pending_count INTEGER;
BEGIN
  -- Verify ownership
  SELECT EXISTS (
    SELECT 1 FROM email_campaigns
    WHERE id = campaign_id_param
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  ) INTO campaign_exists;
  
  IF NOT campaign_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign not found or access denied'
    );
  END IF;
  
  -- Update campaign status to cancelled
  UPDATE email_campaigns
  SET 
    status = 'cancelled',
    completed_at = COALESCE(completed_at, NOW()),
    updated_at = NOW()
  WHERE id = campaign_id_param
  AND deleted_at IS NULL;
  
  -- Mark all pending/sending recipients as failed
  UPDATE campaign_recipients
  SET 
    status = 'failed',
    error_message = 'Campaign cancelled by user',
    error_code = 'CANCELLED',
    failed_at = NOW(),
    updated_at = NOW()
  WHERE campaign_id = campaign_id_param
  AND status IN ('pending', 'sending');
  
  GET DIAGNOSTICS pending_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Campaign cancelled successfully',
    'campaign_id', campaign_id_param,
    'cancelled_recipients', pending_count
  );
END;
$$;

COMMENT ON FUNCTION cancel_campaign IS
'Cancels a campaign and marks all pending/sending recipients as failed. Must be called by campaign owner.';

-- Function: Get campaign progress
DROP FUNCTION IF EXISTS get_campaign_progress(UUID);

CREATE OR REPLACE FUNCTION get_campaign_progress(campaign_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_data RECORD;
  status_breakdown jsonb;
  progress_percent NUMERIC;
  pending_count INTEGER;
BEGIN
  -- Get campaign data
  SELECT * INTO campaign_data
  FROM email_campaigns
  WHERE id = campaign_id_param
  AND user_id = auth.uid()
  AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign not found or access denied'
    );
  END IF;
  
  -- Get status breakdown
  SELECT 
    COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
  INTO status_breakdown
  FROM (
    SELECT status, COUNT(*) as count
    FROM campaign_recipients
    WHERE campaign_id = campaign_id_param
    GROUP BY status
  ) sub;
  
  -- Get pending count
  SELECT COUNT(*) INTO pending_count
  FROM campaign_recipients
  WHERE campaign_id = campaign_id_param
  AND status IN ('pending', 'sending');
  
  -- Calculate progress percentage
  progress_percent := CASE 
    WHEN campaign_data.total_recipients > 0 
    THEN ROUND((campaign_data.sent_count::NUMERIC / campaign_data.total_recipients) * 100, 2)
    ELSE 0 
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', campaign_id_param,
    'name', campaign_data.name,
    'subject', campaign_data.subject,
    'status', campaign_data.status,
    'total_recipients', campaign_data.total_recipients,
    'sent_count', campaign_data.sent_count,
    'delivered_count', campaign_data.delivered_count,
    'failed_count', campaign_data.failed_count,
    'bounced_count', campaign_data.bounced_count,
    'pending_count', pending_count,
    'progress_percent', progress_percent,
    'status_breakdown', status_breakdown,
    'started_at', campaign_data.started_at,
    'completed_at', campaign_data.completed_at,
    'created_at', campaign_data.created_at,
    'updated_at', campaign_data.updated_at
  );
END;
$$;

COMMENT ON FUNCTION get_campaign_progress IS
'Returns detailed progress information for a campaign. Must be called by campaign owner.';

-- ============================================================================
-- STEP 5: Grant Necessary Permissions
-- ============================================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION send_campaign_emails(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pause_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_recipients(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_progress(UUID) TO authenticated;

-- ============================================================================
-- TESTING & VERIFICATION
-- ============================================================================

-- Test function to verify trigger setup
CREATE OR REPLACE FUNCTION test_trigger_setup()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if trigger exists
  RETURN QUERY
  SELECT 
    'Trigger Exists'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'invoke_email_worker_on_status_change'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END,
    'Trigger: invoke_email_worker_on_status_change';
  
  -- Check if function exists
  RETURN QUERY
  SELECT 
    'Function Exists'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'trigger_campaign_email_worker'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END,
    'Function: trigger_campaign_email_worker()';
  
  -- Check if http extension is enabled
  RETURN QUERY
  SELECT 
    'http Extension'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'http'
    ) THEN '✓ PASS' ELSE '✗ FAIL - Enable http extension' END,
    'Required for HTTP requests';
END;
$$;

COMMENT ON FUNCTION test_trigger_setup IS 
'Test function to verify trigger and dependencies are properly set up';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE '✓ Email campaign trigger migration completed successfully';
  RAISE NOTICE '✓ Trigger function: trigger_campaign_email_worker()';
  RAISE NOTICE '✓ Trigger: invoke_email_worker_on_status_change';
  RAISE NOTICE '✓ Helper functions: send_campaign_emails, pause_campaign, retry_failed_recipients, cancel_campaign, get_campaign_progress';
  RAISE NOTICE '✓ Test function: test_trigger_setup()';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Run: SELECT * FROM test_trigger_setup();';
  RAISE NOTICE '2. HTTP extension is already enabled';
  RAISE NOTICE '3. Deploy edge function: supabase functions deploy send-email';
  RAISE NOTICE '4. Test with: SELECT send_campaign_emails(''your-campaign-id'');';
  RAISE NOTICE '';
END $$;

