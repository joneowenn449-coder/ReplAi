-- Add per-star notification settings to wb_cabinets
ALTER TABLE replai.wb_cabinets ADD COLUMN IF NOT EXISTS tg_notify_stars jsonb;
