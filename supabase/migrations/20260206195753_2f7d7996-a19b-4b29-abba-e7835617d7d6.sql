
-- Add reply_modes JSONB column to settings table
-- Default: all ratings in "manual" mode (safe default)
ALTER TABLE public.settings 
ADD COLUMN reply_modes jsonb NOT NULL DEFAULT '{"1": "manual", "2": "manual", "3": "manual", "4": "manual", "5": "manual"}'::jsonb;
