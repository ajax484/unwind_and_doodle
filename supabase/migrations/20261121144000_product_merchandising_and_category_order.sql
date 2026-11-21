-- Product merchandising (global display order + flexible homepage featuring)
-- and category storefront ordering

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Indexes for storefront catalog & homepage queries
CREATE INDEX IF NOT EXISTS idx_products_display_order
  ON public.products (organization_id, display_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_featured
  ON public.products (organization_id, featured_order ASC, display_order ASC)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_categories_sort_order
  ON public.categories (organization_id, sort_order ASC, name ASC);

-- Backfill sequential display_order per organization for existing products
WITH ranked_products AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at DESC, id ASC) AS rn
  FROM public.products
  WHERE display_order = 0
)
UPDATE public.products AS p
SET display_order = rp.rn
FROM ranked_products AS rp
WHERE p.id = rp.id;

-- Idempotently ensure the 6 canonical shopping categories exist per organization
-- without deleting any existing categories or product assignments
WITH canonical_categories(name, slug, description, sort_order) AS (
  VALUES
    ('Coloring Books', 'coloring-books', 'Mindful illustrations on thick, bleed-resistant pages.', 1),
    ('Journals', 'journals', 'Guided and open-layout journals for daily reflection.', 2),
    ('Game Books', 'game-books', 'Playful activity and puzzle books for relaxing offline.', 3),
    ('Customized Books', 'customized-books', 'Personalized keepsake books made from your photos and themes.', 4),
    ('Coloring Tools', 'coloring-tools', 'Artist-grade pencils, markers, and pens for smooth coloring.', 5),
    ('Kits', 'kits', 'Curated bundles combining books, tools, and gift-ready sets.', 6)
)
INSERT INTO public.categories (organization_id, name, slug, description, sort_order)
SELECT
  o.id,
  cc.name,
  cc.slug,
  cc.description,
  cc.sort_order
FROM public.organizations AS o
CROSS JOIN canonical_categories AS cc
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories AS existing
  WHERE existing.organization_id = o.id
    AND existing.slug = cc.slug
);

-- Assign default sort_order to canonical categories if still 0
WITH canonical_order(slug, sort_order) AS (
  VALUES
    ('coloring-books', 1),
    ('journals', 2),
    ('game-books', 3),
    ('customized-books', 4),
    ('coloring-tools', 5),
    ('kits', 6)
)
UPDATE public.categories AS c
SET sort_order = co.sort_order
FROM canonical_order AS co
WHERE c.slug = co.slug
  AND c.sort_order = 0;

-- Assign sequential sort_order after canonical categories for any other existing categories still at 0
WITH remaining_categories AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY name ASC, id ASC) + 10 AS rn
  FROM public.categories
  WHERE sort_order = 0
)
UPDATE public.categories AS c
SET sort_order = rc.rn
FROM remaining_categories AS rc
WHERE c.id = rc.id;
