'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDelete, useUpdate } from '@refinedev/core';
import { MoreHorizontal, Copy, Eye, Edit, Trash2, Star } from 'lucide-react';
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
import type { Template } from './data/schema';
import { TemplatePreviewDialog } from './template-preview-dialog';

interface TemplateActionsProps {
  template: Template;
}

export function TemplateActions({ template }: TemplateActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  const { mutate: deleteTemplate, mutation: { isPending: isDeleting } } = useDelete();
  const { mutate: updateTemplate } = useUpdate();

  const handleCopyId = () => {
    navigator.clipboard.writeText(template.id);
    toast.success('Template ID copied to clipboard');
  };

  const handleToggleFavorite = () => {
    updateTemplate(
      {
        resource: 'templates',
        id: template.id,
        values: { is_favorite: !template.is_favorite },
      },
      {
        onSuccess: () => {
          toast.success(template.is_favorite ? 'Removed from favorites' : 'Added to favorites');
        },
        onError: () => {
          toast.error('Failed to update template');
        },
      }
    );
  };

  const handleDelete = () => {
    deleteTemplate(
      {
        resource: 'templates',
        id: template.id,
      },
      {
        onSuccess: () => {
          toast.success('Template deleted successfully');
          setShowDeleteDialog(false);
        },
        onError: (error) => {
          toast.error(error?.message || 'Failed to delete template');
          setShowDeleteDialog(false);
        },
      }
    );
  };

  const handleEdit = () => {
    router.push(`/v2/dashboard/templates/${template.id}/edit`);
  };

  const handlePreview = () => {
    setShowPreviewDialog(true);
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
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleFavorite}>
            <Star className={`mr-2 h-4 w-4 ${template.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            {template.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template
              &quot;{template.name}&quot;.
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

      <TemplatePreviewDialog
        template={template}
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
      />
    </>
  );
}

