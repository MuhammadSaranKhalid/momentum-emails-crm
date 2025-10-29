import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

// Helper function to refresh access token
async function refreshAccessToken(refreshToken: string) {
  const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    scope: 'openid profile offline_access User.Read Mail.Read Mail.Send',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'User not authenticated' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const folder = searchParams.get('folder') || 'inbox'; // 'inbox' or 'sentitems'
    const top = searchParams.get('top') || '10'; // Number of emails to fetch

    if (!accountId) {
      return NextResponse.json({ message: 'Account ID is required' }, { status: 400 });
    }

    // Fetch the user's Microsoft token from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')
      .single();

    if (tokenError || !tokenData) {
      console.error('No Microsoft token found:', tokenError);
      return NextResponse.json({ message: 'Microsoft account not found' }, { status: 404 });
    }

    let { access_token, refresh_token } = tokenData;
    const { expires_at } = tokenData;

    // Check if the access token is expired
    if (new Date(expires_at) < new Date()) {
      try {
        const refreshedData = await refreshAccessToken(refresh_token);
        access_token = refreshedData.access_token;
        refresh_token = refreshedData.refresh_token || refresh_token;

        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshedData.expires_in);

        // Update the token in the database
        await supabase
          .from('user_tokens')
          .update({
            access_token,
            refresh_token,
            expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);
      } catch (error) {
        console.error('Error refreshing token:', error);
        return NextResponse.json({ message: 'Failed to refresh access token' }, { status: 500 });
      }
    }

    // Fetch emails from Microsoft Graph API
    const folderPath = folder === 'inbox' ? 'inbox' : 'sentitems';
    const graphUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/${folderPath}/messages?$top=${top}&$select=id,subject,from,sender,toRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments&$orderby=receivedDateTime DESC`;

    console.log('Fetching emails from:', graphUrl);

    const graphResponse = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    console.log('Graph response status:', graphResponse.status);

    if (!graphResponse.ok) {
      const errorBody = await graphResponse.text();
      console.error('Microsoft Graph API Error:', {
        status: graphResponse.status,
        statusText: graphResponse.statusText,
        body: errorBody
      });
      return NextResponse.json({ 
        message: 'Failed to fetch emails from Microsoft Graph',
        error: errorBody,
        status: graphResponse.status
      }, { status: 500 });
    }

    const emailsData = await graphResponse.json();
    console.log('Emails fetched successfully:', emailsData.value?.length || 0);

    interface EmailRecipient {
      emailAddress?: {
        name?: string;
        address?: string;
      };
    }

    interface GraphEmail {
      id: string;
      subject?: string;
      from?: {
        emailAddress?: {
          name?: string;
          address?: string;
        };
      };
      toRecipients?: EmailRecipient[];
      receivedDateTime?: string;
      sentDateTime?: string;
      isRead?: boolean;
      hasAttachments?: boolean;
    }

    // Format the emails
    const formattedEmails = emailsData.value.map((email: GraphEmail) => ({
      id: email.id,
      subject: email.subject || '(No Subject)',
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown',
      fromEmail: email.from?.emailAddress?.address || '',
      to: email.toRecipients?.map((r) => r.emailAddress?.name || r.emailAddress?.address).join(', ') || '',
      date: email.receivedDateTime || email.sentDateTime,
      isRead: email.isRead,
      hasAttachments: email.hasAttachments,
    }));

    return NextResponse.json({
      emails: formattedEmails,
      count: formattedEmails.length,
    });

  } catch (error) {
    console.error('Error fetching emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ 
      message: 'Internal Server Error', 
      error: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
}

