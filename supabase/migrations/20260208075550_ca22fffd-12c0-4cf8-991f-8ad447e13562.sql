
-- 1. Назначить роль admin для tygrosyss@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'tygrosyss@gmail.com'
ON CONFLICT DO NOTHING;

-- 2. RLS: админы могут обновлять балансы токенов
CREATE POLICY "Admins can update token balances"
ON public.token_balances FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. RLS: админы могут создавать транзакции
CREATE POLICY "Admins can insert token transactions"
ON public.token_transactions FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
