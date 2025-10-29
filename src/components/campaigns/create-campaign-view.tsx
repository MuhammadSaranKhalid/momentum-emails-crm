'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { campaignSchema } from '@/app/dashboard/campaigns/new/schema';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useTransition, useMemo, useRef } from 'react';
import { SelectTemplateDialog } from './select-template-dialog';
import { useList } from '@refinedev/core';
import { Member } from '@/app/dashboard/members/data/schema';
import { Spinner } from '../ui/spinner';
import { UserList } from './user-list';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createCampaign } from '@/app/dashboard/campaigns/actions';
import { TagsInput } from '@/components/ui/tags-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Upload, File as FileIcon, ArrowLeft, Send, Mail } from "lucide-react";
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/ui/rich-text-editor'), { ssr: false });

const inter = Inter({ subsets: ['latin'] });

export function CreateCampaignView() {
  const router = useRouter();
  const [isTemplateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { result: membersData, query: {isLoading} } = useList<Member>({
    resource: 'members',
    pagination: { mode: 'off' },
    sorters: [{ field: "created_at", order: "desc" }],
  });

  const allMembers = membersData?.data || [];

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return allMembers;
    return allMembers.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allMembers, searchTerm]);

  const form = useForm<z.infer<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      subject: '',
      body: '',
      cc: [],
      bcc: [],
      attachments: null,
    },
  });

  const attachments = form.watch('attachments');

  const handleSelectTemplate = (template: { subject: string; body: string }) => {
    form.setValue('subject', template.subject);
    form.setValue('body', template.body);
  }

  const handleSelectionChange = (user: Member) => {
    setSelectedMembers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedMembers(filteredMembers);
    } else {
      setSelectedMembers([]);
    }
  };

  const isAllFilteredSelected = filteredMembers.length > 0 && filteredMembers.every(fm => selectedMembers.some(sm => sm.id === fm.id));

  async function onSubmit(data: z.infer<typeof campaignSchema>) {
    const memberIds = selectedMembers.map(m => m.id);
    const attachments = data.attachments ? Array.from(data.attachments) : [];
    
    startTransition(async () => {
        const result = await createCampaign(data, memberIds, attachments);
        if (result && result.error) {
            toast.error(result.error);
        } else {
            toast.success("Campaign created successfully!");
            router.push('/dashboard/campaigns');
        }
    });
  }

  return (
    <div className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
         <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-10">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Campaign</h1>
                    <p className="text-muted-foreground">Configure and launch your next email campaign.</p>
                </div>
            </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Mail className="h-6 w-6 text-primary" />
                            <div>
                                <CardTitle>Email Content</CardTitle>
                                <CardDescription>Compose the main content of your email campaign.</CardDescription>
                            </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
                            Browse Templates
                        </Button>
                    </div>
                </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer Sale Announcement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Controller
                    control={form.control}
                    name="cc"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>CC</FormLabel>
                        <FormControl>
                            <TagsInput {...field} placeholder="Add CC emails..." />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Controller
                    control={form.control}
                    name="bcc"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>BCC</FormLabel>
                        <FormControl>
                            <TagsInput {...field} placeholder="Add BCC emails..." />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem >
                      <FormLabel>Body</FormLabel>
                      <FormControl>
                        <RichTextEditor 
                            {...field}
                            setContents={field.value}
                            onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field: { onChange, onBlur, name } }) => (
                    <FormItem>
                      <FormLabel>Attachments</FormLabel>
                      <FormControl>
                        <div>
                          <Input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => onChange(e.target.files)}
                            onBlur={onBlur}
                            name={name}
                            ref={fileInputRef}
                          />
                          {(!attachments || attachments.length === 0) ? (
                            <div className="relative w-full h-52 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors bg-muted/20" onClick={() => fileInputRef.current?.click()}>
                                <div className="p-4 rounded-full bg-background mb-4 shadow-sm">
                                    <Upload className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <p className="mt-2 text-lg font-semibold text-muted-foreground">Drag & drop files here</p>
                                <p className="text-sm text-muted-foreground/80 mt-1">or <span className="text-primary font-medium">click to browse</span></p>
                                <p className="text-xs text-muted-foreground/60 mt-4">Max file size: 10MB</p>
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold">Selected Files:</h3>
                                    <Button variant="outline" size="sm" onClick={() => form.setValue('attachments', null)}>Clear</Button>
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {Array.from(attachments).map((file, i) => (
                                        <li key={i} className="flex items-center gap-3 p-2 rounded-md bg-background/50 border">
                                            <FileIcon className="h-5 w-5"/>
                                            <span>{file.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-8 lg:sticky lg:top-10">
            <Card>
                <CardHeader>
                    <CardTitle>Recipients</CardTitle>
                    <CardDescription>Select the members who will receive this campaign.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-20">
                            <Spinner className="h-8 w-8" />
                        </div>
                    ) : (
                        <UserList
                            users={filteredMembers}
                            selectedUsers={selectedMembers}
                            onSelectionChange={handleSelectionChange}
                            onSelectAll={handleSelectAll}
                            isAllSelected={isAllFilteredSelected}
                            isLoading={isLoading}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                        />
                    )}
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 flex justify-center mt-12 sticky bottom-0 bg-background/90 backdrop-blur-sm py-4">
            <Button 
                type="submit" 
                size="lg" 
                disabled={selectedMembers.length === 0 || isPending || isLoading}
                className="shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105 w-full max-w-xs"
            >
              {isPending ? (
                  <><Spinner className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                  <><Send className="mr-2 h-4 w-4" /> {`Send to ${selectedMembers.length} member(s)`}</>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <SelectTemplateDialog 
        open={isTemplateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSelect={handleSelectTemplate}
      />
    </div>
    </div>
  );
}
