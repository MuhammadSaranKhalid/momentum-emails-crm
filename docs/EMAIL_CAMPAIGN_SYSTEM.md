# Email Campaign System - Complete Guide

Complete documentation for the automated email campaign system with database triggers and edge function integration.

## 🚀 System Overview

This system provides a fully automated email campaign management solution that:

- ✅ Automatically triggers email sending when campaign status changes
- ✅ Processes campaigns in the background using Supabase Edge Functions
- ✅ Supports multiple Microsoft email accounts per user
- ✅ Provides real-time progress tracking and statistics
- ✅ Includes retry logic with exponential backoff
- ✅ Offers complete campaign control (pause, resume, retry, cancel)

## 📁 Documentation Structure

```
docs/
├── EMAIL_CAMPAIGN_SYSTEM.md           ← You are here (overview)
├── database/
│   ├── schema.sql                     ← Complete database schema
│   └── migrations/
│       ├── README.md                  ← Migration system overview
│       ├── SETUP.md                   ← Setup instructions
│       ├── API_INTEGRATION.md         ← Frontend integration guide
│       ├── 001_email_campaign_trigger_setup.sql  ← Main migration
│       ├── members-migration.sql      ← Members table setup
│       └── templates-migration.sql    ← Templates table setup
├── features/
│   ├── email-integration.md           ← Microsoft email integration
│   ├── email-worker.md                ← Edge function details
│   └── account-selection-flow.md      ← Multiple accounts feature
└── api/
    └── microsoft-auth.md              ← Microsoft OAuth setup
```

## 🏗️ Architecture

### High-Level Flow

```
User Action (Start Campaign)
    ↓
API Route (/api/campaigns/[id]/send)
    ↓
Database Function (send_campaign_emails)
    ↓
Status Update (draft → sending)
    ↓
Database Trigger 🔥 (AUTOMATICALLY FIRES)
    ↓
Edge Function (send-email-worker)
    ↓
Process Recipients & Send Emails
    ↓
Update Statuses (Real-time)
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | Next.js 15 + React | User interface for campaign management |
| **API Routes** | Next.js API Routes | Backend endpoints for campaign actions |
| **Database** | PostgreSQL (Supabase) | Campaign storage and trigger logic |
| **Edge Function** | Deno (Supabase) | Email processing worker |
| **Email Service** | Microsoft Graph API | Actual email sending |
| **Trigger System** | pg_net + PostgreSQL | Automatic edge function invocation |

## 🚦 Quick Start

### Prerequisites

- Supabase project set up
- Microsoft Azure app configured (for OAuth)
- Node.js and npm installed
- Supabase CLI installed

### 1. Database Setup

Run the migrations in order:

```bash
# 1. Main schema (if not already done)
# Execute docs/database/schema.sql in Supabase SQL Editor

# 2. Email campaign trigger setup
# Execute docs/database/migrations/001_email_campaign_trigger_setup.sql
```

### 2. Enable pg_net

In Supabase Dashboard:
1. Go to **Database** → **Extensions**
2. Enable **pg_net** extension

✅ **Note**: Edge function URL and service role key are pre-configured in the migration!

### 3. Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy send-email-worker
```

### 5. Set Edge Function Secrets

```bash
supabase secrets set MICROSOFT_CLIENT_ID=your_microsoft_client_id
supabase secrets set MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 6. Environment Variables (Next.js)

Update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

### 7. Test the System

```bash
# Start development server
npm run dev

# Navigate to http://localhost:3000
# 1. Sign up/Login
# 2. Connect a Microsoft account
# 3. Create a campaign
# 4. Add recipients
# 5. Click "Send Campaign"
# 6. Watch it process automatically! 🎉
```

## 📚 Detailed Documentation

### For Setup & Configuration

👉 **[Migration Setup Guide](./database/migrations/SETUP.md)**
- Complete step-by-step setup
- Configuration instructions
- Troubleshooting common issues
- Testing procedures

### For Frontend Developers

👉 **[API Integration Guide](./database/migrations/API_INTEGRATION.md)**
- API route documentation
- React hooks examples
- Component integration
- Real-time progress monitoring

### For Database Administrators

👉 **[Migration System Overview](./database/migrations/README.md)**
- Architecture details
- Database functions reference
- Performance considerations
- Monitoring queries

### For Backend Developers

👉 **[Email Worker Details](./features/email-worker.md)**
- Edge function implementation
- Microsoft Graph API integration
- Error handling & retries
- Token refresh logic

## 🔧 Available API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/campaigns/[id]/send` | POST | Start sending a campaign |
| `/api/campaigns/[id]/pause` | POST | Pause an active campaign |
| `/api/campaigns/[id]/retry` | POST | Retry failed recipients |
| `/api/campaigns/[id]/cancel` | POST | Cancel a campaign |
| `/api/campaigns/[id]/status` | GET | Get real-time progress |

## 🗄️ Database Functions

| Function | Description |
|----------|-------------|
| `send_campaign_emails(campaign_id)` | Validates and starts campaign sending |
| `pause_campaign(campaign_id)` | Pauses an active campaign |
| `retry_failed_recipients(campaign_id)` | Retries all failed recipients |
| `cancel_campaign(campaign_id)` | Cancels campaign and marks pending as failed |
| `get_campaign_progress(campaign_id)` | Returns detailed progress stats |
| `trigger_campaign_email_worker()` | Internal trigger function |

