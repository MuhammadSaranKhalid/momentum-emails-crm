// ============================================================================
// Setup type definitions and Supabase client
// ============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createTransport } from "npm:nodemailer@6.9.7";

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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Helper: Replace member variables in text
// ============================================================================
function replaceMemberVariables(text: string, member: any): string {
  if (!text) return text;

  let replaced = text;
  // Replace all member variables with actual values
  replaced = replaced.replace(/\{\{first_name\}\}/g, member.first_name || "");
  replaced = replaced.replace(/\{\{last_name\}\}/g, member.last_name || "");
  replaced = replaced.replace(
    /\{\{full_name\}\}/g,
    member.full_name ||
      `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
      ""
  );
  replaced = replaced.replace(/\{\{email\}\}/g, member.email || "");
  replaced = replaced.replace(/\{\{mobile\}\}/g, member.mobile || "");
  replaced = replaced.replace(
    /\{\{company_name\}\}/g,
    member.company_name || ""
  );
  replaced = replaced.replace(/\{\{address\}\}/g, member.address || "");
  replaced = replaced.replace(/\{\{country\}\}/g, member.country || "");

  return replaced;
}

// ============================================================================
// Helper: Refresh Microsoft Access Token
// ============================================================================
async function refreshAccessToken(refreshToken: string) {
  try {
    const tokenUrl =
      "https://login.microsoftonline.com/common/oauth2/v2.0/token";

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
    const expiresAt = new Date(
      Date.now() + data.expires_in * 1000
    ).toISOString();

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
// Helper: Get valid email credentials (Microsoft or SMTP)
// ============================================================================
async function getValidEmailCredentials(campaign: any) {
  try {
    if (!campaign.user_token_id) {
      console.error("Campaign has no user_token_id:", campaign.id);
      return null;
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("user_tokens")
      .select("*")
      .eq("id", campaign.user_token_id)
      .single();

    if (tokenError || !tokenData) {
      console.error("Email account not found:", tokenError);
      return null;
    }

    const provider = tokenData.provider || "microsoft";
    console.log(
      `Using ${provider} account: ${tokenData.email} for campaign: ${campaign.id}`
    );

    // Handle Microsoft OAuth
    if (provider === "microsoft") {
      let { access_token, refresh_token, expires_at, email, name } = tokenData;

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
        type: "microsoft",
        accessToken: access_token,
        accountEmail: email,
        accountName: name || email,
        tokenId: tokenData.id,
      };
    }

    // Handle IMAP/SMTP
    if (provider === "imap") {
      if (
        !tokenData.smtp_host ||
        !tokenData.smtp_username ||
        !tokenData.smtp_password
      ) {
        throw new Error("Incomplete SMTP configuration");
      }

      return {
        type: "smtp",
        smtpConfig: {
          host: tokenData.smtp_host,
          port: tokenData.smtp_port || 587,
          secure: tokenData.smtp_secure !== false,
          username: tokenData.smtp_username,
          password: tokenData.smtp_password,
        },
        accountEmail: tokenData.email,
        accountName: tokenData.name || tokenData.email,
        tokenId: tokenData.id,
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    console.error("Error getting email credentials:", error);
    return null;
  }
}

// ============================================================================
// Helper: Fetch and prepare campaign attachments
// ============================================================================
async function getCampaignAttachments(campaignId: string) {
  try {
    // Fetch attachment metadata from database
    const { data: attachments, error: attachmentsError } = await supabaseAdmin
      .from("campaign_attachments")
      .select("id, file_name, file_size, file_type, storage_path")
      .eq("campaign_id", campaignId)
      .is("deleted_at", null);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
      return [];
    }

    if (!attachments || attachments.length === 0) {
      return [];
    }

    console.log(
      `Found ${attachments.length} attachments for campaign ${campaignId}`
    );

    // Download and process each attachment
    const processedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          // Download file from Supabase storage
          const { data: fileData, error: downloadError } =
            await supabaseAdmin.storage
              .from("campaign-attachments")
              .download(attachment.storage_path);

          if (downloadError) {
            console.error(
              `Error downloading attachment ${attachment.file_name}:`,
              downloadError
            );
            return null;
          }

          // Convert blob to base64
          const arrayBuffer = await fileData.arrayBuffer();
          const base64Content = btoa(
            String.fromCharCode(...new Uint8Array(arrayBuffer))
          );

          return {
            filename: attachment.file_name,
            content: base64Content,
            contentType: attachment.file_type,
            encoding: "base64",
            size: attachment.file_size,
          };
        } catch (error) {
          console.error(
            `Error processing attachment ${attachment.file_name}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out failed attachments
    return processedAttachments.filter((att) => att !== null);
  } catch (error) {
    console.error("Error in getCampaignAttachments:", error);
    return [];
  }
}

