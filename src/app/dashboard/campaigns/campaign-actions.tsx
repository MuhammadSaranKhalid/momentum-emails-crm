'use client';

import { useState } from 'react';
import { useDelete } from '@refinedev/core';
import { MoreHorizontal, Copy, Send, Eye, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Campaign } from './columns';

interface CampaignActionsProps {
  campaign: Campaign;
}

export function CampaignActions({ campaign }: CampaignActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { mutate: deleteCampaign, isLoading: isDeleting } = useDelete();

  const handleCopyId = () => {
    navigator.clipboard.writeText(campaign.id);
    toast.success('Campaign ID copied to clipboard');
  };

  const handleDelete = () => {
    deleteCampaign(
      {
        resource: 'email_campaigns',
        id: campaign.id,
      },
      {
        onSuccess: () => {
          toast.success('Campaign deleted successfully');
          setShowDeleteDialog(false);
        },
        onError: (error) => {
          console.error('Error deleting campaign:', error);
          toast.error('Failed to delete campaign');
        },
      }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCopyId}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy campaign ID</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/v2/dashboard/campaigns/${campaign.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              <span>View details</span>
            </Link>
          </DropdownMenuItem>
          {campaign.status === 'draft' && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/v2/dashboard/campaigns/${campaign.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit campaign</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/v2/dashboard/campaigns/${campaign.id}/send`}>
                  <Send className="mr-2 h-4 w-4" />
                  <span>Send now</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete campaign</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign
              &quot;{campaign.name}&quot; and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

