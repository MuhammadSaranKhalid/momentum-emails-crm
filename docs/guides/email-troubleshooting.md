# Email Integration Troubleshooting Guide

## Current Error: 500 Internal Server Error

### What I've Fixed

1. ✅ **Updated Token Refresh Scope** - Changed from `.default` to explicit permissions
2. ✅ **Added Detailed Logging** - Server logs now show exact error from Microsoft
3. ✅ **Better Error Messages** - Dashboard now displays actual error message

### How to Debug

#### Step 1: Check Server Logs
After refreshing the dashboard, check your terminal/console where Next.js is running. You should see:

```
Fetching emails from: https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?...
Graph response status: [STATUS_CODE]
```

**If you see status 401:** Token is invalid or expired
**If you see status 403:** Insufficient permissions
**If you see status 404:** Invalid folder path or mailbox not found

#### Step 2: Check Browser Console
The browser console will now show:
- API Error Response with full error details
- Any JavaScript errors

#### Step 3: Verify Microsoft App Permissions

Your Microsoft Azure App Registration must have these API permissions:

**Microsoft Graph API:**
- ✅ `Mail.Read` - Read user mail
- ✅ `Mail.Send` - Send mail as user
- ✅ `User.Read` - Sign in and read user profile
- ✅ `offline_access` - Maintain access to data

**How to Check:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: Azure Active Directory → App registrations
3. Select your app
4. Go to "API permissions"
5. Verify all permissions are granted
6. Click "Grant admin consent" if needed

### Common Issues & Solutions

#### Issue 1: "Insufficient privileges to complete the operation"
**Error Code:** 403

**Cause:** Missing Mail.Read permission

**Solution:**
1. Go to Azure Portal → App Registration
2. Add Microsoft Graph → Delegated Permissions → Mail.Read
3. Click "Grant admin consent for [Your Org]"
4. Reconnect your Microsoft account in the app

#### Issue 2: "Access token has expired"
**Error Code:** 401

**Cause:** Token expired and refresh failed

**Solution:**
1. Disconnect Microsoft account
2. Reconnect (this will get a fresh token)
3. Make sure `MICROSOFT_CLIENT_SECRET` environment variable is set

#### Issue 3: "The mailbox is either inactive or not found"
**Error Code:** 404

**Cause:** User's mailbox not accessible

**Solution:**
1. Verify the account has an active mailbox
2. Try signing in to [Outlook Web](https://outlook.office.com)
3. Ensure it's a proper Microsoft 365/Outlook account

#### Issue 4: "Invalid scope"
**Error during OAuth:** Error getting token

**Cause:** Scope mismatch between request and Azure app config

**Solution:**
1. Ensure all scopes in code are added to Azure app
2. Verify redirect URI matches exactly
3. Check client secret is not expired

### Environment Variables Checklist

Make sure these are set in your `.env.local`:

```bash
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

**Important:** 
- Client secret must be the **VALUE**, not the ID
- Redirect URI must match exactly what's in Azure (including protocol and port)

### Testing Steps

#### 1. Test Token Validity
Run this in your browser console while on the dashboard:

```javascript
fetch('/api/microsoft/emails?accountId=YOUR_ACCOUNT_ID&folder=inbox&top=1')
  .then(r => r.json())
  .then(console.log)
```

#### 2. Verify Account ID
Check Redux state:

```javascript
// In browser console
console.log(window.__REDUX_DEVTOOLS_EXTENSION__)
```

Or add this temporarily to your dashboard component:

```typescript
console.log('Selected Account:', selectedAccount);
```

#### 3. Check Database
Verify the user_tokens table has a valid token:

```sql
SELECT id, user_id, provider, expires_at, created_at 
FROM user_tokens 
WHERE provider = 'microsoft' 
AND user_id = 'YOUR_USER_ID';
```

### Quick Fixes

#### Fix 1: Reconnect Account
The fastest way to fix most issues:

1. Go to dashboard
2. Click Microsoft Account Switcher
3. Add account (even if one exists)
4. Complete OAuth flow
5. This replaces the old token with a fresh one

#### Fix 2: Update Scopes in All Files

Make sure these files have the correct scope:

**src/app/api/auth/microsoft/connect/route.ts:**
```typescript
const scope = "openid profile offline_access User.Read Mail.Read Mail.Send";
```

**src/app/api/auth/microsoft/callback/route.ts:**
```typescript
const scope = 'openid profile offline_access User.Read Mail.Read Mail.Send';
```

**src/app/api/microsoft/emails/route.ts** (refresh function):
```typescript
scope: 'openid profile offline_access User.Read Mail.Read Mail.Send',
```

#### Fix 3: Clear and Refresh

```bash
# Stop the dev server
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies (if needed)
npm install

# Restart dev server
npm run dev
```

### Microsoft Graph API Reference

#### Endpoint We're Using:
```
GET https://graph.microsoft.com/v1.0/me/mailFolders/{folder}/messages
```

#### Available Folders:
- `inbox` - Inbox folder
- `sentitems` - Sent items
- `drafts` - Draft emails
- `deleteditems` - Deleted emails
- `junkemail` - Junk/spam

#### Query Parameters:
- `$top=10` - Number of results
- `$select=id,subject,from...` - Fields to return
- `$orderby=receivedDateTime DESC` - Sort order
- `$filter=isRead eq false` - Filter (e.g., unread only)

### Next Steps

1. **Check the server logs** when you refresh the dashboard
2. **Look for the Graph response status** in logs
3. **Share the error details** if the issue persists

The detailed logging we just added will show you exactly what Microsoft Graph API is returning.

### Still Not Working?

If you're still getting 500 errors:

1. Share the server log output (the console.log statements)
2. Share the browser console error
3. Confirm:
   - Microsoft app permissions are granted
   - Environment variables are set correctly
   - Account has an active mailbox
   - Token exists in database

### Success Indicators

You'll know it's working when you see:

**Server logs:**
```
Fetching emails from: https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages...
Graph response status: 200
Emails fetched successfully: 10
```

**Dashboard:**
- Inbox and Sent tabs show email counts
- Emails appear in the table
- No error messages
- Search works

---

**Note:** After making these changes, you may need to:
1. Restart your Next.js dev server
2. Reconnect your Microsoft account (to get a token with proper scopes)
3. Clear your browser cache if issues persist

