"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Mail, Users } from "lucide-react";

interface SendConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  campaignName: string;
  subject: string;
  recipientCount: number;
  isLoading?: boolean;
}

export function SendConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  campaignName,
  subject,
  recipientCount,
  isLoading = false,
}: SendConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    // Dialog will close automatically via onOpenChange when status changes
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
            </div>
            <AlertDialogTitle>Confirm Send Campaign</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-4 pt-4">
            <p>
              You are about to send this email campaign. Please review the details below:
            </p>

            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Campaign Name
                  </p>
                  <p className="text-sm font-semibold text-foreground wrap-break-word">
                    {campaignName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Subject
                  </p>
                  <p className="text-sm font-semibold text-foreground wrap-break-word">
                    {subject}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Recipients
                  </p>
                  <Badge variant="secondary" className="font-semibold">
                    {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/10 p-3">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-500 mt-0.5 shrink-0" />
              <div className="text-xs text-orange-800 dark:text-orange-300">
                <p className="font-semibold mb-1">Warning</p>
                <p>
                  This action cannot be undone. The campaign will be sent immediately to all selected recipients.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? "Sending..." : "Send Campaign"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

