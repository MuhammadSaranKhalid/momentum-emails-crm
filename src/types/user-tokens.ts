/**
 * Type definition for the user_tokens table
 * Stores connected account tokens (Microsoft OAuth, etc.)
 */
export interface UserToken {
  id: string;
  name: string;
  email: string;
  avatar: string;
  user_id: string;
  provider: 'microsoft' | string;
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_at: string;
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
 * Type for creating a new user token record
 */
export type CreateUserToken = Omit<UserToken, 'id' | 'created_at' | 'updated_at'>;

/**
 * Type for updating a user token record
 */
export type UpdateUserToken = Partial<Omit<UserToken, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

