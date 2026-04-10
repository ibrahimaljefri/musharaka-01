-- Migration 013: Support Tickets
-- Allows tenant users to submit support requests; super-admins manage and resolve them.

CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1001;

CREATE TABLE IF NOT EXISTS support_tickets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number    TEXT NOT NULL UNIQUE DEFAULT ('SUP-' || nextval('support_ticket_seq')),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name      TEXT NOT NULL,
  submitter_name   TEXT NOT NULL,
  submitter_email  TEXT NOT NULL,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('integration', 'license', 'technical', 'reporting')),
  description      TEXT NOT NULL,
  steps            TEXT,
  attachment_url   TEXT,
  attachment_name  TEXT,
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'in_progress', 'resolved')),
  admin_comment    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Tenant users can insert tickets for their own tenant
CREATE POLICY "tenant_insert" ON support_tickets FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- Super-admins have full access (read, update, delete)
CREATE POLICY "super_admin_full" ON support_tickets
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

COMMENT ON TABLE support_tickets IS
  'Support tickets submitted by tenant users. Managed by super-admins.';
