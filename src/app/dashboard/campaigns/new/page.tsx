'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreate, useCreateMany, useList, useGetIdentity } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSelector, useDispatch } from "react-redux";

import { Editor } from "@/components/v2/editor";
import { Header } from "@/components/v2/header";
import { RecipientsSidebar } from "@/components/v2/recipients-sidebar";
import { SendConfirmationDialog } from "@/components/v2/send-confirmation-dialog";
import { Form } from "@/components/ui/form";
import { selectCampaignData, selectCampaignName, selectSelectedMemberIds, setCampaignName } from "@/store/features/campaigns/campaignSlice";
import { Member } from "@/app/dashboard/members/data/schema";
import { RootState } from "@/store";

// Campaign form schema
const campaignFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  cc: z.array(z.string().email()),
  bcc: z.array(z.string().email()),
  reply_to: z.string().email().optional(),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  // Get authenticated user identity using Refine
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  // Get campaign data from Redux
  const campaignData = useSelector(selectCampaignData);
  const campaignName = useSelector(selectCampaignName);
  const selectedMemberIds = useSelector(selectSelectedMemberIds);
  
  // Get selected Microsoft account from Redux
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

  // Handler for campaign name change
  const handleCampaignNameChange = (name: string) => {
    dispatch(setCampaignName(name));
  };

  // Fetch all members to get email addresses
  const { result: membersData, query: membersQuery } = useList<Member>({
    resource: "members",
    pagination: {
      mode: "off",
    },
  });

  const members = membersData?.data || [];
  const isMembersLoading = membersQuery.isLoading;

  // Initialize form with react-hook-form
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      subject: campaignData.subject,
      body: campaignData.body,
      cc: campaignData.cc,
      bcc: campaignData.bcc,
      reply_to: campaignData.reply_to,
    },
    mode: "onChange",
  });

  // Refine hooks for creating campaign and recipients
  const { mutate: createCampaign } = useCreate();
  const { mutate: createManyRecipients } = useCreateMany();

  // Save as draft
  const handleSaveDraft = async () => {
    if (!userId) {
      toast.error("User not authenticated. Please log in.");
      return;
    }

    if (!selectedAccount?.id) {
      toast.error("Please select a Microsoft account first");
      return;
    }

    // Wait for members to finish loading
    if (isMembersLoading) {
      toast.error("Please wait for members to load");
      return;
    }

    const values = form.getValues();
    
    if (!values.subject || !values.body) {
      toast.error("Subject and body are required");
      return;
    }

    if (selectedMemberIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setIsSaving(true);

    // Create campaign
    createCampaign(
      {
        resource: "email_campaigns",
        values: {
          name: campaignName,
          subject: values.subject,
          body: values.body,
          cc: values.cc,
          bcc: values.bcc,
          reply_to: values.reply_to,
          status: "draft",
          total_recipients: selectedMemberIds.length,
          user_id: userId,
          user_token_id: selectedAccount.id,
        },
      },
      {
        onSuccess: (data) => {
          const campaignId = data.data.id;

          // Create recipients with email and name, filter out invalid ones
          const recipientsData = selectedMemberIds
            .map((memberId) => {
              const member = members.find((m: Member) => m.id === memberId);
              if (!member || !member.email) {
                console.warn(`Skipping member ${memberId} - no email found`);
                return null;
              }
              return {
                campaign_id: campaignId,
                member_id: memberId,
                recipient_email: member.email,
                recipient_name: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || '',
                status: "pending",
              };
            })
            .filter((recipient): recipient is NonNullable<typeof recipient> => recipient !== null);

          // Batch insert all recipients at once
          createManyRecipients(
            {
              resource: "campaign_recipients",
              values: recipientsData,
            },
            {
              onSuccess: () => {
                setIsSaving(false);
                toast.success("Campaign saved as draft");
                router.push("/dashboard/campaigns");
              },
              onError: (error) => {
                setIsSaving(false);
                console.error("Error creating recipients:", error);
                toast.error("Campaign saved but failed to add recipients");
              },
            }
          );
        },
        onError: (error) => {
          setIsSaving(false);
          console.error("Error saving campaign:", error);
          toast.error("Failed to save campaign");
        },
      }
    );
  };

  // Validate and show confirmation dialog before sending
  const handleSendCampaign = async () => {
    if (!userId) {
      toast.error("User not authenticated. Please log in.");
      return;
    }

    if (!selectedAccount?.id) {
      toast.error("Please select a Microsoft account first");
      return;
    }

    // Wait for members to finish loading
    if (isMembersLoading) {
      toast.error("Please wait for members to load");
      return;
    }

    const values = form.getValues();

    if (!values.subject || !values.body) {
      toast.error("Subject and body are required");
      return;
    }

    if (selectedMemberIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    // Show confirmation dialog
    setShowSendConfirmation(true);
  };

  // Execute the actual send after confirmation
  const executeSendCampaign = async () => {
    if (!userId || !selectedAccount?.id) {
      return;
    }

    const values = form.getValues();

    setIsSending(true);

    // Create campaign with 'queued' status
    createCampaign(
      {
        resource: "email_campaigns",
        values: {
          name: campaignName,
          subject: values.subject,
          body: values.body,
          cc: values.cc,
          bcc: values.bcc,
          reply_to: values.reply_to,
          status: "queued",
          started_at: new Date().toISOString(),
          total_recipients: selectedMemberIds.length,
          user_id: userId,
          user_token_id: selectedAccount.id,
        },
      },
      {
        onSuccess: (data) => {
          const campaignId = data.data.id;

          // Create recipients with email and name, filter out invalid ones
          const recipientsData = selectedMemberIds
            .map((memberId) => {
              const member = members.find((m: Member) => m.id === memberId);
              if (!member || !member.email) {
                console.warn(`Skipping member ${memberId} - no email found`);
                return null;
              }
              return {
                campaign_id: campaignId,
                member_id: memberId,
                recipient_email: member.email,
                recipient_name: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || '',
                status: "pending",
              };
            })
            .filter((recipient): recipient is NonNullable<typeof recipient> => recipient !== null);

          // Batch insert all recipients at once
          createManyRecipients(
            {
              resource: "campaign_recipients",
              values: recipientsData,
            },
            {
              onSuccess: () => {
                setIsSending(false);
                toast.success("Campaign is being sent!");
                router.push("/dashboard/campaigns");
              },
              onError: (error) => {
                setIsSending(false);
                console.error("Error creating recipients:", error);
                toast.error("Campaign created but failed to add recipients");
              },
            }
          );
        },
        onError: (error) => {
          setIsSending(false);
          console.error("Error sending campaign:", error);
          toast.error("Failed to send campaign");
        },
      }
    );
  };

  // Handle preview
  const handlePreview = () => {
    const values = form.getValues();
    if (!values.subject || !values.body) {
      toast.error("Subject and body are required for preview");
      return;
    }
    // TODO: Implement preview modal
    toast.info("Preview feature coming soon");
  };

  return (
    <div className="flex flex-col h-full">
      <Form {...form}>
        <form className="flex flex-col h-full">
          {/* Fixed Header - stays at top */}
          <div className="shrink-0">
            <Header 
              campaignName={campaignName}
              onCampaignNameChange={handleCampaignNameChange}
              onPreview={handlePreview}
              onSaveDraft={handleSaveDraft}
              onSendCampaign={handleSendCampaign}
              isSaving={isSaving}
              isSending={isSending}
            />
          </div>

          {/* Scrollable Content Area - Editor and Recipients */}
          <main className="flex flex-1 min-h-0">
            <Editor form={form} />
            <RecipientsSidebar members={members} isLoading={isMembersLoading} />
          </main>
        </form>
      </Form>

      <SendConfirmationDialog
        open={showSendConfirmation}
        onOpenChange={setShowSendConfirmation}
        onConfirm={executeSendCampaign}
        campaignName={campaignName}
        subject={form.watch("subject")}
        recipientCount={selectedMemberIds.length}
        isLoading={isSending}
      />
    </div>
  );
}


