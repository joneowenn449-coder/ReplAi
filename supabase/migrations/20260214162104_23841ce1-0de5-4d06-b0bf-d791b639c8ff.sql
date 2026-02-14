
-- 1. Create wb_cabinets table
CREATE TABLE public.wb_cabinets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Основной',
  wb_api_key TEXT,
  brand_name TEXT NOT NULL DEFAULT '',
  ai_prompt_template TEXT NOT NULL DEFAULT 'Ты — менеджер бренда на Wildberries. Напиши вежливый, дружелюбный и профессиональный ответ на отзыв покупателя. Если отзыв положительный — поблагодари. Если негативный — извинись и предложи решение. Ответ должен быть от 2 до 4 предложений, без шаблонных фраз.',
  reply_modes JSONB NOT NULL DEFAULT '{"1": "manual", "2": "manual", "3": "manual", "4": "manual", "5": "manual"}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wb_cabinets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cabinets" ON public.wb_cabinets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own cabinets" ON public.wb_cabinets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cabinets" ON public.wb_cabinets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cabinets" ON public.wb_cabinets FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Service role can manage wb_cabinets" ON public.wb_cabinets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view all cabinets" ON public.wb_cabinets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_wb_cabinets_updated_at
  BEFORE UPDATE ON public.wb_cabinets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Trigger: only one active cabinet per user
CREATE OR REPLACE FUNCTION public.ensure_single_active_cabinet()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.wb_cabinets SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_active_cabinet_trigger
  BEFORE INSERT OR UPDATE OF is_active ON public.wb_cabinets
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_cabinet();

-- 3. Add cabinet_id columns
ALTER TABLE public.reviews ADD COLUMN cabinet_id UUID REFERENCES public.wb_cabinets(id);
ALTER TABLE public.chats ADD COLUMN cabinet_id UUID REFERENCES public.wb_cabinets(id);
ALTER TABLE public.chat_messages ADD COLUMN cabinet_id UUID REFERENCES public.wb_cabinets(id);

-- 4. Migrate existing data
INSERT INTO public.wb_cabinets (user_id, name, wb_api_key, brand_name, ai_prompt_template, reply_modes, last_sync_at, is_active)
SELECT s.user_id, 'Основной', s.wb_api_key, s.brand_name, s.ai_prompt_template, s.reply_modes, s.last_sync_at, true
FROM public.settings s WHERE s.user_id IS NOT NULL;

UPDATE public.reviews r SET cabinet_id = c.id
FROM public.wb_cabinets c WHERE r.user_id = c.user_id AND c.is_active = true AND r.cabinet_id IS NULL;

UPDATE public.chats ch SET cabinet_id = c.id
FROM public.wb_cabinets c WHERE ch.user_id = c.user_id AND c.is_active = true AND ch.cabinet_id IS NULL;

UPDATE public.chat_messages SET cabinet_id = sub.cab_id
FROM (
  SELECT cm2.id AS msg_id, wc.id AS cab_id
  FROM public.chat_messages cm2
  JOIN public.chats ch2 ON ch2.chat_id = cm2.chat_id
  JOIN public.wb_cabinets wc ON wc.user_id = ch2.user_id AND wc.is_active = true
  WHERE cm2.cabinet_id IS NULL
) sub
WHERE chat_messages.id = sub.msg_id;

-- 5. Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _starter_tokens INTEGER := 10;
  _starter_ai_requests INTEGER := 5;
BEGIN
  INSERT INTO public.profiles (id, phone, display_name)
  VALUES (NEW.id, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  INSERT INTO public.token_balances (user_id, balance) VALUES (NEW.id, _starter_tokens);
  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (NEW.id, _starter_tokens, 'bonus', 'Стартовые токены при регистрации');
  INSERT INTO public.settings (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.ai_request_balances (user_id, balance) VALUES (NEW.id, _starter_ai_requests);
  INSERT INTO public.ai_request_transactions (user_id, amount, type, description)
  VALUES (NEW.id, _starter_ai_requests, 'bonus', 'Пробные запросы AI аналитика');
  INSERT INTO public.wb_cabinets (user_id, name, is_active) VALUES (NEW.id, 'Основной', true);
  RETURN NEW;
END;
$$;
