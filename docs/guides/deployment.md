# Deployment Guide

This guide covers deploying Momentum to production with Vercel and Supabase.

## Prerequisites

- ✅ Code pushed to GitHub/GitLab
- ✅ Vercel account
- ✅ Supabase project (production)
- ✅ Microsoft Azure app (production settings)
- ✅ Domain name (optional but recommended)

## 🚀 Quick Deployment

### 1. Deploy to Vercel

#### A. Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add environment variables (see below)
6. Click "Deploy"

#### B. Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 2. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key

# Microsoft OAuth
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-prod-client-id
MICROSOFT_CLIENT_SECRET=your-prod-client-secret
NEXT_PUBLIC_REDIRECT_URI=https://your-domain.com/api/auth/microsoft/callback

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

**Important**: Use separate Microsoft OAuth app for production!

### 3. Set Up Production Database

#### Create Supabase Production Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for provisioning (~2 minutes)
4. Note your connection details

#### Run Migrations

```bash
# Connect to production database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Or use Supabase CLI
supabase link --project-ref your-prod-project-ref

# Run migrations
\i docs/database/schema.sql
\i docs/database/migrations/members-migration.sql
\i docs/database/migrations/templates-migration.sql
\i docs/database/migrations/email-worker-triggers.sql
```

#### Enable Extensions

In Supabase Dashboard → Database → Extensions:

1. Search and enable `pg_net`
2. (Optional) Search and enable `pg_cron`

#### Configure Database Settings

```sql
-- Set edge function URL
ALTER DATABASE postgres SET app.settings.edge_function_url TO 
  'https://[your-project-ref].supabase.co/functions/v1/send-email-worker';

-- Set service role key (be very careful with this!)
ALTER DATABASE postgres SET app.settings.service_role_key TO 
  'your-service-role-key';
```

### 4. Deploy Edge Functions

```bash
# Login to Supabase
supabase login

# Link to production project
supabase link --project-ref your-prod-project-ref

# Deploy edge function
supabase functions deploy send-email-worker --project-ref your-prod-project-ref

# Set production secrets
supabase secrets set MICROSOFT_CLIENT_ID=your-prod-client-id --project-ref your-prod-project-ref
supabase secrets set MICROSOFT_CLIENT_SECRET=your-prod-client-secret --project-ref your-prod-project-ref
supabase secrets set SUPABASE_URL=https://your-prod-project.supabase.co --project-ref your-prod-project-ref
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key --project-ref your-prod-project-ref

# Verify deployment
supabase functions list --project-ref your-prod-project-ref
```

### 5. Configure Microsoft Azure (Production)

#### Create Production App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations → New registration

3. **Configure Application:**
   - **Name**: Momentum Production
   - **Supported account types**: Multitenant (recommended) or Single tenant
   - **Redirect URI**: 
     - Type: Web
     - URL: `https://your-domain.com/api/auth/microsoft/callback`

4. **Add API Permissions:**
   - Microsoft Graph → Delegated Permissions:
     - `User.Read`
     - `Mail.Read`
     - `Mail.Send`
     - `Calendars.Read` (optional)
     - `IMAP.AccessAsUser.All` (optional)
     - `SMTP.Send` (optional)
     - `offline_access`

5. **Create Client Secret:**
   - Certificates & secrets → New client secret
   - Description: "Production Secret"
   - Expires: 24 months (or custom)
   - **Copy the secret immediately** (you won't see it again!)

6. **Grant Admin Consent:**
   - API permissions → Grant admin consent for [Your Organization]
   - Click "Yes" to confirm

7. **Optional: Configure Branding:**
   - Branding & properties → Set logo, terms of service, privacy statement

8. **Security Settings:**
   - Authentication → Platform configurations → Web
     - Enable Access tokens
     - Enable ID tokens
   - Authentication → Implicit grant and hybrid flows
     - ✅ ID tokens (for hybrid flows)

#### Verify Configuration

```bash
# Test OAuth flow
curl -X GET "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://your-domain.com/api/auth/microsoft/callback&scope=openid+profile+offline_access+User.Read+Mail.Read+Mail.Send"
```

### 6. Custom Domain (Optional)

#### Add Custom Domain in Vercel

1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `momentum.example.com`)
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

#### Update Environment Variables

After domain is active, update:
```env
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
NEXT_PUBLIC_REDIRECT_URI=https://your-custom-domain.com/api/auth/microsoft/callback
```

#### Update Azure Redirect URI

1. Azure Portal → App registrations → Your app
2. Authentication → Add platform → Web
3. Add: `https://your-custom-domain.com/api/auth/microsoft/callback`

### 7. Post-Deployment Verification

#### Test Checklist

- [ ] Homepage loads correctly
- [ ] Login/Register works
- [ ] Microsoft account connection works
- [ ] OAuth redirect works correctly
- [ ] Dashboard displays without errors
- [ ] Email fetching works
- [ ] Campaign creation works
- [ ] Email sending works (create test campaign)
- [ ] Error handling works (disconnect internet, try actions)
- [ ] Mobile responsive design works

#### Test Email Campaign

