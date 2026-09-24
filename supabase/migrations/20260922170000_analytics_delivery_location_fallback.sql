-- Migration: 20260922170000_analytics_delivery_location_fallback.sql
-- Description: Updates get_analytics_overview RPC to fall back to shipping_address city/state when location_id is NULL.

CREATE OR REPLACE FUNCTION "public"."get_analytics_overview"(
  "p_org_id" "uuid",
  "p_from" timestamp with time zone,
  "p_to" timestamp with time zone,
  "p_prev_from" timestamp with time zone,
  "p_prev_to" timestamp with time zone
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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

  -- F. Top Delivery Locations (with fallback to shipping_address city/state for manual & imported orders)
  SELECT COALESCE(jsonb_agg(sub), '[]'::JSONB)
  INTO v_top_locations
  FROM (
    SELECT 
      MAX(o.location_id::text) AS "locationId",
      COALESCE(
        l.name,
        NULLIF(NULLIF(o.shipping_address->>'city', ''), 'Unknown'),
        NULLIF(NULLIF(o.shipping_address->>'state', ''), 'Unknown'),
        'Unknown / Other'
      ) AS "locationName",
      COALESCE(
        l.state,
        NULLIF(NULLIF(o.shipping_address->>'state', ''), 'Unknown'),
        'N/A'
      ) AS state,
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
    GROUP BY 
      COALESCE(
        l.name,
        NULLIF(NULLIF(o.shipping_address->>'city', ''), 'Unknown'),
        NULLIF(NULLIF(o.shipping_address->>'state', ''), 'Unknown'),
        'Unknown / Other'
      ),
      COALESCE(
        l.state,
        NULLIF(NULLIF(o.shipping_address->>'state', ''), 'Unknown'),
        'N/A'
      )
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

ALTER FUNCTION "public"."get_analytics_overview"(
  "p_org_id" "uuid",
  "p_from" timestamp with time zone,
  "p_to" timestamp with time zone,
  "p_prev_from" timestamp with time zone,
  "p_prev_to" timestamp with time zone
) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_analytics_overview"(
  "p_org_id" "uuid",
  "p_from" timestamp with time zone,
  "p_to" timestamp with time zone,
  "p_prev_from" timestamp with time zone,
  "p_prev_to" timestamp with time zone
) TO "anon";

GRANT ALL ON FUNCTION "public"."get_analytics_overview"(
  "p_org_id" "uuid",
  "p_from" timestamp with time zone,
  "p_to" timestamp with time zone,
  "p_prev_from" timestamp with time zone,
  "p_prev_to" timestamp with time zone
) TO "authenticated";

GRANT ALL ON FUNCTION "public"."get_analytics_overview"(
  "p_org_id" "uuid",
  "p_from" timestamp with time zone,
  "p_to" timestamp with time zone,
  "p_prev_from" timestamp with time zone,
  "p_prev_to" timestamp with time zone
) TO "service_role";
