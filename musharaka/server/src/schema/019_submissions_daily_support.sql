-- 019: Add daily-range support to submissions table
-- The original schema (010) was monthly-only via unique (branch_id, month, year).
-- This migration:
--   1) adds period_start, period_end, post_mode columns
--   2) replaces the monthly-only unique constraint with a partial unique
--      index over the period range, scoped to status='sent' so reverted
--      rows can be re-sent without UQ violation
--   3) backfills period_start/period_end for existing monthly rows
--   4) widens the status CHECK to allow 'reverted'

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end   DATE,
  ADD COLUMN IF NOT EXISTS post_mode    TEXT
    CHECK (post_mode IN ('daily','monthly'));

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS uq_submission_branch_month_year;

CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_branch_period_active
  ON submissions(branch_id, period_start, period_end)
  WHERE status = 'sent';

-- Backfill existing monthly rows (idempotent — only sets where NULL)
UPDATE submissions
SET period_start = make_date(year, month, 1),
    period_end   = (make_date(year, month, 1) + interval '1 month - 1 day')::date,
    post_mode    = 'monthly'
WHERE period_start IS NULL;

-- Widen the status check to allow 'reverted'
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('sent','failed','reverted'));

COMMENT ON COLUMN submissions.period_start IS 'First sale-date covered by this submission (inclusive)';
COMMENT ON COLUMN submissions.period_end   IS 'Last sale-date covered by this submission (inclusive)';
COMMENT ON COLUMN submissions.post_mode    IS 'daily | monthly — matches tenant.cenomi_post_mode at the time of submission';
