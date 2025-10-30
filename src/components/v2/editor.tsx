"use client";

import { useState, KeyboardEvent, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
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
}

export function Editor({ form }: EditorProps) {
  const dispatch = useDispatch();
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "templates">("editor");

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
    <div className="flex flex-1 flex-col bg-neutral-light dark:bg-neutral-dark overflow-hidden">
      <ScrollArea className="h-0 flex-1">
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
      <div className="px-6">
        <div className="flex border-b border-border-light dark:border-border-dark gap-8">
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
      </div>
      <div className="flex flex-col flex-1 p-6">
        {activeTab === "editor" ? (
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem className="flex flex-col h-full">
                <FormControl>
                  <div className="flex flex-col rounded-lg border border-border-light dark:border-border-dark h-full bg-background-light dark:bg-background-dark">
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
        ) : (
          <div className="flex flex-col rounded-lg border border-border-light dark:border-border-dark h-full bg-background-light dark:bg-background-dark p-8">
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
