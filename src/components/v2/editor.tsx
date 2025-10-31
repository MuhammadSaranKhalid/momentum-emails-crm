"use client";

import { useState, KeyboardEvent, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, File, FileText, FileImage, FileVideo, FileAudio, FileSpreadsheet, FileArchive, FileCode } from "lucide-react";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  setSubject,
  setBody,
  setCc,
  setBcc,
} from "@/store/features/campaigns/campaignSlice";
import dynamic from "next/dynamic";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Attachments } from "@/components/v2/attachments";
import type { Attachment } from "@/types/attachment";

const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 p-4 min-h-[400px] border border-border-light dark:border-border-dark rounded-lg">
        Loading editor...
      </div>
    ),
  }
);

interface CampaignFormData {
  subject: string;
  body: string;
  cc: string[];
  bcc: string[];
  sender_name?: string;
  sender_email?: string;
  reply_to?: string;
}

interface EditorProps {
  form: UseFormReturn<CampaignFormData>;
  attachments: Attachment[];
  onAddAttachment: (attachment: Attachment) => void;
  onRemoveAttachment: (id: string) => void;
}

export function Editor({ form, attachments, onAddAttachment, onRemoveAttachment }: EditorProps) {
  const dispatch = useDispatch();
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "templates">("editor");

  // Get file icon based on file type
  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Image files
    if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension || '')) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    
    // Video files
    if (fileType.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) {
      return <FileVideo className="h-4 w-4 text-purple-500" />;
    }
    
    // Audio files
    if (fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension || '')) {
      return <FileAudio className="h-4 w-4 text-pink-500" />;
    }
    
    // Document files
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension || '')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    
    // Spreadsheet files
    if (['xls', 'xlsx', 'csv', 'ods'].includes(extension || '')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension || '')) {
      return <FileArchive className="h-4 w-4 text-yellow-500" />;
    }
    
    // Code files
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml', 'sql', 'md', 'yml', 'yaml'].includes(extension || '')) {
      return <FileCode className="h-4 w-4 text-cyan-500" />;
    }
    
    // Default file icon
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const ccEmails = form.watch("cc") ?? [];
  const bccEmails = form.watch("bcc") ?? [];

  // Sync form values with Redux
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "subject") {
        dispatch(setSubject(value.subject ?? ""));
      } else if (name === "body") {
        dispatch(setBody(value.body ?? ""));
      } else if (name === "cc") {
        const ccArray = (value.cc ?? []).filter(
          (email): email is string => typeof email === "string"
        );
        dispatch(setCc(ccArray));
      } else if (name === "bcc") {
        const bccArray = (value.bcc ?? []).filter(
          (email): email is string => typeof email === "string"
        );
        dispatch(setBcc(bccArray));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, dispatch]);

  // Handle adding CC email
  const handleAddCc = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const email = ccInput.trim().replace(",", "");
      const currentCc = form.getValues("cc") || [];
      if (email && isValidEmail(email) && !currentCc.includes(email)) {
        const newCc = [...currentCc, email];
        form.setValue("cc", newCc);
        dispatch(setCc(newCc));
        setCcInput("");
      }
    }
  };

  // Handle adding BCC email
  const handleAddBcc = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const email = bccInput.trim().replace(",", "");
      const currentBcc = form.getValues("bcc") || [];
      if (email && isValidEmail(email) && !currentBcc.includes(email)) {
        const newBcc = [...currentBcc, email];
        form.setValue("bcc", newBcc);
        dispatch(setBcc(newBcc));
        setBccInput("");
      }
    }
  };

  // Remove CC email
  const removeCc = (emailToRemove: string) => {
    const currentCc = form.getValues("cc") || [];
    const newCc = currentCc.filter((email: string) => email !== emailToRemove);
    form.setValue("cc", newCc);
    dispatch(setCc(newCc));
  };

  // Remove BCC email
  const removeBcc = (emailToRemove: string) => {
    const currentBcc = form.getValues("bcc") || [];
    const newBcc = currentBcc.filter(
      (email: string) => email !== emailToRemove
    );
    form.setValue("bcc", newBcc);
    dispatch(setBcc(newBcc));
  };

  // Handle blur for adding emails when clicking outside
  const handleCcBlur = () => {
    const email = ccInput.trim();
    const currentCc = form.getValues("cc") || [];
    if (email && isValidEmail(email) && !currentCc.includes(email)) {
      const newCc = [...currentCc, email];
      form.setValue("cc", newCc);
      dispatch(setCc(newCc));
      setCcInput("");
    }
  };

  const handleBccBlur = () => {
    const email = bccInput.trim();
    const currentBcc = form.getValues("bcc") || [];
    if (email && isValidEmail(email) && !currentBcc.includes(email)) {
      const newBcc = [...currentBcc, email];
      form.setValue("bcc", newBcc);
      dispatch(setBcc(newBcc));
      setBccInput("");
    }
  };
  return (
    <div className="flex flex-1 flex-col bg-neutral-light dark:bg-neutral-dark min-h-0 overflow-hidden">
      {/* ScrollArea wrapping the entire editor content */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="p-6 space-y-4">
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <Label
                  htmlFor="subject"
                  className="text-base font-medium leading-normal pb-2 text-text-light dark:text-text-dark"
                >
                  Subject
                </Label>
                <FormControl>
                  <Input
                    {...field}
                    id="subject"
                    placeholder="Enter your email subject line"
                    className="h-14 p-[15px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex w-full gap-4">
            <div className="flex flex-col w-1/2">
              <Label
                htmlFor="cc"
                className="text-base font-medium leading-normal pb-2 text-text-light dark:text-text-dark"
              >
                CC
              </Label>
              <Input
                id="cc"
                placeholder="Add CC recipients (press Enter or comma)"
                className="h-14 p-[15px]"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={handleAddCc}
                onBlur={handleCcBlur}
              />
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {ccEmails.map((email: string) => (
                    <div
                      key={email}
                      className="flex items-center gap-1 rounded-full bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark pl-2.5 pr-1 py-1 text-sm font-medium border border-border-light dark:border-border-dark"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => removeCc(email)}
                        className="p-0.5 rounded-full text-subtext-light dark:text-subtext-dark hover:bg-neutral-light/50 dark:hover:bg-neutral-dark/50 hover:text-text-light dark:hover:text-text-dark"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col w-1/2">
              <Label
                htmlFor="bcc"
                className="text-base font-medium leading-normal pb-2 text-text-light dark:text-text-dark"
              >
                BCC
              </Label>
              <Input
                id="bcc"
                placeholder="Add BCC recipients (press Enter or comma)"
                className="h-14 p-[15px]"
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                onKeyDown={handleAddBcc}
                onBlur={handleBccBlur}
              />
              {bccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {bccEmails.map((email: string) => (
                    <div
                      key={email}
                      className="flex items-center gap-1 rounded-full bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark pl-2.5 pr-1 py-1 text-sm font-medium border border-border-light dark:border-border-dark"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => removeBcc(email)}
                        className="p-0.5 rounded-full text-subtext-light dark:text-subtext-dark hover:bg-neutral-light/50 dark:hover:bg-neutral-dark/50 hover:text-text-light dark:hover:text-text-dark"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark">
            <div className="flex gap-8">
              <button
                className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${
                  activeTab === "editor"
                    ? "border-b-primary text-primary"
                    : "border-b-transparent text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark"
                }`}
                onClick={() => setActiveTab("editor")}
              >
                <p className="text-sm font-bold leading-normal">Editor</p>
              </button>
              <button
                className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${
                  activeTab === "templates"
                    ? "border-b-primary text-primary"
                    : "border-b-transparent text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark"
                }`}
                onClick={() => setActiveTab("templates")}
              >
                <p className="text-sm font-bold leading-normal">Templates</p>
              </button>
            </div>
            
            {/* Attachments Section - Right Side */}
            <div className="pb-3">
              <Attachments 
                attachments={attachments}
                onAdd={onAddAttachment}
              />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === "editor" ? (
            <>
              {/* Attached Files Display */}
              {attachments.length > 0 && (
                <div className="rounded-lg border border-border-light dark:border-border-dark bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">
                      Attached Files ({attachments.length})
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {attachments.reduce((sum, att) => sum + att.size, 0) > 0 && 
                        `${(attachments.reduce((sum, att) => sum + att.size, 0) / (1024 * 1024)).toFixed(2)} MB / 25 MB`
                      }
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 rounded-md border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-3 py-2 text-sm"
                      >
                        {getFileIcon(attachment.name, attachment.type)}
                        <div className="flex flex-col">
                          <span className="text-text-light dark:text-text-dark font-medium">
                            {attachment.name}
                          </span>
                          <span className="text-xs text-subtext-light dark:text-subtext-dark">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveAttachment(attachment.id)}
                          className="ml-2 p-0.5 rounded-full hover:bg-neutral-light/50 dark:hover:bg-neutral-dark/50 text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-col rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <RichTextEditor
                          value={field.value}
                          onChange={(content: string) => {
                            field.onChange(content);
                            dispatch(setBody(content));
                          }}
                          placeholder="Start writing your email here..."
                          setOptions={{
                            height: "500px",
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            <div className="flex flex-col rounded-lg border border-border-light dark:border-border-dark min-h-[500px] bg-background-light dark:bg-background-dark p-8">
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-lg font-medium text-text-light dark:text-text-dark mb-2">
                  Templates Coming Soon
                </p>
                <p className="text-sm text-subtext-light dark:text-subtext-dark">
                  Select from pre-built email templates
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
