-- Migration: Production-Ready Organization-Scoped Analytics System
-- Provides high-performance database-level indexes and atomic RPC functions for commerce analytics

-- 1. Targeted Performance Indexes
CREATE INDEX IF NOT EXISTS idx_payments_org_status_paid_at 
ON public.payments (status, paid_at);

CREATE INDEX IF NOT EXISTS idx_orders_org_placed_at 
ON public.orders (organization_id, placed_at);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org_created 
ON public.checkout_sessions (organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_customers_org_created 
ON public.customers (organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_order_item_addons_order_item 
ON public.order_item_addons (order_item_id);

CREATE INDEX IF NOT EXISTS idx_order_item_bundle_comp_order_item 
ON public.order_item_bundle_components (order_item_id);

CREATE INDEX IF NOT EXISTS idx_order_item_theme_customizations_item 
ON public.order_item_theme_customizations (order_item_id);

CREATE INDEX IF NOT EXISTS idx_order_item_theme_snapshots_customization 
ON public.order_item_theme_snapshots (customization_id);


-- 2. Helper function to compute percentage change safely in SQL
CREATE OR REPLACE FUNCTION public.calculate_percentage_change_sql(
  p_current NUMERIC,
  p_previous NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_previous = 0 THEN
    IF p_current > 0 THEN
      RETURN jsonb_build_object('current', p_current, 'previous', p_previous, 'percentageChange', null, 'isNew', true);
    ELSE
      RETURN jsonb_build_object('current', p_current, 'previous', p_previous, 'percentageChange', 0, 'isNew', false);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'current', p_current,
    'previous', p_previous,
    'percentageChange', ROUND(((p_current - p_previous) / p_previous) * 100.0, 1),
    'isNew', false
  );
END;
$$;


-- 3. RPC: get_analytics_overview
CREATE OR REPLACE FUNCTION public.get_analytics_overview(
  p_org_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_prev_from TIMESTAMPTZ,
  p_prev_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Current Period Aggregates
  v_curr_revenue NUMERIC := 0;
  v_curr_paid_orders INTEGER := 0;
  v_curr_total_orders INTEGER := 0;
  v_curr_aov NUMERIC := 0;
  v_curr_gov NUMERIC := 0;
  v_curr_discount_total NUMERIC := 0;
  v_curr_new_customers INTEGER := 0;

  -- Previous Period Aggregates
  v_prev_revenue NUMERIC := 0;
  v_prev_paid_orders INTEGER := 0;
  v_prev_total_orders INTEGER := 0;
  v_prev_aov NUMERIC := 0;
  v_prev_gov NUMERIC := 0;
  v_prev_discount_total NUMERIC := 0;
  v_prev_new_customers INTEGER := 0;

  -- Result JSON structures
  v_sales_by_source JSONB := '[]'::JSONB;
  v_sales_by_channel JSONB := '[]'::JSONB;
  v_order_statuses JSONB := '[]'::JSONB;
  v_top_locations JSONB := '[]'::JSONB;
  v_top_products JSONB := '[]'::JSONB;
  v_recent_series JSONB := '[]'::JSONB;
BEGIN
  -- Authorization check
  IF auth.role() <> 'service_role' AND NOT (
    public.is_organization_admin(p_org_id) OR public.is_organization_member(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges for organization %', p_org_id;
  END IF;

  -- A1. Current Period: Revenue & Distinct Paid Orders (Strictly from payments table, no join multiplication)
  SELECT 
    COALESCE(SUM(p.amount), 0),
    COUNT(DISTINCT p.order_id)
  INTO v_curr_revenue, v_curr_paid_orders
  FROM public.payments p
  JOIN public.orders o ON o.id = p.order_id
  WHERE o.organization_id = p_org_id
    AND p.status = 'successful'
    AND p.paid_at >= p_from AND p.paid_at <= p_to
    AND o.status NOT IN ('cancelled', 'refunded');

  -- A2. Current Period: Total Orders, GOV, Discounts
  SELECT
    COUNT(o.id),
    COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'refunded') THEN o.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'refunded') THEN o.discount_total ELSE 0 END), 0)
  INTO v_curr_total_orders, v_curr_gov, v_curr_discount_total
  FROM public.orders o
  WHERE o.organization_id = p_org_id
    AND COALESCE(o.placed_at, o.created_at) >= p_from 
    AND COALESCE(o.placed_at, o.created_at) <= p_to;

  -- A3. Current Period: New Customers (whose first valid paid order is in range)
  WITH first_purchases AS (
    SELECT 
      o.customer_id,
      MIN(p.paid_at) AS first_paid_at
    FROM public.orders o
    JOIN public.payments p ON p.order_id = o.id
    WHERE o.organization_id = p_org_id
      AND o.customer_id IS NOT NULL
      AND p.status = 'successful'
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.customer_id
  )
  SELECT COUNT(*)
  INTO v_curr_new_customers
  FROM first_purchases
  WHERE first_paid_at >= p_from AND first_paid_at <= p_to;

  -- B1. Previous Period: Revenue & Distinct Paid Orders
  SELECT 
    COALESCE(SUM(p.amount), 0),
    COUNT(DISTINCT p.order_id)
  INTO v_prev_revenue, v_prev_paid_orders
  FROM public.payments p
  JOIN public.orders o ON o.id = p.order_id
  WHERE o.organization_id = p_org_id
    AND p.status = 'successful'
    AND p.paid_at >= p_prev_from AND p.paid_at <= p_prev_to
    AND o.status NOT IN ('cancelled', 'refunded');

  -- B2. Previous Period: Total Orders, GOV, Discounts
  SELECT
    COUNT(o.id),
    COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'refunded') THEN o.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'refunded') THEN o.discount_total ELSE 0 END), 0)
  INTO v_prev_total_orders, v_prev_gov, v_prev_discount_total
  FROM public.orders o
  WHERE o.organization_id = p_org_id
    AND COALESCE(o.placed_at, o.created_at) >= p_prev_from 
    AND COALESCE(o.placed_at, o.created_at) <= p_prev_to;

  -- B3. Previous Period: New Customers
  WITH first_purchases_prev AS (
    SELECT 
      o.customer_id,
      MIN(p.paid_at) AS first_paid_at
    FROM public.orders o
    JOIN public.payments p ON p.order_id = o.id
    WHERE o.organization_id = p_org_id
      AND o.customer_id IS NOT NULL
      AND p.status = 'successful'
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.customer_id
  )
  SELECT COUNT(*)
  INTO v_prev_new_customers
  FROM first_purchases_prev
  WHERE first_paid_at >= p_prev_from AND first_paid_at <= p_prev_to;

  -- Calculate AOVs safely
  IF v_curr_paid_orders > 0 THEN
    v_curr_aov := ROUND(v_curr_revenue / v_curr_paid_orders, 2);
  ELSE
    v_curr_aov := 0;
  END IF;

  IF v_prev_paid_orders > 0 THEN
    v_prev_aov := ROUND(v_prev_revenue / v_prev_paid_orders, 2);
  ELSE
    v_prev_aov := 0;
  END IF;

  -- C. Sales by Source (Storefront vs Manual, etc.)
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_sales_by_source
  FROM (
    SELECT 
      o.order_source AS source,
      COUNT(DISTINCT o.id) AS orders,
      COALESCE(SUM(p.amount), 0) AS revenue,
      CASE 
        WHEN v_curr_revenue > 0 THEN ROUND((COALESCE(SUM(p.amount), 0) / v_curr_revenue) * 100.0, 1)
        ELSE 0
      END AS "percentageOfRevenue"
    FROM public.orders o
    LEFT JOIN public.payments p ON p.order_id = o.id 
      AND p.status = 'successful' 
      AND p.paid_at >= p_from AND p.paid_at <= p_to
    WHERE o.organization_id = p_org_id
      AND COALESCE(o.placed_at, o.created_at) >= p_from 
      AND COALESCE(o.placed_at, o.created_at) <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.order_source
    ORDER BY revenue DESC
  ) sub;

  -- D. Sales by Channel (for manual orders: whatsapp, instagram, etc.)
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_sales_by_channel
  FROM (
    SELECT 
      COALESCE(o.manual_order_channel, 'unspecified') AS channel,
      COUNT(DISTINCT o.id) AS orders,
      COALESCE(SUM(p.amount), 0) AS revenue
    FROM public.orders o
    LEFT JOIN public.payments p ON p.order_id = o.id 
      AND p.status = 'successful' 
      AND p.paid_at >= p_from AND p.paid_at <= p_to
    WHERE o.organization_id = p_org_id
      AND o.order_source = 'manual'
      AND COALESCE(o.placed_at, o.created_at) >= p_from 
      AND COALESCE(o.placed_at, o.created_at) <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.manual_order_channel
    ORDER BY revenue DESC
  ) sub;

  -- E. Order Status Breakdown
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_order_statuses
  FROM (
    SELECT 
      o.status::text AS status,
      COUNT(o.id) AS count,
      CASE 
        WHEN v_curr_total_orders > 0 THEN ROUND((COUNT(o.id)::NUMERIC / v_curr_total_orders) * 100.0, 1)
        ELSE 0
      END AS percentage
    FROM public.orders o
    WHERE o.organization_id = p_org_id
      AND COALESCE(o.placed_at, o.created_at) >= p_from 
      AND COALESCE(o.placed_at, o.created_at) <= p_to
    GROUP BY o.status
    ORDER BY count DESC
  ) sub;

  -- F. Top Locations
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_top_locations
  FROM (
    SELECT 
      o.location_id AS "locationId",
      COALESCE(l.name, 'Unknown / Other') AS "locationName",
      COALESCE(l.state, 'N/A') AS state,
      COUNT(DISTINCT o.id) AS orders,
      COALESCE(SUM(p.amount), 0) AS revenue
    FROM public.orders o
    LEFT JOIN public.locations l ON l.id = o.location_id
    LEFT JOIN public.payments p ON p.order_id = o.id 
      AND p.status = 'successful' 
      AND p.paid_at >= p_from AND p.paid_at <= p_to
    WHERE o.organization_id = p_org_id
      AND COALESCE(o.placed_at, o.created_at) >= p_from 
      AND COALESCE(o.placed_at, o.created_at) <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.location_id, l.name, l.state
    ORDER BY revenue DESC, orders DESC
    LIMIT 10
  ) sub;

  -- G. Top Products (Top 5 overview snapshots, aggregating items without order duplication)
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_top_products
  FROM (
    WITH valid_paid_orders AS (
      SELECT DISTINCT p.order_id
      FROM public.payments p
      JOIN public.orders o ON o.id = p.order_id
      WHERE o.organization_id = p_org_id
        AND p.status = 'successful'
        AND p.paid_at >= p_from AND p.paid_at <= p_to
        AND o.status NOT IN ('cancelled', 'refunded')
    )
    SELECT 
      oi.product_id AS "productId",
      oi.product_name AS "productName",
      oi.sku,
      SUM(oi.quantity) AS "quantitySold",
      SUM(oi.total) AS revenue,
      COUNT(DISTINCT oi.order_id) AS "ordersCount"
    FROM public.order_items oi
    JOIN valid_paid_orders vpo ON vpo.order_id = oi.order_id
    GROUP BY oi.product_id, oi.product_name, oi.sku
    ORDER BY revenue DESC, "quantitySold" DESC
    LIMIT 5
  ) sub;

  -- Return compiled overview response
  RETURN jsonb_build_object(
    'kpis', jsonb_build_object(
      'revenue', public.calculate_percentage_change_sql(v_curr_revenue, v_prev_revenue),
      'orders', public.calculate_percentage_change_sql(v_curr_total_orders, v_prev_total_orders),
      'paidOrders', public.calculate_percentage_change_sql(v_curr_paid_orders, v_prev_paid_orders),
      'aov', public.calculate_percentage_change_sql(v_curr_aov, v_prev_aov),
      'newCustomers', public.calculate_percentage_change_sql(v_curr_new_customers, v_prev_new_customers),
      'grossOrderValue', public.calculate_percentage_change_sql(v_curr_gov, v_prev_gov),
      'totalDiscountGiven', public.calculate_percentage_change_sql(v_curr_discount_total, v_prev_discount_total)
    ),
    'salesBySource', v_sales_by_source,
    'salesByChannel', v_sales_by_channel,
    'orderStatusBreakdown', v_order_statuses,
    'topLocations', v_top_locations,
    'topProducts', v_top_products
  );
