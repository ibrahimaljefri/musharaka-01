-- 024: Allow incremental submissions for the same period
--
-- The previous design (021) blocked any second submission for the same
-- (branch_id, period_start, period_end) tuple even when the tenant added
-- NEW pending sales to a month that was already partially sent. Real-world
-- usage: tenant submits Feb monthly, then adds late invoices for Feb 5/6/7
-- and needs to send those too. Old behaviour returned
-- "تم إرسال هذه الفترة مسبقاً" — a hard block.
--
-- This migration:
--   1) Drops the partial unique index that enforced one-sent-per-period
--   2) Replaces submit_to_seinomy_v2() to remove the EXISTS guard so
--      each call creates a fresh submission row covering only the still-
--      pending sales it found in the period range.
--
-- Audit trail stays correct: تقرير الإرسالات will show one submission row
-- per submit click, with its own invoice_count / total_amount.

-- 1. Drop the blocking unique index (kept idempotent for re-runs)
DROP INDEX IF EXISTS uq_submission_branch_period_active;

-- 2. Replace the RPC — remove the "already sent" guard
CREATE OR REPLACE FUNCTION submit_to_seinomy_v2(
  p_branch_id     UUID,
  p_period_start  DATE,
  p_period_end    DATE,
  p_post_mode     TEXT,
  p_invoice_count INT,
  p_total_amount  NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_submission_id UUID;
  v_tenant_id     UUID;
  v_updated       INT;
BEGIN
  -- Resolve tenant from branch
  SELECT tenant_id INTO v_tenant_id FROM branches WHERE id = p_branch_id;
  IF v_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الفرع غير موجود');
  END IF;

  -- Insert the submission row. month/year derived from period_start so
  -- legacy code reading those columns keeps working. Multiple sent rows
  -- for the same period are allowed: each represents one batch sent.
  INSERT INTO submissions
    (tenant_id, branch_id, month, year, period_start, period_end, post_mode,
     invoice_count, total_amount, status)
  VALUES
    (v_tenant_id, p_branch_id,
     EXTRACT(MONTH FROM p_period_start)::smallint,
     EXTRACT(YEAR  FROM p_period_start)::smallint,
     p_period_start, p_period_end, p_post_mode,
     p_invoice_count, p_total_amount, 'sent')
  RETURNING id INTO v_submission_id;

  -- Mark only the pending sales in the period as sent + link them to this
  -- submission. Already-sent rows from previous submissions are untouched.
  UPDATE sales
  SET status = 'sent', submission_id = v_submission_id
  WHERE branch_id = p_branch_id
    AND sale_date BETWEEN p_period_start AND p_period_end
    AND status = 'pending';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Defensive: if no pending rows existed the submission row is empty;
  -- roll back so we don't create phantom audit entries.
  IF v_updated = 0 THEN
    DELETE FROM submissions WHERE id = v_submission_id;
    RETURN json_build_object('success', false,
      'error', 'لا توجد فواتير معلقة لهذه الفترة');
  END IF;

  RETURN json_build_object('success', true,
    'submission_id', v_submission_id,
    'sales_sent',    v_updated);
END;
$$;

COMMENT ON FUNCTION submit_to_seinomy_v2 IS
  'v3 incremental: each call creates a fresh submission row for the still-pending sales in the period. Permits resubmitting a month after adding late invoices.';
