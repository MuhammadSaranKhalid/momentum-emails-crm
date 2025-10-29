# Project Restructuring Plan

## 🎯 Goals
1. Remove redundant and unused files
2. Better organize API routes
3. Consolidate documentation
4. Improve type definitions structure
5. Clean up component organization
6. Remove mock/template data

## 📋 Files to Remove

### Redundant Components
- ✅ `src/components/app-sidebar.tsx` - Replaced by v2/sidebar
- ✅ `src/components/team-switcher.tsx` - Replaced by microsoft-account-switcher
- ✅ `src/components/nav-documents.tsx` - Unused old nav component
- ✅ `src/components/nav-main.tsx` - Unused old nav component
- ✅ `src/components/nav-microsoft-accounts.tsx` - Unused old nav component
- ✅ `src/components/nav-secondary.tsx` - Unused old nav component

### Unused Dashboard Components
- ✅ `src/components/dashboard/CreateTemplateDialog.tsx` - Not used
- ✅ `src/components/dashboard/Header.tsx` - Using v2/header
- ✅ `src/components/dashboard/PreviewDialog.tsx` - Not used
- ✅ `src/components/dashboard/TemplateCard.tsx` - Not used

### Configuration Duplicates
- ✅ `next.config.ts` - Keep only .mjs version
- ✅ `styles/globals.css` - Duplicate of src/app/globals.css

### Mock/Template Data
- ✅ `src/lib/template-data.ts` - Contains mock data

### Empty Folders
- ✅ `src/contexts/` - Empty folder

### Root Clutter
- Move documentation to `/docs` folder
- ✅ `firebase-debug.log` - Should be in .gitignore

## 🔄 Reorganization

### API Routes Structure
```
src/app/api/
├── auth/
│   └── microsoft/           # Microsoft OAuth
│       ├── connect/
│       ├── callback/
│       └── accounts/
└── microsoft/               # Microsoft Graph API
    └── emails/
```

**Better Structure:**
```
src/app/api/
└── microsoft/
    ├── auth/                # All auth-related
    │   ├── connect/
    │   ├── callback/
    │   └── accounts/
    └── graph/               # All Graph API calls
        └── emails/
```

### Types Structure
**Current:**
```
src/types/
└── user-tokens.ts
```

**Better:**
```
src/types/
├── index.ts             # Export all types
├── auth.ts              # Authentication types
├── email.ts             # Email types
├── campaign.ts          # Campaign types
├── member.ts            # Member types
└── template.ts          # Template types
```

### Components Structure
**Current:** Mixed v2 and regular components

**Better:**
```
src/components/
├── layout/              # Layout components
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── nav-user.tsx
├── auth/                # Auth-related
│   ├── microsoft-account-switcher.tsx
│   └── connected-accounts-list.tsx
├── campaigns/           # Campaign features
├── members/             # Member features (from dashboard)
├── templates/           # Template features (from dashboard)
├── data-table/          # Reusable table components
├── shared/              # Shared components
│   └── icons.tsx
└── ui/                  # UI primitives
```

### Documentation Structure
```
docs/
├── api/
│   ├── microsoft-auth.md
│   └── microsoft-graph.md
├── features/
│   ├── email-integration.md
│   └── user-tokens.md
├── guides/
│   ├── troubleshooting.md
│   └── deployment.md
└── database/
    ├── schema.sql
    └── migrations/
```

## 📦 New Structure

### Utilities Organization
```
src/lib/
├── api/                 # API client utilities
│   ├── microsoft.ts
│   └── supabase.ts
├── hooks/               # Custom hooks
│   ├── use-mobile.ts
│   └── use-emails.ts
├── utils/               # Helper functions
│   ├── date.ts
│   ├── format.ts
│   └── validation.ts
└── constants.ts         # App constants
```

### Store Organization
```
src/store/
├── features/
│   ├── auth/
│   │   └── authSlice.ts
│   ├── accounts/
│   │   └── accountsSlice.ts
│   ├── campaigns/
│   │   └── campaignsSlice.ts
│   └── emails/
│       └── emailsSlice.ts
├── hooks.ts            # Typed hooks
└── index.ts            # Store configuration
```

## ✅ Implementation Steps

### Phase 1: Remove Redundant Files
1. Delete unused components
2. Delete duplicate configs
3. Delete mock data
4. Delete empty folders

### Phase 2: Reorganize API Routes
1. Move auth routes under microsoft
2. Create graph subfolder
3. Update imports

### Phase 3: Reorganize Components
1. Create new folder structure
2. Move components to appropriate folders
3. Update imports
4. Remove v2 prefix (make it standard)

### Phase 4: Organize Types
1. Split types into logical files
2. Create index.ts for exports
3. Update all imports

### Phase 5: Documentation
1. Create docs folder
2. Move and organize documentation
3. Update README with new structure

### Phase 6: Clean Root
1. Move SQL files to docs/database
2. Consolidate markdown files
3. Update .gitignore

## 🎨 Final Structure Preview

```
momentum/
├── docs/                           # All documentation
│   ├── api/
│   ├── features/
│   ├── guides/
│   └── database/
├── public/                         # Static assets
├── src/
│   ├── app/
│   │   ├── (auth)/                # Auth pages
│   │   ├── api/
│   │   │   └── microsoft/         # Microsoft APIs
│   │   │       ├── auth/          # OAuth endpoints
│   │   │       └── graph/         # Graph API endpoints
│   │   ├── dashboard/             # Dashboard pages
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/                # Layout components
│   │   ├── auth/                  # Auth components
│   │   ├── campaigns/             # Campaign components
│   │   ├── data-table/            # Table components
│   │   ├── shared/                # Shared components
│   │   └── ui/                    # UI primitives
│   ├── lib/
│   │   ├── api/                   # API utilities
│   │   ├── hooks/                 # Custom hooks
│   │   └── utils/                 # Helper functions
│   ├── providers/                 # Context providers
│   ├── store/                     # Redux store
│   ├── types/                     # TypeScript types
│   └── middleware.ts
├── .env.local                     # Environment variables
├── .gitignore
├── next.config.mjs
├── package.json
├── README.md
└── tsconfig.json
```

## 🚀 Benefits

1. **Better Organization**: Logical grouping of related files
2. **Easier Navigation**: Clear folder structure
3. **Improved Maintainability**: Easy to find and update code
4. **Scalability**: Easy to add new features
5. **Professional**: Industry-standard structure
6. **Type Safety**: Better organized types
7. **Documentation**: Centralized and organized
8. **Clean Root**: Minimal clutter

## 📝 Post-Restructuring Tasks

1. Update import paths in all files
2. Update documentation references
3. Test all features still work
4. Update README with new structure
5. Add JSDoc comments to key functions
6. Create CONTRIBUTING.md guide