END;
$$;


-- 4. RPC: get_analytics_sales_series (Zero-filled time-series for Revenue & Orders)
CREATE OR REPLACE FUNCTION public.get_analytics_sales_series(
  p_org_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_granularity TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_step_interval INTERVAL;
  v_trunc_unit TEXT;
  v_series JSONB := '[]'::JSONB;
BEGIN
  -- Authorization check
  IF auth.role() <> 'service_role' AND NOT (
    public.is_organization_admin(p_org_id) OR public.is_organization_member(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges for organization %', p_org_id;
  END IF;

  IF p_granularity = 'month' THEN
    v_step_interval := INTERVAL '1 month';
    v_trunc_unit := 'month';
  ELSIF p_granularity = 'week' THEN
    v_step_interval := INTERVAL '1 week';
    v_trunc_unit := 'week';
  ELSE
    v_step_interval := INTERVAL '1 day';
    v_trunc_unit := 'day';
  END IF;

  WITH time_buckets AS (
    SELECT generate_series(
      date_trunc(v_trunc_unit, p_from),
      date_trunc(v_trunc_unit, p_to),
      v_step_interval
    ) AS bucket_start
  ),
  revenue_by_bucket AS (
    SELECT 
      date_trunc(v_trunc_unit, p.paid_at) AS bucket,
      SUM(p.amount) AS revenue
    FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE o.organization_id = p_org_id
      AND p.status = 'successful'
      AND p.paid_at >= p_from AND p.paid_at <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY date_trunc(v_trunc_unit, p.paid_at)
  ),
  orders_by_bucket AS (
    SELECT 
      date_trunc(v_trunc_unit, COALESCE(o.placed_at, o.created_at)) AS bucket,
      COUNT(o.id) AS orders_count
    FROM public.orders o
    WHERE o.organization_id = p_org_id
      AND COALESCE(o.placed_at, o.created_at) >= p_from 
      AND COALESCE(o.placed_at, o.created_at) <= p_to
    GROUP BY date_trunc(v_trunc_unit, COALESCE(o.placed_at, o.created_at))
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', to_char(tb.bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'revenue', COALESCE(rb.revenue, 0),
      'orders', COALESCE(ob.orders_count, 0)
    ) ORDER BY tb.bucket_start
  ), '[]'::JSONB)
  INTO v_series
  FROM time_buckets tb
  LEFT JOIN revenue_by_bucket rb ON rb.bucket = tb.bucket_start
  LEFT JOIN orders_by_bucket ob ON ob.bucket = tb.bucket_start;

  RETURN v_series;
END;
$$;


-- 5. RPC: get_analytics_products
CREATE OR REPLACE FUNCTION public.get_analytics_products(
  p_org_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_top_products JSONB := '[]'::JSONB;
  v_bundle_sales JSONB := '[]'::JSONB;
  v_comp_demand JSONB := '[]'::JSONB;
  v_theme_popularity JSONB := '[]'::JSONB;
  v_addon_performance JSONB := '[]'::JSONB;
BEGIN
  -- Authorization check
  IF auth.role() <> 'service_role' AND NOT (
    public.is_organization_admin(p_org_id) OR public.is_organization_member(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges for organization %', p_org_id;
  END IF;

  -- 1. Top products based on historical snapshots
  WITH valid_paid_orders AS (
    SELECT DISTINCT p.order_id
    FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE o.organization_id = p_org_id
      AND p.status = 'successful'
      AND p.paid_at >= p_from AND p.paid_at <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
  )
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_top_products
  FROM (
    SELECT 
      oi.product_id AS "productId",
      oi.product_name AS "productName",
      oi.sku,
      SUM(oi.quantity) AS "quantitySold",
      SUM(oi.total) AS revenue,
      COUNT(DISTINCT oi.order_id) AS "ordersCount"
    FROM public.order_items oi
    JOIN valid_paid_orders vpo ON vpo.order_id = oi.order_id
    GROUP BY oi.product_id, oi.product_name, oi.sku
    ORDER BY revenue DESC
    LIMIT 20
  ) sub;

  -- 2. Bundle Sales (treated as single parent product)
  WITH valid_paid_orders AS (
    SELECT DISTINCT p.order_id
    FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE o.organization_id = p_org_id
      AND p.status = 'successful'
      AND p.paid_at >= p_from AND p.paid_at <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
  )
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_bundle_sales
  FROM (
    SELECT 
      oi.product_id AS "productId",
      oi.product_name AS "productName",
      oi.sku,
      SUM(oi.quantity) AS "quantitySold",
      SUM(oi.total) AS revenue,
      COUNT(DISTINCT oi.order_id) AS "ordersCount"
    FROM public.order_items oi
    JOIN valid_paid_orders vpo ON vpo.order_id = oi.order_id
    JOIN public.products pr ON pr.id = oi.product_id AND pr.product_type = 'bundle'
    GROUP BY oi.product_id, oi.product_name, oi.sku
    ORDER BY revenue DESC
    LIMIT 20
  ) sub;

  -- 3. Bundle Component Demand (For inventory planning, from order_item_bundle_components)
  WITH valid_paid_orders AS (
    SELECT DISTINCT p.order_id
    FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE o.organization_id = p_org_id
      AND p.status = 'successful'
      AND p.paid_at >= p_from AND p.paid_at <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
  )
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_comp_demand
  FROM (
    SELECT 
      bc.component_product_id AS "componentProductId",
      bc.product_name AS "productName",
      bc.sku,
      SUM(bc.total_quantity) AS "totalQuantityDemanded"
    FROM public.order_item_bundle_components bc
    JOIN public.order_items oi ON oi.id = bc.order_item_id
    JOIN valid_paid_orders vpo ON vpo.order_id = oi.order_id
    GROUP BY bc.component_product_id, bc.product_name, bc.sku
    ORDER BY "totalQuantityDemanded" DESC
    LIMIT 20
  ) sub;

  -- 4. Theme popularity (from order_item_theme_snapshots)
  WITH valid_paid_orders AS (
    SELECT DISTINCT p.order_id
    FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE o.organization_id = p_org_id
      AND p.status = 'successful'
      AND p.paid_at >= p_from AND p.paid_at <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
  )
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_theme_popularity
  FROM (
    SELECT 
      ts.theme_id AS "themeId",
      ts.theme_name AS "themeName",
      COUNT(ts.id) AS "selectionsCount"
    FROM public.order_item_theme_snapshots ts
    JOIN public.order_item_theme_customizations tc ON tc.id = ts.customization_id
    JOIN public.order_items oi ON oi.id = tc.order_item_id
    JOIN valid_paid_orders vpo ON vpo.order_id = oi.order_id
    GROUP BY ts.theme_id, ts.theme_name
    ORDER BY "selectionsCount" DESC
    LIMIT 20
  ) sub;

  -- 5. Add-on performance (from order_item_addons)
  WITH valid_paid_orders AS (
    SELECT DISTINCT p.order_id
    FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE o.organization_id = p_org_id
      AND p.status = 'successful'
      AND p.paid_at >= p_from AND p.paid_at <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
  ),
  total_paid_orders_count AS (
    SELECT COUNT(*) AS total_count FROM valid_paid_orders
  )
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_addon_performance
  FROM (
    SELECT 
      oa.addon_product_id AS "addonProductId",
      oa.product_name AS "productName",
      oa.sku,
      SUM(oa.quantity) AS "quantitySold",
      SUM(oa.total) AS revenue,
      CASE 
        WHEN (SELECT total_count FROM total_paid_orders_count) > 0 THEN 
          ROUND((COUNT(DISTINCT oi.order_id)::NUMERIC / (SELECT total_count FROM total_paid_orders_count)) * 100.0, 1)
        ELSE NULL
      END AS "attachRate"
    FROM public.order_item_addons oa
    JOIN public.order_items oi ON oi.id = oa.order_item_id
    JOIN valid_paid_orders vpo ON vpo.order_id = oi.order_id
    GROUP BY oa.addon_product_id, oa.product_name, oa.sku
    ORDER BY revenue DESC
    LIMIT 20
  ) sub;

  RETURN jsonb_build_object(
    'topProducts', v_top_products,
    'bundleSales', v_bundle_sales,
    'componentDemand', v_comp_demand,
    'themePopularity', v_theme_popularity,
    'addonPerformance', v_addon_performance
  );
END;
$$;


-- 6. RPC: get_analytics_customers
CREATE OR REPLACE FUNCTION public.get_analytics_customers(
  p_org_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_prev_from TIMESTAMPTZ,
  p_prev_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_curr_new_customers INTEGER := 0;
  v_curr_purchasing_customers INTEGER := 0;
  v_curr_returning_customers INTEGER := 0;
  v_curr_repeat_rate NUMERIC := 0;
  v_curr_guest_orders INTEGER := 0;
  v_curr_registered_orders INTEGER := 0;
  v_curr_new_accounts INTEGER := 0;

  v_prev_new_customers INTEGER := 0;
  v_prev_purchasing_customers INTEGER := 0;
  v_prev_returning_customers INTEGER := 0;
  v_prev_repeat_rate NUMERIC := 0;
  v_prev_guest_orders INTEGER := 0;
  v_prev_registered_orders INTEGER := 0;
  v_prev_new_accounts INTEGER := 0;

  v_top_customers JSONB := '[]'::JSONB;
BEGIN
  -- Authorization check
  IF auth.role() <> 'service_role' AND NOT (
    public.is_organization_admin(p_org_id) OR public.is_organization_member(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges for organization %', p_org_id;
  END IF;

  -- 1. Current Period Customer Cohort Aggregates
  WITH customer_purchases AS (
    SELECT 
      o.customer_id,
      MIN(p.paid_at) AS first_paid_at,
      COUNT(DISTINCT CASE WHEN p.paid_at >= p_from AND p.paid_at <= p_to THEN o.id END) AS orders_in_range,
      COUNT(DISTINCT CASE WHEN p.paid_at < p_from THEN o.id END) AS orders_before_range,
      COUNT(DISTINCT o.id) AS total_lifetime_paid_orders
    FROM public.orders o
    JOIN public.payments p ON p.order_id = o.id
    WHERE o.organization_id = p_org_id
      AND o.customer_id IS NOT NULL
      AND p.status = 'successful'
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.customer_id
  )
  SELECT 
    COUNT(*) FILTER (WHERE first_paid_at >= p_from AND first_paid_at <= p_to),
    COUNT(*) FILTER (WHERE orders_in_range > 0),
    COUNT(*) FILTER (WHERE orders_in_range > 0 AND orders_before_range > 0),
    CASE 
      WHEN COUNT(*) FILTER (WHERE total_lifetime_paid_orders >= 1) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE total_lifetime_paid_orders >= 2)::NUMERIC / 
               COUNT(*) FILTER (WHERE total_lifetime_paid_orders >= 1)::NUMERIC) * 100.0, 1)
      ELSE 0
    END
  INTO v_curr_new_customers, v_curr_purchasing_customers, v_curr_returning_customers, v_curr_repeat_rate
  FROM customer_purchases;

  -- Guest vs Registered orders in current period
  SELECT 
    COUNT(*) FILTER (WHERE customer_id IS NULL),
    COUNT(*) FILTER (WHERE customer_id IS NOT NULL)
  INTO v_curr_guest_orders, v_curr_registered_orders
  FROM public.orders
  WHERE organization_id = p_org_id
    AND COALESCE(placed_at, created_at) >= p_from 
    AND COALESCE(placed_at, created_at) <= p_to;

  -- New registered customer accounts in current period
  SELECT COUNT(*)
  INTO v_curr_new_accounts
  FROM public.customers
  WHERE organization_id = p_org_id
    AND created_at >= p_from AND created_at <= p_to;

  -- 2. Previous Period Customer Cohort Aggregates
  WITH customer_purchases_prev AS (
    SELECT 
      o.customer_id,
      MIN(p.paid_at) AS first_paid_at,
      COUNT(DISTINCT CASE WHEN p.paid_at >= p_prev_from AND p.paid_at <= p_prev_to THEN o.id END) AS orders_in_range,
      COUNT(DISTINCT CASE WHEN p.paid_at < p_prev_from THEN o.id END) AS orders_before_range,
      COUNT(DISTINCT o.id) AS total_lifetime_paid_orders
    FROM public.orders o
    JOIN public.payments p ON p.order_id = o.id
    WHERE o.organization_id = p_org_id
      AND o.customer_id IS NOT NULL
      AND p.status = 'successful'
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY o.customer_id
  )
  SELECT 
    COUNT(*) FILTER (WHERE first_paid_at >= p_prev_from AND first_paid_at <= p_prev_to),
    COUNT(*) FILTER (WHERE orders_in_range > 0),
    COUNT(*) FILTER (WHERE orders_in_range > 0 AND orders_before_range > 0),
    CASE 
      WHEN COUNT(*) FILTER (WHERE total_lifetime_paid_orders >= 1) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE total_lifetime_paid_orders >= 2)::NUMERIC / 
               COUNT(*) FILTER (WHERE total_lifetime_paid_orders >= 1)::NUMERIC) * 100.0, 1)
      ELSE 0
    END
  INTO v_prev_new_customers, v_prev_purchasing_customers, v_prev_returning_customers, v_prev_repeat_rate
  FROM customer_purchases_prev;

  -- Guest vs Registered orders in previous period
  SELECT 
    COUNT(*) FILTER (WHERE customer_id IS NULL),
    COUNT(*) FILTER (WHERE customer_id IS NOT NULL)
  INTO v_prev_guest_orders, v_prev_registered_orders
  FROM public.orders
  WHERE organization_id = p_org_id
    AND COALESCE(placed_at, created_at) >= p_prev_from 
    AND COALESCE(placed_at, created_at) <= p_prev_to;

  -- New registered customer accounts in previous period
  SELECT COUNT(*)
  INTO v_prev_new_accounts
  FROM public.customers
  WHERE organization_id = p_org_id
    AND created_at >= p_prev_from AND created_at <= p_prev_to;

  -- 3. Top Customers (highest spend in selected period)
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_top_customers
  FROM (
    SELECT 
      c.id AS "customerId",
      TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS name,
      c.email,
      c.phone,
      COUNT(DISTINCT o.id) AS "totalOrders",
      COALESCE(SUM(p.amount), 0) AS "totalSpent",
      MAX(p.paid_at) AS "lastOrderAt"
    FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id
    JOIN public.payments p ON p.order_id = o.id
    WHERE c.organization_id = p_org_id
      AND p.status = 'successful'
      AND p.paid_at >= p_from AND p.paid_at <= p_to
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone
    ORDER BY "totalSpent" DESC, "totalOrders" DESC
    LIMIT 20
  ) sub;

  RETURN jsonb_build_object(
    'kpis', jsonb_build_object(
      'newCustomers', public.calculate_percentage_change_sql(v_curr_new_customers, v_prev_new_customers),
      'purchasingCustomers', public.calculate_percentage_change_sql(v_curr_purchasing_customers, v_prev_purchasing_customers),
      'returningCustomers', public.calculate_percentage_change_sql(v_curr_returning_customers, v_prev_returning_customers),
      'repeatPurchaseRate', public.calculate_percentage_change_sql(v_curr_repeat_rate, v_prev_repeat_rate),
      'guestOrders', public.calculate_percentage_change_sql(v_curr_guest_orders, v_prev_guest_orders),
      'registeredOrders', public.calculate_percentage_change_sql(v_curr_registered_orders, v_prev_registered_orders),
      'newAccounts', public.calculate_percentage_change_sql(v_curr_new_accounts, v_prev_new_accounts)
    ),
    'topCustomers', v_top_customers
  );
END;
$$;


-- 7. RPC: get_analytics_inventory
CREATE OR REPLACE FUNCTION public.get_analytics_inventory(
  p_org_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_stock INTEGER := 0;
  v_available_stock INTEGER := 0;
  v_reserved_stock INTEGER := 0;
  v_low_stock_count INTEGER := 0;
  v_out_of_stock_count INTEGER := 0;

  v_low_stock_products JSONB := '[]'::JSONB;
  v_out_of_stock_products JSONB := '[]'::JSONB;
  v_movement_breakdown JSONB := '[]'::JSONB;
  v_warehouse_breakdown JSONB := '[]'::JSONB;
BEGIN
  -- Authorization check
  IF auth.role() <> 'service_role' AND NOT (
    public.is_organization_admin(p_org_id) OR public.is_organization_member(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges for organization %', p_org_id;
  END IF;

  -- 1. Overall stock summaries for products belonging to organization
  SELECT 
    COALESCE(SUM(i.quantity), 0),
    COALESCE(SUM(i.quantity - i.reserved_quantity), 0),
    COALESCE(SUM(i.reserved_quantity), 0)
  INTO v_total_stock, v_available_stock, v_reserved_stock
  FROM public.inventory i
  JOIN public.products pr ON pr.id = i.product_id
  WHERE pr.organization_id = p_org_id;

  -- 2. Low stock & Out of stock product counts & lists
  WITH product_stock AS (
    SELECT 
      pr.id AS product_id,
      pr.name AS product_name,
      pr.sku,
      pr.status::text AS status,
      COALESCE(SUM(i.quantity), 0) AS quantity,
      COALESCE(SUM(i.reserved_quantity), 0) AS reserved_quantity,
      COALESCE(SUM(i.quantity - i.reserved_quantity), 0) AS available_quantity
    FROM public.products pr
    LEFT JOIN public.inventory i ON i.product_id = pr.id
    WHERE pr.organization_id = p_org_id
      AND pr.status = 'published'
      AND pr.product_type <> 'bundle' -- Bundles are virtual composites
    GROUP BY pr.id, pr.name, pr.sku, pr.status
  )
  SELECT 
    COUNT(*) FILTER (WHERE available_quantity > 0 AND available_quantity <= 5),
    COUNT(*) FILTER (WHERE available_quantity <= 0)
  INTO v_low_stock_count, v_out_of_stock_count
  FROM product_stock;

  -- Low stock items list (available <= 5 and > 0)
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_low_stock_products
  FROM (
    SELECT 
      pr.id AS "productId",
      pr.name AS "productName",
      pr.sku,
      COALESCE(SUM(i.quantity), 0) AS quantity,
      COALESCE(SUM(i.reserved_quantity), 0) AS "reservedQuantity",
      COALESCE(SUM(i.quantity - i.reserved_quantity), 0) AS "availableQuantity",
      pr.status::text AS status
    FROM public.products pr
    LEFT JOIN public.inventory i ON i.product_id = pr.id
    WHERE pr.organization_id = p_org_id
      AND pr.status = 'published'
      AND pr.product_type <> 'bundle'
    GROUP BY pr.id, pr.name, pr.sku, pr.status
    HAVING COALESCE(SUM(i.quantity - i.reserved_quantity), 0) > 0 
       AND COALESCE(SUM(i.quantity - i.reserved_quantity), 0) <= 5
    ORDER BY "availableQuantity" ASC
    LIMIT 25
  ) sub;

  -- Out of stock items list (available <= 0)
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_out_of_stock_products
  FROM (
    SELECT 
      pr.id AS "productId",
      pr.name AS "productName",
      pr.sku,
      COALESCE(SUM(i.quantity), 0) AS quantity,
      COALESCE(SUM(i.reserved_quantity), 0) AS "reservedQuantity",
      COALESCE(SUM(i.quantity - i.reserved_quantity), 0) AS "availableQuantity",
      pr.status::text AS status
    FROM public.products pr
    LEFT JOIN public.inventory i ON i.product_id = pr.id
    WHERE pr.organization_id = p_org_id
      AND pr.status = 'published'
      AND pr.product_type <> 'bundle'
    GROUP BY pr.id, pr.name, pr.sku, pr.status
    HAVING COALESCE(SUM(i.quantity - i.reserved_quantity), 0) <= 0
    ORDER BY pr.name ASC
    LIMIT 25
  ) sub;

  -- 3. Movement Breakdown over selected period
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_movement_breakdown
  FROM (
    SELECT 
      im.movement_type::text AS "movementType",
      COUNT(im.id) AS "totalMovements",
      SUM(ABS(im.quantity)) AS "totalQuantity"
    FROM public.inventory_movements im
    JOIN public.products pr ON pr.id = im.product_id
    WHERE pr.organization_id = p_org_id
      AND im.created_at >= p_from AND im.created_at <= p_to
    GROUP BY im.movement_type
    ORDER BY "totalMovements" DESC
  ) sub;

  -- 4. Warehouse stock breakdown
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_warehouse_breakdown
  FROM (
    SELECT 
      w.id AS "warehouseId",
      w.name AS "warehouseName",
      COALESCE(w.state, 'N/A') AS "warehouseCode",
      COALESCE(SUM(i.quantity), 0) AS "totalStock",
      COALESCE(SUM(i.quantity - i.reserved_quantity), 0) AS "availableStock",
      COALESCE(SUM(i.reserved_quantity), 0) AS "reservedStock",
      COUNT(DISTINCT i.product_id) AS "productCount"
    FROM public.warehouses w
    LEFT JOIN public.inventory i ON i.warehouse_id = w.id
    WHERE w.organization_id = p_org_id
    GROUP BY w.id, w.name, w.state
    ORDER BY "totalStock" DESC
  ) sub;

  RETURN jsonb_build_object(
    'summary', jsonb_build_object(
      'totalStock', v_total_stock,
      'availableStock', v_available_stock,
      'reservedStock', v_reserved_stock,
      'lowStockCount', v_low_stock_count,
      'outOfStockCount', v_out_of_stock_count
    ),
    'lowStockProducts', v_low_stock_products,
    'outOfStockProducts', v_out_of_stock_products,
    'movementBreakdown', v_movement_breakdown,
    'warehouseBreakdown', v_warehouse_breakdown
  );
END;
$$;


-- 8. RPC: get_analytics_checkout
CREATE OR REPLACE FUNCTION public.get_analytics_checkout(
  p_org_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_sessions INTEGER := 0;
  v_completed_sessions INTEGER := 0;
  v_abandoned_sessions INTEGER := 0;
  v_active_sessions INTEGER := 0;
  v_conversion_rate NUMERIC := 0;

  v_successful_payments INTEGER := 0;
  v_failed_payments INTEGER := 0;
  v_payment_success_rate NUMERIC := 0;
  v_provider_breakdown JSONB := '[]'::JSONB;
BEGIN
  -- Authorization check
  IF auth.role() <> 'service_role' AND NOT (
    public.is_organization_admin(p_org_id) OR public.is_organization_member(p_org_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges for organization %', p_org_id;
  END IF;

  -- 1. Checkout session analytics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'abandoned' OR status = 'expired'),
    COUNT(*) FILTER (WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))
  INTO v_total_sessions, v_completed_sessions, v_abandoned_sessions, v_active_sessions
  FROM public.checkout_sessions
  WHERE organization_id = p_org_id
    AND created_at >= p_from AND created_at <= p_to;

  -- Conversion rate: completed / (completed + abandoned + expired)
  IF (v_completed_sessions + v_abandoned_sessions) > 0 THEN
    v_conversion_rate := ROUND((v_completed_sessions::NUMERIC / (v_completed_sessions + v_abandoned_sessions)::NUMERIC) * 100.0, 1);
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- 2. Payment transactions analytics
  SELECT 
    COUNT(*) FILTER (WHERE p.status = 'successful'),
    COUNT(*) FILTER (WHERE p.status = 'failed')
  INTO v_successful_payments, v_failed_payments
  FROM public.payments p
  JOIN public.orders o ON o.id = p.order_id
  WHERE o.organization_id = p_org_id
    AND p.created_at >= p_from AND p.created_at <= p_to;

  IF (v_successful_payments + v_failed_payments) > 0 THEN
    v_payment_success_rate := ROUND((v_successful_payments::NUMERIC / (v_successful_payments + v_failed_payments)::NUMERIC) * 100.0, 1);
  ELSE
    v_payment_success_rate := 0;
  END IF;

  -- 3. Provider breakdown
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_provider_breakdown
  FROM (
    SELECT 
      p.provider,
      COUNT(p.id) AS "paymentsCount",
      COALESCE(SUM(CASE WHEN p.status = 'successful' THEN p.amount ELSE 0 END), 0) AS revenue
    FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE o.organization_id = p_org_id
      AND p.created_at >= p_from AND p.created_at <= p_to
    GROUP BY p.provider
    ORDER BY revenue DESC
  ) sub;

  RETURN jsonb_build_object(
    'checkoutSessions', jsonb_build_object(
      'totalSessions', v_total_sessions,
      'completedSessions', v_completed_sessions,
      'abandonedSessions', v_abandoned_sessions,
      'activeSessions', v_active_sessions,
      'conversionRate', v_conversion_rate
    ),
    'payments', jsonb_build_object(
      'successfulPayments', v_successful_payments,
      'failedPayments', v_failed_payments,
      'successRate', v_payment_success_rate,
      'providerBreakdown', v_provider_breakdown
    )
  );
END;
$$;
