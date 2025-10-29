# Email Campaign Trigger Setup Guide

This guide explains how to set up the automatic email campaign trigger that invokes the edge function when a campaign status changes to "sending".

## Prerequisites

- Supabase project with database access
- Supabase CLI installed
- `email_campaigns` and `campaign_recipients` tables created (see `schema.sql`)
- Edge function `send-email-worker` deployed

## Setup Steps

### Step 1: Run the Migration

Execute the migration SQL file in your Supabase database:

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `001_email_campaign_trigger_setup.sql`
4. Click "Run"

**Option B: Via Supabase CLI**
```bash
supabase db reset
# or
psql $DATABASE_URL < docs/database/migrations/001_email_campaign_trigger_setup.sql
```

### Step 2: Enable pg_net Extension

The migration automatically enables `pg_net`, but verify it's active:

1. Go to Supabase Dashboard → Database → Extensions
2. Search for "pg_net"
3. Ensure it's enabled (green toggle)

### Step 3: Configure Database Settings

✅ **Configuration is already done!** The edge function URL and service role key are hardcoded in the migration.

**Your Configuration:**
- **Edge Function URL**: `https://srjfclplxoonrzczpfyz.supabase.co/functions/v1/send-email-worker`
- **Service Role Key**: Pre-configured in the trigger function

**Security Note:**
- The service role key is embedded in the database function (SECURITY DEFINER)
- It's NOT exposed to client-side code
- Only the database trigger can use it to invoke the edge function
- If you need to change these values, you'll need to re-run the migration with updated values

### Step 4: Deploy Edge Function

If not already deployed, deploy the email worker edge function:

```bash
cd supabase/functions
supabase functions deploy send-email-worker
```

### Step 5: Set Edge Function Secrets

The edge function needs these environment variables:

```bash
supabase secrets set MICROSOFT_CLIENT_ID=your_microsoft_client_id
supabase secrets set MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 5: Verify Setup

Test the trigger by updating a campaign status:

```sql
-- Get a test campaign ID
SELECT id, name, status FROM email_campaigns WHERE user_id = auth.uid() LIMIT 1;

-- Use the helper function to start sending
SELECT send_campaign_emails('your-campaign-uuid-here');

-- Check the campaign status
SELECT status, started_at FROM email_campaigns WHERE id = 'your-campaign-uuid-here';

