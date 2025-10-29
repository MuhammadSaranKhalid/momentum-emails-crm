import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { recipientEmail, subject, body } = await req.json();

    if (!recipientEmail || !subject || !body) {
        return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ success: false, message: "Authentication error: User not found." }, { status: 401 });
    }

    // 1. Fetch the user's Microsoft access token from the database
    const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('provider', 'microsoft')
        .single();

    if (tokenError || !tokenData) {
        console.error("Error fetching token:", tokenError);
        return NextResponse.json({ success: false, message: "Could not find a valid Microsoft account connection." }, { status: 404 });
    }

    const { access_token } = tokenData;

    // 2. Construct the email payload for the Microsoft Graph API
    const emailPayload = {
        message: {
            subject: subject,
            body: {
                contentType: "HTML",
                content: body,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: recipientEmail,
                    },
                },
            ],
        },
        saveToSentItems: "true",
    };

    // 3. Send the email using the Microsoft Graph API
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Microsoft Graph API Error:", errorBody);
            // Don't expose the raw MS Graph API error to the client for security
            return NextResponse.json({ success: false, message: `Failed to send email.` }, { status: response.status });
        }

        return NextResponse.json({ success: true, message: "Email sent successfully via Microsoft 365!" });

    } catch (error) {
        console.error("Error sending email:", error);
        return NextResponse.json({ success: false, message: "An unexpected error occurred." }, { status: 500 });
    }
}
