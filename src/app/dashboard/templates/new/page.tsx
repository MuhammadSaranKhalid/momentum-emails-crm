'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreate, useGetIdentity } from '@refinedev/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { categoryOptions } from '../data/schema';
import { z } from 'zod';

// Form schema for the dialog (without html_content which is managed separately)
const templateDetailsSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional().or(z.literal('')),
  subject: z.string().min(1, "Subject is required"),
  category: z.enum(["Newsletter", "Marketing", "Transactional", "Announcement", "Other"]).optional(),
});

type TemplateDetailsInput = z.infer<typeof templateDetailsSchema>;

const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] border rounded-md bg-muted">
      <Spinner className="h-8 w-8" />
    </div>
  ),
});

export default function NewTemplatePage() {
  const router = useRouter();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { mutate: createTemplate, mutation: { isPending: isSaving } } = useCreate();
  const [htmlContent, setHtmlContent] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const form = useForm<TemplateDetailsInput>({
    resolver: zodResolver(templateDetailsSchema),
    defaultValues: {
      name: '',
      description: '',
      subject: '',
    },
  });

  const handleOpenSaveDialog = () => {
    if (!htmlContent.trim()) {
      toast.error('Please add some content to your template');
      return;
    }
    setShowSaveDialog(true);
  };

  const handleSave = (values: TemplateDetailsInput) => {
    if (!identity?.id) {
      toast.error('User not authenticated');
      return;
    }

    const cleanedValues = {
      name: values.name,
      description: values.description?.trim() || null,
      subject: values.subject,
      html_content: htmlContent,
      category: values.category || null,
      is_favorite: false,
      user_id: identity.id,
    };

    createTemplate(
      {
        resource: 'templates',
        values: cleanedValues,
      },
      {
        onSuccess: () => {
          toast.success('Template created successfully');
          setShowSaveDialog(false);
          router.push('/dashboard/templates');
        },
        onError: (error) => {
          console.error('Error creating template:', error);
          toast.error(error?.message || 'Failed to create template');
        },
      }
    );
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Template</h1>
            <p className="text-sm text-muted-foreground">
              Design a reusable email template
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenSaveDialog}
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Template
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        <div className="h-full rounded-lg border bg-card">
          <RichTextEditor
            value={htmlContent}
            onChange={setHtmlContent}
            placeholder="Design your email template here..."
          />
        </div>
      </main>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>
              Fill in the template details to save your email template.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Welcome Email, Monthly Newsletter"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this template's purpose"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Email subject line"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    'Save Template'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

