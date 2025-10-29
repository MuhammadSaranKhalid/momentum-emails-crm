# Microsoft Account Selection Flow

## Problem
A user can connect multiple Microsoft accounts. When they create and send a campaign, we need to determine which account to use for sending emails.

## Solution

### 1. Account Selection at Campaign Creation

When creating a campaign, capture the currently selected Microsoft account from Redux:

```typescript
// src/app/dashboard/campaigns/new/page.tsx

import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function CreateCampaignPage() {
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);
  
  const handleCreateCampaign = async (formData) => {
    // Include the selected account information
    const campaignData = {
      name: formData.name,
      subject: formData.subject,
      body: formData.body,
      
      // Store which account to use for sending
      sender_email: selectedAccount?.email,     // Account email
      sender_name: selectedAccount?.name,       // Display name (optional)
      
      user_id: userId,
      template_id: templateId,
      // ... other fields
    };
    
    await supabase.from('email_campaigns').insert(campaignData);
  };
}
```

### 2. Database Schema

The `email_campaigns` table already has these fields:

```sql
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Account selection fields
  sender_email TEXT,  -- Which Microsoft account to use
  sender_name TEXT,   -- Display name for "From" field
  reply_to TEXT,      -- Optional reply-to address
  
  -- Campaign content
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  -- ...
);
```

### 3. Edge Function Logic

The edge function uses this flow to select the account:

