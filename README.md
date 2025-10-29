# Momentum - Email Campaign Platform

A modern, scalable email campaign platform built with Next.js, featuring Microsoft account integration, automated email sending, and comprehensive campaign analytics.

## 🚀 Features

- **Microsoft Account Integration**: OAuth 2.0 authentication with automatic token refresh
- **Campaign Management**: Create, schedule, and send email campaigns
- **Template System**: Reusable email templates with rich text editing
- **Member Management**: Organize recipients and track engagement
- **Automated Email Sending**: Background worker processes emails via Microsoft Graph API
- **Real-time Analytics**: Track delivery rates, opens, and failures
- **Retry Logic**: Automatic retries with exponential backoff for failed sends
- **Dashboard**: Beautiful UI with email inbox/sent items display

## 📁 Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed documentation.

```
momentum/
├── docs/                    # Comprehensive documentation
│   ├── api/                 # API documentation
│   ├── features/            # Feature guides
│   ├── guides/              # User guides
│   └── database/            # Database schemas and migrations
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Authentication pages
│   │   ├── api/             # API routes
│   │   └── dashboard/       # Dashboard pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities
│   ├── store/               # Redux state management
│   ├── types/               # TypeScript types
│   └── utils/               # Helper functions
├── supabase/
│   └── functions/           # Supabase Edge Functions
└── public/                  # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Redux Toolkit
- **Data Fetching**: Refine.dev
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Microsoft OAuth
- **Email API**: Microsoft Graph API
- **Serverless Functions**: Supabase Edge Functions (Deno)

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Microsoft Azure account (for OAuth app)
- Git

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/momentum.git
cd momentum
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Microsoft OAuth
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set Up Database

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in this order:
   - `docs/database/schema.sql` (main schema)
   - `docs/database/migrations/001_email_campaign_trigger_setup.sql` (triggers)

**Option B: Via Command Line**

```bash
# 1. Main schema
psql -h your-db-host -U postgres -d postgres -f docs/database/schema.sql

# 2. Email campaign trigger setup
psql -h your-db-host -U postgres -d postgres -f docs/database/migrations/001_email_campaign_trigger_setup.sql
```

**Enable pg_net Extension**
1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_net` extension

✅ **Note**: Database configuration is pre-configured in the migration. No additional setup needed!

See **[Migration Setup Guide](docs/database/migrations/SETUP.md)** for detailed instructions.

### 5. Deploy Edge Functions

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the email worker function
supabase functions deploy send-email-worker

# Set secrets
supabase secrets set MICROSOFT_CLIENT_ID=your-client-id
supabase secrets set MICROSOFT_CLIENT_SECRET=your-client-secret
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 6. Configure Microsoft Azure App

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" → "App registrations" → "New registration"
3. Set up:
   - **Name**: Momentum Email Platform
   - **Redirect URI**: `http://localhost:3000/api/auth/microsoft/callback`
   - **API Permissions**:
     - Microsoft Graph (Delegated):
       - `User.Read`
       - `Mail.Read`
       - `Mail.Send`
       - `offline_access`
4. Create a client secret and copy it to your `.env.local`
5. **Grant admin consent** for the permissions

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Documentation

### 🌟 Main Guides
- **[Email Campaign System](docs/EMAIL_CAMPAIGN_SYSTEM.md)**: **⭐ START HERE** - Complete system overview
- **[Project Structure](PROJECT_STRUCTURE.md)**: Detailed project organization
- **[Migration Setup Guide](docs/database/migrations/SETUP.md)**: Database setup instructions
- **[API Integration Guide](docs/database/migrations/API_INTEGRATION.md)**: Frontend integration examples

### 📚 Feature Documentation
- **[Email Integration](docs/features/email-integration.md)**: Microsoft Graph API integration
- **[Email Worker](docs/features/email-worker.md)**: Background email processing
- **[User Tokens](docs/features/user-tokens.md)**: Token management system
- **[Account Selection](docs/features/account-selection-flow.md)**: Multiple accounts feature

### 🔧 API & Technical
- **[Microsoft Auth API](docs/api/microsoft-auth.md)**: OAuth flow documentation
- **[Database Schema](docs/database/schema.sql)**: Complete database structure
- **[Troubleshooting](docs/guides/email-troubleshooting.md)**: Common issues and solutions

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Update redirect URI in Microsoft Azure to your production URL
5. Deploy!

### Configure Production

1. Update Microsoft Azure app redirect URI:
   ```
   https://your-domain.com/api/auth/microsoft/callback
   ```

2. Update environment variables in Vercel

3. Enable required Supabase extensions:
   - `pg_net` (for HTTP requests)
   - `pg_cron` (optional, for scheduled jobs)

See [Deployment Guide](docs/guides/deployment.md) for detailed instructions.

## 🔑 Key Features

### 1. Microsoft Account Integration

- OAuth 2.0 flow with automatic token refresh
- Multiple account support
- Secure token storage with RLS
- Account switcher in sidebar

### 2. Campaign Management

- Create campaigns with templates
- Select recipients from members list
- Schedule or send immediately
- Real-time progress tracking
- Pause/resume capabilities

### 3. Automated Email Sending

- Background processing via Edge Functions
- Batch processing with rate limiting
- Automatic retries with exponential backoff
- Comprehensive error handling
- Event logging and analytics

### 4. Dashboard

- View inbox and sent emails
- Campaign statistics
- Member management
- Template library

## 🧪 Testing

```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📊 API Routes

### Authentication
- `GET /api/auth/microsoft/connect` - Initiate OAuth flow
- `GET /api/auth/microsoft/callback` - OAuth callback
- `GET /api/auth/microsoft/accounts` - List connected accounts

### Campaigns
- `POST /api/campaigns/[id]/send` - Start sending campaign
- `GET /api/campaigns/[id]/status` - Get campaign status
- `POST /api/campaigns/[id]/pause` - Pause campaign
- `POST /api/campaigns/[id]/retry` - Retry failed recipients
- `POST /api/campaigns/[id]/cancel` - Cancel campaign

See **[API Integration Guide](docs/database/migrations/API_INTEGRATION.md)** for detailed API documentation.

### Emails
- `GET /api/microsoft/emails` - Fetch emails from Microsoft

## 🔒 Security

- Row Level Security (RLS) on all tables
- Secure token storage
- Service role key for Edge Functions only
- CORS protection
- Rate limiting on API routes
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

Found a bug? Please [open an issue](https://github.com/yourusername/momentum/issues) with:
- Description of the issue
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)

## 💬 Support

- Documentation: [Project Docs](docs/)
- Email: support@momentum.com
- Discord: [Join our server](https://discord.gg/momentum)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Refine](https://refine.dev/)

---

Made with ❤️ by the Momentum Team

**Project Status**: ✅ Production Ready

**Last Updated**: October 29, 2025
