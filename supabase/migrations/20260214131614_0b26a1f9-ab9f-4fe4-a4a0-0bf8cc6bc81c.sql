
-- Create payments table for Robokassa integration
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inv_id SERIAL NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  tokens INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (user_id = auth.uid());

-- Service role can manage all payments (for webhook)
CREATE POLICY "Service role can manage payments"
ON public.payments FOR ALL
USING (true)
WITH CHECK (true);

-- Users can insert their own payments
CREATE POLICY "Users can insert their own payments"
ON public.payments FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
