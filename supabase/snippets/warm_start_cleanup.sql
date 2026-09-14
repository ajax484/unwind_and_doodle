-- ==============================================================================
-- Production Database Warm Start Script
-- Preserves:
--   - organizations (1)
--   - organization_members (3)
--   - organization_invitations (0)
--   - auth.users (team members only)
--   - locations (5)
--   - warehouses (1)
--   - warehouse_locations
--   - delivery_rates
--   - marketing_segments
-- Clears:
--   - orders, order_items, order payments, carts, customers
--   - products, product_media, product_images, categories, themes
--   - inventory, receipts, notifications, discounts, logs
--   - non-team customer accounts from auth.users
-- ==============================================================================

BEGIN;

-- 1. Commerce: Orders, Items, Payments
TRUNCATE TABLE
  public.order_item_theme_customizations,
  public.order_item_theme_snapshots,
  public.order_item_addons,
  public.order_item_bundle_components,
  public.order_items,
  public.order_payment_requests,
  public.order_status_history,
  public.payments,
  public.orders
CASCADE;

-- 2. Commerce: Carts & Checkout Sessions
TRUNCATE TABLE
  public.cart_items,
  public.checkout_sessions,
  public.carts
CASCADE;

-- 3. Customers
TRUNCATE TABLE
  public.customer_addresses,
  public.stock_notifications,
  public.customers
CASCADE;

-- 4. Catalog: Products, Categories, Themes & Media
TRUNCATE TABLE
  public.bundle_items,
  public.product_addons,
  public.product_categories,
  public.product_themes,
  public.product_media,
  public.product_images,
  public.review_images,
  public.reviews,
  public.customization_assets,
  public.customizations,
  public.themes,
  public.categories,
  public.products
CASCADE;

-- 5. Inventory & Stock
TRUNCATE TABLE
  public.inventory_reservations,
  public.inventory_movements,
  public.inventory,
  public.stock_receipt_items,
  public.stock_receipts
CASCADE;

-- 6. Discounts & Marketing
TRUNCATE TABLE
  public.discount_categories,
  public.discount_products,
  public.discounts,
  public.marketing_campaign_recipients,
  public.marketing_email_events,
  public.marketing_campaigns,
  public.marketing_automations
CASCADE;

-- 7. Notifications & Logs
TRUNCATE TABLE
  public.notifications,
  public.audit_logs,
  public.domain_events
CASCADE;

-- 8. Auth: Prune non-team users (keep only organization members)
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM public.organization_members
);

COMMIT;
