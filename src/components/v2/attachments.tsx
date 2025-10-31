"use client";

import * as React from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Attachment } from "@/types/attachment";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total

interface AttachmentsProps {
  attachments: Attachment[];
  onAdd: (attachment: Attachment) => void;
}

export function Attachments({ attachments, onAdd }: AttachmentsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);

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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
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
    </div>
  );
}

