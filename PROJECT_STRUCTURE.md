# Project Structure

This document outlines the organization of the Momentum email campaign platform.

## 📁 Root Directory

```
momentum/
├── docs/                    # All project documentation
├── public/                  # Static assets
├── src/                     # Source code
├── .env.local              # Environment variables (not in git)
├── .gitignore
├── components.json         # shadcn/ui configuration
├── next.config.mjs         # Next.js configuration
├── package.json            # Dependencies
├── postcss.config.mjs      # PostCSS configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 📚 Documentation (`/docs`)

```
docs/
├── api/                    # API documentation (future)
├── database/               # Database schemas and migrations
│   ├── migrations/
│   │   ├── members-migration.sql
│   │   └── templates-migration.sql
│   └── schema.sql
├── features/               # Feature documentation
│   ├── email-integration.md
│   └── user-tokens.md
├── guides/                 # User guides
│   └── email-troubleshooting.md
├── blueprint.md            # Original project blueprint
├── gemini-notes.md         # AI collaboration notes
├── implementation-summary.md
└── restructuring-plan.md
```

## 💻 Source Code (`/src`)

### Application (`/src/app`)

```
src/app/
├── (auth)/                 # Authentication pages (route group)
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── layout.tsx
│
├── api/                    # API routes
│   ├── auth/
│   │   └── microsoft/      # Microsoft OAuth
│   │       ├── callback/
│   │       ├── connect/
│   │       └── accounts/
│   ├── microsoft/
│   │   └── emails/         # Microsoft Graph API - Emails
│   └── send-email/
│
├── dashboard/              # Dashboard pages
│   ├── campaigns/          # Campaign management
│   │   ├── new/
│   │   ├── columns.tsx
│   │   ├── page.tsx
│   │   └── ...
│   ├── members/            # Member management
│   │   ├── data/
│   │   ├── columns.tsx
│   │   ├── page.tsx
│   │   └── ...
│   ├── templates/          # Template management
│   │   ├── [id]/edit/
│   │   ├── new/
│   │   ├── data/
│   │   ├── columns.tsx
│   │   ├── page.tsx
│   │   └── ...
│   ├── layout.tsx          # Dashboard layout (with sidebar)
│   └── page.tsx            # Dashboard home (with emails)
│
├── favicon.ico
├── globals.css             # Global styles
├── layout.tsx              # Root layout
└── page.tsx                # Landing page
```

### Components (`/src/components`)

```
src/components/
├── campaigns/              # Campaign-related components
│   ├── compose-form.tsx
│   ├── create-campaign-view.tsx
│   ├── select-template.tsx
│   └── ...
│
├── data-table/             # Reusable table components
│   ├── data-table.tsx
│   ├── data-table-column-header.tsx
│   ├── data-table-pagination.tsx
│   └── ...
│
├── ui/                     # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
│
├── v2/                     # Current UI components
│   ├── sidebar.tsx         # Main sidebar
│   ├── header.tsx          # Campaign header
│   ├── editor.tsx          # Email editor
│   └── recipients-sidebar.tsx
│
├── connected-accounts-list.tsx
├── icons.tsx
├── microsoft-account-switcher.tsx  # Account switcher
└── nav-user.tsx
```

### Types (`/src/types`)

```
src/types/
├── auth.ts                 # Authentication types
├── email.ts                # Email-related types
├── user-tokens.ts          # User token types
└── index.ts                # Central export
```

### State Management (`/src/store`)

```
src/store/
├── features/
│   ├── accounts/
│   │   └── accountsSlice.ts    # Selected Microsoft account
│   └── campaigns/
│       └── campaignSlice.ts     # Campaign state
└── index.ts                     # Store configuration
```

### Utilities & Helpers (`/src/lib`, `/src/utils`)

```
src/
├── lib/
│   └── utils.ts            # General utilities (cn, etc.)
│
├── utils/
│   ├── supabase/           # Supabase utilities
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── middleware.ts
│   │   └── constants.ts
│   └── user-tokens.ts      # Token helper functions
│
├── hooks/
│   └── use-mobile.ts       # Custom hooks
│
└── providers/              # Context providers
    ├── auth-provider/
    └── data-provider/
```

## 🔑 Key Features

### 1. Dashboard Layout System
- Centralized layout in `/dashboard/layout.tsx`
- Consistent sidebar across all dashboard pages
- No duplicated layout code

### 2. Microsoft Account Integration
- OAuth flow in `/api/auth/microsoft/`
- Token management with `user_tokens` table
- Account switcher in sidebar
- Automatic token refresh

### 3. Email Integration
- Fetch inbox/sent emails from Microsoft Graph API
- Display in dashboard overview
- Real-time search and filtering

### 4. Campaign Management
- Create campaigns with email templates
- Select recipients from members list
- Send emails via Microsoft account

### 5. Data Tables
- Reusable data table components
- Server-side pagination
- Sorting and filtering
- Column visibility controls

## 🛠️ Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Redux Toolkit
- **Data Fetching:** Refine.dev
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + Microsoft OAuth
- **Email API:** Microsoft Graph API

## 🔄 Data Flow

### Authentication Flow
```
User → Login Page → Supabase Auth → Dashboard
                ↓
          Microsoft OAuth → user_tokens table
```

### Email Fetching Flow
```
Dashboard → API Route → Microsoft Graph API
    ↓           ↓              ↓
  Redux    Token Check    Access Token
            & Refresh
```

### Campaign Creation Flow
```
User → Campaign Form → Select Template → Select Recipients
  ↓
Campaign API → Queue Emails → Send via Microsoft Graph API
```

## 📝 Naming Conventions

### Files
- **Components:** PascalCase (e.g., `MicrosoftAccountSwitcher.tsx`)
- **Pages:** kebab-case (e.g., `forgot-password/page.tsx`)
- **Utilities:** kebab-case (e.g., `user-tokens.ts`)
- **Types:** kebab-case (e.g., `email.ts`)

### Code
- **Components:** PascalCase (e.g., `function EmailTable()`)
- **Functions:** camelCase (e.g., `function fetchEmails()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RECIPIENTS`)
- **Types/Interfaces:** PascalCase (e.g., `interface UserAccount`)

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create `.env.local` with required keys (see `.env.example`)

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000)

## 📦 Key Dependencies

- `next` - React framework
- `react` & `react-dom` - React library
- `typescript` - Type safety
- `tailwindcss` - Utility-first CSS
- `@reduxjs/toolkit` - State management
- `@refinedev/core` - Data fetching
- `@supabase/supabase-js` - Database client
- `date-fns` - Date formatting
- `lucide-react` - Icons

## 🎯 Best Practices

1. **Component Organization:** Group related components in feature folders
2. **Type Safety:** Always define types for props and API responses
3. **Error Handling:** Use try-catch with user-friendly error messages
4. **Loading States:** Show spinners/skeletons during data fetching
5. **Responsive Design:** Mobile-first approach with Tailwind
6. **Code Reusability:** Extract common logic into hooks/utilities
7. **Documentation:** Add JSDoc comments for complex functions

## 🔒 Security

- Never expose API keys or tokens in client code
- All sensitive operations happen server-side
- Use environment variables for secrets
- Implement proper token refresh logic
- Validate all user inputs

## 📖 Further Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

Last Updated: October 29, 2025

