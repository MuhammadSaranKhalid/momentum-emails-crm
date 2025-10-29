# Email Worker System

## Overview

The Email Worker is a Supabase Edge Function that automatically processes email campaigns and sends emails through connected Microsoft accounts. It's triggered by database events and operates asynchronously for scalability.

## Architecture

```
┌─────────────────┐
│  User Action    │
│  (Start Campaign│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update Status  │
│  to 'sending'   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  Trigger (pg_net│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Edge Function  │
│  (send-email-   │
│   worker)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Microsoft      │
│  Graph API      │
└─────────────────┘
```

## Components

### 1. Edge Function (`send-email-worker`)

**Location:** `supabase/functions/send-email-worker/index.ts`

**Purpose:** Processes campaign recipients and sends emails via Microsoft Graph API

**Features:**
- Automatic token refresh
- Batch processing with configurable batch sizes
- Retry logic with exponential backoff
- Rate limiting (1 second between emails)
- Detailed event logging
- Error handling and recovery

**Endpoint:**
```typescript
POST /functions/v1/send-email-worker
{
  "campaign_id": "uuid",  // Required: Campaign to process
  "batch_size": 10        // Optional, default: 10
}
```

### 2. Database Triggers

**Location:** `docs/database/migrations/email-worker-triggers.sql`

**Trigger:**
- **Campaign Status Change**: Automatically invokes Edge Function via HTTP when campaign status changes to 'sending'

**Technology:** Uses PostgreSQL's `pg_net` extension for async HTTP requests

## Email Sending Flow

### Step 1: Campaign Creation
```typescript
// User creates campaign with recipients
const campaign = await supabase
  .from('email_campaigns')
  .insert({
    user_id: userId,
    subject: 'Newsletter',
    body: '<p>Hello!</p>',
    status: 'draft',
  });

const recipients = await supabase
  .from('campaign_recipients')
  .insert([
    { campaign_id: campaign.id, member_id: '...', recipient_email: '...' },
    // ... more recipients
  ]);
```

### Step 2: Activate Campaign
```typescript
// Update campaign status to 'sending'
await supabase
  .from('email_campaigns')
  .update({ status: 'sending' })
  .eq('id', campaignId);

// OR use helper function
await supabase.rpc('send_campaign_emails', { campaign_id_param: campaignId });
```

### Step 3: Automatic Processing
```
1. Database trigger fires instantly
2. pg_net makes async HTTP request to Edge Function
3. Edge Function processes batch of recipients:
   - Fetches campaign details
   - Gets user's Microsoft token
   - Refreshes token if expired
   - Sends email via Graph API
   - Updates recipient status
   - Logs events
4. For large campaigns, invoke function multiple times to process in batches
```

### Step 4: Status Tracking
```typescript
// Monitor campaign progress
const { data: campaign } = await supabase
  .from('email_campaigns')
  .select('sent_count, delivered_count, failed_count, total_recipients')
  .eq('id', campaignId)
  .single();

// View detailed recipient status
const { data: recipients } = await supabase
  .from('campaign_recipients')
  .select('recipient_email, status, sent_at, error_message')
  .eq('campaign_id', campaignId);

// View event log
const { data: events } = await supabase
  .from('campaign_events')
  .select('*')
  .eq('campaign_id', campaignId)
  .order('created_at', { ascending: false });
```

## Configuration

### Environment Variables

**Edge Function:**
```bash
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Database:**
```sql
ALTER DATABASE postgres SET app.settings.edge_function_url TO 
  'https://your-project.supabase.co/functions/v1/send-email-worker';

ALTER DATABASE postgres SET app.settings.service_role_key TO 
  'your_service_role_key';
```

### Deployment

```bash
# 1. Deploy edge function
supabase functions deploy send-email-worker

# 2. Set secrets
supabase secrets set MICROSOFT_CLIENT_ID=xxx
supabase secrets set MICROSOFT_CLIENT_SECRET=xxx
supabase secrets set SUPABASE_URL=xxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx

