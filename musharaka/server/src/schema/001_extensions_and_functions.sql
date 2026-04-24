-- 001: Extensions and shared trigger functions
-- Requires PostgreSQL 13+ (gen_random_uuid built-in)

-- uuid-ossp and pgcrypto are not available on all cPanel hosts;
-- gen_random_uuid() is built into PostgreSQL 13+ (no extension needed)

-- Shared trigger: auto-update updated_at on any table
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
