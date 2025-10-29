# User Tokens Integration

This document explains how the `user_tokens` table is integrated and used throughout the application.

## Table Schema

The `user_tokens` table stores OAuth tokens for connected accounts (primarily Microsoft accounts):

| Column         | Type                    | Description                                    |
|----------------|-------------------------|------------------------------------------------|
| id             | uuid                    | Primary key                                    |
| name           | text                    | User's display name from the OAuth provider    |
| email          | text                    | User's email from the OAuth provider           |
| avatar         | text                    | User's avatar URL (base64 or external URL)     |
| user_id        | uuid                    | Foreign key to the authenticated user          |
| provider       | text                    | OAuth provider name (e.g., "microsoft")        |
| access_token   | text                    | OAuth access token                             |
| refresh_token  | text                    | OAuth refresh token                            |
| id_token       | text                    | OAuth ID token                                 |
| expires_at     | timestamp with time zone| Token expiration timestamp                     |
| created_at     | timestamp with time zone| Record creation timestamp                      |
| updated_at     | timestamp with time zone| Record last update timestamp                   |

## Type Definitions

Located in `src/types/user-tokens.ts`:

### `UserToken`
Complete token record with all sensitive data.

### `UserAccount`
Public-facing account information without sensitive tokens (used in UI components).

### `CreateUserToken`
Type for creating new token records.

### `UpdateUserToken`
Type for updating existing token records.

## Components

### `MicrosoftAccountSwitcher`
**Location:** `src/components/microsoft-account-switcher.tsx`

**Purpose:** Displays connected Microsoft accounts and allows switching between them.

**Features:**
- Fetches user_tokens filtered by `user_id` and `provider='microsoft'`
- Displays account selector with avatar, name, and email
- Stores selected account in Redux store
- Provides "Add account" button to connect new accounts
- Shows loading and empty states

**Usage:**
```tsx
import { MicrosoftAccountSwitcher } from '@/components/microsoft-account-switcher';

<MicrosoftAccountSwitcher />
```

## API Routes

### `/api/auth/microsoft/connect`
**Purpose:** Initiates Microsoft OAuth flow to connect a new account.

### `/api/auth/microsoft/callback`
**Purpose:** Handles OAuth callback and stores tokens in `user_tokens` table.

**Process:**
1. Exchanges authorization code for tokens
2. Fetches user profile from Microsoft Graph API
3. Checks for existing connected account
4. Fetches user's profile photo
5. Stores/updates tokens in `user_tokens` table

### `/api/auth/microsoft/accounts`
**Purpose:** Retrieves connected Microsoft account information.

**Process:**
1. Fetches tokens from `user_tokens` table
2. Checks if access token is expired
3. Refreshes token if needed
4. Fetches current user profile from Microsoft Graph API
5. Returns sanitized account information

## Redux Store

### `accountsSlice`
**Location:** `src/store/features/accounts/accountsSlice.ts`

**State:**
```typescript
interface AccountsState {
  selectedAccount: UserAccount | null;
}
```

**Actions:**
- `setSelectedAccount(account: UserAccount | null)` - Sets the currently selected account
- `clearSelectedAccount()` - Clears the selected account

**Usage:**
```typescript
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedAccount } from '@/store/features/accounts/accountsSlice';
import { RootState } from '@/store';

const dispatch = useDispatch();
const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

// Set selected account
dispatch(setSelectedAccount(account));

// Clear selected account
dispatch(clearSelectedAccount());
```

## Utilities

### Token Utilities
**Location:** `src/utils/user-tokens.ts`

**Functions:**

#### `isTokenExpired(token: UserToken): boolean`
Check if a token is expired (with 5-minute buffer).

#### `needsRefresh(token: UserToken): boolean`
Check if a token needs to be refreshed.

#### `getAvatarInitials(name: string): string`
Generate avatar initials from a name.

#### `formatTokenExpiry(expiresAt: string): string`
Format expiry time in human-readable format.

#### `sanitizeToken(token: UserToken): Partial<UserToken>`
Remove sensitive data from token for logging/display.

## Security Best Practices

