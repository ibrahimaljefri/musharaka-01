-- 002: Application users — replaces Supabase auth.users
-- password_hash defaults to 'NEEDS_RESET' for migrated users

CREATE TABLE IF NOT EXISTS app_users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL DEFAULT 'NEEDS_RESET',
  full_name           TEXT,
  phone               TEXT,
  email_confirmed_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
