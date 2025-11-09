-- ============================================================================
-- IMAP/SMTP SUPPORT MIGRATION
-- ============================================================================
-- Adds IMAP/SMTP columns to user_tokens table
-- ============================================================================

-- Add IMAP configuration columns
ALTER TABLE public.user_tokens
ADD COLUMN IF NOT EXISTS imap_host text,
ADD COLUMN IF NOT EXISTS imap_port integer DEFAULT 993,
ADD COLUMN IF NOT EXISTS imap_secure boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS imap_username text,
ADD COLUMN IF NOT EXISTS imap_password text;

-- Add SMTP configuration columns
ALTER TABLE public.user_tokens
ADD COLUMN IF NOT EXISTS smtp_host text,
ADD COLUMN IF NOT EXISTS smtp_port integer DEFAULT 465,
ADD COLUMN IF NOT EXISTS smtp_secure boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS smtp_username text,
ADD COLUMN IF NOT EXISTS smtp_password text;

-- Update provider constraint to include imap/smtp
ALTER TABLE public.user_tokens
DROP CONSTRAINT IF EXISTS user_tokens_provider_check;

ALTER TABLE public.user_tokens
ADD CONSTRAINT user_tokens_provider_check CHECK (
  provider IN ('microsoft', 'google', 'imap', 'smtp', 'custom')
);

-- Add comments
COMMENT ON COLUMN public.user_tokens.imap_host IS 'IMAP server hostname (e.g., imap.gmail.com)';
COMMENT ON COLUMN public.user_tokens.imap_port IS 'IMAP server port (typically 993 for SSL/TLS)';
COMMENT ON COLUMN public.user_tokens.imap_secure IS 'Whether to use SSL/TLS for IMAP';
COMMENT ON COLUMN public.user_tokens.imap_username IS 'Username for IMAP authentication';
COMMENT ON COLUMN public.user_tokens.imap_password IS 'Password for IMAP authentication';
COMMENT ON COLUMN public.user_tokens.smtp_host IS 'SMTP server hostname (e.g., smtp.gmail.com)';
COMMENT ON COLUMN public.user_tokens.smtp_port IS 'SMTP server port (465 for SSL, 587 for TLS)';
COMMENT ON COLUMN public.user_tokens.smtp_secure IS 'Whether to use SSL/TLS for SMTP';
COMMENT ON COLUMN public.user_tokens.smtp_username IS 'Username for SMTP authentication';
COMMENT ON COLUMN public.user_tokens.smtp_password IS 'Password for SMTP authentication';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✓ IMAP/SMTP support migration completed';
  RAISE NOTICE 'Supported providers: microsoft, google, imap, smtp, custom';
END $$;