### 1. Token Storage
- Access tokens, refresh tokens, and ID tokens are stored encrypted in the database
- Never expose these tokens in client-side code
- Always fetch from server-side API routes

### 2. Token Refresh
- Check token expiry before making API calls
- Automatically refresh expired tokens using refresh_token
- Update database with new tokens after refresh

### 3. Data Access
- Always filter `user_tokens` by `user_id` to prevent unauthorized access
- Use Row Level Security (RLS) policies in Supabase
- Validate user authentication before accessing tokens

### 4. API Routes
- All token-related operations should be server-side only
- Use Supabase Server Client in API routes
- Never send tokens to the client

## Integration Flow

### 1. User Connects Microsoft Account

```
User clicks "Add Account"
  ↓
Redirected to /api/auth/microsoft/connect
  ↓
Redirected to Microsoft OAuth page
  ↓
User grants permissions
  ↓
Callback to /api/auth/microsoft/callback
  ↓
Tokens stored in user_tokens table
  ↓
User redirected to dashboard
```

### 2. Displaying Connected Accounts

```
Dashboard loads
  ↓
MicrosoftAccountSwitcher fetches user_tokens
  ↓
Filters by user_id and provider='microsoft'
  ↓
Displays accounts in dropdown
  ↓
First account auto-selected in Redux store
```

### 3. Using Connected Account

```
User selects an account
  ↓
Account stored in Redux (selectedAccount)
  ↓
Components access selectedAccount from store
  ↓
API calls use selected account's tokens
```

## Example Queries

### Fetch User Tokens (Client-side with Refine)

```typescript
import { useList, useGetIdentity } from '@refinedev/core';
import { UserAccount } from '@/types/user-tokens';

const { data: identity } = useGetIdentity<{ id: string }>();

const { result: accountsData, query: { isLoading } } = useList<UserAccount>({
  resource: "user_tokens",
  filters: [
    {
      field: "user_id",
      operator: "eq",
      value: identity?.id,
    },
    {
      field: "provider",
      operator: "eq",
      value: "microsoft",
    }
  ],
  queryOptions: {
    enabled: !!identity?.id,
  },
});

const accounts = accountsData?.data || [];
```

### Fetch User Tokens (Server-side)

```typescript
import { createSupabaseServerClient } from '@/utils/supabase/server';

const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();

const { data: tokens, error } = await supabase
  .from('user_tokens')
  .select('*')
  .eq('user_id', user.id)
  .eq('provider', 'microsoft');
```

## Dashboard Layout Integration

The `user_tokens` table is seamlessly integrated into the dashboard layout:

### Layout Structure
```
src/app/dashboard/layout.tsx
  └── SidebarProvider
      └── V2Sidebar
          └── MicrosoftAccountSwitcher (uses user_tokens)
          └── Navigation Links
          └── NavUser
```

### All Dashboard Pages
All pages under `/dashboard/*` automatically have access to:
- Connected Microsoft accounts in the sidebar
- Selected account state from Redux
- Consistent user experience across all pages

## Troubleshooting

### Issue: No accounts showing
**Solution:** 
1. Check if user is authenticated
2. Verify user has connected a Microsoft account
3. Check browser console for errors
4. Verify `user_tokens` table has records for the user

### Issue: Token expired errors
**Solution:**
1. Implement automatic token refresh in API routes
2. Check if `refresh_token` exists in database
3. Verify Microsoft OAuth app refresh token settings

### Issue: Avatar not displaying
**Solution:**
1. Check if avatar URL is valid
2. Verify Microsoft Graph API permissions for profile photo
3. Fallback to initials using `getAvatarInitials` utility

## Future Enhancements

1. **Multiple Provider Support**
   - Add Google OAuth
   - Add other email providers
   - Unified account switcher

2. **Token Refresh UI**
   - Show token expiry warnings
   - Manual refresh button
   - Auto-refresh background job

3. **Account Management**
   - Disconnect account feature
   - Account settings page
   - Token health monitoring

4. **Audit Logging**
   - Track token usage
   - Log account switches
   - Security event monitoring

