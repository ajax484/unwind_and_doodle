-- Migration: 20260914100000_unified_product_media.sql
-- Description: Implement Unified Product Media Architecture (images, videos, ordering, thumbnails)

-- 1. Create product_media_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_media_type') THEN
    CREATE TYPE public.product_media_type AS ENUM ('image', 'video');
  END IF;
END $$;

-- 2. Create product_media table
CREATE TABLE IF NOT EXISTS public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type public.product_media_type NOT NULL DEFAULT 'image',
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_media_sort_order_non_negative CHECK (sort_order >= 0)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_product_sort ON public.product_media USING btree (product_id, sort_order);

-- 4. Updated at trigger
DROP TRIGGER IF EXISTS product_media_updated_at ON public.product_media;
CREATE TRIGGER product_media_updated_at
  BEFORE UPDATE ON public.product_media
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Backfill existing product_images records into product_media
INSERT INTO public.product_media (
  id,
  product_id,
  type,
  storage_path,
  thumbnail_path,
  alt_text,
  sort_order,
  created_at,
  updated_at
)
SELECT
  id,
  product_id,
  'image'::public.product_media_type,
  storage_path,
  NULL,
  alt_text,
  sort_order,
  created_at,
  created_at
FROM public.product_images
ON CONFLICT (id) DO NOTHING;

-- 6. Row Level Security
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_media_public_read ON public.product_media;
CREATE POLICY product_media_public_read ON public.product_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.status = 'published'::public.product_status
    )
  );

DROP POLICY IF EXISTS product_media_admin_all ON public.product_media;
CREATE POLICY product_media_admin_all ON public.product_media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND public.is_organization_admin(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

-- 7. Permissions & Grants
GRANT ALL ON TABLE public.product_media TO anon;
GRANT ALL ON TABLE public.product_media TO authenticated;
GRANT ALL ON TABLE public.product_media TO service_role;
