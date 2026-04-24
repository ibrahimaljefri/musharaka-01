-- 001: Extensions and shared trigger functions
-- Requires PostgreSQL 13+ (gen_random_uuid built-in)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- fallback for gen_random_uuid on older PG
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- used for crypt() if needed later

-- Shared trigger: auto-update updated_at on any table
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
