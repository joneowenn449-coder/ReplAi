-- Add telegram_id to auth_users for Telegram-based registration
ALTER TABLE replai.auth_users ADD COLUMN IF NOT EXISTS telegram_id text;

-- Unique index: one Telegram account = one user
CREATE UNIQUE INDEX IF NOT EXISTS auth_users_telegram_id_idx ON replai.auth_users (telegram_id) WHERE telegram_id IS NOT NULL;
