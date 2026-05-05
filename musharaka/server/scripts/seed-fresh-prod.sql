-- Fresh-DB seed for urrwah.com / dev.urrwah.com
--
-- Inserts exactly two users — a super-admin and admin@admin.com — with NEW
-- passwords distinct from anything used on stepup2you. Both are wired into
-- super_admins so they get full platform control.
--
-- DO NOT run this on a non-empty database. The seed script (.sh) verifies
-- the user count is 0 before applying.
--
-- Placeholders are substituted by scripts/seed-fresh-prod.sh:
--   :SUPERADMIN_EMAIL   default 'superadmin@urrwah.com'
--   :SUPERADMIN_HASH    bcrypt of new password (read from stdin)
--   :ADMIN_EMAIL        always 'admin@admin.com'
--   :ADMIN_HASH         bcrypt of new password (read from stdin)

BEGIN;

-- 1. Super-admin
INSERT INTO app_users (id, email, password_hash, full_name, email_confirmed_at)
VALUES (gen_random_uuid(), :'SUPERADMIN_EMAIL', :'SUPERADMIN_HASH',
        'Super Admin', now());

INSERT INTO super_admins (user_id)
SELECT id FROM app_users WHERE email = :'SUPERADMIN_EMAIL';

-- 2. admin@admin.com
INSERT INTO app_users (id, email, password_hash, full_name, email_confirmed_at)
VALUES (gen_random_uuid(), :'ADMIN_EMAIL', :'ADMIN_HASH',
        'Admin', now());

INSERT INTO super_admins (user_id)
SELECT id FROM app_users WHERE email = :'ADMIN_EMAIL';

-- 3. Sanity check — must be exactly 2 users now
DO $$
DECLARE
  user_count INT;
  super_count INT;
BEGIN
  SELECT count(*) INTO user_count FROM app_users;
  SELECT count(*) INTO super_count FROM super_admins;
  IF user_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly 2 users in app_users, found %', user_count;
  END IF;
  IF super_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly 2 super_admins, found %', super_count;
  END IF;
END $$;

COMMIT;
