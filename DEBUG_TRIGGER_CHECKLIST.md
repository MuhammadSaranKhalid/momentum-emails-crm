# Database Trigger Debug Checklist

## Issue: Database trigger not calling edge function

### Step 1: Verify Campaign Status

**The trigger ONLY fires when status = 'sending'**

Check your campaign status:
```sql
SELECT id, name, status, user_token_id, created_at 
FROM email_campaigns 
ORDER BY created_at DESC 
LIMIT 5;
```

✅ **Expected:** Status should be `'sending'` for trigger to fire
❌ **Problem:** If status is `'draft'`, trigger won't fire

**Solution:** Update campaign to sending status:
```sql
UPDATE email_campaigns 
SET status = 'sending' 
WHERE id = 'your-campaign-id';
```

OR use the helper function:
```sql
SELECT send_campaign_emails('your-campaign-id');
```

### Step 2: Check if pg_net Extension is Enabled

```sql
-- Check if pg_net is installed
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

✅ **Expected:** Should return one row
❌ **Problem:** If empty, extension is not enabled

**Solution:** Enable pg_net:
1. Go to Supabase Dashboard → Database → Extensions
2. Search for "pg_net"
3. Click "Enable"

OR run SQL:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 3: Verify Database Settings are Configured

```sql
-- Check if settings exist
SELECT 
  current_setting('app.settings.edge_function_url', true) as edge_url,
  current_setting('app.settings.service_role_key', true) as service_key;
```

✅ **Expected:** Both should return values
❌ **Problem:** If NULL, settings not configured

**Solution:** Set the configuration:
```sql
ALTER DATABASE postgres SET app.settings.edge_function_url TO 
  'https://your-project-ref.supabase.co/functions/v1/send-email-worker';

ALTER DATABASE postgres SET app.settings.service_role_key TO 
  'your-service-role-key-here';
```

**Important:** Replace:
- `your-project-ref` with your actual Supabase project reference
- `your-service-role-key-here` with your actual service role key (from Supabase Dashboard → Settings → API)

### Step 4: Verify Trigger Exists

```sql
-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'invoke_email_worker_on_status_change';
```

✅ **Expected:** Should return one row
❌ **Problem:** If empty, trigger doesn't exist

**Solution:** Run the migration file:
```bash
psql -h your-db-host -U postgres -d postgres -f docs/database/migrations/email-worker-triggers.sql
```

OR copy/paste the SQL from `email-worker-triggers.sql` into Supabase SQL Editor

### Step 5: Check Trigger Function Exists

```sql
-- Check if trigger function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'trigger_campaign_email_worker';
```

✅ **Expected:** Should return function definition
❌ **Problem:** If empty, function doesn't exist

**Solution:** Run the migration file again

### Step 6: Test Trigger Manually

```sql
-- Create a test campaign with 'sending' status
INSERT INTO email_campaigns (
  user_id, 
  user_token_id,
  name, 
  subject, 
  body, 
  status,
  total_recipients
)
VALUES (
  auth.uid(),  -- Your user ID
  'your-user-token-id',  -- Your Microsoft account token ID
  'Test Campaign',
  'Test Subject',
  '<p>Test Body</p>',
  'sending',  -- ← Important: Must be 'sending'
  1
)
RETURNING id;

-- Check PostgreSQL logs for trigger output
-- Look for: "Invoked email worker for campaign: ..."
```

### Step 7: Check PostgreSQL Logs

In Supabase Dashboard → Logs → Postgres Logs

Look for:
- ✅ `NOTICE: Invoked email worker for campaign: [uuid] (request_id: [number])`
- ❌ `WARNING: Edge function not configured`
- ❌ `WARNING: Failed to invoke email worker: [error]`

### Step 8: Verify Edge Function is Deployed

```bash
# Check deployed functions
supabase functions list

# Should show:
# send-email-worker
```

If not deployed:
```bash
supabase functions deploy send-email-worker
```

### Step 9: Check Edge Function Logs

In Supabase Dashboard → Edge Functions → send-email-worker → Logs

Look for incoming requests when trigger fires

### Step 10: Test Edge Function Directly

Test if edge function works when called manually:

```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/send-email-worker \
  -H "Authorization: Bearer your-service-role-key" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id": "your-campaign-id"}'
```

✅ **Expected:** Function processes campaign
❌ **Problem:** If error, check edge function logs

## Common Issues & Solutions

### Issue 1: "Edge function not configured"
**Cause:** Database settings not set
**Fix:** Run Step 3 above

### Issue 2: Trigger fires but no edge function call
**Cause:** pg_net extension not enabled
**Fix:** Enable pg_net (Step 2)

### Issue 3: Trigger doesn't fire at all
**Cause:** Campaign status is not 'sending'
**Fix:** Update status to 'sending' (Step 1)

### Issue 4: "Campaign has no user_token_id"
**Cause:** Campaign created without Microsoft account
**Fix:** Ensure `selectedAccount` is set when creating campaign

### Issue 5: "Token expired" or "403 Forbidden"
**Cause:** Service role key incorrect or expired
**Fix:** Update service role key in database settings

## Quick Test Script

Run this complete test:

```sql
-- 1. Check extension
SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net') as pg_net_enabled;

-- 2. Check settings
SELECT 
  current_setting('app.settings.edge_function_url', true) IS NOT NULL as has_url,
  current_setting('app.settings.service_role_key', true) IS NOT NULL as has_key;

-- 3. Check trigger
SELECT EXISTS(
  SELECT 1 FROM information_schema.triggers 
  WHERE trigger_name = 'invoke_email_worker_on_status_change'
) as trigger_exists;

-- 4. Check recent campaigns
SELECT id, name, status, user_token_id, created_at 
FROM email_campaigns 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 5;
```

Expected output:
```
pg_net_enabled | has_url | has_key | trigger_exists
---------------|---------|---------|---------------
true           | true    | true    | true
```

## Need More Help?

If all checks pass but still not working:

1. Check Edge Function environment variables:
   ```bash
   supabase secrets list
   ```

2. Check Edge Function logs for errors

3. Verify campaign has `user_token_id` set:
   ```sql
   SELECT id, user_token_id FROM email_campaigns WHERE id = 'your-campaign-id';
   ```

4. Manually invoke the function:
   ```sql
   SELECT send_campaign_emails('your-campaign-id');
   ```

---

**Most Common Cause:** Campaign created with `status = 'draft'` instead of `status = 'sending'`

**Quick Fix:**
```sql
UPDATE email_campaigns SET status = 'sending' WHERE id = 'your-campaign-id';
```

