import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

const clientId = process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
const scope = 'openid profile offline_access User.Read Mail.Read Mail.Send Calendars.Read IMAP.AccessAsUser.All SMTP.Send';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const supabase = await createSupabaseServerClient();

  try {
    if (!code) {
      return NextResponse.json({ message: 'Authorization code not found.' }, { status: 400 });
    }

    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const body = new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      scope,
      code,
      redirect_uri: redirectUri || '',
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to acquire token:', data);
      return NextResponse.json({ message: 'Failed to acquire token.', error: data }, { status: response.status });
    }

    const { access_token, refresh_token, id_token, expires_in } = data;

    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
            'Authorization': `Bearer ${access_token}`,
        },
    });

    if (!graphResponse.ok) {
        console.error('Failed to fetch user profile from Microsoft Graph');
        return NextResponse.json({ message: 'Failed to fetch user profile.' }, { status: graphResponse.status });
    }

    const profile = await graphResponse.json();
    const newEmail = profile.mail || profile.userPrincipalName;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    let photoUrl = '';
    try {
        const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
        });

        if (photoResponse.ok) {
            const blob = await photoResponse.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            photoUrl = `data:${blob.type};base64,${buffer.toString('base64')}`;
        }
    } catch (photoError) {
        console.warn('Could not fetch user photo:', photoError);
    }

    const expires_at = new Date();
    expires_at.setSeconds(expires_at.getSeconds() + expires_in);

    const { error: upsertError } = await supabase
      .from('user_tokens')
      .upsert({
        user_id: user.id,
        provider: 'microsoft',
        access_token,
        refresh_token,
        id_token,
        expires_at: expires_at.toISOString(),
        name: profile.displayName,
        email: newEmail,
        avatar: photoUrl,
      });

    if (upsertError) {
        console.error('Error saving tokens to database:', upsertError);
        return NextResponse.json({ message: 'Error saving tokens to database', error: upsertError.message }, { status: 500 });
    }

    return NextResponse.redirect(new URL('/dashboard', req.url));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Callback error:', errorMessage);
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
