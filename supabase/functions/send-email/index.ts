// ============================================================================
// Setup type definitions and Supabase client
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Initialize Supabase Admin Client (Global)
// ============================================================================

const supabaseAdmin = createClient(
  "https://srjfclplxoonrzczpfyz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyamZjbHBseG9vbnJ6Y3pwZnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgyNzcxNiwiZXhwIjoyMDY3NDAzNzE2fQ.640IuE9zg60gZ7GYV974n-M5qoYodKNFevAr3LcPaqw"
);

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Helper: Replace member variables in text
// ============================================================================

function replaceMemberVariables(
  text: string,
  member: {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    email?: string | null;
    mobile?: string | null;
    company_name?: string | null;
    address?: string | null;
    country?: string | null;
  }
): string {
  if (!text) return text;

  let replaced = text;

  // Replace all member variables with actual values
  replaced = replaced.replace(/\{\{first_name\}\}/g, member.first_name || "");
  replaced = replaced.replace(/\{\{last_name\}\}/g, member.last_name || "");
  replaced = replaced.replace(
    /\{\{full_name\}\}/g,
    member.full_name || `${member.first_name || ""} ${member.last_name || ""}`.trim() || ""
  );
  replaced = replaced.replace(/\{\{email\}\}/g, member.email || "");
  replaced = replaced.replace(/\{\{mobile\}\}/g, member.mobile || "");
  replaced = replaced.replace(/\{\{company_name\}\}/g, member.company_name || "");
  replaced = replaced.replace(/\{\{address\}\}/g, member.address || "");
  replaced = replaced.replace(/\{\{country\}\}/g, member.country || "");

  return replaced;
}

// ============================================================================
// Helper: Refresh Microsoft Access Token
// ============================================================================

