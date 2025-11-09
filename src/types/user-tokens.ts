/**
 * Type definition for the user_tokens table
 * Stores connected account tokens (Microsoft OAuth, IMAP/SMTP, etc.)
 */
export interface UserToken {
  id: string;
  name: string;
  email: string;
  avatar: string;
  user_id: string;
  provider: 'microsoft' | 'imap' | 'smtp' | string;
  
  // OAuth fields (for Microsoft)
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_at: string;
  
  // IMAP/SMTP fields
  imap_host?: string;
  imap_port?: number;
  imap_secure?: boolean;
  imap_username?: string;
  imap_password?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_username?: string;
  smtp_password?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Public-facing account type (without sensitive tokens)
 * Used for display purposes in UI components
 */
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: string;
}

/**
 * IMAP/SMTP form data
 */
export interface IMAPSMTPFormData {
  name: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_username: string;
  imap_password: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string;
}

/**
 * Email provider presets
 */
export const EMAIL_PRESETS: Record<string, Partial<IMAPSMTPFormData>> = {
  gmail: {
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_secure: true,
  },
  outlook: {
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_secure: true,
  },
  yahoo: {
    imap_host: 'imap.mail.yahoo.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.mail.yahoo.com',
    smtp_port: 465,
    smtp_secure: true,
  },
}

/**
 * Type for creating a new user token record
 */
export type CreateUserToken = Omit<UserToken, 'id' | 'created_at' | 'updated_at'>;

/**
 * Type for updating a user token record
 */
export type UpdateUserToken = Partial<Omit<UserToken, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

