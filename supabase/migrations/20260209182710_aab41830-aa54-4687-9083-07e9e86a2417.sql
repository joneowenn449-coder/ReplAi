
-- Таблица баланса AI-запросов
CREATE TABLE public.ai_request_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_request_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai balance" ON public.ai_request_balances
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all ai balances" ON public.ai_request_balances
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ai balances" ON public.ai_request_balances
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages ai balances" ON public.ai_request_balances
  FOR ALL USING (true) WITH CHECK (true);

-- Таблица транзакций AI-запросов
CREATE TABLE public.ai_request_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL DEFAULT 'usage',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_request_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai transactions" ON public.ai_request_transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all ai transactions" ON public.ai_request_transactions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages ai transactions" ON public.ai_request_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Обновить триггер handle_new_user — добавить стартовые AI-запросы
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _starter_tokens INTEGER := 10;
  _starter_ai_requests INTEGER := 5;
BEGIN
  INSERT INTO public.profiles (id, phone, display_name)
  VALUES (NEW.id, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));

  INSERT INTO public.token_balances (user_id, balance)
  VALUES (NEW.id, _starter_tokens);

  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (NEW.id, _starter_tokens, 'bonus', 'Стартовые токены при регистрации');

  INSERT INTO public.settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- AI аналитик: стартовые запросы
  INSERT INTO public.ai_request_balances (user_id, balance)
  VALUES (NEW.id, _starter_ai_requests);

  INSERT INTO public.ai_request_transactions (user_id, amount, type, description)
  VALUES (NEW.id, _starter_ai_requests, 'bonus', 'Пробные запросы AI аналитика');

  RETURN NEW;
END;
$$;
