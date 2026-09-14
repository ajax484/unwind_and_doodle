-- Migration: Phase 6L — Coloring Book Themes & Cover Personalization
-- Creates foundation tables, relationships, RLS policies, and RPCs for customizable coloring books.

-- 1. Create themes table
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NULL,
  storage_path TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_org_slug ON public.themes(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_themes_org_sort ON public.themes(organization_id, sort_order);

-- 2. Create product_themes junction table
CREATE TABLE IF NOT EXISTS public.product_themes (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_product_themes_product ON public.product_themes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_themes_theme ON public.product_themes(theme_id);

-- 3. Extend products table with theme customization capability flag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supports_theme_customization BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Create order item theme customization table
CREATE TABLE IF NOT EXISTS public.order_item_theme_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  cover_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_item_theme_customizations_item UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_order_item_theme_cust_item ON public.order_item_theme_customizations(order_item_id);

-- 5. Create order item theme snapshots table (denormalized theme names)
CREATE TABLE IF NOT EXISTS public.order_item_theme_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customization_id UUID NOT NULL REFERENCES public.order_item_theme_customizations(id) ON DELETE CASCADE,
  theme_id UUID NULL REFERENCES public.themes(id) ON DELETE SET NULL,
  theme_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_item_theme_snapshots_cust_theme UNIQUE (customization_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_order_item_theme_snapshots_cust ON public.order_item_theme_snapshots(customization_id);

-- 6. RLS Policies
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_theme_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_theme_snapshots ENABLE ROW LEVEL SECURITY;

-- Themes Policies
DROP POLICY IF EXISTS "Public read active themes" ON public.themes;
CREATE POLICY "Public read active themes" ON public.themes
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Org admin manage themes" ON public.themes;
CREATE POLICY "Org admin manage themes" ON public.themes
  FOR ALL USING (public.is_organization_admin(organization_id));

-- Product Themes Policies
DROP POLICY IF EXISTS "Public read product themes" ON public.product_themes;
CREATE POLICY "Public read product themes" ON public.product_themes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_themes.product_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Org admin manage product themes" ON public.product_themes;
CREATE POLICY "Org admin manage product themes" ON public.product_themes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_themes.product_id AND public.is_organization_admin(p.organization_id)
    )
  );

-- Order Item Theme Customizations & Snapshots Policies
DROP POLICY IF EXISTS "Read order item theme customizations" ON public.order_item_theme_customizations;
CREATE POLICY "Read order item theme customizations" ON public.order_item_theme_customizations
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Service role manage order item theme customizations" ON public.order_item_theme_customizations;
CREATE POLICY "Service role manage order item theme customizations" ON public.order_item_theme_customizations
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Read order item theme snapshots" ON public.order_item_theme_snapshots;
CREATE POLICY "Read order item theme snapshots" ON public.order_item_theme_snapshots
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Service role manage order item theme snapshots" ON public.order_item_theme_snapshots;
CREATE POLICY "Service role manage order item theme snapshots" ON public.order_item_theme_snapshots
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- 7. Admin Theme Management RPCs

-- Create Admin Theme
CREATE OR REPLACE FUNCTION public.create_admin_theme(
  p_org_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_storage_path TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE,
  p_sort_order INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_theme_id UUID;
  v_clean_name TEXT;
  v_clean_slug TEXT;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  v_clean_name := TRIM(COALESCE(p_name, ''));
  v_clean_slug := LOWER(TRIM(COALESCE(p_slug, '')));

  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Theme name cannot be empty.';
  END IF;

  IF v_clean_slug = '' THEN
    RAISE EXCEPTION 'Theme slug cannot be empty.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.themes
    WHERE organization_id = p_org_id AND slug = v_clean_slug
  ) THEN
    RAISE EXCEPTION 'A theme with slug "%" already exists for this organization.', v_clean_slug;
  END IF;

  INSERT INTO public.themes (
    organization_id,
    name,
    slug,
    description,
    storage_path,
    is_active,
    sort_order
  ) VALUES (
    p_org_id,
    v_clean_name,
    v_clean_slug,
    TRIM(p_description),
    TRIM(p_storage_path),
    COALESCE(p_is_active, TRUE),
    COALESCE(p_sort_order, 0)
  ) RETURNING id INTO v_theme_id;

  RETURN v_theme_id;
END;
$$;

-- Update Admin Theme
CREATE OR REPLACE FUNCTION public.update_admin_theme(
  p_org_id UUID,
  p_theme_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_storage_path TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_name TEXT;
  v_clean_slug TEXT;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.themes
    WHERE id = p_theme_id AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Theme % does not exist for organization %', p_theme_id, p_org_id;
  END IF;

  IF p_slug IS NOT NULL THEN
    v_clean_slug := LOWER(TRIM(p_slug));
    IF v_clean_slug = '' THEN
      RAISE EXCEPTION 'Theme slug cannot be empty.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.themes
      WHERE organization_id = p_org_id AND slug = v_clean_slug AND id <> p_theme_id
    ) THEN
      RAISE EXCEPTION 'A theme with slug "%" already exists for this organization.', v_clean_slug;
    END IF;
  END IF;

  IF p_name IS NOT NULL THEN
    v_clean_name := TRIM(p_name);
    IF v_clean_name = '' THEN
      RAISE EXCEPTION 'Theme name cannot be empty.';
    END IF;
  END IF;

  UPDATE public.themes
  SET
    name = COALESCE(v_clean_name, name),
    slug = COALESCE(v_clean_slug, slug),
    description = CASE WHEN p_description IS NOT NULL THEN TRIM(p_description) ELSE description END,
    storage_path = CASE WHEN p_storage_path IS NOT NULL THEN TRIM(p_storage_path) ELSE storage_path END,
    is_active = COALESCE(p_is_active, is_active),
    sort_order = COALESCE(p_sort_order, sort_order),
    updated_at = NOW()
  WHERE id = p_theme_id AND organization_id = p_org_id;

  RETURN TRUE;
END;
$$;

-- Delete Admin Theme
CREATE OR REPLACE FUNCTION public.delete_admin_theme(
  p_org_id UUID,
  p_theme_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.themes
    WHERE id = p_theme_id AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Theme % does not exist for organization %', p_theme_id, p_org_id;
  END IF;

  DELETE FROM public.themes
  WHERE id = p_theme_id AND organization_id = p_org_id;

  RETURN TRUE;
END;
$$;

-- Toggle Admin Theme Active Status
CREATE OR REPLACE FUNCTION public.toggle_admin_theme_active(
  p_org_id UUID,
  p_theme_id UUID,
  p_is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  UPDATE public.themes
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = p_theme_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Theme % does not exist for organization %', p_theme_id, p_org_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Reorder Admin Themes
CREATE OR REPLACE FUNCTION public.reorder_admin_themes(
  p_org_id UUID,
  p_theme_orders JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item JSONB;
  v_theme_id UUID;
  v_order INTEGER;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_theme_orders) LOOP
    v_theme_id := (v_item->>'id')::UUID;
    v_order := (v_item->>'sort_order')::INTEGER;

    UPDATE public.themes
    SET sort_order = v_order, updated_at = NOW()
    WHERE id = v_theme_id AND organization_id = p_org_id;
  END LOOP;

  RETURN TRUE;
END;
$$;

-- Assign Themes to Product
CREATE OR REPLACE FUNCTION public.assign_product_themes(
  p_org_id UUID,
  p_product_id UUID,
  p_theme_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prod_org UUID;
  v_theme_id UUID;
  v_theme_org UUID;
  v_theme_active BOOLEAN;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  SELECT organization_id INTO v_prod_org
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND OR v_prod_org <> p_org_id THEN
    RAISE EXCEPTION 'Product % does not belong to organization %', p_product_id, p_org_id;
  END IF;

  -- Validate all themes belong to org and are active
  IF p_theme_ids IS NOT NULL AND array_length(p_theme_ids, 1) > 0 THEN
    FOREACH v_theme_id IN ARRAY p_theme_ids LOOP
      SELECT organization_id, is_active INTO v_theme_org, v_theme_active
      FROM public.themes
      WHERE id = v_theme_id;

      IF NOT FOUND OR v_theme_org <> p_org_id THEN
        RAISE EXCEPTION 'Theme % does not belong to organization %', v_theme_id, p_org_id;
      END IF;

      IF NOT v_theme_active THEN
        RAISE EXCEPTION 'Theme % is inactive and cannot be assigned to products', v_theme_id;
      END IF;
    END LOOP;
  END IF;

  -- Atomic replacement
  DELETE FROM public.product_themes WHERE product_id = p_product_id;

  IF p_theme_ids IS NOT NULL AND array_length(p_theme_ids, 1) > 0 THEN
    INSERT INTO public.product_themes (product_id, theme_id)
    SELECT DISTINCT p_product_id, unnest(p_theme_ids);
  END IF;

  RETURN TRUE;
END;
$$;

-- Storefront Theme Retrieval RPC
CREATE OR REPLACE FUNCTION public.get_product_available_themes(
  p_product_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  storage_path TEXT,
  sort_order INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.name, t.description, t.storage_path, t.sort_order
  FROM public.product_themes pt
  JOIN public.themes t ON t.id = pt.theme_id
  WHERE pt.product_id = p_product_id
    AND t.is_active = TRUE
  ORDER BY t.sort_order ASC, t.name ASC;
$$;

REVOKE ALL ON FUNCTION public.create_admin_theme FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_theme TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.update_admin_theme FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_theme TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.delete_admin_theme FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_admin_theme TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.toggle_admin_theme_active FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_admin_theme_active TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.reorder_admin_themes FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_admin_themes TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.assign_product_themes FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_product_themes TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.get_product_available_themes FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_available_themes TO service_role, authenticated, anon;