// ============================================================================
// Helper: Send email via Microsoft Graph API
// ============================================================================
async function sendEmailViaGraph(
  accessToken: string,
  campaign: any,
  recipient: any,
  member: any,
  attachments: any[] = []
) {
  try {
    const personalizedSubject = replaceMemberVariables(
      campaign.subject,
      member
    );
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
        emailAddress: { address: email },
      }));
    }

    if (campaign.bcc?.length > 0) {
      emailPayload.message.bccRecipients = campaign.bcc.map(
        (email: string) => ({
          emailAddress: { address: email },
        })
      );
    }

    if (attachments.length > 0) {
      emailPayload.message.attachments = attachments.map((att) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.filename,
        contentType: att.contentType,
        contentBytes: att.content,
        size: att.size,
      }));
      console.log(`Added ${attachments.length} attachments to email`);
    }

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      }
    );

    if (response.status === 202) {
      const messageId =
        response.headers.get("x-ms-request-id") || crypto.randomUUID();
      return {
        success: true,
        messageId,
        provider: "microsoft",
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
// Helper: Send email via SMTP (nodemailer)
// ============================================================================
async function sendEmailViaSMTP(
  smtpConfig: any,
  fromEmail: string,
  fromName: string,
  campaign: any,
  recipient: any,
  member: any,
  attachments: any[] = []
) {
  try {
    const personalizedSubject = replaceMemberVariables(
      campaign.subject,
      member
    );
    const personalizedBody = replaceMemberVariables(campaign.body, member);

    // Create transporter
    const transporter = createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    // Prepare email options
    const mailOptions: any = {
      from: `"${fromName}" <${fromEmail}>`,
      to: `"${recipient.recipient_name || recipient.recipient_email}" <${
        recipient.recipient_email
      }>`,
      subject: personalizedSubject,
      html: personalizedBody,
    };

    if (campaign.reply_to) {
      mailOptions.replyTo = campaign.reply_to;
    }

    if (campaign.cc?.length > 0) {
      mailOptions.cc = campaign.cc.join(", ");
    }

    if (campaign.bcc?.length > 0) {
      mailOptions.bcc = campaign.bcc.join(", ");
    }

    if (attachments.length > 0) {
      mailOptions.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: att.encoding,
      }));
      console.log(`Added ${attachments.length} attachments to SMTP email`);
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      provider: "smtp",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown SMTP error",
    };
  }
}

// ============================================================================
// Unified Email Sender
// ============================================================================
async function sendEmail(
  credentials: any,
  campaign: any,
  recipient: any,
  member: any,
  attachments: any[] = []
) {
  if (credentials.type === "microsoft") {
    return await sendEmailViaGraph(
      credentials.accessToken,
      campaign,
      recipient,
      member,
      attachments
    );
  } else if (credentials.type === "smtp") {
    return await sendEmailViaSMTP(
      credentials.smtpConfig,
      credentials.accountEmail,
      credentials.accountName,
      campaign,
      recipient,
      member,
      attachments
    );
  } else {
    return {
      success: false,
      error: "Invalid credentials type",
    };
  }
}

