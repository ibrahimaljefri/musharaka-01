-- 015: Support tickets

CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1001;

CREATE TABLE IF NOT EXISTS support_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number    TEXT NOT NULL UNIQUE DEFAULT ('SUP-' || nextval('support_ticket_seq')),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name      TEXT NOT NULL,
  submitter_name   TEXT NOT NULL,
  submitter_email  TEXT NOT NULL,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN (
    'مبيعات','فروع','مستخدمون','ترخيص','تقني','أخرى',
    'integration','license','technical','reporting'
  )),
  description      TEXT NOT NULL,
  steps            TEXT,
  attachment_url   TEXT,
  attachment_name  TEXT,
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','in_progress','resolved')),
  admin_comment    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
