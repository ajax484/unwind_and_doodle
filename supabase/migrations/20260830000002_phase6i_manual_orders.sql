-- Migration: Phase 6I Manual Orders & Customer Payment Links (Production Hardened Final Pass)
-- Reconciles manual order creation with canonical database schemas, inventory reservation, server-authoritative discount rules, concurrent idempotency handling, and payment request management.

-- 1. Ensure idempotency_key column & unique index exists on orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_org_idempotency ON public.orders(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Ensure unique index exists on order_payment_requests token
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_payment_requests_token ON public.order_payment_requests(token);

-- 3. Hardened Atomic RPC Function for Admin Manual Order Creation
DROP FUNCTION IF EXISTS public.create_admin_manual_order(UUID, JSONB, JSONB, JSONB, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.create_admin_manual_order(UUID, JSONB, JSONB, JSONB, UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_admin_manual_order(
  p_org_id UUID,
  p_customer JSONB,
  p_shipping_address JSONB,
  p_items JSONB,
  p_location_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_manual_order_channel TEXT DEFAULT 'instagram',
  p_discount_code TEXT DEFAULT NULL,
  p_shipping_fee NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
-- INTENTIONAL BUSINESS RULE: Admin-created manual orders allow selling products with status 'published' or 'draft'
-- (allowing admins to process private custom/draft items for clients over DM/phone before public catalog listing),
-- while strictly excluding 'archived' products.
DECLARE
  v_order_id UUID;
  v_payment_req_id UUID;
  v_order_number TEXT;
  v_token TEXT;
  v_cust_email TEXT;
  v_cust_first TEXT;
  v_cust_last TEXT;
  v_cust_phone TEXT;
  v_cust_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_prod_name TEXT;
  v_prod_sku TEXT;
  v_prod_type public.product_type;
  v_prod_org UUID;
  v_prod_status public.product_status;
  v_prod_price NUMERIC;
  v_item_subtotal NUMERIC;
  v_subtotal NUMERIC := 0;
  v_discount_id UUID := NULL;
  v_disc_code TEXT := NULL;
  v_discount_type public.discount_type;
  v_discount_value NUMERIC;
  v_discount_min_amount NUMERIC;
  v_discount_usage_limit INTEGER;
  v_discount_usage_count INTEGER;
  v_discount_starts_at TIMESTAMPTZ;
  v_discount_expires_at TIMESTAMPTZ;
  v_discount_active BOOLEAN;
  v_discount_amount NUMERIC := 0;
  v_total NUMERIC := 0;
  v_order_item_id UUID;
  v_comp RECORD;
  v_product_ids UUID[];
  v_inv_id UUID;
  v_warehouse_id UUID;
  v_rand_hex TEXT;
  v_existing_order_id UUID;
BEGIN
  -- 1. Verify caller authorization (SECURITY DEFINER requirement)
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  -- 2. Idempotency Check (Fast Path for existing idempotency key)
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    SELECT id, order_number, total, subtotal, discount_total, shipping_fee
    INTO v_existing_order_id, v_order_number, v_total, v_subtotal, v_discount_amount, p_shipping_fee
    FROM public.orders
    WHERE organization_id = p_org_id AND idempotency_key = TRIM(p_idempotency_key);

    IF FOUND THEN
      SELECT token, id INTO v_token, v_payment_req_id
      FROM public.order_payment_requests
      WHERE order_id = v_existing_order_id;

      RETURN jsonb_build_object(
        'order_id', v_existing_order_id,
        'order_number', v_order_number,
        'payment_request_id', v_payment_req_id,
        'token', v_token,
        'subtotal', v_subtotal,
        'discount_total', v_discount_amount,
        'shipping_fee', p_shipping_fee,
        'total', v_total,
        'idempotent', true
      );
    END IF;
  END IF;

  -- 3. Validate customer information
  v_cust_email := TRIM(p_customer->>'email');
  v_cust_first := TRIM(COALESCE(p_customer->>'first_name', ''));
  v_cust_last := TRIM(COALESCE(p_customer->>'last_name', ''));
  v_cust_phone := TRIM(COALESCE(p_customer->>'phone', ''));

  IF v_cust_email IS NULL OR v_cust_email = '' THEN
    RAISE EXCEPTION 'Customer email is required for manual order creation.';
  END IF;

  -- Resolve customer_id safely scoped to organization_id
  SELECT id INTO v_cust_id
  FROM public.customers
  WHERE organization_id = p_org_id AND LOWER(email) = LOWER(v_cust_email)
  LIMIT 1;

  -- 4. Validate items presence & check duplicate product_id values
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Manual order must contain at least one product item.';
  END IF;

  SELECT array_agg((item->>'product_id')::UUID)
  INTO v_product_ids
  FROM jsonb_array_elements(p_items) AS item;

  IF (SELECT COUNT(DISTINCT id) FROM unnest(v_product_ids) AS id) <> array_length(v_product_ids, 1) THEN
    RAISE EXCEPTION 'Order items cannot contain duplicate product IDs. Combine quantities into a single item.';
  END IF;

  -- 5. Resolve & Validate Warehouse
  v_warehouse_id := p_warehouse_id;
  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE organization_id = p_org_id AND is_active = TRUE
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'No active warehouse found for organization %', p_org_id;
    END IF;
  ELSE
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE id = v_warehouse_id AND organization_id = p_org_id AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Warehouse % is not active or does not belong to organization %', p_warehouse_id, p_org_id;
    END IF;
  END IF;

  -- 6. Calculate DB-authoritative pricing for items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Product quantity must be greater than zero.';
    END IF;

    SELECT name, sku, product_type, status, organization_id, selling_price
    INTO v_prod_name, v_prod_sku, v_prod_type, v_prod_status, v_prod_org, v_prod_price
    FROM public.products
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % does not exist', v_product_id;
    END IF;

    IF v_prod_org <> p_org_id THEN
      RAISE EXCEPTION 'Product % belongs to another organization', v_product_id;
    END IF;

    -- Intentional business rule: Allow published and draft products for admin manual orders, reject archived products
    IF v_prod_status = 'archived'::public.product_status THEN
      RAISE EXCEPTION 'Product % (%) is archived and cannot be ordered', v_prod_name, v_product_id;
    END IF;

    IF v_prod_price IS NULL OR v_prod_price < 0 THEN
      RAISE EXCEPTION 'Product % has an invalid selling price', v_prod_name;
    END IF;

    v_item_subtotal := v_prod_price * v_qty;
    v_subtotal := v_subtotal + v_item_subtotal;
  END LOOP;

  -- 7. Calculate server-authoritative discount using canonical discount schema
  IF p_discount_code IS NOT NULL AND TRIM(p_discount_code) <> '' THEN
    SELECT
      id, code, type, value, minimum_order_amount, usage_limit, usage_count, starts_at, expires_at, active
    INTO
      v_discount_id, v_disc_code, v_discount_type, v_discount_value, v_discount_min_amount, v_discount_usage_limit, v_discount_usage_count, v_discount_starts_at, v_discount_expires_at, v_discount_active
    FROM public.discounts
    WHERE organization_id = p_org_id
      AND LOWER(code) = LOWER(TRIM(p_discount_code))
    LIMIT 1;

    IF v_discount_id IS NULL THEN
      RAISE EXCEPTION 'Discount code "%" is invalid for this organization.', TRIM(p_discount_code);
    END IF;

    IF NOT v_discount_active THEN
      RAISE EXCEPTION 'Discount code "%" is inactive.', v_disc_code;
    END IF;

    IF v_discount_starts_at IS NOT NULL AND v_discount_starts_at > NOW() THEN
      RAISE EXCEPTION 'Discount code "%" has not started yet.', v_disc_code;
    END IF;

    IF v_discount_expires_at IS NOT NULL AND v_discount_expires_at < NOW() THEN
      RAISE EXCEPTION 'Discount code "%" has expired.', v_disc_code;
    END IF;

    IF v_discount_usage_limit IS NOT NULL AND v_discount_usage_count >= v_discount_usage_limit THEN
      RAISE EXCEPTION 'Discount code "%" has reached its usage limit.', v_disc_code;
    END IF;

    IF v_discount_min_amount IS NOT NULL AND v_subtotal < v_discount_min_amount THEN
      RAISE EXCEPTION 'Order subtotal (₦%) does not meet minimum order requirement (₦%) for discount "%".', v_subtotal, v_discount_min_amount, v_disc_code;
    END IF;

    -- Compute discount amount
    IF v_discount_type = 'percentage' THEN
      v_discount_amount := (v_subtotal * (v_discount_value / 100.0));
    ELSIF v_discount_type = 'fixed_amount' THEN
      v_discount_amount := LEAST(v_subtotal, v_discount_value);
    END IF;
  END IF;

  -- 8. Calculate Total
  IF p_shipping_fee IS NULL OR p_shipping_fee < 0 THEN
    RAISE EXCEPTION 'Shipping fee cannot be negative.';
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount_amount + p_shipping_fee);

  -- 9. Generate Order Number
  v_order_number := 'ORD-M-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));

  -- 10. Create Order Record with Concurrent Idempotency Guard
  BEGIN
    INSERT INTO public.orders (
      organization_id,
      order_number,
      order_source,
      manual_order_channel,
      created_by,
      customer_id,
      email,
      first_name,
      last_name,
      phone,
      shipping_address,
      location_id,
      warehouse_id,
      status,
      subtotal,
      discount_total,
      discount_id,
      discount_code,
      shipping_fee,
      total,
      idempotency_key,
      placed_at
    ) VALUES (
      p_org_id,
      v_order_number,
      'manual',
      COALESCE(p_manual_order_channel, 'instagram'),
      auth.uid(),
      v_cust_id,
      v_cust_email,
      v_cust_first,
      v_cust_last,
      v_cust_phone,
      p_shipping_address,
      p_location_id,
      v_warehouse_id,
      'created'::public.order_status,
      v_subtotal,
      v_discount_amount,
      v_discount_id,
      v_disc_code,
      p_shipping_fee,
      v_total,
      p_idempotency_key,
      NOW()
    ) RETURNING id INTO v_order_id;
  EXCEPTION WHEN unique_violation THEN
    -- Race condition fallback for concurrent duplicate idempotency requests
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
      SELECT id, order_number, total, subtotal, discount_total, shipping_fee
      INTO v_existing_order_id, v_order_number, v_total, v_subtotal, v_discount_amount, p_shipping_fee
      FROM public.orders
      WHERE organization_id = p_org_id AND idempotency_key = TRIM(p_idempotency_key);

      IF FOUND THEN
        SELECT token, id INTO v_token, v_payment_req_id
        FROM public.order_payment_requests
        WHERE order_id = v_existing_order_id;

        RETURN jsonb_build_object(
          'order_id', v_existing_order_id,
          'order_number', v_order_number,
          'payment_request_id', v_payment_req_id,
          'token', v_token,
          'subtotal', v_subtotal,
          'discount_total', v_discount_amount,
          'shipping_fee', p_shipping_fee,
          'total', v_total,
          'idempotent', true
        );
      END IF;
    END IF;
    RAISE;
  END;

  -- 11. Insert Order Items & Snapshot Bundle Components
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    SELECT name, sku, product_type, selling_price
    INTO v_prod_name, v_prod_sku, v_prod_type, v_prod_price
    FROM public.products
    WHERE id = v_product_id;

    v_item_subtotal := v_prod_price * v_qty;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total
    ) VALUES (
      v_order_id,
      v_product_id,
      v_prod_name,
      v_qty,
      v_prod_price,
      v_item_subtotal
    ) RETURNING id INTO v_order_item_id;

    -- Handle Bundle Component Snapshots
    IF v_prod_type = 'bundle' THEN
      FOR v_comp IN
        SELECT
          bi.component_product_id,
          p.name AS component_name,
          p.sku AS component_sku,
          bi.quantity AS qty_per_bundle,
          COALESCE(p.cost_price, 0) AS cost_price,
          p.organization_id AS comp_org,
          p.product_type AS comp_type
        FROM public.bundle_items bi
        JOIN public.products p ON p.id = bi.component_product_id
        WHERE bi.bundle_product_id = v_product_id
      LOOP
        IF v_comp.comp_org <> p_org_id THEN
          RAISE EXCEPTION 'Bundle % contains component % belonging to another organization', v_prod_name, v_comp.component_name;
        END IF;

        IF v_comp.comp_type = 'bundle' THEN
          RAISE EXCEPTION 'Nested bundles are prohibited: Bundle % contains bundle %', v_prod_name, v_comp.component_name;
        END IF;

        INSERT INTO public.order_item_bundle_components (
          order_item_id,
          component_product_id,
          product_name,
          sku,
          quantity_per_bundle,
          total_quantity,
          unit_cost_price
        ) VALUES (
          v_order_item_id,
          v_comp.component_product_id,
          v_comp.component_name,
          v_comp.component_sku,
          v_comp.qty_per_bundle,
          (v_comp.qty_per_bundle * v_qty),
          v_comp.cost_price
        );
      END LOOP;
    END IF;
  END LOOP;

  -- 12. Reserve Inventory Atomically using canonical reserve_inventory function
  -- Signature: public.reserve_inventory(p_order_id uuid, p_inventory_id uuid, p_quantity integer, p_expiration_minutes integer DEFAULT 30)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;

    SELECT product_type INTO v_prod_type
    FROM public.products
    WHERE id = v_product_id;

    IF v_prod_type <> 'bundle' THEN
      -- Reserve single physical/custom product stock
      SELECT id INTO v_inv_id
      FROM public.inventory
      WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id
      FOR UPDATE;

      IF v_inv_id IS NULL THEN
        RAISE EXCEPTION 'No inventory record for product % in warehouse %', v_product_id, v_warehouse_id;
      END IF;

      PERFORM public.reserve_inventory(v_order_id, v_inv_id, v_qty, 1440); -- 24 hours (1440 mins)
    ELSE
      -- Reserve bundle component inventory
      FOR v_comp IN
        SELECT component_product_id, quantity AS qty_per_bundle
        FROM public.bundle_items
        WHERE bundle_product_id = v_product_id
      LOOP
        SELECT id INTO v_inv_id
        FROM public.inventory
        WHERE warehouse_id = v_warehouse_id AND product_id = v_comp.component_product_id
        FOR UPDATE;

        IF v_inv_id IS NULL THEN
          RAISE EXCEPTION 'No inventory record for bundle component % in warehouse %', v_comp.component_product_id, v_warehouse_id;
        END IF;

        PERFORM public.reserve_inventory(v_order_id, v_inv_id, (v_comp.qty_per_bundle * v_qty), 1440); -- 24 hours (1440 mins)
      END LOOP;
    END IF;
  END LOOP;

  -- 13. Generate Secure Random Payment Token
  SELECT encode(gen_random_bytes(24), 'hex') INTO v_rand_hex;
  v_token := 'mpr_' || v_rand_hex;

  INSERT INTO public.order_payment_requests (
    organization_id,
    order_id,
    token,
    status,
    amount,
    currency,
    expires_at,
    created_by
  ) VALUES (
    p_org_id,
    v_order_id,
    v_token,
    'pending',
    v_total,
    'NGN',
    NOW() + INTERVAL '24 hours',
    auth.uid()
  ) RETURNING id INTO v_payment_req_id;

  -- 14. Record Initial Status History
  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    status,
    previous_status,
    note
  ) VALUES (
    v_order_id,
    NULL,
    'created'::public.order_status,
    'created'::public.order_status,
    NULL,
    'Manual order created by admin via ' || COALESCE(p_manual_order_channel, 'admin dashboard')
  );

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_request_id', v_payment_req_id,
    'token', v_token,
    'subtotal', v_subtotal,
    'discount_total', v_discount_amount,
    'shipping_fee', p_shipping_fee,
    'total', v_total,
    'idempotent', false
  );
END;
$$;

-- Function Execution Permissions
REVOKE ALL ON FUNCTION public.create_admin_manual_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_manual_order TO service_role, authenticated;
