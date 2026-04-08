-- Migration 011: Bot subscribers table
-- Maps WhatsApp/Telegram chat IDs to tenant branches for the sales bot

CREATE TABLE IF NOT EXISTS bot_subscribers (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  chat_id          TEXT NOT NULL,
  contact_name     TEXT,
  -- Denormalized for fast bot lookups (no JOIN needed on every message)
  tenant_name      TEXT NOT NULL,
  contract_number  TEXT,
  branch_code      TEXT NOT NULL,
  branch_name      TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT true,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform, chat_id)
);

CREATE INDEX idx_bot_subscribers_platform_chat
  ON bot_subscribers (platform, chat_id);

CREATE INDEX idx_bot_subscribers_tenant
  ON bot_subscribers (tenant_id);

-- RLS
ALTER TABLE bot_subscribers ENABLE ROW LEVEL SECURITY;

-- Only super-admins can manage bot subscribers
CREATE POLICY "super_admin_full_access" ON bot_subscribers
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE bot_subscribers IS
  'Maps WhatsApp/Telegram chat IDs to tenant branches. Denormalized for fast bot response.';
