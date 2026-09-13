-- Migration: 20260913000000_inventory_and_bundle_public_read.sql
-- Description: Adds public read RLS policies on inventory, bundle_items, warehouses, and product_addons
-- Purpose: Ensures storefront catalog and stock availability remain resilient even if server credentials fall back or fail.

-- 1. Inventory Table Public Read
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read inventory" ON public.inventory;
CREATE POLICY "Public read inventory"
  ON public.inventory
  FOR SELECT
  USING (true);

-- 2. Bundle Items Table Public Read
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read bundle items" ON public.bundle_items;
CREATE POLICY "Public read bundle items"
  ON public.bundle_items
  FOR SELECT
  USING (true);

-- 3. Warehouses Table Public Read (Active warehouses)
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active warehouses" ON public.warehouses;
CREATE POLICY "Public read active warehouses"
  ON public.warehouses
  FOR SELECT
  USING (COALESCE(active, true) = true);

-- 4. Product Add-ons Table Public Read (Active add-on links)
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product addons" ON public.product_addons;
CREATE POLICY "Public read product addons"
  ON public.product_addons
  FOR SELECT
  USING (COALESCE(active, true) = true);
