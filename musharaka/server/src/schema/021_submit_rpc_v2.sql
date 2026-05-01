-- 021: New atomic submit RPC supporting daily ranges
-- Replaces the monthly-only submit_to_seinomy() with a v2 that takes an
-- arbitrary period range. The old function is left in place untouched
-- for any in-flight clients. New code calls submit_to_seinomy_v2().

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
BEGIN
  -- Resolve tenant from branch
  SELECT tenant_id INTO v_tenant_id FROM branches WHERE id = p_branch_id;
  IF v_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'الفرع غير موجود');
  END IF;

  -- Prevent double-send of the same period (partial unique index also enforces this)
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE branch_id = p_branch_id
      AND period_start = p_period_start
      AND period_end   = p_period_end
      AND status = 'sent'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'تم إرسال هذه الفترة مسبقاً');
  END IF;

  -- Insert the submission row. month/year derived from period_start so
  -- legacy code reading those columns keeps working.
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

  -- Mark all pending sales in the period as sent + link them to the submission
  UPDATE sales
  SET status = 'sent', submission_id = v_submission_id
  WHERE branch_id = p_branch_id
    AND sale_date BETWEEN p_period_start AND p_period_end
    AND status = 'pending';

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;

COMMENT ON FUNCTION submit_to_seinomy_v2 IS
  'Atomic submit: insert submissions row + flip pending sales in the period to sent. Used by both daily and monthly Cenomi flows.';
