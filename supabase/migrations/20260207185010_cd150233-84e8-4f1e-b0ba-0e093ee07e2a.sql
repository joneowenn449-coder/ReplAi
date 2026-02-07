
-- =============================================
-- Phase 1: Authentication & Multi-tenancy (fixed order)
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table FIRST
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage user_roles"
  ON public.user_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Create has_role function BEFORE any policies that use it
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create profiles table (now has_role exists)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create token_balances table
CREATE TABLE public.token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token balance"
  ON public.token_balances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all token balances"
  ON public.token_balances FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage token_balances"
  ON public.token_balances FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Create token_transactions table
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'bonus',
  description TEXT,
  review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.token_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
  ON public.token_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage token_transactions"
  ON public.token_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Add user_id to existing tables (nullable for existing data)
ALTER TABLE public.settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chats ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.product_recommendations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. Drop old RLS policies and create new user-scoped ones

-- settings
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Service role can manage settings" ON public.settings;

CREATE POLICY "Users can view their own settings"
  ON public.settings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own settings"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage settings"
  ON public.settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- reviews
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Service role can manage reviews" ON public.reviews;

CREATE POLICY "Users can view their own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage reviews"
  ON public.reviews FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- chats
DROP POLICY IF EXISTS "Authenticated users can insert chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can update chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can view chats" ON public.chats;
DROP POLICY IF EXISTS "Service role can manage chats" ON public.chats;

CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own chats"
  ON public.chats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage chats"
  ON public.chats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- chat_messages
DROP POLICY IF EXISTS "Authenticated users can insert chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can view chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Service role can manage chat_messages" ON public.chat_messages;

CREATE POLICY "Users can view their own chat_messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own chat_messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage chat_messages"
  ON public.chat_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- product_recommendations
DROP POLICY IF EXISTS "Authenticated users can delete recommendations" ON public.product_recommendations;
DROP POLICY IF EXISTS "Authenticated users can insert recommendations" ON public.product_recommendations;
DROP POLICY IF EXISTS "Authenticated users can view recommendations" ON public.product_recommendations;
DROP POLICY IF EXISTS "Service role can manage recommendations" ON public.product_recommendations;

CREATE POLICY "Users can view their own recommendations"
  ON public.product_recommendations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own recommendations"
  ON public.product_recommendations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own recommendations"
  ON public.product_recommendations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage recommendations"
  ON public.product_recommendations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 9. Trigger to auto-create profile, token balance, settings, and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _starter_tokens INTEGER := 10;
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
