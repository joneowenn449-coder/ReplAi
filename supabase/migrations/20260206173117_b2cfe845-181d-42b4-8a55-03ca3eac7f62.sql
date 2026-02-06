ALTER TABLE public.reviews DROP CONSTRAINT reviews_status_check;

ALTER TABLE public.reviews ADD CONSTRAINT reviews_status_check CHECK (status IN ('new', 'pending', 'auto', 'sent', 'archived'));