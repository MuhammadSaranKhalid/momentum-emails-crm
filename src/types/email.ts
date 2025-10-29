/**
 * Email-related type definitions
 */

export interface Email {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface EmailRecipient {
  emailAddress?: {
    name?: string;
    address?: string;
  };
}

export interface GraphEmail {
  id: string;
  subject?: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  toRecipients?: EmailRecipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  hasAttachments?: boolean;
}

export interface EmailsResponse {
  emails: Email[];
  count: number;
}