// ============================================================================
// Controlled Concurrency Email Processor
// ============================================================================
async function processCampaignRecipients(campaignId: string) {
  const MAX_CONCURRENT = 2; // Batch size: 2 emails
  const EMAIL_DELAY_MS = 300; // Delay between individual emails in a batch (300ms)
  const BATCH_DELAY_MS = 1000; // Delay between batches (1 second)

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

    console.log("Campaign: ", campaign);

    if (campaignError || !campaign)
      throw new Error(`Campaign not found: ${campaignId}`);

    console.log(`Processing campaign: ${campaign.id} - "${campaign.subject}"`);

    const credentials = await getValidEmailCredentials(campaign);
    if (!credentials)
      throw new Error(`No valid email credentials for campaign: ${campaignId}`);

    console.log(`Using ${credentials.type} provider for sending`);

    // Fetch campaign attachments
    const attachments = await getCampaignAttachments(campaignId);
    if (attachments.length > 0) {
      console.log(`Campaign has ${attachments.length} attachments`);
    }

    // Fetch recipients
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "failed"])
      .order("created_at", {
        ascending: true,
      });

    console.log("Recipients: ", recipients);

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
      .select(
        "id, first_name, last_name, full_name, email, mobile, company_name, address, country"
      )
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

    const sendToRecipient = async (recipient: any) => {
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
        credentials,
        campaign,
        recipient,
        member,
        attachments
      );

      if (result.success) {
        succeeded++;
        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            message_id: result.messageId,
            provider_name: result.provider || credentials.type,
          })
          .eq("id", recipient.id);

        await supabaseAdmin.from("campaign_events").insert({
          campaign_id: campaignId,
          recipient_id: recipient.id,
          event_type: "sent",
          event_data: {
            message_id: result.messageId,
            provider: result.provider,
          },
        });

        console.log(
          `✓ Sent to ${recipient.recipient_email} via ${result.provider}`
        );
      } else {
        failed++;
        const retryCount = recipient.retry_count + 1;
        const shouldRetry = retryCount < recipient.max_retries;
        const retryDelayMinutes = Math.min(5 * Math.pow(2, retryCount), 30);
        const nextRetryAt = shouldRetry
          ? new Date(Date.now() + retryDelayMinutes * 60 * 1000).toISOString()
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
    };

    // Controlled concurrency batching with staggered delays
    console.log(
      `Processing ${recipients.length} recipients in batches of ${MAX_CONCURRENT}`
    );
    for (let i = 0; i < recipients.length; i += MAX_CONCURRENT) {
      const batch = recipients.slice(i, i + MAX_CONCURRENT);
      const batchNumber = Math.floor(i / MAX_CONCURRENT) + 1;
      const totalBatches = Math.ceil(recipients.length / MAX_CONCURRENT);

      console.log(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)...`
      );

      // Send emails in the batch with staggered delays
      for (let j = 0; j < batch.length; j++) {
        // Add delay between emails in the same batch (except first)
        if (j > 0) {
          console.log(
            `  Waiting ${EMAIL_DELAY_MS}ms before next email in batch...`
          );
          await new Promise((r) => setTimeout(r, EMAIL_DELAY_MS));
        }

        await sendToRecipient(batch[j]);
      }

      // Add delay between batches (only if there are more batches coming)
      if (i + MAX_CONCURRENT < recipients.length) {
        console.log(
          `Batch ${batchNumber} completed. Waiting ${BATCH_DELAY_MS}ms before next batch...`
        );
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Finalize campaign if done
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sent",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    console.log("Campaign completed successfully");
    console.log(
      `Summary: Processed=${processed}, Succeeded=${succeeded}, Failed=${failed}, Skipped=${skipped}`
    );

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
  (EdgeRuntime as any).waitUntil(
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
