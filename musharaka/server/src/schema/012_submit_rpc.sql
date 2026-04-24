-- 012: Atomic Cenomi submission function (plain SQL, no Supabase SECURITY DEFINER needed)

CREATE OR REPLACE FUNCTION submit_to_seinomy(
  p_branch_id     UUID,
  p_month         SMALLINT,
  p_year          SMALLINT,
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
  -- Resolve tenant_id from branch (for the new tenant_id column on submissions)
  SELECT tenant_id INTO v_tenant_id FROM branches WHERE id = p_branch_id;

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
  INSERT INTO submissions (tenant_id, branch_id, month, year, invoice_count, total_amount)
  VALUES (v_tenant_id, p_branch_id, p_month, p_year, p_invoice_count, p_total_amount)
  RETURNING id INTO v_submission_id;

  -- Mark pending sales as sent
  UPDATE sales
  SET status = 'sent', submission_id = v_submission_id
  WHERE branch_id = p_branch_id
    AND EXTRACT(MONTH FROM sale_date) = p_month
    AND EXTRACT(YEAR  FROM sale_date) = p_year
    AND status = 'pending';

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;
