
-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wb_id TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  author_name TEXT NOT NULL DEFAULT '',
  text TEXT,
  product_name TEXT NOT NULL DEFAULT '',
  product_article TEXT NOT NULL DEFAULT '',
  photo_links JSONB DEFAULT '[]'::jsonb,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'pending', 'auto', 'sent')),
  ai_draft TEXT,
  sent_answer TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create settings table (single row)
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_prompt_template TEXT NOT NULL DEFAULT 'Ты — менеджер бренда LUNÉRA на Wildberries. Напиши вежливый, дружелюбный и профессиональный ответ на отзыв покупателя. Если отзыв положительный — поблагодари. Если негативный — извинись и предложи решение. Ответ должен быть от 2 до 4 предложений, без шаблонных фраз. Не используй восклицательные знаки чрезмерно.',
  last_sync_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews: authenticated users can read/write
CREATE POLICY "Authenticated users can view reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (true);

-- Allow service role (edge functions) full access via anon for sync
CREATE POLICY "Service role can manage reviews"
  ON public.reviews FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- RLS policies for settings
CREATE POLICY "Authenticated users can view settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can manage settings"
  ON public.settings FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for reviews
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.settings (auto_reply_enabled) VALUES (false);
