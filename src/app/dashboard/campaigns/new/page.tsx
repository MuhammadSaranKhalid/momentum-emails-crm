'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreate, useCreateMany, useList, useGetIdentity, CrudFilter } from "@refinedev/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSelector, useDispatch } from "react-redux";
import { supabaseBrowserClient } from "@/utils/supabase/client";
import { Save, Send, Pencil, Check, X } from "lucide-react";

import { Editor } from "@/components/v2/editor";
import { RecipientsSidebar } from "@/components/v2/recipients-sidebar";
import { SendConfirmationDialog } from "@/components/v2/send-confirmation-dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DashboardHeader } from "@/components/dashboard-header";
import { selectCampaignData, selectCampaignName, selectSelectedMemberIds, setCampaignName } from "@/store/features/campaigns/campaignSlice";
import { Member } from "@/app/dashboard/members/data/schema";
import { RootState } from "@/store";
import { uploadCampaignAttachments } from "@/utils/attachments";
import type { Attachment } from "@/types/attachment";

// Campaign form schema
const campaignFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  cc: z.array(z.string().email()),
  bcc: z.array(z.string().email()),
  reply_to: z.string().email().optional(),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

// Filter types
interface FilterState {
  country: string[];
  type: string[];
  shipment: string[];
}

export default function NewCampaignPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Filter and search state for database-level filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    country: [],
    type: [],
    shipment: [],
  });
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  // Get authenticated user identity using Refine
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  // Fetch distinct countries from database using RPC
  useEffect(() => {
    const fetchDistinctCountries = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabaseBrowserClient
          .rpc('get_distinct_countries', { p_user_id: userId });

        if (error) {
          console.error('Error fetching countries:', error);
          return;
        }

        // Extract country values from the result
        const countries = data?.map((item: { country: string }) => item.country) || [];
        setAvailableCountries(countries);
      } catch (error) {
        console.error('Error fetching distinct countries:', error);
      }
    };

    fetchDistinctCountries();
  }, [userId]);

  // Get campaign data from Redux
  const campaignData = useSelector(selectCampaignData);
  const campaignName = useSelector(selectCampaignName);
  const selectedMemberIds = useSelector(selectSelectedMemberIds);
  
  // Get selected Microsoft account from Redux
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

  // Attachment handlers
  const handleAddAttachment = (attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  // Campaign name editing handlers
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleEditClick = () => {
    setTempName(campaignName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      dispatch(setCampaignName(tempName.trim()));
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setTempName(campaignName);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Build database filters
  const dbFilters: CrudFilter[] = [];
  
  // Search filter
  if (searchQuery.trim()) {
    const searchText = searchQuery.toLowerCase();
    dbFilters.push({
      operator: "or",
      value: [
        { field: "full_name", operator: "contains", value: searchText },
        { field: "email", operator: "contains", value: searchText },
        { field: "company_name", operator: "contains", value: searchText },
      ],
    });
  }

  // Country filter
  if (filters.country.length > 0) {
    dbFilters.push({
      field: "country",
      operator: "in",
      value: filters.country,
    });
  }

  // Import/Export filter
  if (filters.type.length > 0) {
    dbFilters.push({
      field: "import_export",
      operator: "in",
      value: filters.type,
    });
  }

  // Mode of shipment filter
  if (filters.shipment.length > 0) {
    dbFilters.push({
      field: "mode_of_shipment",
      operator: "in",
      value: filters.shipment,
    });
  }

  // Fetch members with database-level filtering
  const { result: membersData, query: membersQuery } = useList<Member>({
    resource: "members",
    pagination: {
      mode: "off",
    },
    filters: dbFilters,
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

    // Validate form using react-hook-form
    const isValid = await form.trigger(['subject', 'body']);
    
    if (!isValid) {
      const errors = form.formState.errors;
      
      if (errors.subject) {
        toast.error(errors.subject.message || "Subject is required");
        return;
      }
      if (errors.body) {
        toast.error(errors.body.message || "Email body is required");
        return;
      }
      
      return;
    }

    if (selectedMemberIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    const values = form.getValues();
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
        onSuccess: async (data) => {
          const campaignId = data.data.id;

          if (!campaignId) {
            setIsSaving(false);
            toast.error("Failed to get campaign ID");
            return;
          }

          try {
            // Upload attachments if any
            if (attachments.length > 0) {
              await uploadCampaignAttachments(campaignId as string, attachments);
            }

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
          } catch (error) {
            setIsSaving(false);
            console.error("Error uploading attachments:", error);
            toast.error("Campaign saved but failed to upload attachments");
          }
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

    // Validate form using react-hook-form
    const isValid = await form.trigger();
    
    if (!isValid) {
      const errors = form.formState.errors;
      
      // Show specific validation errors
      if (errors.subject) {
        toast.error(errors.subject.message || "Subject is required");
        return;
      }
      if (errors.body) {
        toast.error(errors.body.message || "Email body is required");
        return;
      }
      if (errors.cc) {
        toast.error("Invalid CC email addresses");
        return;
      }
      if (errors.bcc) {
        toast.error("Invalid BCC email addresses");
        return;
      }
      if (errors.reply_to) {
        toast.error("Invalid reply-to email address");
        return;
      }
      
      toast.error("Please fix the form errors before sending");
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
        onSuccess: async (data) => {
          const campaignId = data.data.id;

          if (!campaignId) {
            setIsSending(false);
            toast.error("Failed to get campaign ID");
            return;
          }

          try {
            // Upload attachments if any
            if (attachments.length > 0) {
              await uploadCampaignAttachments(campaignId as string, attachments);
            }

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
          } catch (error) {
            setIsSending(false);
            console.error("Error uploading attachments:", error);
            toast.error("Campaign created but failed to upload attachments");
          }
        },
        onError: (error) => {
          setIsSending(false);
          console.error("Error sending campaign:", error);
          toast.error("Failed to send campaign");
        },
      }
    );
  };

  // Custom breadcrumb with editable campaign name
  const campaignNameBreadcrumb = (
    <div className="flex items-center gap-2">
      {isEditingName ? (
        <>
          <Input
            ref={inputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter campaign name..."
            className="h-8 max-w-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSaveName}
            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-600/10"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancelEdit}
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="font-medium">{campaignName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <>
      <DashboardHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Campaigns', href: '/dashboard/campaigns' },
          { label: campaignNameBreadcrumb }
        ]}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || isSending}
            >
              {isSaving ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button 
              type="button"
              onClick={handleSendCampaign}
              disabled={isSaving || isSending}
            >
              {isSending ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSending ? "Sending..." : "Send Campaign"}
            </Button>
          </>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Form {...form}>
          <form className="flex flex-1 min-h-0">
            {/* Scrollable Content Area - Editor and Recipients */}
            <Editor 
              form={form}
              attachments={attachments}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
            />
            <RecipientsSidebar 
              members={members} 
              isLoading={isMembersLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onFiltersChange={setFilters}
              availableCountries={availableCountries}
            />
          </form>
        </Form>
      </div>

      <SendConfirmationDialog
        open={showSendConfirmation}
        onOpenChange={setShowSendConfirmation}
        onConfirm={executeSendCampaign}
        campaignName={campaignName}
        subject={form.watch("subject")}
        recipientCount={selectedMemberIds.length}
        attachmentCount={attachments.length}
        isLoading={isSending}
      />
    </>
  );
}


