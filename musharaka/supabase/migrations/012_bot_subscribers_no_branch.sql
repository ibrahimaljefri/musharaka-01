-- Migration 012: Make branch fields optional in bot_subscribers
-- Branch is now identified per-message by the subscriber, not pre-configured.
-- The bot asks the subscriber for their branch if not included in the message.

ALTER TABLE bot_subscribers ALTER COLUMN branch_id    DROP NOT NULL;
ALTER TABLE bot_subscribers ALTER COLUMN branch_code  DROP NOT NULL;
ALTER TABLE bot_subscribers ALTER COLUMN branch_name  DROP NOT NULL;