## 🔐 Security Features

### Authentication & Authorization

- **Row-Level Security (RLS)**: All campaign data protected by RLS policies
- **User Ownership**: Users can only access their own campaigns
- **Token Security**: Microsoft tokens stored encrypted in database
- **Service Role Isolation**: Service role key only used by database triggers

### Data Protection

```sql
-- Example RLS Policy
CREATE POLICY "Users can only view their campaigns"
ON email_campaigns FOR SELECT
USING (auth.uid() = user_id);
```

### Best Practices

1. ✅ Never expose service role key in client-side code
2. ✅ Always verify user ownership in API routes
3. ✅ Use database functions with SECURITY DEFINER carefully
4. ✅ Rotate Microsoft OAuth secrets periodically
5. ✅ Monitor failed login attempts and suspicious activity

## 📊 Monitoring & Analytics

### Campaign Dashboard Query

```sql
SELECT 
  id,
  name,
  status,
  sent_count,
  total_recipients,
  ROUND((sent_count::NUMERIC / NULLIF(total_recipients, 0)) * 100, 2) as progress,
  started_at,
  completed_at
FROM email_campaigns
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Failed Sends Report

```sql
SELECT 
  c.name,
  cr.recipient_email,
  cr.error_message,
  cr.retry_count
FROM campaign_recipients cr
JOIN email_campaigns c ON cr.campaign_id = c.id
WHERE c.user_id = auth.uid()
AND cr.status = 'failed';
```

### System Health

```sql
-- Active campaigns
SELECT COUNT(*) FROM email_campaigns WHERE status = 'sending';

-- Recent trigger invocations
SELECT COUNT(*) FROM net._http_response 
WHERE created > NOW() - INTERVAL '1 hour';
```

## 🐛 Troubleshooting

### Issue: Trigger not firing

**Symptoms**: Campaign status changes but edge function doesn't run

**Solutions**:
1. Check if pg_net is enabled
2. Verify database settings are configured
3. Check PostgreSQL logs for errors
4. Verify trigger exists: `\dft email_campaigns`

### Issue: Emails not sending

**Symptoms**: Campaign starts but recipients stay in "pending" status

**Solutions**:
1. Check edge function logs: `supabase functions logs send-email-worker`
2. Verify Microsoft tokens are valid
3. Check campaign has `user_token_id` set
4. Verify Microsoft account has Mail.Send permissions

### Issue: "No valid Microsoft account"

**Symptoms**: Error when starting campaign

**Solutions**:
1. Ensure user has connected a Microsoft account
2. Check `user_tokens` table for valid entries
3. Verify campaign has `user_token_id` set
4. Try reconnecting Microsoft account

### Get Help

- 📖 [Setup Guide](./database/migrations/SETUP.md) - Detailed setup instructions
- 🔧 [Troubleshooting Section](./database/migrations/SETUP.md#troubleshooting) - Common issues
- 💬 [GitHub Issues](https://github.com/your-repo/issues) - Report bugs
- 📧 Contact support

## 🎯 Common Use Cases

### Starting a Campaign

```typescript
// Frontend
const { sendCampaign } = useCampaignActions();
await sendCampaign(campaignId);

// That's it! The system handles everything else automatically
```

### Monitoring Progress

```typescript
// Real-time progress hook
const progress = useCampaignProgress(campaignId);

// Display progress
<Progress value={progress?.progress_percent || 0} />
```

### Handling Failures

```typescript
// Retry failed recipients
const { retryCampaign } = useCampaignActions();
await retryCampaign(campaignId);

// System automatically triggers edge function
```

### Multiple Email Accounts

```typescript
// Users can connect multiple Microsoft accounts
// Select account when creating campaign
<MicrosoftAccountSelector
  selectedAccountId={campaign.user_token_id}
  onChange={setAccountId}
/>
```

## 🚀 Deployment

### Production Checklist

- [ ] Run all database migrations
- [ ] Enable pg_net extension
- [ ] Configure database settings (project_url, service_role_key)
- [ ] Deploy edge function to production
- [ ] Set all edge function secrets
- [ ] Configure environment variables
- [ ] Test with small campaign first
- [ ] Monitor logs during initial rollout
- [ ] Set up monitoring alerts
- [ ] Document runbook for support team

### Performance Tuning

```sql
-- Adjust batch size in edge function
-- Default: Process all recipients in one invocation

-- Adjust delay between emails
-- Default: 1 second (in edge function)

-- Adjust retry settings
-- Default: 3 retries with exponential backoff
```

## 📈 Roadmap

### Planned Features

- [ ] Scheduled campaigns (send at specific time)
- [ ] A/B testing support
- [ ] Email templates with variables
- [ ] Webhook notifications
- [ ] Analytics dashboard
- [ ] Email open/click tracking
- [ ] Unsubscribe management
- [ ] Contact list segmentation

## 🤝 Contributing

See the main [README.md](../README.md) for contribution guidelines.

## 📄 License

See [LICENSE](../LICENSE) for details.

---

**Last Updated**: October 29, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

For more information, see the detailed documentation in the links above.

