-- 004: Password reset tokens (SMTP-triggered)

CREATE TABLE IF NOT EXISTS app_password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 of the raw token sent via email
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user  ON app_password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON app_password_resets(token_hash);