-- View logs (if trigger fired successfully, you'll see notices)
```

You should see log messages like:
```
NOTICE: Triggering email worker for campaign: <uuid> (status: draft -> sending)
NOTICE: Email worker invoked successfully. Campaign: <uuid>, Request ID: <id>
```

## How It Works

### Automatic Flow

1. **User starts campaign**: Call `send_campaign_emails(campaign_id)`
2. **Status updates**: Campaign status changes to `'sending'`
3. **Trigger fires**: `invoke_email_worker_on_status_change` trigger detects the change
4. **HTTP request**: Trigger function makes HTTP POST to edge function via `pg_net`
5. **Edge function processes**: Worker processes all pending recipients
6. **Status updates**: Campaign and recipient statuses update automatically

### Manual Status Update

You can also trigger manually by updating the status directly:

```sql
UPDATE email_campaigns 
SET status = 'sending' 
WHERE id = 'campaign-uuid' AND user_id = auth.uid();
```

The trigger will automatically fire and invoke the edge function.

## Available Functions

The migration creates these helper functions:

### `send_campaign_emails(campaign_id UUID)`
Validates and starts sending a campaign. Automatically triggers the worker.

```sql
SELECT send_campaign_emails('uuid-here');
```

**Returns:**
```json
{
  "success": true,
  "message": "Campaign started successfully",
  "campaign_id": "...",
  "total_recipients": 150
}
```

### `pause_campaign(campaign_id UUID)`
Pauses an active campaign.

```sql
SELECT pause_campaign('uuid-here');
```

### `retry_failed_recipients(campaign_id UUID)`
Retries all failed recipients that haven't exceeded max retries. Automatically restarts the campaign.

```sql
SELECT retry_failed_recipients('uuid-here');
```

### `cancel_campaign(campaign_id UUID)`
Cancels a campaign and marks all pending recipients as failed.

```sql
SELECT cancel_campaign('uuid-here');
```

### `get_campaign_progress(campaign_id UUID)`
Gets detailed progress information for a campaign.

```sql
SELECT get_campaign_progress('uuid-here');
```

**Returns:**
```json
{
  "success": true,
  "campaign_id": "...",
  "status": "sending",
  "total_recipients": 100,
  "sent_count": 75,
  "delivered_count": 72,
  "failed_count": 3,
  "pending_count": 25,
  "progress_percent": 75.00,
  "status_breakdown": {
    "sent": 75,
    "pending": 22,
    "sending": 3
  },
  "started_at": "2025-10-29T10:00:00Z",
  "completed_at": null
}
```

## Monitoring & Debugging

### Check if pg_net is working

```sql
-- List recent HTTP requests made by pg_net
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;
```

### View trigger execution

Check PostgreSQL logs in Supabase Dashboard → Database → Logs for messages like:
- `NOTICE: Triggering email worker for campaign: ...`
- `NOTICE: Email worker invoked successfully...`
- `WARNING: Failed to invoke email worker...` (if there's an error)

### Test configuration

```sql
-- Verify the trigger function exists and is configured
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) LIKE '%srjfclplxoonrzczpfyz%' as has_correct_url
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'trigger_campaign_email_worker'
AND n.nspname = 'public';
```

### Common Issues

**1. "Edge function URL not working"**
- Solution: Verify the edge function is deployed and accessible
- Check edge function logs: `supabase functions logs send-email-worker`

**2. "Extension pg_net not found"**
- Solution: Enable pg_net extension in Dashboard → Database → Extensions

**3. Edge function not receiving requests**
- Check edge function logs: `supabase functions logs send-email-worker`
- Verify service role key is correct
- Ensure edge function is deployed: `supabase functions list`

**4. Trigger not firing**
- Verify trigger exists: `\dft email_campaigns` in psql
- Check campaign status actually changed to 'sending'
- Review PostgreSQL logs for errors

## Rollback

If you need to remove the trigger:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS invoke_email_worker_on_status_change ON email_campaigns;

-- Drop trigger function
DROP FUNCTION IF EXISTS trigger_campaign_email_worker();

-- Drop helper functions (optional)
DROP FUNCTION IF EXISTS send_campaign_emails(UUID);
DROP FUNCTION IF EXISTS pause_campaign(UUID);
DROP FUNCTION IF EXISTS retry_failed_recipients(UUID);
DROP FUNCTION IF EXISTS cancel_campaign(UUID);
DROP FUNCTION IF EXISTS get_campaign_progress(UUID);

-- Note: No database settings to reset since values are hardcoded
```

## Security Notes

1. **Service Role Key Storage**: The key is stored in database configuration, only accessible to database functions
2. **RLS Policies**: All helper functions verify `auth.uid()` matches campaign owner
3. **SECURITY DEFINER**: Functions run with definer privileges but include ownership checks
4. **HTTP Requests**: Only sent to configured edge function URL
5. **Error Handling**: Trigger failures don't prevent campaign status updates (logged as warnings)

## Next Steps

After setup is complete:
1. Test with a small campaign (1-2 recipients)
2. Monitor edge function logs during first test
3. Verify recipient statuses update correctly
4. Scale up to production campaigns

## Support

For issues or questions:
- Check Supabase logs: Dashboard → Database → Logs
- Check edge function logs: `supabase functions logs send-email-worker`
- Review this documentation
- Check PostgreSQL trigger documentation: https://www.postgresql.org/docs/current/trigger-definition.html

