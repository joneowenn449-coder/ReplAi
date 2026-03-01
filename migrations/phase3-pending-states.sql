-- Phase 3.1: bot_pending_states — replaces in-memory Maps
-- Run against the external DB (schema replai)

CREATE TABLE IF NOT EXISTS replai.bot_pending_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'onboarding' | 'edit' | 'api_key_update' | 'new_cabinet'
  target_id TEXT NOT NULL,      -- reviewId, cabinetId, userId, or JSON payload
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One pending state per chatId+type (upsert semantics enforced in code, index for lookups)
CREATE INDEX IF NOT EXISTS idx_bot_pending_states_chat_type
  ON replai.bot_pending_states (chat_id, type);

-- Auto-expire index (for cleanup queries on created_at)
CREATE INDEX IF NOT EXISTS idx_bot_pending_states_created_at
  ON replai.bot_pending_states (created_at);