# 3. Run migrations
psql -f docs/database/migrations/email-worker-triggers.sql

# 4. Enable extensions
-- In Supabase Dashboard > Database > Extensions
-- Enable: pg_net, pg_cron (optional)
```

## Retry Logic

### Automatic Retries
- **Max Retries:** 3 (configurable per recipient)
- **Backoff Strategy:** Exponential (5min, 15min, 30min)
- **Trigger:** Automatic via database trigger

### Manual Retry
```typescript
// Retry all failed recipients in a campaign
await supabase.rpc('retry_failed_recipients', {
  campaign_id_param: campaignId
});

// Retry specific recipient
await supabase
  .from('campaign_recipients')
  .update({
    status: 'pending',
    next_retry_at: new Date().toISOString(),
  })
  .eq('id', recipientId);
```

## Rate Limiting

### Microsoft Graph API Limits
- **Throttling:** 10,000 API requests per 10 minutes
- **Mail Send:** Varies by account type (typically 30 msgs/min for personal)

### Implementation
```typescript
// 1-second delay between emails
await new Promise(resolve => setTimeout(resolve, 1000));
```

### Recommendations
- **Batch Size:** 10-50 recipients per invocation
- **Concurrent Campaigns:** Limit to 3-5 active campaigns
- **Monitor:** Track API response headers for throttling

## Error Handling

### Common Errors

**1. Token Expired/Invalid**
```
Error: Failed to refresh access token
Solution: User must reconnect Microsoft account
```

**2. Rate Limit Exceeded**
```
Error: Graph API error: 429 - Too Many Requests
Solution: Implement exponential backoff, reduce batch size
```

**3. Invalid Recipient**
```
Error: Graph API error: 400 - Invalid recipient address
Solution: Validate email addresses before adding to campaign
```

**4. Insufficient Permissions**
```
Error: Graph API error: 403 - Forbidden
Solution: Check Microsoft account has Mail.Send permission
```

### Error Recovery

All errors are logged to `campaign_recipients` and `campaign_events`:
```typescript
const { data: failedRecipients } = await supabase
  .from('campaign_recipients')
  .select('*')
  .eq('campaign_id', campaignId)
  .eq('status', 'failed');

// Analyze error patterns
const errorGroups = failedRecipients.reduce((acc, r) => {
  acc[r.error_code] = (acc[r.error_code] || 0) + 1;
  return acc;
}, {});
```

## Monitoring

### Campaign Progress
```sql
-- View active campaigns
SELECT 
  id,
  name,
  status,
  sent_count,
  total_recipients,
  ROUND((sent_count::DECIMAL / NULLIF(total_recipients, 0)) * 100, 2) as progress_percent
FROM email_campaigns
WHERE status IN ('sending', 'scheduled')
ORDER BY started_at DESC;
```

### Real-time Updates
```typescript
// Subscribe to campaign updates
const subscription = supabase
  .channel('campaign-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'email_campaigns',
    filter: `id=eq.${campaignId}`,
  }, (payload) => {
    console.log('Campaign updated:', payload.new);
  })
  .subscribe();

// Subscribe to recipient status
const recipientSub = supabase
  .channel('recipient-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'campaign_recipients',
    filter: `campaign_id=eq.${campaignId}`,
  }, (payload) => {
    console.log('Recipient updated:', payload.new);
  })
  .subscribe();
```

## Performance Optimization

### Batch Processing
```typescript
// Adjust batch size based on email size and complexity
const batchSize = emailBody.length > 50000 ? 5 : 10;

await fetch(edgeFunctionUrl, {
  method: 'POST',
  body: JSON.stringify({ campaign_id: campaignId, batch_size: batchSize }),
});
```

### Parallel Processing
```typescript
// Process multiple campaigns concurrently
const pendingCampaigns = await supabase
  .from('email_campaigns')
  .select('id')
  .eq('status', 'sending')
  .limit(3);

