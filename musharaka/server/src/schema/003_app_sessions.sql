-- 003: Refresh token sessions (JWT rotation)

CREATE TABLE IF NOT EXISTS app_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 of the raw token
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  user_agent          TEXT,
  ip                  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user       ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_token_hash ON app_sessions(refresh_token_hash);
