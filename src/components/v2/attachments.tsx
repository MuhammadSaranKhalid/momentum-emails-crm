"use client";

import * as React from "react";
import { Paperclip, X, File } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Attachment } from "@/types/attachment";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

interface AttachmentsProps {
  attachments: Attachment[];
  onAdd: (attachment: Attachment) => void;
  onRemove: (id: string) => void;
}

export function Attachments({ attachments, onAdd, onRemove }: AttachmentsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum file size is 25MB.`);
        return;
      }

      // Check total size
      const newTotalSize = totalSize + file.size;
      if (newTotalSize > MAX_TOTAL_SIZE) {
        toast.error(`Total attachment size would exceed 25MB limit.`);
        return;
      }

      // Check if file already exists
      if (attachments.some(att => att.name === file.name && att.size === file.size)) {
        toast.error(`${file.name} is already attached.`);
        return;
      }

      // Add attachment
      const attachment: Attachment = {
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      };

      onAdd(attachment);
      toast.success(`${file.name} attached successfully`);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (id: string) => {
    const attachment = attachments.find(att => att.id === id);
    onRemove(id);
    if (attachment) {
      toast.info(`${attachment.name} removed`);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Attach button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          multiple
          accept="*/*"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleButtonClick}
          className="gap-2"
        >
          <Paperclip className="h-4 w-4" />
          Attach Files
        </Button>
        {attachments.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {attachments.length} file{attachments.length > 1 ? 's' : ''} ({formatFileSize(totalSize)} / 25MB)
          </span>
        )}
      </div>

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-3 py-2 text-sm"
            >
              <File className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-text-light dark:text-text-dark font-medium">
                  {attachment.name}
                </span>
                <span className="text-xs text-subtext-light dark:text-subtext-dark">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(attachment.id)}
                className="ml-2 p-0.5 rounded-full hover:bg-neutral-light/50 dark:hover:bg-neutral-dark/50 text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