await Promise.all(
  pendingCampaigns.map(campaign =>
    fetch(edgeFunctionUrl, {
      method: 'POST',
      body: JSON.stringify({ campaign_id: campaign.id }),
    })
  )
);
```

### Database Indexing
Ensure these indexes exist (already in schema.sql):
```sql
CREATE INDEX idx_recipients_campaign_status ON campaign_recipients(campaign_id, status);
CREATE INDEX idx_recipients_next_retry ON campaign_recipients(next_retry_at) 
  WHERE status = 'failed';
CREATE INDEX idx_queue_status_priority ON email_worker_queue(status, priority DESC);
```

## Testing

### Local Testing
```bash
# 1. Start Supabase locally
supabase start

# 2. Deploy function locally
supabase functions serve send-email-worker --env-file .env.local

# 3. Test with curl
curl -X POST http://localhost:54321/functions/v1/send-email-worker \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id": "test-campaign-id"}'
```

### Integration Testing
```typescript
// Create test campaign
const { data: campaign } = await supabase
  .from('email_campaigns')
  .insert({
    user_id: testUserId,
    subject: 'Test Campaign',
    body: '<p>Test Email</p>',
    status: 'draft',
  })
  .select()
  .single();

// Add test recipient
await supabase
  .from('campaign_recipients')
  .insert({
    campaign_id: campaign.id,
    member_id: testMemberId,
    recipient_email: 'test@example.com',
  });

// Trigger sending
await supabase.rpc('send_campaign_emails', {
  campaign_id_param: campaign.id,
});

// Wait and verify
await new Promise(resolve => setTimeout(resolve, 5000));

const { data: recipient } = await supabase
  .from('campaign_recipients')
  .select('status, sent_at')
  .eq('campaign_id', campaign.id)
  .single();

expect(recipient.status).toBe('sent');
expect(recipient.sent_at).not.toBeNull();
```

## Security Considerations

1. **Token Storage:** Access tokens stored in database, protected by RLS
2. **Edge Function Auth:** Requires service role key for invocation
3. **User Isolation:** RLS ensures users can only send from their accounts
4. **Rate Limiting:** Prevents abuse via batch size limits
5. **Audit Trail:** All actions logged in `campaign_events`

## Troubleshooting

### Edge Function Not Triggering
```sql
-- Check if triggers are enabled
SELECT * FROM pg_trigger WHERE tgname LIKE 'queue%';

-- Manually queue a job
SELECT queue_email_worker_job('your-campaign-id');

-- Check queue table
SELECT * FROM email_worker_queue ORDER BY created_at DESC LIMIT 10;
```

### Emails Not Sending
```sql
-- Check recipient status
SELECT status, COUNT(*) FROM campaign_recipients
WHERE campaign_id = 'your-campaign-id'
GROUP BY status;

-- Check for errors
SELECT recipient_email, error_message, retry_count
FROM campaign_recipients
WHERE campaign_id = 'your-campaign-id' AND status = 'failed';

-- Check token validity
SELECT email, expires_at, expires_at < NOW() as is_expired
FROM user_tokens
WHERE user_id = 'your-user-id' AND provider = 'microsoft';
```

### Performance Issues
```sql
-- Check queue backlog
SELECT status, COUNT(*), AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
FROM email_worker_queue
GROUP BY status;

-- Find slow campaigns
SELECT c.id, c.name, c.started_at,
  EXTRACT(EPOCH FROM (NOW() - c.started_at)) / 60 as running_minutes,
  c.sent_count, c.total_recipients
FROM email_campaigns c
WHERE c.status = 'sending'
ORDER BY running_minutes DESC;
```

## Future Enhancements

1. **Priority Queuing:** High-priority campaigns processed first
2. **Smart Scheduling:** Send at optimal times based on recipient timezone
3. **A/B Testing:** Send variants and track performance
4. **Delivery Tracking:** Integrate with Microsoft Graph webhooks
5. **Email Templates:** Dynamic content with personalization variables
6. **Bounce Handling:** Automatic suppression list management
7. **Analytics:** Detailed dashboards and reports
8. **Multi-provider:** Support Gmail, SendGrid, etc.

---

Last Updated: October 29, 2025