async function refreshAccessToken(refreshToken: string) {
  try {
    const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const body = new URLSearchParams({
      client_id: Deno.env.get("MICROSOFT_CLIENT_ID") || "",
      client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET") || "",
      scope: "openid profile offline_access User.Read Mail.Read Mail.Send",
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Token refresh failed:", errorData);
      return null;
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

// ============================================================================
// Helper: Get valid Microsoft access token for campaign
// ============================================================================

async function getValidAccessToken(campaign: any) {
  try {
    if (!campaign.user_token_id) {
      console.error("Campaign has no user_token_id:", campaign.id);
      return null;
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("user_tokens")
      .select("id, name, email, access_token, refresh_token, expires_at")
      .eq("id", campaign.user_token_id)
      .single();

    if (tokenError || !tokenData) {
      console.error("Microsoft account not found:", tokenError);
      return null;
    }

    let { access_token, refresh_token, expires_at, email, name } = tokenData;
    console.log(
      `Using Microsoft account: ${email} (${name}) for campaign: ${campaign.id}`
    );

    const expiresDate = new Date(expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (expiresDate.getTime() - now.getTime() < bufferTime) {
      console.log(`Token expired for ${email}, refreshing...`);
      const refreshed = await refreshAccessToken(refresh_token);
      if (!refreshed) throw new Error("Failed to refresh access token");

      await supabaseAdmin
        .from("user_tokens")
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken,
          expires_at: refreshed.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenData.id);

      access_token = refreshed.accessToken;
      console.log(`Token refreshed successfully for account: ${email}`);
    }

    return {
      accessToken: access_token,
      accountEmail: email,
      accountName: name || email,
      tokenId: tokenData.id,
    };
  } catch (error) {
    console.error("Error getting valid token:", error);
    return null;
  }
}

// ============================================================================
// Helper: Send single email via Microsoft Graph API
// ============================================================================

async function sendEmail(
  accessToken: string,
  campaign: any,
  recipient: any,
  member: any
) {
  try {
    // Replace variables in subject and body with member data
    const personalizedSubject = replaceMemberVariables(campaign.subject, member);
    const personalizedBody = replaceMemberVariables(campaign.body, member);

    const emailPayload: any = {
      message: {
        subject: personalizedSubject,
        body: {
          contentType: "HTML",
          content: personalizedBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipient.recipient_email,
              name: recipient.recipient_name || recipient.recipient_email,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    if (campaign.reply_to) {
      emailPayload.message.replyTo = [
        {
          emailAddress: {
            address: campaign.reply_to,
          },
        },
      ];
    }

    if (campaign.cc?.length > 0) {
      emailPayload.message.ccRecipients = campaign.cc.map((email: string) => ({
        emailAddress: {
          address: email,
        },
      }));
    }

    if (campaign.bcc?.length > 0) {
      emailPayload.message.bccRecipients = campaign.bcc.map((email: string) => ({
        emailAddress: {
          address: email,
        },
      }));
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (response.status === 202) {
      const messageId =
        response.headers.get("x-ms-request-id") || crypto.randomUUID();
      return {
        success: true,
        messageId,
      };
    } else {
      const errorData = await response.text();
      return {
        success: false,
        error: `Graph API error: ${response.status} - ${errorData}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

// ============================================================================
// Controlled Concurrency Email Processor
// ============================================================================

async function processCampaignRecipients(campaignId: string) {
  const MAX_CONCURRENT = 5;
  let processed = 0,
    succeeded = 0,
    failed = 0,
    skipped = 0;

  try {
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    console.log("Campaigns ", campaign);

    if (campaignError || !campaign)
      throw new Error(`Campaign not found: ${campaignId}`);

    console.log(`Processing campaign: ${campaign.id} - "${campaign.subject}"`);

    const tokenData = await getValidAccessToken(campaign);
    if (!tokenData)
      throw new Error(`No valid Microsoft account for campaign: ${campaignId}`);

    // Fetch recipients
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "failed"])
      .order("created_at", {
        ascending: true,
      });

    console.log("Recipient ", recipients);

    if (recipientsError)
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);

    if (!recipients?.length) {
      console.log("No recipients to process");
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      };
    }

    console.log(`Found ${recipients.length} recipients to process`);

    // Fetch all unique member IDs
    const memberIds = [
      ...new Set(recipients.map((r: any) => r.member_id).filter(Boolean)),
    ];

    // Fetch all members data at once for efficiency
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from("members")
      .select("id, first_name, last_name, full_name, email, mobile, company_name, address, country")
      .in("id", memberIds);

    if (membersError) {
      console.error("Failed to fetch members:", membersError);
      throw new Error(`Failed to fetch members: ${membersError.message}`);
    }

    // Create a map of member_id -> member data for quick lookup
    const membersMap = new Map(
      (membersData || []).map((member: any) => [member.id, member])
    );

    console.log(`Fetched ${membersMap.size} members for personalization`);

    if (campaign.status === "scheduled") {
      await supabaseAdmin
        .from("email_campaigns")
        .update({
          status: "sending",
          started_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    }

    async function sendToRecipient(recipient: any) {
      processed++;

      // Get member data from the map
      const member = membersMap.get(recipient.member_id);
      if (!member) {
        console.warn(
          `No member data found for recipient ${recipient.id} (member_id: ${recipient.member_id}), skipping...`
        );
        skipped++;
        return;
      }

      await supabaseAdmin
        .from("campaign_recipients")
        .update({
          status: "sending",
        })
        .eq("id", recipient.id);

      await supabaseAdmin.from("campaign_events").insert({
        campaign_id: campaignId,
        recipient_id: recipient.id,
        event_type: "queued",
        event_data: {
          attempt: recipient.retry_count + 1,
        },
      });

      const result = await sendEmail(
        tokenData!.accessToken,
        campaign,
        recipient,
        member
      );

      if (result.success) {
        succeeded++;
        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            message_id: result.messageId,
            provider_name: "microsoft",
          })
          .eq("id", recipient.id);

        await supabaseAdmin.from("campaign_events").insert({
          campaign_id: campaignId,
          recipient_id: recipient.id,
          event_type: "sent",
          event_data: {
            message_id: result.messageId,
          },
        });

        console.log(`✓ Sent to ${recipient.recipient_email}`);
      } else {
        failed++;
        const retryCount = recipient.retry_count + 1;
        const shouldRetry = retryCount < recipient.max_retries;
        const retryDelayMinutes = Math.min(5 * Math.pow(2, retryCount), 30);
        const nextRetryAt = shouldRetry
          ? new Date(
              Date.now() + retryDelayMinutes * 60 * 1000
            ).toISOString()
          : null;

        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: result.error,
            retry_count: retryCount,
            next_retry_at: nextRetryAt,
          })
          .eq("id", recipient.id);

        await supabaseAdmin.from("campaign_events").insert({
          campaign_id: campaignId,
          recipient_id: recipient.id,
          event_type: "failed",
          event_data: {
            error: result.error,
            retry_count: retryCount,
            will_retry: shouldRetry,
          },
        });

        console.log(
          `✗ Failed to send to ${recipient.recipient_email}: ${result.error}`
        );
      }
    }

    // Controlled concurrency batching
    for (let i = 0; i < recipients.length; i += MAX_CONCURRENT) {
      const batch = recipients.slice(i, i + MAX_CONCURRENT);
      await Promise.allSettled(batch.map(sendToRecipient));
      await new Promise((r) => setTimeout(r, 1000)); // 1s gap between batches
    }

    // Finalize campaign if done
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sent",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    console.log("Campaign completed");

    return {
      processed,
      succeeded,
      failed,
      skipped,
    };
  } catch (error) {
    console.error("Error processing campaign recipients:", error);
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    throw error;
  }
}

// ============================================================================
// Helper: Heartbeat (prevents early shutdown)
// ============================================================================

function heartbeat(campaignId: string) {
  const interval = setInterval(async () => {
    await supabaseAdmin.from("campaign_logs").insert({
      campaign_id: campaignId,
      message: "heartbeat",
      created_at: new Date().toISOString(),
    });
  }, 20000); // every 20s

  return () => clearInterval(interval);
}

// ============================================================================
// Background Task Runner Wrapper
// ============================================================================

function runBackgroundTask(taskFn: () => Promise<void>) {
  EdgeRuntime.waitUntil(
    (async () => {
      try {
        await taskFn();
      } catch (err) {
        console.error("Background task crashed:", err);
      }
    })()
  );
}

// ============================================================================
// Main Deno Serve Handler
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", {
      headers: corsHeaders,
    });

  try {
    const payload = await req.json();

    if (!payload.campaign_id)
      throw new Error("Invalid payload: campaign_id is required");

    runBackgroundTask(async () => {
      const stopHeartbeat = heartbeat(payload.campaign_id);
      try {
        console.log("🚀 Starting background campaign:", payload.campaign_id);
        const result = await processCampaignRecipients(payload.campaign_id);
        console.log("✅ Completed:", result);
        // await supabaseAdmin.from("campaign_logs").insert({
        //   campaign_id: payload.campaign_id,
        //   result,
        //   created_at: new Date().toISOString(),
        // });
      } finally {
        stopHeartbeat();
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Campaign processing started in background.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 202,
      }
    );
  } catch (error: any) {
    console.error("Worker function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});

