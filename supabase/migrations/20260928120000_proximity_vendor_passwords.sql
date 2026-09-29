-- Vendor portal sign-in. Password and session hashes only; the plain values are never stored.

ALTER TABLE public.proximity_advertisers
  ADD COLUMN IF NOT EXISTS password_hash varchar(255),
  ADD COLUMN IF NOT EXISTS session_token_hash varchar(128),
  ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS proximity_advertisers_tenant_email_key
  ON public.proximity_advertisers (tenant_id, lower(email))
  WHERE email IS NOT NULL AND btrim(email) <> '';
