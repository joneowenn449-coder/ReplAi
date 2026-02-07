
-- Create product_recommendations table
CREATE TABLE public.product_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_article TEXT NOT NULL,
  target_article TEXT NOT NULL,
  target_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_article, target_article)
);

-- Enable RLS
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view recommendations"
ON public.product_recommendations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert recommendations"
ON public.product_recommendations FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can delete recommendations"
ON public.product_recommendations FOR DELETE USING (true);

CREATE POLICY "Service role can manage recommendations"
ON public.product_recommendations FOR ALL USING (true) WITH CHECK (true);
