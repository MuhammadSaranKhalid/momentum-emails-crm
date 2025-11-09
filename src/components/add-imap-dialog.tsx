'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreate, useGetIdentity } from '@refinedev/core';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IMAPSMTPFormData, EMAIL_PRESETS } from '@/types/user-tokens';

interface AddIMAPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddIMAPDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddIMAPDialogProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>('gmail');
  
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { mutate: createAccount, mutation: { isPending: isSubmitting } } = useCreate();

  const form = useForm<IMAPSMTPFormData>({
    defaultValues: {
      name: '',
      email: '',
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_secure: true,
      imap_username: '',
      imap_password: '',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 465,
      smtp_secure: true,
      smtp_username: '',
      smtp_password: '',
    },
  });

  // Update form when preset changes
  React.useEffect(() => {
    const preset = EMAIL_PRESETS[selectedPreset];
    if (preset) {
      form.setValue('imap_host', preset.imap_host || '');
      form.setValue('imap_port', preset.imap_port || 993);
      form.setValue('imap_secure', preset.imap_secure ?? true);
      form.setValue('smtp_host', preset.smtp_host || '');
      form.setValue('smtp_port', preset.smtp_port || 465);
      form.setValue('smtp_secure', preset.smtp_secure ?? true);
    }
  }, [selectedPreset, form]);

  // Auto-fill username fields
  const email = form.watch('email');
  React.useEffect(() => {
    if (email) {
      form.setValue('imap_username', email);
      form.setValue('smtp_username', email);
      if (!form.watch('name')) {
        form.setValue('name', email.split('@')[0]);
      }
    }
  }, [email, form]);

  const onSubmit = async (data: IMAPSMTPFormData) => {
    if (!identity?.id) {
      toast.error('User not authenticated');
      return;
    }

    createAccount(
      {
        resource: 'user_tokens',
        values: {
          user_id: identity.id,
          provider: 'imap',
          name: data.name || data.email.split('@')[0],
          email: data.email,
          avatar: '',
          
          // Set empty OAuth fields (required by schema)
          access_token: '',
          refresh_token: '',
          id_token: '',
          expires_at: new Date().toISOString(),
          
          // IMAP settings
          imap_host: data.imap_host,
          imap_port: data.imap_port,
          imap_secure: data.imap_secure,
          imap_username: data.imap_username,
          imap_password: data.imap_password,
          
          // SMTP settings
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_secure: data.smtp_secure,
          smtp_username: data.smtp_username,
          smtp_password: data.smtp_password,
        },
      },
      {
        onSuccess: () => {
          toast.success('IMAP/SMTP account added successfully!');
          handleClose();
          onSuccess?.();
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to add account';
          toast.error(message);
        },
      }
    );
  };

  const handleClose = () => {
    form.reset();
    setSelectedPreset('gmail');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Add IMAP/SMTP Account
          </DialogTitle>
          <DialogDescription>
            Connect Gmail, Outlook, Yahoo, or any email account using IMAP and SMTP.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <FormLabel>Email Provider</FormLabel>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook.com</SelectItem>
                  <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                For Gmail: Enable 2FA and use an App Password
              </FormDescription>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{ 
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My Email Account"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* IMAP/SMTP Tabs */}
            <Tabs defaultValue="smtp" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="smtp">SMTP (Sending)</TabsTrigger>
                <TabsTrigger value="imap">IMAP (Optional)</TabsTrigger>
              </TabsList>

              <TabsContent value="smtp" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="smtp_host"
                    rules={{ required: 'SMTP host is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host *</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp.gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="smtp_port"
                    rules={{ 
                      required: 'Port is required',
                      min: { value: 1, message: 'Invalid port' },
                      max: { value: 65535, message: 'Invalid port' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="smtp_username"
                  rules={{ required: 'Username is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smtp_password"
                  rules={{ required: 'Password is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password/App Password *</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••••••••••" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="imap" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="imap_host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IMAP Host</FormLabel>
                        <FormControl>
                          <Input placeholder="imap.gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="imap_port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 993)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="imap_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imap_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

