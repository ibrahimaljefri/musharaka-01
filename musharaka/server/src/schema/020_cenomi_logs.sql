-- 020: Cenomi request/response audit log
-- One row per Cenomi POST attempt (success or failure). Used by the
-- super-admin /admin/cenomi-logs page to investigate disputed deliveries.
-- The token in request_headers is ALWAYS redacted to "***" before insert.

CREATE TABLE IF NOT EXISTS cenomi_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id)     ON DELETE CASCADE,
  branch_id       UUID          REFERENCES branches(id)    ON DELETE SET NULL,
  submission_id   UUID          REFERENCES submissions(id) ON DELETE SET NULL,
  request_url     TEXT  NOT NULL,
  request_headers JSONB NOT NULL,    -- token redacted to "***"
  request_body    JSONB NOT NULL,
  response_status INT,                -- NULL on connection failure / TLS error
  response_body   JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cenomi_logs_tenant_created ON cenomi_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cenomi_logs_branch_created ON cenomi_logs(branch_id, created_at DESC);

COMMENT ON TABLE cenomi_logs IS
  'Append-only audit log of every Cenomi POST attempt. Token in request_headers is redacted.';
