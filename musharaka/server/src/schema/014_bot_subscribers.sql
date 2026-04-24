-- 014: Bot subscribers (Telegram; WhatsApp disabled)

CREATE TABLE IF NOT EXISTS bot_subscribers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id)          ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('telegram','whatsapp')),
  chat_id          TEXT NOT NULL,
  contact_name     TEXT,
  tenant_name      TEXT NOT NULL,
  contract_number  TEXT,
  branch_code      TEXT,
  branch_name      TEXT,
  is_active        BOOLEAN DEFAULT true,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (platform, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_subscribers_platform_chat ON bot_subscribers(platform, chat_id);
CREATE INDEX IF NOT EXISTS idx_bot_subscribers_tenant        ON bot_subscribers(tenant_id);

CREATE TRIGGER bot_subscribers_updated_at
  BEFORE UPDATE ON bot_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
