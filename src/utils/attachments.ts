import { supabaseBrowserClient } from "@/utils/supabase/client";
import type { Attachment } from "@/types/attachment";

const STORAGE_BUCKET = "campaign-attachments";

export interface UploadedAttachment {
  id: string;
  campaign_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
}

/**
 * Uploads campaign attachments to Supabase storage and creates database records
 * @param campaignId - The ID of the campaign
 * @param attachments - Array of attachments to upload
 * @returns Array of uploaded attachment records
 */
export async function uploadCampaignAttachments(
  campaignId: string,
  attachments: Attachment[]
): Promise<UploadedAttachment[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const uploadedAttachments: UploadedAttachment[] = [];

  for (const attachment of attachments) {
    try {
      // Generate unique file path: campaignId/timestamp-filename
      const timestamp = Date.now();
      const sanitizedFileName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${campaignId}/${timestamp}-${sanitizedFileName}`;

      // Upload file to storage
      const { data: storageData, error: storageError } = await supabaseBrowserClient
        .storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, attachment.file, {
          contentType: attachment.type,
          upsert: false,
        });

      if (storageError) {
        console.error(`Error uploading ${attachment.name}:`, storageError);
        throw new Error(`Failed to upload ${attachment.name}: ${storageError.message}`);
      }

      // Create database record
      const { data: dbData, error: dbError } = await supabaseBrowserClient
        .from('campaign_attachments')
        .insert({
          campaign_id: campaignId,
          file_name: attachment.name,
          file_size: attachment.size,
          file_type: attachment.type,
          storage_path: storageData.path,
        })
        .select()
        .single();

      if (dbError) {
        // If database insert fails, try to clean up the uploaded file
        await supabaseBrowserClient
          .storage
          .from(STORAGE_BUCKET)
          .remove([storageData.path]);
        
        console.error(`Error creating database record for ${attachment.name}:`, dbError);
        throw new Error(`Failed to save attachment metadata: ${dbError.message}`);
      }

      uploadedAttachments.push(dbData);
    } catch (error) {
      console.error(`Error processing attachment ${attachment.name}:`, error);
      throw error;
    }
  }

  return uploadedAttachments;
}

/**
 * Gets the public URL for an attachment
 * @param storagePath - The storage path of the attachment
 * @returns The public URL of the attachment
 */
export function getAttachmentUrl(storagePath: string): string {
  const { data } = supabaseBrowserClient
    .storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Downloads an attachment
 * @param storagePath - The storage path of the attachment
 * @returns The file blob
 */
export async function downloadAttachment(storagePath: string): Promise<Blob> {
  const { data, error } = await supabaseBrowserClient
    .storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download attachment: ${error.message}`);
  }

  return data;
}

/**
 * Deletes an attachment from storage and database
 * @param attachmentId - The ID of the attachment
 * @param storagePath - The storage path of the attachment
 */
export async function deleteAttachment(
  attachmentId: string,
  storagePath: string
): Promise<void> {
  // Delete from storage
  const { error: storageError } = await supabaseBrowserClient
    .storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    console.error('Error deleting from storage:', storageError);
    // Continue with database deletion even if storage deletion fails
  }

  // Soft delete from database
  const { error: dbError } = await supabaseBrowserClient
    .from('campaign_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attachmentId);

  if (dbError) {
    throw new Error(`Failed to delete attachment metadata: ${dbError.message}`);
  }
}

/**
 * Gets all attachments for a campaign
 * @param campaignId - The ID of the campaign
 * @returns Array of attachments
 */
export async function getCampaignAttachments(
  campaignId: string
): Promise<UploadedAttachment[]> {
  const { data, error } = await supabaseBrowserClient
    .from('campaign_attachments')
    .select('*')
    .eq('campaign_id', campaignId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch attachments: ${error.message}`);
  }

  return data || [];
}

