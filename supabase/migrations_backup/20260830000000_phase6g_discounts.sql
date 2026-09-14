-- Migration: Phase 6G Discounts & Coupons (Final Server-Authoritative Architecture)
-- Adds discount tracking columns to orders and checkout_sessions, hardened required-org atomic usage increment RPC, unique code constraints, and strict admin/member-only RLS policies

-- 1. Add discount_id and discount_code snapshot columns to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_id UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- 2. Add discount_id and discount_code to checkout_sessions
ALTER TABLE public.checkout_sessions
ADD COLUMN IF NOT EXISTS discount_id UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- 3. Enforce case-insensitive unique coupon codes per organization
CREATE UNIQUE INDEX IF NOT EXISTS discounts_org_code_idx 
ON public.discounts (organization_id, UPPER(code));

-- 4. Hardened atomic function to increment discount usage requiring organization_id
CREATE OR REPLACE FUNCTION public.increment_discount_usage(
  p_discount_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  UPDATE public.discounts
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_discount_id
    AND organization_id = p_organization_id
    AND active = TRUE
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (expires_at IS NULL OR expires_at >= NOW())
    AND (usage_limit IS NULL OR usage_count < usage_limit);

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  RETURN v_rows_updated > 0;
END;
$$;

-- Restrict function execution permissions
REVOKE ALL ON FUNCTION public.increment_discount_usage(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage(UUID, UUID) TO service_role, authenticated;

-- 5. Enable RLS on discounts, discount_products, discount_categories
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_categories ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if re-running
DROP POLICY IF EXISTS discounts_org_admin_all ON public.discounts;
DROP POLICY IF EXISTS discounts_org_member_read ON public.discounts;
DROP POLICY IF EXISTS discounts_public_read ON public.discounts;

DROP POLICY IF EXISTS discount_products_org_admin_all ON public.discount_products;
DROP POLICY IF EXISTS discount_products_org_member_read ON public.discount_products;
DROP POLICY IF EXISTS discount_products_public_read ON public.discount_products;

DROP POLICY IF EXISTS discount_categories_org_admin_all ON public.discount_categories;
DROP POLICY IF EXISTS discount_categories_org_member_read ON public.discount_categories;
DROP POLICY IF EXISTS discount_categories_public_read ON public.discount_categories;

-- 6. Strict RLS Policies for discounts (Admin & Member Access Only - No Public Read)
CREATE POLICY discounts_org_admin_all ON public.discounts
  FOR ALL
  USING (
    public.is_organization_admin(organization_id)
  )
  WITH CHECK (
    public.is_organization_admin(organization_id)
  );

CREATE POLICY discounts_org_member_read ON public.discounts
  FOR SELECT
  USING (
    public.is_organization_member(organization_id)
  );

-- 7. Strict RLS Policies for discount_products (Admin & Member Access Only - No Public Read)
CREATE POLICY discount_products_org_admin_all ON public.discount_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.discounts d
      WHERE d.id = discount_products.discount_id
        AND public.is_organization_admin(d.organization_id)
    )
  );

CREATE POLICY discount_products_org_member_read ON public.discount_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discounts d
      WHERE d.id = discount_products.discount_id
        AND public.is_organization_member(d.organization_id)
    )
  );

-- 8. Strict RLS Policies for discount_categories (Admin & Member Access Only - No Public Read)
CREATE POLICY discount_categories_org_admin_all ON public.discount_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.discounts d
      WHERE d.id = discount_categories.discount_id
        AND public.is_organization_admin(d.organization_id)
    )
  );

CREATE POLICY discount_categories_org_member_read ON public.discount_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discounts d
      WHERE d.id = discount_categories.discount_id
        AND public.is_organization_member(d.organization_id)
    )
  );
