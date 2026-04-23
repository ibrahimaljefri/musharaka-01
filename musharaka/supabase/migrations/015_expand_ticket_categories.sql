-- Expand the support_tickets.category CHECK constraint to match the 6 Arabic
-- categories the TicketCreate UI has used since the migration to Arabic-as-value.
--
-- The original constraint from `013_support_tickets.sql` only allowed:
--   integration, license, technical, reporting
--
-- But the frontend submits:
--   مبيعات, فروع, مستخدمون, ترخيص, تقني, أخرى
--
-- Result: every ticket submit from /tickets/create returns 422 (validation)
-- or 500 (CHECK violation) depending on which rejection fires first.
--
-- This migration drops the old constraint and replaces it with one that allows
-- BOTH sets — so existing tickets with English codes keep rendering, and new
-- tickets with Arabic values insert successfully. The UI label maps in
-- client/src/lib/ticketConstants.js already handle both.

ALTER TABLE support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_category_check;

ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN (
    -- New Arabic categories (canonical, used by the UI today)
    'مبيعات',
    'فروع',
    'مستخدمون',
    'ترخيص',
    'تقني',
    'أخرى',
    -- Legacy English categories (backward-compat for existing rows)
    'integration',
    'license',
    'technical',
    'reporting'
  ));
