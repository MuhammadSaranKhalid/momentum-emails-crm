import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

// Function to get a new access token using the refresh token
async function refreshAccessToken(refreshToken: string) {
  const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
    scope:
      "openid profile offline_access User.Read Mail.Read Mail.Send Calendars.Read IMAP.AccessAsUser.All SMTP.Send",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to refresh access token:", data);
    return null;
  }

  return data;
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: "User not authenticated" },
      { status: 401 }
    );
  }

  // 1. Fetch the user's Microsoft token from the database
  const { data: tokenData, error: tokenError } = await supabase
    .from("user_tokens")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "microsoft")
    .single();
  console.log("Data ", tokenData);

  if (tokenError || !tokenData) {
    console.error("No Microsoft token found for the user:", tokenError);
    return NextResponse.json({ accounts: [] });
  }

  let { access_token } = tokenData;
  const { expires_at, refresh_token } = tokenData;

  // 2. Check if the access token is expired
  if (new Date(expires_at) < new Date()) {
    console.log("Access token expired, refreshing...");
    const newTokens = await refreshAccessToken(refresh_token);
    if (newTokens) {
      access_token = newTokens.access_token;

      // Update the new tokens in the database
      const new_expires_at = new Date();
      new_expires_at.setSeconds(
        new_expires_at.getSeconds() + newTokens.expires_in
      );

      const { error: updateError } = await supabase
        .from("user_tokens")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || refresh_token, // Keep old refresh token if a new one isn't provided
          expires_at: new_expires_at.toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating tokens in database:", updateError);
        // Continue with the old token if update fails, but it might not work
      }
    } else {
      // If refresh fails, we can't proceed
      return NextResponse.json(
        { message: "Failed to refresh Microsoft token." },
        { status: 500 }
      );
    }
  }

  // 3. Fetch user's profile from Microsoft Graph API
  try {
    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!graphResponse.ok) {
      console.error("Failed to fetch user profile from Microsoft Graph");
      return NextResponse.json(
        { message: "Failed to fetch user profile." },
        { status: graphResponse.status }
      );
    }

    const profile = await graphResponse.json();

    // 4. Fetch user's photo
    let photoUrl = "";
    try {
      const photoResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me/photo/$value",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (photoResponse.ok) {
        const blob = await photoResponse.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        photoUrl = `data:${blob.type};base64,${buffer.toString("base64")}`;
      }
    } catch (photoError) {
      console.warn("Could not fetch user photo:", photoError);
      // It's okay if photo is not available, we'll use a fallback
    }

    const account = {
      name: profile.displayName,
      email: profile.mail || profile.userPrincipalName,
      avatar: photoUrl,
    };

    // Since we only handle one account per user, we return an array with one account
    return NextResponse.json({ accounts: [account] });
  } catch (error) {
    console.error("Error fetching data from Microsoft Graph:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal Server Error", error: errorMessage },
      { status: 500 }
    );
  }
}
