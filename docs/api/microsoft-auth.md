# Microsoft Authentication API

This document describes the Microsoft OAuth authentication flow implementation.

## Overview

The application uses Microsoft OAuth 2.0 for authenticating users and accessing Microsoft Graph API on their behalf.

## OAuth Flow

### 1. Connect Route (`/api/auth/microsoft/connect`)

**Purpose:** Initiates the OAuth flow

**Endpoint:** `GET /api/auth/microsoft/connect`

**Process:**
1. Generates a random state parameter for CSRF protection
2. Constructs authorization URL with required scopes
3. Redirects user to Microsoft login page

**Scopes Requested:**
- `openid` - OpenID Connect authentication
- `profile` - User's basic profile
- `offline_access` - Refresh token access
- `User.Read` - Read user's profile
- `Mail.Read` - Read user's mail
- `Mail.Send` - Send mail as user
- `Calendars.Read` - Read calendars (future feature)
- `IMAP.AccessAsUser.All` - IMAP access
- `SMTP.Send` - SMTP sending

**Environment Variables Required:**
```
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

### 2. Callback Route (`/api/auth/microsoft/callback`)

**Purpose:** Handles OAuth callback and exchanges code for tokens

**Endpoint:** `GET /api/auth/microsoft/callback`

**Query Parameters:**
- `code` - Authorization code from Microsoft
- `state` - CSRF protection token

**Process:**
1. Validates state parameter
2. Exchanges authorization code for access token
3. Fetches user profile from Microsoft Graph API
4. Stores tokens in `user_tokens` table
5. Redirects to dashboard

**Token Storage:**
```typescript
{
  user_id: string;          // Supabase user ID
  provider: 'microsoft';
  email: string;
  name: string;
  avatar: string;
  access_token: string;     // For API calls
  refresh_token: string;    // For token refresh
  id_token: string;         // OpenID token
  expires_at: string;       // Token expiration (ISO)
}
```

### 3. Accounts Route (`/api/auth/microsoft/accounts`)

**Purpose:** Returns list of connected Microsoft accounts for current user

**Endpoint:** `GET /api/auth/microsoft/accounts`

**Authentication:** Required (Supabase session)

**Response:**
```typescript
{
  accounts: UserAccount[];
}
```

**Example Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "provider": "microsoft",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": "https://...",
      "access_token": "ey...",
      "refresh_token": "0.AS...",
      "expires_at": "2025-10-30T12:00:00Z",
      "created_at": "2025-10-29T10:00:00Z",
      "updated_at": "2025-10-29T10:00:00Z"
    }
  ]
}
```

## Token Refresh

Tokens expire after approximately 1 hour. The application automatically refreshes tokens when needed.

**Refresh Logic:**
```typescript
if (new Date(expires_at) <= new Date()) {
  // Token expired, refresh it
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refresh_token,
      grant_type: 'refresh_token',
      scope: 'openid profile offline_access User.Read Mail.Read Mail.Send',
    }),
  });
}
```

**Important:** The refresh token remains valid for 90 days. After that, users must re-authenticate.

## Database Schema

### user_tokens Table

```sql
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  email TEXT,
  name TEXT,
  avatar TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  id_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, email)
);

CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_provider ON user_tokens(provider);
```

## Security Considerations

1. **State Parameter:** Protects against CSRF attacks
2. **HTTPS Only:** OAuth flow must use HTTPS in production
3. **Token Storage:** Tokens stored server-side only, never exposed to client
4. **Row Level Security:** Supabase RLS ensures users can only access their own tokens
5. **Token Rotation:** Refresh tokens regularly updated

## Error Handling

### Common Errors

**AADSTS50011:** The redirect URI in the request does not match
- **Solution:** Ensure `NEXT_PUBLIC_REDIRECT_URI` matches Azure app registration

**AADSTS65001:** User or administrator has not consented
- **Solution:** Grant admin consent in Azure Portal

**AADSTS70000:** Invalid client secret
- **Solution:** Verify `MICROSOFT_CLIENT_SECRET` in environment variables

**Invalid Grant:** Refresh token expired
- **Solution:** User must re-authenticate

## Testing

### Test OAuth Flow

1. Click "Add Microsoft Account" in sidebar
2. Login with Microsoft account
3. Grant permissions
4. Verify redirect to dashboard
5. Check `user_tokens` table for stored tokens

### Test Token Refresh

1. Manually set `expires_at` to past date in database
2. Make API call (e.g., fetch emails)
3. Verify token automatically refreshes
4. Check updated `expires_at` in database

## Azure App Registration Setup

### Required Configuration

1. **Platform:** Web
2. **Redirect URIs:**
   - Development: `http://localhost:3000/api/auth/microsoft/callback`
   - Production: `https://yourdomain.com/api/auth/microsoft/callback`

3. **API Permissions:**
   - Microsoft Graph (Delegated):
     - `User.Read`
     - `Mail.Read`
     - `Mail.Send`
     - `Calendars.Read`
     - `IMAP.AccessAsUser.All`
     - `SMTP.Send`

4. **Certificates & Secrets:**
   - Create client secret
   - Copy to `MICROSOFT_CLIENT_SECRET`

5. **Grant Admin Consent:** 
   - Click "Grant admin consent for [organization]"

## References

- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)

---

Last Updated: October 29, 2025

