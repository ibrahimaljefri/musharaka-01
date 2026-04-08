-- ============================================================
-- Migration 004: Atomic Seinomy submission RPC
-- Used by Node.js seinomyApiService to run as a transaction
-- ============================================================

CREATE OR REPLACE FUNCTION submit_to_seinomy(
  p_branch_id     UUID,
  p_month         SMALLINT,
  p_year          SMALLINT,
  p_invoice_count INT,
  p_total_amount  NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission_id UUID;
BEGIN
  -- Prevent double submission
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE branch_id = p_branch_id
      AND month = p_month
      AND year  = p_year
      AND status = 'sent'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'تم إرسال فواتير هذه الفترة مسبقاً');
  END IF;

  -- Create submission record
  INSERT INTO submissions (branch_id, month, year, invoice_count, total_amount)
  VALUES (p_branch_id, p_month, p_year, p_invoice_count, p_total_amount)
  RETURNING id INTO v_submission_id;

  -- Mark all pending sales for this branch/month/year as sent
  UPDATE sales
  SET status = 'sent', submission_id = v_submission_id
  WHERE branch_id = p_branch_id
    AND EXTRACT(MONTH FROM sale_date) = p_month
    AND EXTRACT(YEAR  FROM sale_date) = p_year
    AND status = 'pending';

  RETURN json_build_object(
    'success', true,
    'submission_id', v_submission_id
  );
END;
$$;
