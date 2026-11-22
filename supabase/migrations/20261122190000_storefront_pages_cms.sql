-- Tier 1.3: Lightweight Storefront Content & Policy Pages CMS (CAT-5, CHK-1)

CREATE TABLE IF NOT EXISTS public.storefront_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug IN ('about', 'delivery', 'returns', 'faq', 'contact')),
  title text NOT NULL,
  subtitle text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title text,
  seo_description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_storefront_pages_org_slug
  ON public.storefront_pages (organization_id, slug);

ALTER TABLE public.storefront_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read storefront pages" ON public.storefront_pages;
CREATE POLICY "Public can read storefront pages"
  ON public.storefront_pages
  FOR SELECT
  USING (true);
