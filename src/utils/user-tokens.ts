import { UserToken } from '@/types/user-tokens';

/**
 * Check if a user token is expired
 */
export function isTokenExpired(token: UserToken): boolean {
  if (!token.expires_at) return true;
  
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  
  // Consider token expired if it expires in the next 5 minutes
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  return expiresAt.getTime() - now.getTime() < bufferTime;
}

/**
 * Check if a user token needs to be refreshed
 */
export function needsRefresh(token: UserToken): boolean {
  return isTokenExpired(token) && !!token.refresh_token;
}

/**
 * Get the avatar initials from a name
 */
export function getAvatarInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Format the token expiry time
 */
export function formatTokenExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) {
    return 'Expired';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    return `Expires in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `Expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Sanitize user token by removing sensitive data
 * Useful when logging or displaying token information
 */
export function sanitizeToken(token: UserToken): Partial<UserToken> {
  return {
    id: token.id,
    name: token.name,
    email: token.email,
    avatar: token.avatar,
    provider: token.provider,
    expires_at: token.expires_at,
    created_at: token.created_at,
    updated_at: token.updated_at,
  };
}

