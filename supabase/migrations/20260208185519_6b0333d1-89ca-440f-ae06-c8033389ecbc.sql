-- Add brand_name column to reviews (from WB API)
ALTER TABLE public.reviews
ADD COLUMN brand_name text NOT NULL DEFAULT '';

-- Add brand_name column to settings (user default)
ALTER TABLE public.settings
ADD COLUMN brand_name text NOT NULL DEFAULT '';