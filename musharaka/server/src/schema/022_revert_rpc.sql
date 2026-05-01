-- 022: Atomic revert of a sent submission
-- Used by super-admin's "إعادة التعيين" button. Marks the submission
-- 'reverted' (kept for audit trail) and returns the linked sales to
-- 'pending' with submission_id = NULL so they can be edited and re-sent.
-- Scoped to one submission row = one branch + one period range.

CREATE OR REPLACE FUNCTION revert_seinomy_submission(p_submission_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_branch UUID;
  v_start  DATE;
  v_end    DATE;
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

  -- Sales return to pending AND become editable (submission_id cleared)
  UPDATE sales
  SET status = 'pending', submission_id = NULL
  WHERE submission_id = p_submission_id;

  RETURN json_build_object('success', true, 'branch_id', v_branch,
                           'period_start', v_start, 'period_end', v_end);
END;
$$;

COMMENT ON FUNCTION revert_seinomy_submission IS
  'Reverse a sent submission: mark reverted, return linked sales to pending (editable). Scope = one branch + one period.';
