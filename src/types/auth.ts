/**
 * Authentication and user-related type definitions
 */

export interface UserIdentity {
  id: string;
  email?: string;
  name?: string;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface MicrosoftProfile {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName: string;
}

