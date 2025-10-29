'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SelectTemplate } from './select-template';
import { Template } from '@/app/dashboard/templates/schema';

interface SelectTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: { subject: string; body: string }) => void;
}

export function SelectTemplateDialog({ open, onOpenChange, onSelect }: SelectTemplateDialogProps) {
  const handleSelectAndClose = (template: { subject: string; body: string }) => {
    onSelect(template);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Browse Email Templates</DialogTitle>
          <DialogDescription>
            Select a pre-designed template or close this window to start from scratch.
          </DialogDescription>
        </DialogHeader>
        <SelectTemplate onSelect={handleSelectAndClose} onSkip={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