```typescript
async function getValidAccessToken(supabase: any, campaign: CampaignData) {
  // Build query to find Microsoft account
  let query = supabase
    .from('user_tokens')
    .select('id, email, access_token, refresh_token, expires_at')
    .eq('user_id', campaign.user_id)
    .eq('provider', 'microsoft')
    .order('created_at', { ascending: false }); // Most recent first

  // 1. If campaign specifies sender_email, use that account
  if (campaign.sender_email) {
    query = query.eq('email', campaign.sender_email);
  }
  
  // 2. Otherwise, use most recently connected account (default)
  
  const { data: tokenData } = await query.limit(1).single();
  
  // Fetch credentials and send emails using this account
  // ...
}
```

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CONNECTS MICROSOFT ACCOUNTS                          │
│                                                               │
│  User → Sidebar → "Add Account" → OAuth → user_tokens table │
│                                                               │
│  user_tokens:                                                │
│  - id: uuid-1                                                │
│    email: "john@company.com"                                 │
│    user_id: user-123                                         │
│                                                               │
│  - id: uuid-2                                                │
│    email: "john.doe@personal.com"                            │
│    user_id: user-123                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USER SELECTS ACTIVE ACCOUNT                              │
│                                                               │
│  Sidebar → Microsoft Account Switcher → Select Account      │
│                                                               │
│  Redux Store:                                                │
│  {                                                            │
│    accounts: {                                               │
│      selectedAccount: {                                      │
│        id: "uuid-1",                                         │
│        email: "john@company.com",                            │
│        name: "John Doe"                                      │
│      }                                                        │
│    }                                                          │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USER CREATES CAMPAIGN                                     │
│                                                               │
│  Create Campaign Form:                                       │
│  - Captures: selectedAccount.email                           │
│  - Stores in: campaign.sender_email                          │
│                                                               │
│  email_campaigns:                                            │
│  - id: campaign-123                                          │
│    user_id: user-123                                         │
│    sender_email: "john@company.com"  ← STORED HERE          │
│    sender_name: "John Doe"                                   │
│    subject: "Newsletter"                                     │
│    status: "draft"                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. USER STARTS CAMPAIGN                                      │
│                                                               │
│  Dashboard → Start Campaign → API Call                       │
│                                                               │
│  POST /api/campaigns/[id]/send                               │
│                                                               │
│  Updates:                                                    │
│  campaign.status = 'sending'                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. DATABASE TRIGGER FIRES                                    │
│                                                               │
│  Trigger: invoke_email_worker_on_status_change              │
│                                                               │
│  Invokes Edge Function:                                      │
│  POST /functions/v1/send-email-worker                        │
│  {                                                            │
│    campaign_id: "campaign-123"                               │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. EDGE FUNCTION PROCESSES                                   │
│                                                               │
│  A. Fetch Campaign:                                          │
│     SELECT * FROM email_campaigns                            │
│     WHERE id = 'campaign-123'                                │
│     → Gets: sender_email = "john@company.com"                │
│                                                               │
│  B. Fetch Account Credentials:                               │
│     SELECT * FROM user_tokens                                │
│     WHERE user_id = 'user-123'                               │
│       AND provider = 'microsoft'                             │
│       AND email = 'john@company.com'  ← MATCHES HERE        │
│     → Gets: access_token, refresh_token                      │
│                                                               │
│  C. Refresh Token if Expired:                                │
│     - Uses: MICROSOFT_CLIENT_ID (env var)                    │
│     - Uses: MICROSOFT_CLIENT_SECRET (env var)                │
│     - Uses: refresh_token (from database)                    │
│     → Gets: New access_token                                 │
│                                                               │
│  D. Send Emails via Microsoft Graph API:                     │
│     POST https://graph.microsoft.com/v1.0/me/sendMail        │
│     Authorization: Bearer [access_token]                     │
│     → Sends from: john@company.com                           │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Option 1: Automatic (Current Selected Account) ✅ **RECOMMENDED**

**When:** Campaign creation/start
**How:** Automatically use the currently selected account from Redux

```typescript
// src/app/dashboard/campaigns/new/page.tsx
const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

const campaignData = {
  // ... other fields
  sender_email: selectedAccount?.email,
  sender_name: selectedAccount?.name,
};
```

**Pros:**
- Simple UX - no extra selection needed
- Uses the account user is currently viewing
- Matches user's mental model

**Cons:**
- User must remember to switch accounts before creating campaign

### Option 2: Explicit Selection Dropdown

**When:** Campaign creation form
**How:** Add account selector to the form

```typescript
// src/app/dashboard/campaigns/new/page.tsx
export default function CreateCampaignPage() {
  const [selectedAccountForCampaign, setSelectedAccountForCampaign] = useState<string>();
  const { data: accounts } = useList({ resource: 'user_tokens' });
  
  return (
    <form>
      {/* ... other fields */}
      
      <div>
        <label>Send From Account</label>
        <Select
          value={selectedAccountForCampaign}
          onValueChange={setSelectedAccountForCampaign}
        >
          {accounts?.map(account => (
            <SelectItem key={account.id} value={account.email}>
              {account.name} ({account.email})
            </SelectItem>
          ))}
        </Select>
      </div>
    </form>
  );
}
```

**Pros:**
- Explicit choice
- Clear which account will be used
- Can override default selection

**Cons:**
- Extra step in workflow
- More complex UI

### Option 3: Hybrid Approach ✅ **BEST PRACTICE**

Combine both: Default to current account, with option to change:

```typescript
export default function CreateCampaignPage() {
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);
  const [senderEmail, setSenderEmail] = useState(selectedAccount?.email);
  
  const { data: accounts } = useList({
    resource: 'user_tokens',
    filters: [
      { field: 'user_id', operator: 'eq', value: userId },
      { field: 'provider', operator: 'eq', value: 'microsoft' },
    ],
  });
  
  return (
    <form>
      {/* ... other fields */}
      
      <div>
        <label>Send From</label>
        <Select value={senderEmail} onValueChange={setSenderEmail}>
          {accounts?.data?.map(account => (
            <SelectItem key={account.id} value={account.email}>
              {account.name} ({account.email})
              {account.email === selectedAccount?.email && " (Current)"}
            </SelectItem>
          ))}
        </Select>
        <p className="text-sm text-muted-foreground">
          Emails will be sent from this Microsoft account
        </p>
      </div>
    </form>
  );
}
```

## Edge Cases & Handling

### Case 1: User Deletes the Account After Creating Campaign

**Problem:** Campaign has `sender_email = "john@company.com"` but user disconnected that account

**Solution:**
```typescript
// Edge function falls back to most recent account
if (campaign.sender_email) {
  query = query.eq('email', campaign.sender_email);
}

const { data: tokenData } = await query.limit(1).single();

if (!tokenData && campaign.sender_email) {
  // Account not found, try fallback to any account
  console.warn(`Original account ${campaign.sender_email} not found, using fallback`);
  
  const { data: fallbackToken } = await supabase
    .from('user_tokens')
    .select('*')
    .eq('user_id', campaign.user_id)
    .eq('provider', 'microsoft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (fallbackToken) {
    tokenData = fallbackToken;
  }
}
```

### Case 2: User Has No Connected Accounts

**Problem:** User tries to send campaign without any Microsoft account

**Solution:**
```typescript
// In API route: /api/campaigns/[id]/send
const { data: userToken } = await supabase
  .from('user_tokens')
  .select('email')
  .eq('user_id', user.id)
  .eq('provider', 'microsoft')
  .limit(1);

if (!userToken) {
  return NextResponse.json({
    error: 'No Microsoft account connected. Please connect an account first.',
    redirect: '/api/auth/microsoft/connect',
  }, { status: 400 });
}
```

### Case 3: Campaign Created Without sender_email

**Problem:** Old campaigns or campaigns created before this feature

**Solution:**
```typescript
// Edge function automatically uses most recent account
// The query.order('created_at', { ascending: false }) ensures we get the latest
if (!campaign.sender_email) {
  console.log('No sender_email specified, using most recent account');
}
```

## UI Improvements

### Show Account in Campaign List

```typescript
// src/app/dashboard/campaigns/columns.tsx
{
  accessorKey: 'sender_email',
  header: 'Sending From',
  cell: ({ row }) => {
    const senderEmail = row.getValue('sender_email');
    return (
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4" />
        <span>{senderEmail || 'Default Account'}</span>
      </div>
    );
  },
}
```

### Show Account in Campaign Details

```typescript
// Campaign status page
<div className="flex items-center gap-2">
  <Avatar className="h-8 w-8">
    <AvatarImage src={accountAvatar} />
    <AvatarFallback>{accountInitials}</AvatarFallback>
  </Avatar>
  <div>
    <p className="text-sm font-medium">Sending from</p>
    <p className="text-sm text-muted-foreground">{campaign.sender_email}</p>
  </div>
</div>
```

## Testing

### Test Scenarios

1. **Single Account User**
   - User has one Microsoft account
   - Creates campaign
   - Verify: Uses that account automatically

2. **Multiple Account User**
   - User has 3 Microsoft accounts
   - Switches to account #2
   - Creates campaign
   - Verify: Campaign stored with account #2 email
   - Verify: Emails sent from account #2

3. **Account Deletion**
   - User creates campaign with account A
   - User disconnects account A
   - User tries to send campaign
   - Verify: Falls back to another account or shows error

4. **No Account**
   - User has no connected accounts
   - Tries to create/send campaign
   - Verify: Shows error message with link to connect account

## Summary

**Decision Flow:**
1. ✅ Store `sender_email` when campaign is created (from Redux selectedAccount)
2. ✅ Edge function queries `user_tokens` WHERE `email = sender_email`
3. ✅ Falls back to most recent account if specified account not found
4. ✅ Returns error if user has no Microsoft accounts at all

This approach:
- ✅ Works with multiple accounts
- ✅ Preserves user's choice
- ✅ Has sensible fallbacks
- ✅ Clear and predictable behavior

---

Last Updated: October 29, 2025

