# Email Integration with Microsoft Account

## Overview
The dashboard now displays the first 10 inbox and sent emails from the selected Microsoft account in real-time.

## Implementation Details

### 1. API Route: `/api/microsoft/emails`
**File:** `src/app/api/microsoft/emails/route.ts`

**Features:**
- Fetches emails from Microsoft Graph API
- Automatically refreshes expired access tokens
- Supports both inbox and sent items folders
- Returns formatted email data

**Query Parameters:**
- `accountId` (required) - The ID from the `user_tokens` table
- `folder` (optional) - Either `inbox` or `sentitems` (default: `inbox`)
- `top` (optional) - Number of emails to fetch (default: `10`)

**Example Usage:**
```typescript
GET /api/microsoft/emails?accountId=123&folder=inbox&top=10
```

**Response Format:**
```json
{
  "emails": [
    {
      "id": "email-id",
      "subject": "Email subject",
      "from": "Sender Name",
      "fromEmail": "sender@example.com",
      "to": "recipient@example.com",
      "date": "2024-01-15T10:30:00Z",
      "isRead": false,
      "hasAttachments": true
    }
  ],
  "count": 10
}
```

### 2. Updated Dashboard
**File:** `src/app/dashboard/page.tsx`

**Features:**
- ✅ Fetches emails automatically when an account is selected
- ✅ Displays inbox and sent emails in separate tabs
- ✅ Shows email count badges on tabs
- ✅ Real-time search filtering
- ✅ Unread indicator (blue dot)
- ✅ Attachment indicator (📎)
- ✅ Human-readable dates ("2 hours ago")
- ✅ Loading states with spinner
- ✅ Error handling with retry button
- ✅ Empty states with helpful messages

**Visual Features:**
- Unread emails are bold with a blue dot indicator
- Emails with attachments show a 📎 icon
- Hover effects on table rows
- Tab counts show number of emails loaded
- Icons on tabs (Inbox and Mail icons)

### 3. Integration with Redux
The dashboard reads the selected account from Redux state:

```typescript
const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);
```

When a user switches accounts in the `MicrosoftAccountSwitcher`, the dashboard automatically:
1. Detects the account change
2. Fetches new inbox emails
3. Fetches new sent emails
4. Updates the display

## User Flow

### Step 1: Account Selection
```
User selects account in sidebar
   ↓
Redux state updates
   ↓
Dashboard detects change via useEffect
```

### Step 2: Email Fetching
```
Dashboard component
   ↓
Calls /api/microsoft/emails (inbox)
   ↓
Calls /api/microsoft/emails (sentitems)
   ↓
Both run in parallel
```

### Step 3: API Processing
```
API receives request
   ↓
Fetches token from user_tokens table
   ↓
Checks if token expired
   ↓
Refreshes if needed
   ↓
Calls Microsoft Graph API
   ↓
Returns formatted emails
```

### Step 4: Display
```
Emails loaded
   ↓
Displayed in tabs
   ↓
User can search/filter
   ↓
Switch between inbox/sent
```

## Email Display Format

### Inbox Tab
- **From Column:** Sender name with unread indicator
- **Subject Column:** Email subject (bold if unread) with attachment icon
- **Date Column:** Relative time ("2 hours ago")

### Sent Tab
- **To Column:** Recipient names
- **Subject Column:** Email subject with attachment icon
- **Date Column:** Relative time

## Error Handling

### No Account Selected
Shows message: "Please connect a Microsoft account to view your emails"

### Loading State
Shows a spinner while fetching emails

### Error State
- Displays error message
- Provides "Retry" button
- Logs error to console for debugging

### Token Expired
- Automatically refreshes the token
- Updates database with new token
- Continues the request seamlessly

## Search Functionality

### Inbox Search
Searches in:
- Sender name (from)
- Email subject

### Sent Search
Searches in:
- Recipient names (to)
- Email subject

## Performance Optimizations

1. **useCallback Hooks:** Memoize fetch functions to prevent unnecessary re-renders
2. **Parallel Fetching:** Inbox and sent emails fetch simultaneously
3. **Conditional Fetching:** Only fetches when account is selected
4. **Search Filtering:** Client-side filtering for instant results

## Security Features

1. **Server-side API:** All token operations happen on the server
2. **User Validation:** Ensures user owns the account
3. **Token Protection:** Never exposes tokens to client
4. **Automatic Refresh:** Handles token expiry transparently

## Dependencies

### New Package
- `date-fns` - For human-readable date formatting

```bash
npm install date-fns
```

### Imports Used
```typescript
import { formatDistanceToNow } from 'date-fns';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
```

## Microsoft Graph API Endpoints Used

### Get Inbox Messages
```
GET https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages
```

### Get Sent Items
```
GET https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages
```

### Query Parameters
- `$top=10` - Limit to 10 emails
- `$select=...` - Select specific fields
- `$orderby=receivedDateTime DESC` - Sort by date

## Permissions Required

The Microsoft OAuth app must have these permissions:
- `Mail.Read` - Read user's emails
- `Mail.ReadWrite` - Full access to user emails
- `offline_access` - For refresh tokens

## Troubleshooting

### Emails Not Loading
1. Check if account is selected in Redux
2. Verify token exists in `user_tokens` table
3. Check browser console for errors
4. Verify Microsoft Graph API permissions

### Token Refresh Failed
1. Check `MICROSOFT_CLIENT_SECRET` environment variable
2. Verify refresh token is valid
3. Check Microsoft app credentials

### Empty Email List
1. Verify the account actually has emails
2. Check Microsoft Graph API response in server logs
3. Ensure correct folder path (inbox/sentitems)

## Future Enhancements

1. **Pagination:** Load more than 10 emails
2. **Email Details Modal:** Click to view full email
3. **Real-time Updates:** Poll for new emails
4. **Email Actions:** Mark as read, delete, reply
5. **Filters:** By date, unread status, has attachments
6. **Email Composition:** Send emails directly from dashboard
7. **Multiple Folder Support:** Add other folders (drafts, deleted, etc.)

## Testing Checklist

- [ ] Account selection triggers email fetch
- [ ] Inbox tab shows correct emails
- [ ] Sent tab shows correct emails
- [ ] Search filters emails correctly
- [ ] Unread indicator displays properly
- [ ] Attachment icon shows when present
- [ ] Dates format correctly
- [ ] Loading spinner appears during fetch
- [ ] Error state shows with retry button
- [ ] No account state displays correctly
- [ ] Token refresh works automatically
- [ ] Switching accounts updates emails

## Files Modified

1. ✅ `src/app/api/microsoft/emails/route.ts` - New API route
2. ✅ `src/app/dashboard/page.tsx` - Updated dashboard
3. ✅ `package.json` - Added date-fns dependency

## Summary

The dashboard now provides a complete email viewing experience integrated with the Microsoft Account Switcher. Users can:
- View their latest 10 inbox emails
- View their latest 10 sent emails
- Switch between accounts seamlessly
- Search through emails instantly
- See unread status and attachments
- Get human-readable date formats

All data is fetched securely from Microsoft Graph API using the stored OAuth tokens, with automatic token refresh handling! 🎉