```bash
# 1. Create test campaign via API or UI
# 2. Check database
psql> SELECT * FROM email_campaigns WHERE status = 'sending';

# 3. Check edge function logs
supabase functions logs send-email-worker --project-ref your-prod-project-ref

# 4. Verify email worker queue
psql> SELECT * FROM email_worker_queue;

# 5. Check campaign progress
psql> SELECT id, name, status, sent_count, total_recipients 
      FROM email_campaigns 
      WHERE id = 'your-campaign-id';
```

## 🔧 Configuration

### Environment-Specific Settings

Create different configurations for dev/staging/prod:

```typescript
// src/lib/config.ts
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    logLevel: 'debug',
  },
  production: {
    apiUrl: 'https://your-domain.com',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    logLevel: 'error',
  },
};

export default config[process.env.NODE_ENV || 'development'];
```

### Feature Flags

Use environment variables for feature flags:

```env
# Enable beta features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_A_B_TESTING=false
NEXT_PUBLIC_MAX_RECIPIENTS_PER_CAMPAIGN=10000
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Type check
        run: npm run type-check
        
      - name: Lint
        run: npm run lint
        
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Database Migrations

Automate migrations:

```yaml
# .github/workflows/migrate.yml
name: Run Migrations

on:
  push:
    paths:
      - 'docs/database/**'
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          psql $DATABASE_URL -f docs/database/schema.sql
          psql $DATABASE_URL -f docs/database/migrations/email-worker-triggers.sql
```

## 📊 Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Analytics

### Supabase Monitoring

1. Dashboard → Database → Query Performance
2. Dashboard → Edge Functions → Logs
3. Set up alerts for:
   - High error rates
   - Slow queries
   - High database load

### Custom Monitoring

```typescript
// src/lib/monitoring.ts
export function trackError(error: Error, context?: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (e.g., Sentry)
    console.error('Production error:', error, context);
  }
}

export function trackEvent(event: string, data?: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics (e.g., Google Analytics, Mixpanel)
    console.log('Event:', event, data);
  }
}
```

### Health Checks

Create a health check endpoint:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: false,
    edgeFunction: false,
    microsoft: false,
  };

  // Check database
  try {
    const supabase = createClient(/* ... */);
    await supabase.from('email_campaigns').select('count').limit(1);
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check edge function
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email-worker`, {
      method: 'OPTIONS',
    });
    checks.edgeFunction = response.ok;
  } catch (error) {
    console.error('Edge function health check failed:', error);
  }

  const allHealthy = Object.values(checks).every(Boolean);

  return new Response(JSON.stringify(checks), {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Set up monitoring (e.g., UptimeRobot, Pingdom) to call `/api/health` every 5 minutes.

## 🔐 Security Checklist

- [ ] All environment variables stored securely
- [ ] Service role key never exposed to client
- [ ] HTTPS enforced on all routes
- [ ] Row Level Security enabled on all tables
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all API routes
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (sanitize user input)
- [ ] CSRF protection enabled
- [ ] Secure headers configured (CSP, HSTS, etc.)

### Vercel Security Headers

In `next.config.mjs`:

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 🐛 Troubleshooting

### Common Issues

**1. OAuth Redirect Mismatch**
```
Error: AADSTS50011: The redirect URI does not match
Solution: Verify NEXT_PUBLIC_REDIRECT_URI matches Azure app configuration exactly
```

**2. Edge Function Not Triggering**
```
Check: Supabase Dashboard → Edge Functions → Logs
Solution: Verify pg_net extension is enabled and database settings are correct
```

**3. Emails Not Sending**
```
Check: campaign_recipients table for error_message
Solution: Check Microsoft token validity, refresh if expired
```

**4. Build Failures**
```
Error: Type checking failed
Solution: Run `npm run type-check` locally, fix all TypeScript errors
```

### Rollback

If deployment fails:

```bash
# Via Vercel CLI
vercel rollback [deployment-url]

# Or via Dashboard
# Vercel Dashboard → Deployments → Previous deployment → Promote to Production
```

## 📈 Performance Optimization

### Next.js Configuration

```javascript
// next.config.mjs
export default {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_campaigns_user_status 
  ON email_campaigns(user_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_recipients_campaign_pending
  ON campaign_recipients(campaign_id)
  WHERE status = 'pending';

-- Analyze tables
ANALYZE email_campaigns;
ANALYZE campaign_recipients;
ANALYZE campaign_events;
```

## 🎉 Launch Checklist

- [ ] All tests passing
- [ ] Production database migrated
- [ ] Edge functions deployed
- [ ] Environment variables configured
- [ ] Microsoft Azure app configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Health checks passing
- [ ] Error tracking configured
- [ ] Analytics configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team trained on deployment process
- [ ] Support contacts documented

## 📞 Support

If you encounter issues during deployment:

1. Check [Troubleshooting Guide](email-troubleshooting.md)
2. Review Vercel logs: `vercel logs`
3. Check Supabase logs: Dashboard → Edge Functions → Logs
4. Open an issue on GitHub

---

**Deployment completed successfully?** 🎊

Remember to:
- Monitor error rates
- Set up alerts
- Schedule regular backups
- Plan for scaling

Happy deploying! 🚀

