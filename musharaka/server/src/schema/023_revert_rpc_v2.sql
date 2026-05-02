-- 023: Revert RPC v2 — delete linked sales on recall (instead of pending)
-- When an admin recalls/reverts a submission the associated sales rows are
-- DELETED so they no longer appear in the tenant's "آخر المبيعات" view.
-- The submission row stays as 'reverted' for the audit trail.
-- The tenant can enter fresh data and re-submit.

CREATE OR REPLACE FUNCTION revert_seinomy_submission(p_submission_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_branch UUID;
  v_start  DATE;
  v_end    DATE;
  v_deleted INT;
BEGIN
  SELECT branch_id, period_start, period_end
    INTO v_branch, v_start, v_end
  FROM submissions
  WHERE id = p_submission_id AND status = 'sent';

  IF v_branch IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الإرسال غير موجود أو سبق إلغاؤه');
  END IF;

  -- Mark the submission as reverted (kept for audit trail)
  UPDATE submissions SET status = 'reverted' WHERE id = p_submission_id;

  -- Delete the linked sales rows so they don't reappear in the table
  DELETE FROM sales WHERE submission_id = p_submission_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object(
    'success',      true,
    'branch_id',    v_branch,
    'period_start', v_start,
    'period_end',   v_end,
    'deleted_rows', v_deleted
  );
END;
$$;

COMMENT ON FUNCTION revert_seinomy_submission IS
  'Reverse a sent submission v2: mark reverted, DELETE linked sales rows. Tenant can enter fresh data.';
