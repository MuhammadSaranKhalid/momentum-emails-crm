'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOne, useUpdate } from '@refinedev/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { updateTemplateSchema, UpdateTemplateInput, Template, categoryOptions } from '../../data/schema';

const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] border rounded-md bg-muted">
      <Spinner className="h-8 w-8" />
    </div>
  ),
});

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const { result: templateData, query: { isLoading: isLoadingTemplate } } = useOne<Template>({
    resource: 'templates',
    id: templateId,
  });

  const { mutate: updateTemplate, mutation: { isPending: isSaving } } = useUpdate();

  const form = useForm<UpdateTemplateInput>({
    resolver: zodResolver(updateTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      subject: '',
      html_content: '',
      is_favorite: false,
    },
  });

  // Load template data into form
  useEffect(() => {
    if (templateData) {
      form.reset({
        name: templateData.name,
        description: templateData.description || '',
        subject: templateData.subject,
        html_content: templateData.html_content,
        category: templateData.category,
        is_favorite: templateData.is_favorite,
      });
    }
  }, [templateData, form]);

  const handleSave = (values: UpdateTemplateInput) => {
    const cleanedValues = {
      ...values,
      description: values.description?.trim() || null,
      category: values.category || null,
    };

    updateTemplate(
      {
        resource: 'templates',
        id: templateId,
        values: cleanedValues,
      },
      {
        onSuccess: () => {
          toast.success('Template updated successfully');
          router.push('/dashboard/templates');
        },
        onError: (error) => {
          console.error('Error updating template:', error);
          toast.error(error?.message || 'Failed to update template');
        },
      }
    );
  };

  if (isLoadingTemplate) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!templateData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold">Template not found</h2>
        <Button className="mt-4" onClick={() => router.push('/dashboard/templates')}>
          Back to Templates
        </Button>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">Edit Template</h1>
            <p className="text-sm text-muted-foreground">
              {templateData.name}
            </p>
          </div>
        </div>
        <Button
          onClick={form.handleSubmit(handleSave)}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <Form {...form}>
            <form className="space-y-6">
              {/* Template Details */}
              <div className="space-y-4 rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold">Template Details</h2>
                
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-4 rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold">Email Content</h2>
                
                <FormField
                  control={form.control}
                  name="html_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content *</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Write your email content here..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}

