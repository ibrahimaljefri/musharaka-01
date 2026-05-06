-- 025: Terms-of-service content + per-user acceptance tracking.
--
-- A) User-side: track who accepted and when. Single timestamp; no version
--    column — deliberate decision. Content edits do NOT re-prompt acceptors;
--    the legal record is "user accepted whatever the T&C said at time
--    terms_accepted_at". If we ever need version-aware re-prompts later,
--    that's a new migration.
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_admin  BOOLEAN NOT NULL DEFAULT FALSE;

-- Grandfather every pre-existing user as accepted at their creation time
-- so the deploy doesn't lock anyone out of the dashboard.
UPDATE app_users
   SET terms_accepted_at = created_at
 WHERE terms_accepted_at IS NULL;

-- Partial index — only rows still pending acceptance benefit from indexing.
CREATE INDEX IF NOT EXISTS idx_app_users_terms_accepted_null
  ON app_users (id)
  WHERE terms_accepted_at IS NULL;

COMMENT ON COLUMN app_users.terms_accepted_at IS
  'Timestamp the user accepted T&C. NULL means not accepted (admin-created users, day-1).';
COMMENT ON COLUMN app_users.created_by_admin IS
  'TRUE when an admin (super or tenant) created this user via /api/admin/users. They have not yet seen T&C and must accept on first login.';

-- B) Content-side: single-row table holding the current T&C body.
--    Super-admin edits this via /admin/terms. No history retained.
CREATE TABLE IF NOT EXISTS terms_content (
  id          TEXT PRIMARY KEY DEFAULT 'current'
                  CHECK (id = 'current'),                -- enforce singleton
  body        TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES app_users(id) ON DELETE SET NULL
);

-- Seed the singleton row with placeholder content if not yet present.
INSERT INTO terms_content (id, body, updated_at)
VALUES (
  'current',
  '# الشروط والأحكام' || E'\n\n' ||
  'سيتم تحديث محتوى هذه الصفحة قريباً من قبل الإدارة.',
  now()
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE terms_content IS
  'Single-row table storing current T&C content as Markdown. Updated by super-admin via /admin/terms; no version history retained.';
