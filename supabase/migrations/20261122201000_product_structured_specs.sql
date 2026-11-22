-- Tier 2.2: Product Structured Specs (CAT-6)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS paper_gsm text,
  ADD COLUMN IF NOT EXISTS binding text,
  ADD COLUMN IF NOT EXISTS page_count integer CHECK (page_count IS NULL OR page_count > 0),
  ADD COLUMN IF NOT EXISTS dimensions text;
