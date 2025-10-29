'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Template } from './data/schema';

interface TemplatePreviewDialogProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplatePreviewDialog({ template, isOpen, onClose }: TemplatePreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            {template.description || 'Template preview'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto border rounded-md bg-white">
          <iframe
            srcDoc={template.html_content}
            title="Template Preview"
            sandbox="allow-same-origin"
            className="w-full h-full min-h-[500px]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

