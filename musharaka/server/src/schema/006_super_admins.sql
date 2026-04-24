-- 006: Super-admins — references app_users (not auth.users)

CREATE TABLE IF NOT EXISTS super_admins (
  user_id    UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
