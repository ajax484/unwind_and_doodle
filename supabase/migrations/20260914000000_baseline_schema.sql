


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."audit_action" AS ENUM (
    'create',
    'update',
    'delete'
);


ALTER TYPE "public"."audit_action" OWNER TO "postgres";


CREATE TYPE "public"."checkout_status" AS ENUM (
    'active',
    'completed',
    'expired',
    'abandoned'
);


ALTER TYPE "public"."checkout_status" OWNER TO "postgres";


CREATE TYPE "public"."customization_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."customization_status" OWNER TO "postgres";


CREATE TYPE "public"."discount_type" AS ENUM (
    'percentage',
    'fixed',
    'free_shipping'
);


ALTER TYPE "public"."discount_type" OWNER TO "postgres";


CREATE TYPE "public"."inventory_movement_type" AS ENUM (
    'purchase',
    'sale',
    'reservation',
    'release',
    'adjustment',
    'return',
    'transfer_in',
    'transfer_out'
);


ALTER TYPE "public"."inventory_movement_type" OWNER TO "postgres";


CREATE TYPE "public"."inventory_reservation_status" AS ENUM (
    'active',
    'committed',
    'released',
    'expired'
);


ALTER TYPE "public"."inventory_reservation_status" OWNER TO "postgres";


CREATE TYPE "public"."marketing_automation_status" AS ENUM (
    'draft',
    'active',
    'paused'
);


ALTER TYPE "public"."marketing_automation_status" OWNER TO "postgres";


CREATE TYPE "public"."marketing_automation_type" AS ENUM (
    'welcome',
    'abandoned_checkout',
    'post_purchase',
    'win_back'
);


ALTER TYPE "public"."marketing_automation_type" OWNER TO "postgres";


CREATE TYPE "public"."marketing_campaign_status" AS ENUM (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'cancelled',
    'failed'
);


ALTER TYPE "public"."marketing_campaign_status" OWNER TO "postgres";


CREATE TYPE "public"."marketing_campaign_type" AS ENUM (
    'email'
);


ALTER TYPE "public"."marketing_campaign_type" OWNER TO "postgres";


CREATE TYPE "public"."marketing_email_event_type" AS ENUM (
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'unsubscribed'
);


ALTER TYPE "public"."marketing_email_event_type" OWNER TO "postgres";


CREATE TYPE "public"."marketing_recipient_status" AS ENUM (
    'pending',
    'sending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'unsubscribed'
);


ALTER TYPE "public"."marketing_recipient_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'created',
    'pending',
    'confirmed',
    'shipped',
    'received',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'successful',
    'failed',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."product_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."product_status" OWNER TO "postgres";


CREATE TYPE "public"."product_type" AS ENUM (
    'physical',
    'custom',
    'bundle'
);


ALTER TYPE "public"."product_type" OWNER TO "postgres";


CREATE TYPE "public"."review_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."review_status" OWNER TO "postgres";


CREATE TYPE "public"."stock_notification_channel" AS ENUM (
    'email',
    'whatsapp'
);


ALTER TYPE "public"."stock_notification_channel" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_product_themes"("p_org_id" "uuid", "p_product_id" "uuid", "p_theme_ids" "uuid"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."assign_product_themes"("p_org_id" "uuid", "p_product_id" "uuid", "p_theme_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_percentage_change_sql"("p_current" numeric, "p_previous" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
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


ALTER FUNCTION "public"."calculate_percentage_change_sql"("p_current" numeric, "p_previous" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_order"("p_order_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_status order_status;
begin

  select status
  into v_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;


  if v_status not in ('pending', 'confirmed') then
    raise exception
      'Order cannot be cancelled from status %',
      v_status;
  end if;


  perform release_order_inventory(p_order_id);


  perform change_order_status(
    p_order_id,
    'cancelled',
    p_actor_id,
    p_reason
  );

end;
$$;


ALTER FUNCTION "public"."cancel_order"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_status order_status;
begin

  select status
  into v_current_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;


  if not is_valid_order_transition(
    v_current_status,
    p_new_status
  ) then

    raise exception
      'Invalid order transition: % → %',
      v_current_status,
      p_new_status;

  end if;


  update orders
  set
    status = p_new_status,

    confirmed_at =
      case
        when p_new_status = 'confirmed'
        then now()
        else confirmed_at
      end,

    shipped_at =
      case
        when p_new_status = 'shipped'
        then now()
        else shipped_at
      end,

    received_at =
      case
        when p_new_status = 'received'
        then now()
        else received_at
      end,

    cancelled_at =
      case
        when p_new_status = 'cancelled'
        then now()
        else cancelled_at
      end,

    refunded_at =
      case
        when p_new_status = 'refunded'
        then now()
        else refunded_at
      end

  where id = p_order_id;


  insert into order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by,
    note
  )
  values (
    p_order_id,
    v_current_status,
    p_new_status,
    p_actor_id,
    p_note
  );

end;
$$;


ALTER FUNCTION "public"."change_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_marketing_email_event_customer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_recipient_cust_id UUID;
BEGIN
  SELECT customer_id INTO v_recipient_cust_id
  FROM public.marketing_campaign_recipients
  WHERE id = NEW.campaign_recipient_id;

  -- Automatically populate customer_id if omitted
  IF NEW.customer_id IS NULL THEN
    NEW.customer_id := v_recipient_cust_id;
  ELSIF NEW.customer_id IS DISTINCT FROM v_recipient_cust_id THEN
    RAISE EXCEPTION 'Event customer mismatch: event customer % does not match recipient customer %',
      NEW.customer_id, v_recipient_cust_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_marketing_email_event_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_marketing_recipient_customer_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_campaign_org_id UUID;
  v_customer_org_id UUID;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    SELECT organization_id INTO v_campaign_org_id
    FROM public.marketing_campaigns
    WHERE id = NEW.campaign_id;

    SELECT organization_id INTO v_customer_org_id
    FROM public.customers
    WHERE id = NEW.customer_id;

    IF v_customer_org_id IS NULL OR v_campaign_org_id IS NULL OR v_customer_org_id <> v_campaign_org_id THEN
      RAISE EXCEPTION 'Customer organization mismatch: customer % does not belong to campaign organization %', 
        NEW.customer_id, v_campaign_org_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_marketing_recipient_customer_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commit_inventory_reservation"("p_reservation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_reservation public.inventory_reservations%rowtype;
begin

  select *
  into v_reservation
  from public.inventory_reservations
  where id = p_reservation_id
  for update;


  if not found then
    raise exception
      'Reservation % does not exist',
      p_reservation_id;
  end if;


  -- Idempotent.
  if v_reservation.status = 'committed' then
    return;
  end if;


  if v_reservation.status <> 'active' then
    raise exception
      'Reservation % cannot be committed because its status is %',
      p_reservation_id,
      v_reservation.status;
  end if;


  -- Convert reserved stock into sold stock.
  update public.inventory
  set
    quantity = quantity - v_reservation.quantity,
    reserved_quantity =
      reserved_quantity - v_reservation.quantity,
    updated_at = now()
  where id = v_reservation.inventory_id;


  update public.inventory_reservations
  set
    status = 'committed',
    committed_at = now()
  where id = p_reservation_id
    and status = 'active';

end;
$$;


ALTER FUNCTION "public"."commit_inventory_reservation"("p_reservation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commit_order_inventory"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  item record;
begin

  -- Normal products
  for item in
    select
      oi.product_id,
      oi.quantity,
      o.warehouse_id
    from order_items oi
    join orders o
      on o.id = oi.order_id
    where oi.order_id = p_order_id
  loop

    update inventory
    set
      quantity = quantity - item.quantity,
      reserved_quantity = reserved_quantity - item.quantity
    where product_id = item.product_id
      and warehouse_id = item.warehouse_id
      and quantity >= item.quantity
      and reserved_quantity >= item.quantity;

    if not found then
      raise exception
        'Unable to commit inventory for product %',
        item.product_id;
    end if;

    insert into inventory_movements (
      warehouse_id,
      product_id,
      quantity,
      movement_type,
      reference_id,
      note
    )
    values (
      item.warehouse_id,
      item.product_id,
      -item.quantity,
      'sale',
      p_order_id,
      'Inventory sold'
    );

  end loop;


  -- Add-ons
  for item in
    select
      oia.addon_product_id as product_id,
      oia.quantity,
      o.warehouse_id
    from order_item_addons oia
    join order_items oi
      on oi.id = oia.order_item_id
    join orders o
      on o.id = oi.order_id
    where oi.order_id = p_order_id
  loop

    update inventory
    set
      quantity = quantity - item.quantity,
      reserved_quantity = reserved_quantity - item.quantity
    where product_id = item.product_id
      and warehouse_id = item.warehouse_id
      and quantity >= item.quantity
      and reserved_quantity >= item.quantity;

    if not found then
      raise exception
        'Unable to commit inventory for add-on product %',
        item.product_id;
    end if;

    insert into inventory_movements (
      warehouse_id,
      product_id,
      quantity,
      movement_type,
      reference_id,
      note
    )
    values (
      item.warehouse_id,
      item.product_id,
      -item.quantity,
      'sale',
      p_order_id,
      'Add-on inventory sold'
    );

  end loop;

end;
$$;


ALTER FUNCTION "public"."commit_order_inventory"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_payment"("p_order_id" "uuid", "p_provider" "text", "p_provider_reference" "text", "p_amount" numeric, "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order orders%rowtype;
  v_payment payments%rowtype;
begin

  -- ----------------------------------------------------------
  -- Lock order
  -- ----------------------------------------------------------

  select *
  into v_order
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;


  -- ----------------------------------------------------------
  -- Idempotency
  -- ----------------------------------------------------------

  select *
  into v_payment
  from payments
  where provider = p_provider
    and provider_reference = p_provider_reference;

  if found then

    -- Already successfully processed.
    if v_payment.status = 'successful' then
      return;
    end if;

  end if;


  -- ----------------------------------------------------------
  -- Amount validation
  -- ----------------------------------------------------------

  if p_amount <> v_order.total then
    raise exception
      'Payment amount mismatch. Expected %, received %',
      v_order.total,
      p_amount;
  end if;


  -- ----------------------------------------------------------
  -- Create/update payment
  -- ----------------------------------------------------------

  insert into payments (
    order_id,
    provider,
    provider_reference,
    amount,
    currency,
    status,
    paid_at,
    metadata
  )
  values (
    p_order_id,
    p_provider,
    p_provider_reference,
    p_amount,
    'NGN',
    'successful',
    now(),
    p_metadata
  )
  on conflict (provider, provider_reference)
  do update set
    status = 'successful',
    paid_at = now(),
    metadata = excluded.metadata;


  -- ----------------------------------------------------------
  -- Commit inventory
  -- ----------------------------------------------------------

  if v_order.status = 'created' then

    -- Reserve first, then commit.
    perform reserve_order_inventory(p_order_id);

    perform commit_order_inventory(p_order_id);

    perform change_order_status(
      p_order_id,
      'pending',
      null,
      'Payment confirmed'
    );

  end if;

end;
$$;


ALTER FUNCTION "public"."confirm_payment"("p_order_id" "uuid", "p_provider" "text", "p_provider_reference" "text", "p_amount" numeric, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_admin_bundle"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text" DEFAULT NULL::"text", "p_sku" "text" DEFAULT NULL::"text", "p_selling_price" numeric DEFAULT 0, "p_cost_price" numeric DEFAULT 0, "p_status" "public"."product_status" DEFAULT 'draft'::"public"."product_status", "p_category_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[], "p_images" "jsonb" DEFAULT '[]'::"jsonb", "p_components" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_bundle_id UUID;
  v_img JSONB;
  v_comp JSONB;
  v_comp_id UUID;
  v_qty_str TEXT;
  v_qty INTEGER;
  v_comp_type public.product_type;
  v_comp_org UUID;
  v_cat_id UUID;
  v_cat_org UUID;
  v_comp_ids UUID[];
BEGIN
  -- 1. Verify caller authorization (SECURITY DEFINER requirement)
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  -- 2. Validate bundle name & pricing
  IF TRIM(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Bundle name cannot be empty.';
  END IF;

  IF p_selling_price IS NULL OR p_selling_price < 0 THEN
    RAISE EXCEPTION 'Selling price cannot be negative.';
  END IF;

  IF p_cost_price IS NULL OR p_cost_price < 0 THEN
    RAISE EXCEPTION 'Cost price cannot be negative.';
  END IF;

  -- 3. Validate components presence
  IF p_components IS NULL OR jsonb_array_length(p_components) = 0 THEN
    RAISE EXCEPTION 'A bundle must contain at least one component product.';
  END IF;

  -- 4. Validate duplicate components in input
  SELECT array_agg((item->>'component_product_id')::UUID)
  INTO v_comp_ids
  FROM jsonb_array_elements(p_components) AS item;

  IF (SELECT COUNT(DISTINCT id) FROM unnest(v_comp_ids) AS id) <> array_length(v_comp_ids, 1) THEN
    RAISE EXCEPTION 'A bundle cannot contain the same product more than once.';
  END IF;

  -- 5. Validate categories ownership
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    FOREACH v_cat_id IN ARRAY p_category_ids LOOP
      SELECT organization_id INTO v_cat_org
      FROM public.categories
      WHERE id = v_cat_id;

      IF NOT FOUND OR v_cat_org <> p_org_id THEN
        RAISE EXCEPTION 'Category % does not belong to organization %', v_cat_id, p_org_id;
      END IF;
    END LOOP;
  END IF;

  -- 6. Validate each component product
  FOR v_comp IN SELECT * FROM jsonb_array_elements(p_components) LOOP
    v_comp_id := (v_comp->>'component_product_id')::UUID;
    v_qty_str := v_comp->>'quantity';

    IF v_qty_str IS NULL OR TRIM(v_qty_str) = '' THEN
      RAISE EXCEPTION 'Bundle component quantity must be greater than zero.';
    END IF;

    v_qty := (v_qty_str)::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Bundle component quantity must be greater than zero.';
    END IF;

    SELECT product_type, organization_id
    INTO v_comp_type, v_comp_org
    FROM public.products
    WHERE id = v_comp_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Component product % does not exist', v_comp_id;
    END IF;

    IF v_comp_org <> p_org_id THEN
      RAISE EXCEPTION 'Component product % belongs to another organization', v_comp_id;
    END IF;

    IF v_comp_type = 'bundle'::public.product_type THEN
      RAISE EXCEPTION 'A bundle cannot contain another bundle product (%)', v_comp_id;
    END IF;
  END LOOP;

  -- 7. Insert bundle product
  INSERT INTO public.products (
    organization_id,
    name,
    slug,
    description,
    sku,
    product_type,
    status,
    selling_price,
    cost_price,
    requires_customization
  ) VALUES (
    p_org_id,
    TRIM(p_name),
    p_slug,
    p_description,
    p_sku,
    'bundle'::public.product_type,
    p_status,
    p_selling_price,
    p_cost_price,
    FALSE
  ) RETURNING id INTO v_bundle_id;

  -- 8. Insert categories
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    FOREACH v_cat_id IN ARRAY p_category_ids LOOP
      INSERT INTO public.product_categories (product_id, category_id)
      VALUES (v_bundle_id, v_cat_id);
    END LOOP;
  END IF;

  -- 9. Insert images
  IF p_images IS NOT NULL AND jsonb_array_length(p_images) > 0 THEN
    FOR v_img IN SELECT * FROM jsonb_array_elements(p_images) LOOP
      INSERT INTO public.product_images (
        product_id,
        storage_path,
        alt_text,
        sort_order
      ) VALUES (
        v_bundle_id,
        v_img->>'storage_path',
        v_img->>'alt_text',
        COALESCE((v_img->>'sort_order')::INTEGER, 0)
      );
    END LOOP;
  END IF;

  -- 10. Insert bundle items
  FOR v_comp IN SELECT * FROM jsonb_array_elements(p_components) LOOP
    INSERT INTO public.bundle_items (
      bundle_product_id,
      component_product_id,
      quantity
    ) VALUES (
      v_bundle_id,
      (v_comp->>'component_product_id')::UUID,
      (v_comp->>'quantity')::INTEGER
    );
  END LOOP;

  RETURN v_bundle_id;
END;
$$;


ALTER FUNCTION "public"."create_admin_bundle"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_admin_manual_order"("p_org_id" "uuid", "p_customer" "jsonb", "p_shipping_address" "jsonb", "p_items" "jsonb", "p_location_id" "uuid" DEFAULT NULL::"uuid", "p_warehouse_id" "uuid" DEFAULT NULL::"uuid", "p_manual_order_channel" "text" DEFAULT 'instagram'::"text", "p_discount_code" "text" DEFAULT NULL::"text", "p_shipping_fee" numeric DEFAULT 0, "p_notes" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text", "p_manual_discount" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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
  v_discount_source TEXT := NULL;
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
  v_manual_disc_type TEXT;
  v_manual_disc_val NUMERIC;
  v_avail_qty INTEGER;
  v_comp_avail INTEGER;
BEGIN
  -- 1. Verify caller authorization
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  -- 2. Idempotency Check
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
    WHERE organization_id = p_org_id AND (active = TRUE OR active IS NULL)
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'No active warehouse found for organization %', p_org_id;
    END IF;
  ELSE
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE id = v_warehouse_id AND organization_id = p_org_id AND (active = TRUE OR active IS NULL);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Warehouse % is not active or does not belong to organization %', p_warehouse_id, p_org_id;
    END IF;
  END IF;

  -- 6. Calculate DB-authoritative pricing for items & Validate Stock Availability
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

    IF v_prod_status = 'archived'::public.product_status THEN
      RAISE EXCEPTION 'Product % (%) is archived and cannot be ordered', v_prod_name, v_product_id;
    END IF;

    IF v_prod_price IS NULL OR v_prod_price < 0 THEN
      RAISE EXCEPTION 'Product % has an invalid selling price', v_prod_name;
    END IF;

    -- Inventory Availability Check
    IF v_prod_type <> 'bundle' THEN
      SELECT (COALESCE(quantity, 0) - COALESCE(reserved_quantity, 0)) INTO v_avail_qty
      FROM public.inventory
      WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id;

      IF v_avail_qty IS NULL OR v_avail_qty < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for product % (requested %, available %)', v_prod_name, v_qty, COALESCE(v_avail_qty, 0);
      END IF;
    ELSE
      -- Bundle component availability check
      FOR v_comp IN
        SELECT bi.component_product_id, bi.quantity AS qty_per_bundle, p.name AS comp_name
        FROM public.bundle_items bi
        JOIN public.products p ON p.id = bi.component_product_id
        WHERE bi.bundle_product_id = v_product_id
      LOOP
        SELECT (COALESCE(quantity, 0) - COALESCE(reserved_quantity, 0)) INTO v_comp_avail
        FROM public.inventory
        WHERE warehouse_id = v_warehouse_id AND product_id = v_comp.component_product_id;

        IF v_comp_avail IS NULL OR v_comp_avail < (v_comp.qty_per_bundle * v_qty) THEN
          RAISE EXCEPTION 'Insufficient stock for bundle component % in bundle % (requested %, available %)',
            v_comp.comp_name, v_prod_name, (v_comp.qty_per_bundle * v_qty), COALESCE(v_comp_avail, 0);
        END IF;
      END LOOP;
    END IF;

    v_item_subtotal := v_prod_price * v_qty;
    v_subtotal := v_subtotal + v_item_subtotal;
  END LOOP;

  -- 7. Mutual Exclusivity Check between Discount Code and Manual Discount
  IF (p_discount_code IS NOT NULL AND TRIM(p_discount_code) <> '') AND 
     (p_manual_discount IS NOT NULL AND p_manual_discount <> 'null'::jsonb) THEN
    RAISE EXCEPTION 'Discount code and manual discount cannot be used together.';
  END IF;

  -- 8. Calculate Discount
  IF p_manual_discount IS NOT NULL AND p_manual_discount <> 'null'::jsonb THEN
    v_manual_disc_type := p_manual_discount->>'type';
    v_manual_disc_val := (p_manual_discount->>'value')::NUMERIC;

    IF v_manual_disc_val IS NULL OR v_manual_disc_val <= 0 THEN
      RAISE EXCEPTION 'Manual discount value must be greater than zero.';
    END IF;

    IF v_manual_disc_type = 'percentage' THEN
      IF v_manual_disc_val > 100 THEN
        RAISE EXCEPTION 'Percentage discount cannot exceed 100%%.';
      END IF;
      v_discount_amount := (v_subtotal * (v_manual_disc_val / 100.0));
      v_discount_source := 'manual_percentage';
    ELSIF v_manual_disc_type = 'fixed_amount' OR v_manual_disc_type = 'fixed' THEN
      IF v_manual_disc_val > v_subtotal THEN
        RAISE EXCEPTION 'Fixed discount amount (₦%) cannot exceed subtotal (₦%).', v_manual_disc_val, v_subtotal;
      END IF;
      v_discount_amount := v_manual_disc_val;
      v_discount_source := 'manual_fixed';
    ELSE
      RAISE EXCEPTION 'Invalid manual discount type: %', v_manual_disc_type;
    END IF;
  ELSIF p_discount_code IS NOT NULL AND TRIM(p_discount_code) <> '' THEN
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

    IF v_discount_type = 'percentage' THEN
      v_discount_amount := (v_subtotal * (v_discount_value / 100.0));
    ELSIF v_discount_type = 'fixed_amount' THEN
      v_discount_amount := LEAST(v_subtotal, v_discount_value);
    END IF;
    v_discount_source := 'code';
  END IF;

  -- 9. Calculate Total
  IF p_shipping_fee IS NULL OR p_shipping_fee < 0 THEN
    RAISE EXCEPTION 'Shipping fee cannot be negative.';
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount_amount + p_shipping_fee);

  -- 10. Generate Order Number
  v_order_number := 'ORD-M-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));

  -- 11. Create Order Record with Concurrent Idempotency Guard
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
      discount_source,
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
      v_discount_source,
      p_shipping_fee,
      v_total,
      p_idempotency_key,
      NOW()
    ) RETURNING id INTO v_order_id;
  EXCEPTION WHEN unique_violation THEN
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

  -- 12. Insert Order Items & Snapshot Bundle Components
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

  -- 13. Reserve Inventory Atomically by aggregating required physical stock per inventory record
  FOR v_comp IN
    WITH expanded_items AS (
      SELECT 
        (i->>'product_id')::UUID AS product_id, 
        (i->>'quantity')::INTEGER AS qty
      FROM jsonb_array_elements(p_items) i
      JOIN public.products p ON p.id = (i->>'product_id')::UUID
      WHERE p.product_type <> 'bundle'

      UNION ALL

      SELECT 
        bi.component_product_id AS product_id, 
        (bi.quantity * (i->>'quantity')::INTEGER) AS qty
      FROM jsonb_array_elements(p_items) i
      JOIN public.products p ON p.id = (i->>'product_id')::UUID
      JOIN public.bundle_items bi ON bi.bundle_product_id = p.id
      WHERE p.product_type = 'bundle'
    ),
    aggregated_reqs AS (
      SELECT product_id, SUM(qty)::INTEGER AS total_qty
      FROM expanded_items
      GROUP BY product_id
    )
    SELECT 
      inv.id AS inventory_id, 
      ar.product_id, 
      ar.total_qty
    FROM aggregated_reqs ar
    JOIN public.inventory inv ON inv.warehouse_id = v_warehouse_id AND inv.product_id = ar.product_id
  LOOP
    PERFORM 1 FROM public.inventory WHERE id = v_comp.inventory_id FOR UPDATE;
    PERFORM public.reserve_inventory(v_order_id, v_comp.inventory_id, v_comp.total_qty, 1440);
  END LOOP;

  -- 14. Generate Secure Random Payment Token
  v_token := 'mpr_' || REPLACE(gen_random_uuid()::TEXT, '-', '') || REPLACE(gen_random_uuid()::TEXT, '-', '');

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

  -- 15. Record Initial Status History
  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by,
    note
  ) VALUES (
    v_order_id,
    NULL,
    'created'::public.order_status,
    auth.uid(),
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


ALTER FUNCTION "public"."create_admin_manual_order"("p_org_id" "uuid", "p_customer" "jsonb", "p_shipping_address" "jsonb", "p_items" "jsonb", "p_location_id" "uuid", "p_warehouse_id" "uuid", "p_manual_order_channel" "text", "p_discount_code" "text", "p_shipping_fee" numeric, "p_notes" "text", "p_idempotency_key" "text", "p_manual_discount" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_admin_theme"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text" DEFAULT NULL::"text", "p_storage_path" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true, "p_sort_order" integer DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."create_admin_theme"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_whatsapp_number" "text", "p_warehouse_id" "uuid", "p_location_id" "uuid", "p_shipping_address" "jsonb", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order_id uuid;
  v_order_number text;

  v_subtotal numeric(12,2) := 0;
  v_shipping_fee numeric(12,2) := 0;
  v_total numeric(12,2) := 0;

  v_item jsonb;
  v_addon jsonb;

  v_product products%rowtype;
  v_addon_product products%rowtype;

  v_item_id uuid;

  v_unit_price numeric(12,2);
  v_item_total numeric(12,2);
  v_addon_price numeric(12,2);
  v_addon_total numeric(12,2);

  v_addon_config product_addons%rowtype;

begin

  -- ----------------------------------------------------------
  -- Validate warehouse
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from warehouses
    where id = p_warehouse_id
      and organization_id = p_organization_id
      and active = true
  ) then
    raise exception 'Invalid warehouse';
  end if;


  -- ----------------------------------------------------------
  -- Validate location
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from locations
    where id = p_location_id
      and organization_id = p_organization_id
  ) then
    raise exception 'Invalid delivery location';
  end if;


  -- ----------------------------------------------------------
  -- Calculate delivery fee
  -- ----------------------------------------------------------

  select price
  into v_shipping_fee
  from delivery_rates
  where warehouse_id = p_warehouse_id
    and location_id = p_location_id
    and active = true;

  if not found then
    raise exception 'Delivery is unavailable for this location';
  end if;


  -- ----------------------------------------------------------
  -- Generate order number
  -- ----------------------------------------------------------

  v_order_number :=
    'ORD-' ||
    to_char(now(), 'YYYYMMDD') ||
    '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));


  -- ----------------------------------------------------------
  -- Create order
  -- ----------------------------------------------------------

  insert into orders (
    organization_id,
    order_number,
    customer_id,

    status,

    email,
    first_name,
    last_name,
    phone,
    whatsapp_number,

    shipping_address,

    location_id,
    warehouse_id,

    subtotal,
    shipping_fee,
    total,

    placed_at
  )
  values (
    p_organization_id,
    v_order_number,
    p_customer_id,

    'created',

    p_email,
    p_first_name,
    p_last_name,
    p_phone,
    p_whatsapp_number,

    p_shipping_address,

    p_location_id,
    p_warehouse_id,

    0,
    v_shipping_fee,
    0,

    now()
  )
  returning id into v_order_id;


  -- ----------------------------------------------------------
  -- Create order items
  -- ----------------------------------------------------------

  for v_item in
    select *
    from jsonb_array_elements(p_items)
  loop

    select *
    into v_product
    from products
    where id = (v_item->>'product_id')::uuid
      and organization_id = p_organization_id
      and status = 'published';

    if not found then
      raise exception
        'Product % not found or unavailable',
        v_item->>'product_id';
    end if;


    -- Quantity validation
    if (v_item->>'quantity')::integer <= 0 then
      raise exception 'Invalid product quantity';
    end if;


    v_unit_price := v_product.selling_price;

    v_item_total :=
      v_unit_price *
      (v_item->>'quantity')::integer;


    insert into order_items (
      order_id,
      product_id,

      product_name,
      sku,

      quantity,

      unit_price,
      total
    )
    values (
      v_order_id,
      v_product.id,

      v_product.name,
      v_product.sku,

      (v_item->>'quantity')::integer,

      v_unit_price,
      v_item_total
    )
    returning id into v_item_id;


    v_subtotal := v_subtotal + v_item_total;


    -- --------------------------------------------------------
    -- Add-ons
    -- --------------------------------------------------------

    if v_item ? 'addons' then

      for v_addon in
        select *
        from jsonb_array_elements(v_item->'addons')
      loop

        -- Find the configured add-on relationship
        select *
        into v_addon_config
        from product_addons
        where parent_product_id = v_product.id
          and addon_product_id = (v_addon->>'product_id')::uuid
          and active = true;

        if not found then
          raise exception
            'Product % is not a valid add-on for %',
            v_addon->>'product_id',
            v_product.name;
        end if;


        -- Validate add-on product
        select *
        into v_addon_product
        from products
        where id = v_addon_config.addon_product_id
          and organization_id = p_organization_id
          and status = 'published';

        if not found then
          raise exception 'Add-on product unavailable';
        end if;


        -- Validate quantity
        if
          (v_addon->>'quantity')::integer
            < v_addon_config.min_quantity
          or
          (v_addon->>'quantity')::integer
            > v_addon_config.max_quantity
        then
          raise exception
            'Invalid quantity for add-on %',
            v_addon_product.name;
        end if;


        -- Use override if defined
        v_addon_price :=
          coalesce(
            v_addon_config.price_override,
            v_addon_product.selling_price
          );


        v_addon_total :=
          v_addon_price *
          (v_addon->>'quantity')::integer;


        insert into order_item_addons (
          order_item_id,

          addon_product_id,

          product_name,
          sku,

          quantity,

          unit_price,
          total
        )
        values (
          v_item_id,

          v_addon_product.id,

          v_addon_product.name,
          v_addon_product.sku,

          (v_addon->>'quantity')::integer,

          v_addon_price,
          v_addon_total
        );


        v_subtotal :=
          v_subtotal + v_addon_total;

      end loop;

    end if;

  end loop;


  -- ----------------------------------------------------------
  -- Final total
  -- ----------------------------------------------------------

  v_total :=
    v_subtotal +
    v_shipping_fee;


  update orders
  set
    subtotal = v_subtotal,
    total = v_total
  where id = v_order_id;


  -- ----------------------------------------------------------
  -- Initial order history
  -- ----------------------------------------------------------

  insert into order_status_history (
    order_id,
    from_status,
    to_status,
    note
  )
  values (
    v_order_id,
    null,
    'created',
    'Order created'
  );


  return v_order_id;

end;
$$;


ALTER FUNCTION "public"."create_order"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_whatsapp_number" "text", "p_warehouse_id" "uuid", "p_location_id" "uuid", "p_shipping_address" "jsonb", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."delete_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_new_name" "text", "p_new_slug" "text", "p_new_sku" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_source public.products%ROWTYPE;
  v_new_bundle_id UUID;
BEGIN
  -- 1. Verify caller authorization
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  -- 2. Validate new name
  IF TRIM(COALESCE(p_new_name, '')) = '' THEN
    RAISE EXCEPTION 'Bundle name cannot be empty.';
  END IF;

  -- 3. Fetch and verify source bundle
  SELECT * INTO v_source
  FROM public.products
  WHERE id = p_bundle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source bundle product % does not exist', p_bundle_id;
  END IF;

  IF v_source.organization_id <> p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: Source bundle belongs to another organization';
  END IF;

  IF v_source.product_type <> 'bundle'::public.product_type THEN
    RAISE EXCEPTION 'Source product % is not a bundle product', p_bundle_id;
  END IF;

  -- 4. Create new bundle product (receives new UUID, status = draft)
  INSERT INTO public.products (
    organization_id,
    name,
    slug,
    description,
    sku,
    product_type,
    status,
    selling_price,
    cost_price,
    requires_customization
  ) VALUES (
    p_org_id,
    TRIM(p_new_name),
    p_new_slug,
    v_source.description,
    p_new_sku,
    'bundle'::public.product_type,
    'draft'::public.product_status,
    v_source.selling_price,
    v_source.cost_price,
    FALSE
  ) RETURNING id INTO v_new_bundle_id;

  -- 5. Copy categories
  INSERT INTO public.product_categories (product_id, category_id)
  SELECT v_new_bundle_id, category_id
  FROM public.product_categories
  WHERE product_id = p_bundle_id;

  -- 6. Copy images
  INSERT INTO public.product_images (product_id, storage_path, alt_text, sort_order)
  SELECT v_new_bundle_id, storage_path, alt_text, sort_order
  FROM public.product_images
  WHERE product_id = p_bundle_id;

  -- 7. Copy bundle items (receives new bundle_items IDs via gen_random_uuid())
  INSERT INTO public.bundle_items (bundle_product_id, component_product_id, quantity)
  SELECT v_new_bundle_id, component_product_id, quantity
  FROM public.bundle_items
  WHERE bundle_product_id = p_bundle_id;

  RETURN v_new_bundle_id;
END;
$$;


ALTER FUNCTION "public"."duplicate_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_new_name" "text", "p_new_slug" "text", "p_new_sku" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_inventory_reservation"("p_reservation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_reservation public.inventory_reservations%rowtype;
begin

  select *
  into v_reservation
  from public.inventory_reservations
  where id = p_reservation_id
  for update;


  if not found then
    raise exception
      'Reservation % does not exist',
      p_reservation_id;
  end if;


  if v_reservation.status <> 'active' then
    return;
  end if;


  -- Release reserved stock.
  update public.inventory
  set
    reserved_quantity =
      reserved_quantity - v_reservation.quantity,
    updated_at = now()
  where id = v_reservation.inventory_id;


  -- Mark directly as expired.
  update public.inventory_reservations
  set
    status = 'expired',
    released_at = now()
  where id = p_reservation_id
    and status = 'active';

end;
$$;


ALTER FUNCTION "public"."expire_inventory_reservation"("p_reservation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_inventory_reservations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_reservation record;
  v_count integer := 0;
begin

  for v_reservation in
    select id
    from public.inventory_reservations
    where status = 'active'
      and expires_at <= now()
    for update skip locked
  loop

    perform public.expire_inventory_reservation(
      v_reservation.id
    );

    v_count := v_count + 1;

  end loop;

  return v_count;

end;
$$;


ALTER FUNCTION "public"."expire_inventory_reservations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_checkout"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_analytics_checkout"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_customers"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_analytics_customers"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_inventory"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_analytics_inventory"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_overview"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) RETURNS "jsonb"
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


ALTER FUNCTION "public"."get_analytics_overview"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_products"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_analytics_products"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_sales_series"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_granularity" "text" DEFAULT 'day'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_analytics_sales_series"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_granularity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_inventory"("p_product_id" "uuid", "p_warehouse_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select
    quantity - reserved_quantity
  from inventory
  where product_id = p_product_id
    and warehouse_id = p_warehouse_id;
$$;


ALTER FUNCTION "public"."get_available_inventory"("p_product_id" "uuid", "p_warehouse_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaign_organization_id"("p_campaign_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT organization_id
  FROM public.marketing_campaigns
  WHERE id = p_campaign_id;
$$;


ALTER FUNCTION "public"."get_campaign_organization_id"("p_campaign_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_available_themes"("p_product_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "storage_path" "text", "sort_order" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT t.id, t.name, t.description, t.storage_path, t.sort_order
  FROM public.product_themes pt
  JOIN public.themes t ON t.id = pt.theme_id
  WHERE pt.product_id = p_product_id
    AND t.is_active = TRUE
  ORDER BY t.sort_order ASC, t.name ASC;
$$;


ALTER FUNCTION "public"."get_product_available_themes"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_marketing_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_marketing_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_discount_usage"("p_discount_id" "uuid", "p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."increment_discount_usage"("p_discount_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_admin"("target_organization_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT auth.role() = 'service_role' OR EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;


ALTER FUNCTION "public"."is_organization_admin"("target_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_member"("target_organization_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_organization_member"("target_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_valid_order_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin

  -- created → pending
  if p_from = 'created' and p_to = 'pending' then
    return true;
  end if;

  -- pending → confirmed
  if p_from = 'pending' and p_to = 'confirmed' then
    return true;
  end if;

  -- pending → cancelled
  if p_from = 'pending' and p_to = 'cancelled' then
    return true;
  end if;

  -- confirmed → shipped
  if p_from = 'confirmed' and p_to = 'shipped' then
    return true;
  end if;

  -- confirmed → cancelled
  if p_from = 'confirmed' and p_to = 'cancelled' then
    return true;
  end if;

  -- shipped → received
  if p_from = 'shipped' and p_to = 'received' then
    return true;
  end if;

  -- received → refunded
  if p_from = 'received' and p_to = 'refunded' then
    return true;
  end if;

  -- shipped → refunded
  if p_from = 'shipped' and p_to = 'refunded' then
    return true;
  end if;

  return false;

end;
$$;


ALTER FUNCTION "public"."is_valid_order_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."receive_order"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin

  perform change_order_status(
    p_order_id,
    'received',
    null,
    'Customer received order'
  );

end;
$$;


ALTER FUNCTION "public"."receive_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refund_order"("p_order_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_status order_status;
begin

  select status
  into v_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;


  if v_status not in ('shipped', 'received') then
    raise exception
      'Order cannot be refunded from status %',
      v_status;
  end if;


  -- Actual money refund should happen through
  -- the payment provider BEFORE this function is called.
  --
  -- Once provider confirms the refund:
  -- mark payment refunded + order refunded.

  update payments
  set status = 'refunded'
  where order_id = p_order_id
    and status = 'successful';


  perform change_order_status(
    p_order_id,
    'refunded',
    p_actor_id,
    'Full refund processed'
  );

end;
$$;


ALTER FUNCTION "public"."refund_order"("p_order_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_inventory_reservation"("p_reservation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_reservation public.inventory_reservations%rowtype;
begin

  select *
  into v_reservation
  from public.inventory_reservations
  where id = p_reservation_id
  for update;


  if not found then
    raise exception
      'Reservation % does not exist',
      p_reservation_id;
  end if;


  if v_reservation.status <> 'active' then
    return;
  end if;


  -- Decrease reserved stock.
  update public.inventory
  set
    reserved_quantity =
      reserved_quantity - v_reservation.quantity,
    updated_at = now()
  where id = v_reservation.inventory_id;


  -- Mark as released.
  update public.inventory_reservations
  set
    status = 'released',
    released_at = now()
  where id = p_reservation_id
    and status = 'active';

end;
$$;


ALTER FUNCTION "public"."release_inventory_reservation"("p_reservation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_order_inventory"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  item record;
begin

  -- ----------------------------------------------------------
  -- Normal products
  -- ----------------------------------------------------------

  for item in
    select
      oi.product_id,
      oi.quantity,
      o.warehouse_id
    from order_items oi
    join orders o
      on o.id = oi.order_id
    where oi.order_id = p_order_id
  loop

    update inventory
    set reserved_quantity =
      reserved_quantity - item.quantity
    where product_id = item.product_id
      and warehouse_id = item.warehouse_id
      and reserved_quantity >= item.quantity;

    if not found then
      raise exception
        'Unable to release inventory for product %',
        item.product_id;
    end if;

    insert into inventory_movements (
      warehouse_id,
      product_id,
      quantity,
      movement_type,
      reference_id,
      note
    )
    values (
      item.warehouse_id,
      item.product_id,
      item.quantity,
      'release',
      p_order_id,
      'Inventory reservation released'
    );

  end loop;


  -- ----------------------------------------------------------
  -- Add-ons
  -- ----------------------------------------------------------

  for item in
    select
      oia.addon_product_id as product_id,
      oia.quantity,
      o.warehouse_id
    from order_item_addons oia
    join order_items oi
      on oi.id = oia.order_item_id
    join orders o
      on o.id = oi.order_id
    where oi.order_id = p_order_id
  loop

    update inventory
    set reserved_quantity =
      reserved_quantity - item.quantity
    where product_id = item.product_id
      and warehouse_id = item.warehouse_id
      and reserved_quantity >= item.quantity;

    if not found then
      raise exception
        'Unable to release inventory for add-on product %',
        item.product_id;
    end if;

    insert into inventory_movements (
      warehouse_id,
      product_id,
      quantity,
      movement_type,
      reference_id,
      note
    )
    values (
      item.warehouse_id,
      item.product_id,
      item.quantity,
      'release',
      p_order_id,
      'Add-on inventory reservation released'
    );

  end loop;

end;
$$;


ALTER FUNCTION "public"."release_order_inventory"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_admin_themes"("p_org_id" "uuid", "p_theme_orders" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."reorder_admin_themes"("p_org_id" "uuid", "p_theme_orders" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_inventory"("p_order_id" "uuid", "p_inventory_id" "uuid", "p_quantity" integer, "p_expiration_minutes" integer DEFAULT 30) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_inventory public.inventory%rowtype;
  v_available integer;
  v_reservation_id uuid;
  v_expires_at timestamptz;
begin

  if p_quantity <= 0 then
    raise exception 'Reservation quantity must be greater than zero';
  end if;

  if p_expiration_minutes <= 0 then
    raise exception 'Expiration must be greater than zero';
  end if;


  -- Lock inventory row to prevent concurrent reservations.
  select *
  into v_inventory
  from public.inventory
  where id = p_inventory_id
  for update;


  if not found then
    raise exception
      'Inventory record % does not exist',
      p_inventory_id;
  end if;


  v_available :=
    v_inventory.quantity - v_inventory.reserved_quantity;


  if v_available < p_quantity then
    raise exception
      'Insufficient inventory. Available: %, requested: %',
      v_available,
      p_quantity;
  end if;


  -- Prevent duplicate active reservation for the same
  -- order/inventory combination.
  if exists (
    select 1
    from public.inventory_reservations
    where order_id = p_order_id
      and inventory_id = p_inventory_id
      and status = 'active'
  ) then
    raise exception
      'Order % already has an active reservation for inventory %',
      p_order_id,
      p_inventory_id;
  end if;


  v_expires_at :=
    now() + make_interval(mins => p_expiration_minutes);


  update public.inventory
  set
    reserved_quantity = reserved_quantity + p_quantity,
    updated_at = now()
  where id = p_inventory_id;


  insert into public.inventory_reservations (
    inventory_id,
    order_id,
    quantity,
    status,
    expires_at
  )
  values (
    p_inventory_id,
    p_order_id,
    p_quantity,
    'active',
    v_expires_at
  )
  returning id into v_reservation_id;


  return v_reservation_id;

end;
$$;


ALTER FUNCTION "public"."reserve_inventory"("p_order_id" "uuid", "p_inventory_id" "uuid", "p_quantity" integer, "p_expiration_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_order_inventory"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  item record;
  addon record;

  v_available integer;
begin

  -- ----------------------------------------------------------
  -- Lock the order
  -- ----------------------------------------------------------

  perform 1
  from orders
  where id = p_order_id
  for update;


  -- ----------------------------------------------------------
  -- Make sure the order exists
  -- ----------------------------------------------------------

  if not found then
    raise exception 'Order not found';
  end if;


  -- ----------------------------------------------------------
  -- Reserve normal products
  -- ----------------------------------------------------------

  for item in
    select
      oi.product_id,
      oi.quantity,
      o.warehouse_id
    from order_items oi
    join orders o
      on o.id = oi.order_id
    where oi.order_id = p_order_id
  loop

    -- Lock inventory row
    select quantity - reserved_quantity
    into v_available
    from inventory
    where product_id = item.product_id
      and warehouse_id = item.warehouse_id
    for update;

    if not found then
      raise exception
        'No inventory record for product % in warehouse %',
        item.product_id,
        item.warehouse_id;
    end if;

    if v_available < item.quantity then
      raise exception
        'Insufficient inventory for product %. Available: %, requested: %',
        item.product_id,
        v_available,
        item.quantity;
    end if;

    update inventory
    set reserved_quantity =
      reserved_quantity + item.quantity
    where product_id = item.product_id
      and warehouse_id = item.warehouse_id;

    insert into inventory_movements (
      warehouse_id,
      product_id,
      quantity,
      movement_type,
      reference_id,
      note
    )
    values (
      item.warehouse_id,
      item.product_id,
      item.quantity,
      'reservation',
      p_order_id,
      'Inventory reserved for order'
    );

  end loop;


  -- ----------------------------------------------------------
  -- Reserve add-ons
  -- ----------------------------------------------------------

  for addon in
    select
      oia.addon_product_id as product_id,
      oia.quantity,
      o.warehouse_id
    from order_item_addons oia
    join order_items oi
      on oi.id = oia.order_item_id
    join orders o
      on o.id = oi.order_id
    where oi.order_id = p_order_id
  loop

    select quantity - reserved_quantity
    into v_available
    from inventory
    where product_id = addon.product_id
      and warehouse_id = addon.warehouse_id
    for update;

    if not found then
      raise exception
        'No inventory record for add-on product % in warehouse %',
        addon.product_id,
        addon.warehouse_id;
    end if;

    if v_available < addon.quantity then
      raise exception
        'Insufficient inventory for add-on product %. Available: %, requested: %',
        addon.product_id,
        v_available,
        addon.quantity;
    end if;

    update inventory
    set reserved_quantity =
      reserved_quantity + addon.quantity
    where product_id = addon.product_id
      and warehouse_id = addon.warehouse_id;

    insert into inventory_movements (
      warehouse_id,
      product_id,
      quantity,
      movement_type,
      reference_id,
      note
    )
    values (
      addon.warehouse_id,
      addon.product_id,
      addon.quantity,
      'reservation',
      p_order_id,
      'Inventory reserved for order add-on'
    );

  end loop;

end;
$$;


ALTER FUNCTION "public"."reserve_order_inventory"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ship_order"("p_order_id" "uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin

  perform change_order_status(
    p_order_id,
    'shipped',
    p_actor_id,
    'Order shipped'
  );

end;
$$;


ALTER FUNCTION "public"."ship_order"("p_order_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_admin_theme_active"("p_org_id" "uuid", "p_theme_id" "uuid", "p_is_active" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."toggle_admin_theme_active"("p_org_id" "uuid", "p_theme_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text" DEFAULT NULL::"text", "p_sku" "text" DEFAULT NULL::"text", "p_selling_price" numeric DEFAULT 0, "p_cost_price" numeric DEFAULT 0, "p_status" "public"."product_status" DEFAULT 'draft'::"public"."product_status", "p_category_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_images" "jsonb" DEFAULT NULL::"jsonb", "p_components" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_existing_type public.product_type;
  v_existing_org UUID;
  v_img JSONB;
  v_comp JSONB;
  v_comp_id UUID;
  v_qty_str TEXT;
  v_qty INTEGER;
  v_comp_type public.product_type;
  v_comp_org UUID;
  v_cat_id UUID;
  v_cat_org UUID;
  v_comp_ids UUID[];
BEGIN
  -- 1. Verify caller authorization
  IF auth.role() <> 'service_role' AND NOT public.is_organization_admin(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: organization admin access required';
  END IF;

  -- 2. Verify target product exists, belongs to org, and is a bundle
  SELECT product_type, organization_id
  INTO v_existing_type, v_existing_org
  FROM public.products
  WHERE id = p_bundle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bundle product % does not exist', p_bundle_id;
  END IF;

  IF v_existing_org <> p_org_id THEN
    RAISE EXCEPTION 'Unauthorized: Bundle product belongs to another organization';
  END IF;

  IF v_existing_type <> 'bundle'::public.product_type THEN
    RAISE EXCEPTION 'Target product % is not a bundle product', p_bundle_id;
  END IF;

  -- 3. Validate name and prices
  IF TRIM(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Bundle name cannot be empty.';
  END IF;

  IF p_selling_price IS NULL OR p_selling_price < 0 THEN
    RAISE EXCEPTION 'Selling price cannot be negative.';
  END IF;

  IF p_cost_price IS NULL OR p_cost_price < 0 THEN
    RAISE EXCEPTION 'Cost price cannot be negative.';
  END IF;

  -- 4. Validate categories if provided
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    FOREACH v_cat_id IN ARRAY p_category_ids LOOP
      SELECT organization_id INTO v_cat_org
      FROM public.categories
      WHERE id = v_cat_id;

      IF NOT FOUND OR v_cat_org <> p_org_id THEN
        RAISE EXCEPTION 'Category % does not belong to organization %', v_cat_id, p_org_id;
      END IF;
    END LOOP;
  END IF;

  -- 5. Validate components if provided
  IF p_components IS NOT NULL THEN
    IF jsonb_array_length(p_components) = 0 THEN
      RAISE EXCEPTION 'A bundle must contain at least one component product.';
    END IF;

    SELECT array_agg((item->>'component_product_id')::UUID)
    INTO v_comp_ids
    FROM jsonb_array_elements(p_components) AS item;

    IF (SELECT COUNT(DISTINCT id) FROM unnest(v_comp_ids) AS id) <> array_length(v_comp_ids, 1) THEN
      RAISE EXCEPTION 'A bundle cannot contain the same product more than once.';
    END IF;

    FOR v_comp IN SELECT * FROM jsonb_array_elements(p_components) LOOP
      v_comp_id := (v_comp->>'component_product_id')::UUID;
      v_qty_str := v_comp->>'quantity';

      IF v_qty_str IS NULL OR TRIM(v_qty_str) = '' THEN
        RAISE EXCEPTION 'Bundle component quantity must be greater than zero.';
      END IF;

      v_qty := (v_qty_str)::INTEGER;
      IF v_qty IS NULL OR v_qty <= 0 THEN
        RAISE EXCEPTION 'Bundle component quantity must be greater than zero.';
      END IF;

      SELECT product_type, organization_id
      INTO v_comp_type, v_comp_org
      FROM public.products
      WHERE id = v_comp_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Component product % does not exist', v_comp_id;
      END IF;

      IF v_comp_org <> p_org_id THEN
        RAISE EXCEPTION 'Component product % belongs to another organization', v_comp_id;
      END IF;

      IF v_comp_type = 'bundle'::public.product_type THEN
        RAISE EXCEPTION 'A bundle cannot contain another bundle product (%)', v_comp_id;
      END IF;
    END LOOP;
  END IF;

  -- 6. Modify product details
  UPDATE public.products
  SET
    name = TRIM(p_name),
    slug = p_slug,
    description = p_description,
    sku = p_sku,
    selling_price = p_selling_price,
    cost_price = p_cost_price,
    status = p_status,
    updated_at = NOW()
  WHERE id = p_bundle_id;

  -- 7. Replace categories if provided
  IF p_category_ids IS NOT NULL THEN
    DELETE FROM public.product_categories WHERE product_id = p_bundle_id;
    IF array_length(p_category_ids, 1) > 0 THEN
      FOREACH v_cat_id IN ARRAY p_category_ids LOOP
        INSERT INTO public.product_categories (product_id, category_id)
        VALUES (p_bundle_id, v_cat_id);
      END LOOP;
    END IF;
  END IF;

  -- 8. Replace images if provided
  IF p_images IS NOT NULL THEN
    DELETE FROM public.product_images WHERE product_id = p_bundle_id;
    IF jsonb_array_length(p_images) > 0 THEN
      FOR v_img IN SELECT * FROM jsonb_array_elements(p_images) LOOP
        INSERT INTO public.product_images (
          product_id,
          storage_path,
          alt_text,
          sort_order
        ) VALUES (
          p_bundle_id,
          v_img->>'storage_path',
          v_img->>'alt_text',
          COALESCE((v_img->>'sort_order')::INTEGER, 0)
        );
      END LOOP;
    END IF;
  END IF;

  -- 9. Replace bundle items if provided
  IF p_components IS NOT NULL THEN
    DELETE FROM public.bundle_items WHERE bundle_product_id = p_bundle_id;
    FOR v_comp IN SELECT * FROM jsonb_array_elements(p_components) LOOP
      INSERT INTO public.bundle_items (
        bundle_product_id,
        component_product_id,
        quantity
      ) VALUES (
        p_bundle_id,
        (v_comp->>'component_product_id')::UUID,
        (v_comp->>'quantity')::INTEGER
      );
    END LOOP;
  END IF;

  RETURN p_bundle_id;
END;
$$;


ALTER FUNCTION "public"."update_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_storage_path" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_sort_order" integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."update_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_bundle_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_bundle_type public.product_type;
  v_component_type public.product_type;
  v_bundle_org uuid;
  v_component_org uuid;
BEGIN

  SELECT product_type, organization_id
  INTO v_bundle_type, v_bundle_org
  FROM public.products
  WHERE id = NEW.bundle_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bundle product does not exist';
  END IF;

  SELECT product_type, organization_id
  INTO v_component_type, v_component_org
  FROM public.products
  WHERE id = NEW.component_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Component product does not exist';
  END IF;

  IF v_bundle_type <> 'bundle'::public.product_type THEN
    RAISE EXCEPTION
      'bundle_product_id must reference a product with product_type = bundle';
  END IF;

  IF v_component_type = 'bundle'::public.product_type THEN
    RAISE EXCEPTION
      'A bundle cannot contain another bundle';
  END IF;

  IF v_bundle_org <> v_component_org THEN
    RAISE EXCEPTION
      'Bundle and component products must belong to the same organization';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_bundle_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_payment_request"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_order_org uuid;
BEGIN

  SELECT organization_id
  INTO v_order_org
  FROM public.orders
  WHERE id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order does not exist';
  END IF;

  IF v_order_org <> NEW.organization_id THEN
    RAISE EXCEPTION
      'Payment request and order must belong to the same organization';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_order_payment_request"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "action" "public"."audit_action" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "before_data" "jsonb",
    "after_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundle_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bundle_product_id" "uuid" NOT NULL,
    "component_product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bundle_items_different_products" CHECK (("bundle_product_id" <> "component_product_id")),
    CONSTRAINT "bundle_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."bundle_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."bundle_items" IS 'Defines the products and quantities contained within bundle products.';



CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "customization_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_quantity_positive" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "session_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "carts_status_valid" CHECK (("status" = ANY (ARRAY['active'::"text", 'converted'::"text", 'abandoned'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "cart_id" "uuid",
    "customer_id" "uuid",
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "whatsapp_number" "text",
    "shipping_address" "jsonb" NOT NULL,
    "location_id" "uuid",
    "warehouse_id" "uuid",
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(12,2) DEFAULT 0 NOT NULL,
    "shipping_fee" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" "public"."checkout_status" DEFAULT 'active'::"public"."checkout_status" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discount_id" "uuid",
    "discount_code" "text",
    CONSTRAINT "checkout_discount_non_negative" CHECK (("discount_total" >= (0)::numeric)),
    CONSTRAINT "checkout_shipping_non_negative" CHECK (("shipping_fee" >= (0)::numeric)),
    CONSTRAINT "checkout_subtotal_non_negative" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "checkout_total_non_negative" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."checkout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "recipient_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "address_line_1" "text" NOT NULL,
    "address_line_2" "text",
    "state" "text" NOT NULL,
    "lga" "text",
    "location_id" "uuid",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "whatsapp_number" "text",
    "email_marketing_consent" boolean DEFAULT true NOT NULL,
    "whatsapp_marketing_consent" boolean DEFAULT false NOT NULL,
    "email_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customization_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customization_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "mime_type" "text",
    "file_size" bigint,
    "processed_storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customization_assets_file_size_positive" CHECK ((("file_size" IS NULL) OR ("file_size" > 0)))
);


ALTER TABLE "public"."customization_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "status" "public"."customization_status" DEFAULT 'pending'::"public"."customization_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."customizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "delivery_rates_price_non_negative" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."delivery_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discount_categories" (
    "discount_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."discount_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discount_products" (
    "discount_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL
);


ALTER TABLE "public"."discount_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "type" "public"."discount_type" NOT NULL,
    "value" numeric(12,2) DEFAULT 0 NOT NULL,
    "minimum_order_amount" numeric(12,2),
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "starts_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discounts_minimum_order_non_negative" CHECK ((("minimum_order_amount" IS NULL) OR ("minimum_order_amount" >= (0)::numeric))),
    CONSTRAINT "discounts_percentage_valid" CHECK ((("type" <> 'percentage'::"public"."discount_type") OR ("value" <= (100)::numeric))),
    CONSTRAINT "discounts_usage_count_valid" CHECK (("usage_count" >= 0)),
    CONSTRAINT "discounts_usage_limit_valid" CHECK ((("usage_limit" IS NULL) OR ("usage_limit" > 0))),
    CONSTRAINT "discounts_value_non_negative" CHECK (("value" >= (0)::numeric))
);


ALTER TABLE "public"."discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."domain_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "aggregate_type" "text" NOT NULL,
    "aggregate_id" "uuid" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."domain_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "reserved_quantity" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_quantity_non_negative" CHECK (("quantity" >= 0)),
    CONSTRAINT "inventory_reserved_non_negative" CHECK (("reserved_quantity" >= 0)),
    CONSTRAINT "inventory_reserved_not_exceed_quantity" CHECK (("reserved_quantity" <= "quantity"))
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "movement_type" "public"."inventory_movement_type" NOT NULL,
    "reference_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_movements_quantity_not_zero" CHECK (("quantity" <> 0))
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "status" "public"."inventory_reservation_status" DEFAULT 'active'::"public"."inventory_reservation_status" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "released_at" timestamp with time zone,
    "committed_at" timestamp with time zone,
    CONSTRAINT "inventory_reservations_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."inventory_reservations" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_reservations" IS 'Temporary and committed inventory reservations associated with orders.';



COMMENT ON COLUMN "public"."inventory_reservations"."quantity" IS 'Number of units reserved from the associated inventory record.';



COMMENT ON COLUMN "public"."inventory_reservations"."expires_at" IS 'Time after which an active unpaid reservation may be released.';



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "state" "text" NOT NULL,
    "lga" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_automations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."marketing_automation_type" NOT NULL,
    "status" "public"."marketing_automation_status" DEFAULT 'draft'::"public"."marketing_automation_status" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_automations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaign_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "email" "text" NOT NULL,
    "status" "public"."marketing_recipient_status" DEFAULT 'pending'::"public"."marketing_recipient_status" NOT NULL,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "unsubscribed_at" timestamp with time zone,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_campaign_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."marketing_campaign_type" DEFAULT 'email'::"public"."marketing_campaign_type" NOT NULL,
    "status" "public"."marketing_campaign_status" DEFAULT 'draft'::"public"."marketing_campaign_status" NOT NULL,
    "subject" "text",
    "preview_text" "text",
    "sender_name" "text",
    "sender_email" "text",
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "segment_id" "uuid",
    "scheduled_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_email_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "campaign_recipient_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "event_type" "public"."marketing_email_event_type" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_email_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "rules" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "recipient_type" "text" NOT NULL,
    "recipient_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "category" "text" DEFAULT 'system'::"text" NOT NULL,
    "link" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_category_check" CHECK (("category" = ANY (ARRAY['order'::"text", 'inventory'::"text", 'review'::"text", 'customization'::"text", 'stock'::"text", 'system'::"text"]))),
    CONSTRAINT "notifications_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['customer'::"text", 'admin'::"text", 'broadcast'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_item_addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "addon_product_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "sku" "text",
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "total" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_item_addons_quantity_positive" CHECK (("quantity" > 0)),
    CONSTRAINT "order_item_addons_total_non_negative" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "order_item_addons_unit_price_non_negative" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."order_item_addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_item_bundle_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "component_product_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "sku" "text",
    "quantity_per_bundle" integer NOT NULL,
    "total_quantity" integer NOT NULL,
    "unit_cost_price" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_item_bundle_components_quantity_per_bundle_check" CHECK (("quantity_per_bundle" > 0)),
    CONSTRAINT "order_item_bundle_components_total_quantity_check" CHECK (("total_quantity" > 0)),
    CONSTRAINT "order_item_bundle_components_unit_cost_price_check" CHECK (("unit_cost_price" >= (0)::numeric))
);


ALTER TABLE "public"."order_item_bundle_components" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_item_bundle_components" IS 'Historical snapshot of bundle composition at the time an order was created.';



CREATE TABLE IF NOT EXISTS "public"."order_item_theme_customizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "cover_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_item_theme_customizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_item_theme_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customization_id" "uuid" NOT NULL,
    "theme_id" "uuid",
    "theme_name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_item_theme_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "sku" "text",
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "total" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "warehouse_id" "uuid",
    CONSTRAINT "order_items_quantity_positive" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_total_non_negative" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "order_items_unit_price_non_negative" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_payment_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_payment_requests_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "order_payment_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."order_payment_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_payment_requests" IS 'Secure customer-facing payment requests created by admins for manual orders.';



COMMENT ON COLUMN "public"."order_payment_requests"."token" IS 'Cryptographically random customer-facing payment token. Never use the order ID as the token.';



CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "from_status" "public"."order_status",
    "to_status" "public"."order_status" NOT NULL,
    "changed_by" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_id" "uuid",
    "status" "public"."order_status" DEFAULT 'created'::"public"."order_status" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "whatsapp_number" "text",
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(12,2) DEFAULT 0 NOT NULL,
    "shipping_fee" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "shipping_address" "jsonb" NOT NULL,
    "location_id" "uuid",
    "warehouse_id" "uuid",
    "placed_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "shipped_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discount_id" "uuid",
    "discount_code" "text",
    "order_source" "text" DEFAULT 'website'::"text" NOT NULL,
    "manual_order_channel" "text",
    "created_by" "uuid",
    "idempotency_key" "text",
    "discount_source" "text",
    CONSTRAINT "orders_discount_non_negative" CHECK (("discount_total" >= (0)::numeric)),
    CONSTRAINT "orders_manual_channel_check" CHECK ((("manual_order_channel" IS NULL) OR ("manual_order_channel" = ANY (ARRAY['instagram'::"text", 'whatsapp'::"text", 'phone'::"text", 'in_person'::"text", 'other'::"text"])))),
    CONSTRAINT "orders_order_source_check" CHECK (("order_source" = ANY (ARRAY['website'::"text", 'manual'::"text"]))),
    CONSTRAINT "orders_shipping_non_negative" CHECK (("shipping_fee" >= (0)::numeric)),
    CONSTRAINT "orders_subtotal_non_negative" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_total_non_negative" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."order_source" IS 'Origin of the order: website or manually created by an admin.';



COMMENT ON COLUMN "public"."orders"."manual_order_channel" IS 'Channel through which a manual order originated, such as Instagram, WhatsApp, phone, or in-person.';



CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_invitations_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'staff'::"text", 'manager'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_reference" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "paid_at" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_positive" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_product_id" "uuid" NOT NULL,
    "addon_product_id" "uuid" NOT NULL,
    "price_override" numeric(12,2),
    "min_quantity" integer DEFAULT 1 NOT NULL,
    "max_quantity" integer DEFAULT 1 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_addons_max_quantity_valid" CHECK (("max_quantity" >= "min_quantity")),
    CONSTRAINT "product_addons_min_quantity_positive" CHECK (("min_quantity" > 0)),
    CONSTRAINT "product_addons_not_self" CHECK (("parent_product_id" <> "addon_product_id")),
    CONSTRAINT "product_addons_price_non_negative" CHECK ((("price_override" IS NULL) OR ("price_override" >= (0)::numeric))),
    CONSTRAINT "product_addons_valid_quantity_range" CHECK (("max_quantity" >= "min_quantity"))
);


ALTER TABLE "public"."product_addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "product_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "alt_text" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_images_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_themes" (
    "product_id" "uuid" NOT NULL,
    "theme_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "sku" "text",
    "product_type" "public"."product_type" DEFAULT 'physical'::"public"."product_type" NOT NULL,
    "status" "public"."product_status" DEFAULT 'draft'::"public"."product_status" NOT NULL,
    "cost_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "selling_price" numeric(12,2) NOT NULL,
    "requires_customization" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supports_theme_customization" boolean DEFAULT false NOT NULL,
    CONSTRAINT "products_cost_price_non_negative" CHECK (("cost_price" >= (0)::numeric)),
    CONSTRAINT "products_selling_price_non_negative" CHECK (("selling_price" >= (0)::numeric))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."review_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "title" "text",
    "body" "text",
    "status" "public"."review_status" DEFAULT 'pending'::"public"."review_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    CONSTRAINT "reviews_rating_valid" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "channel" "public"."stock_notification_channel" NOT NULL,
    "notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_receipt_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stock_receipt_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "cost_price" numeric(12,2) NOT NULL,
    CONSTRAINT "stock_receipt_items_cost_non_negative" CHECK (("cost_price" >= (0)::numeric)),
    CONSTRAINT "stock_receipt_items_quantity_positive" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."stock_receipt_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "reference" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "storage_path" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warehouse_locations" (
    "warehouse_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL
);


ALTER TABLE "public"."warehouse_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warehouses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address_line_1" "text",
    "address_line_2" "text",
    "state" "text",
    "lga" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."warehouses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_unique_component" UNIQUE ("bundle_product_id", "component_product_id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_unique" UNIQUE ("organization_id", "slug");



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_email_unique" UNIQUE ("organization_id", "email");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customization_assets"
    ADD CONSTRAINT "customization_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customizations"
    ADD CONSTRAINT "customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_rates"
    ADD CONSTRAINT "delivery_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_rates"
    ADD CONSTRAINT "delivery_rates_unique" UNIQUE ("warehouse_id", "location_id");



ALTER TABLE ONLY "public"."discount_categories"
    ADD CONSTRAINT "discount_categories_pkey" PRIMARY KEY ("discount_id", "category_id");



ALTER TABLE ONLY "public"."discount_products"
    ADD CONSTRAINT "discount_products_pkey" PRIMARY KEY ("discount_id", "product_id");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_code_unique" UNIQUE ("organization_id", "code");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."domain_events"
    ADD CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_unique" UNIQUE ("warehouse_id", "product_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_unique" UNIQUE ("organization_id", "state", "lga", "name");



ALTER TABLE ONLY "public"."marketing_automations"
    ADD CONSTRAINT "marketing_automations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_email_events"
    ADD CONSTRAINT "marketing_email_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_segments"
    ADD CONSTRAINT "marketing_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_item_addons"
    ADD CONSTRAINT "order_item_addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_item_bundle_components"
    ADD CONSTRAINT "order_item_bundle_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_item_theme_customizations"
    ADD CONSTRAINT "order_item_theme_customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_item_theme_snapshots"
    ADD CONSTRAINT "order_item_theme_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payment_requests"
    ADD CONSTRAINT "order_payment_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payment_requests"
    ADD CONSTRAINT "order_payment_requests_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_unique" UNIQUE ("organization_id", "order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_unique" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_provider_reference_unique" UNIQUE ("provider", "provider_reference");



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_unique" UNIQUE ("parent_product_id", "addon_product_id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id", "category_id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_themes"
    ADD CONSTRAINT "product_themes_pkey" PRIMARY KEY ("product_id", "theme_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_unique" UNIQUE ("organization_id", "sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_unique" UNIQUE ("organization_id", "slug");



ALTER TABLE ONLY "public"."review_images"
    ADD CONSTRAINT "review_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_unique" UNIQUE ("customer_id", "product_id", "channel");



ALTER TABLE ONLY "public"."stock_receipt_items"
    ADD CONSTRAINT "stock_receipt_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_receipts"
    ADD CONSTRAINT "stock_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "uq_marketing_campaign_recipients_campaign_email" UNIQUE ("campaign_id", "email");



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "uq_marketing_campaign_recipients_id_campaign" UNIQUE ("id", "campaign_id");



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "uq_marketing_campaigns_id_org" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."marketing_segments"
    ADD CONSTRAINT "uq_marketing_segments_id_org" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."order_item_theme_customizations"
    ADD CONSTRAINT "uq_order_item_theme_customizations_item" UNIQUE ("order_item_id");



ALTER TABLE ONLY "public"."order_item_theme_snapshots"
    ADD CONSTRAINT "uq_order_item_theme_snapshots_cust_theme" UNIQUE ("customization_id", "theme_id");



ALTER TABLE ONLY "public"."warehouse_locations"
    ADD CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("warehouse_id", "location_id");



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_name_unique" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_created_idx" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "audit_logs_entity_idx" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "audit_logs_organization_idx" ON "public"."audit_logs" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "bundle_items_bundle_idx" ON "public"."bundle_items" USING "btree" ("bundle_product_id");



CREATE INDEX "bundle_items_component_idx" ON "public"."bundle_items" USING "btree" ("component_product_id");



CREATE INDEX "carts_customer_idx" ON "public"."carts" USING "btree" ("customer_id");



CREATE INDEX "carts_session_idx" ON "public"."carts" USING "btree" ("session_id");



CREATE INDEX "carts_status_idx" ON "public"."carts" USING "btree" ("status");



CREATE INDEX "categories_organization_idx" ON "public"."categories" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "categories_organization_slug_idx" ON "public"."categories" USING "btree" ("organization_id", "slug");



CREATE INDEX "checkout_sessions_email_idx" ON "public"."checkout_sessions" USING "btree" ("lower"("email"));



CREATE INDEX "checkout_sessions_expires_idx" ON "public"."checkout_sessions" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "checkout_sessions_status_idx" ON "public"."checkout_sessions" USING "btree" ("status");



CREATE INDEX "customer_addresses_customer_idx" ON "public"."customer_addresses" USING "btree" ("customer_id");



CREATE UNIQUE INDEX "customer_addresses_one_default_idx" ON "public"."customer_addresses" USING "btree" ("customer_id") WHERE ("is_default" = true);



CREATE UNIQUE INDEX "customer_one_default_address" ON "public"."customer_addresses" USING "btree" ("customer_id") WHERE ("is_default" = true);



CREATE INDEX "customers_email_idx" ON "public"."customers" USING "btree" ("organization_id", "email");



CREATE UNIQUE INDEX "customers_organization_email_idx" ON "public"."customers" USING "btree" ("organization_id", "lower"("email"));



CREATE INDEX "customers_organization_idx" ON "public"."customers" USING "btree" ("organization_id");



CREATE INDEX "customers_phone_idx" ON "public"."customers" USING "btree" ("organization_id", "phone");



CREATE INDEX "customers_user_idx" ON "public"."customers" USING "btree" ("user_id");



CREATE INDEX "customization_assets_customization_idx" ON "public"."customization_assets" USING "btree" ("customization_id");



CREATE INDEX "customizations_order_item_idx" ON "public"."customizations" USING "btree" ("order_item_id");



CREATE UNIQUE INDEX "delivery_rates_active_unique_idx" ON "public"."delivery_rates" USING "btree" ("warehouse_id", "location_id") WHERE ("active" = true);



CREATE INDEX "delivery_rates_location_idx" ON "public"."delivery_rates" USING "btree" ("location_id");



CREATE INDEX "discounts_active_idx" ON "public"."discounts" USING "btree" ("active");



CREATE INDEX "discounts_code_idx" ON "public"."discounts" USING "btree" ("organization_id", "code");



CREATE UNIQUE INDEX "discounts_org_code_idx" ON "public"."discounts" USING "btree" ("organization_id", "upper"("code"));



CREATE INDEX "discounts_organization_code_idx" ON "public"."discounts" USING "btree" ("organization_id", "lower"("code"));



CREATE INDEX "domain_events_aggregate_idx" ON "public"."domain_events" USING "btree" ("aggregate_type", "aggregate_id");



CREATE INDEX "domain_events_type_idx" ON "public"."domain_events" USING "btree" ("event_type");



CREATE INDEX "domain_events_unprocessed_idx" ON "public"."domain_events" USING "btree" ("created_at") WHERE ("processed_at" IS NULL);



CREATE INDEX "idx_checkout_sessions_org_created" ON "public"."checkout_sessions" USING "btree" ("organization_id", "created_at");



CREATE INDEX "idx_customers_org_created" ON "public"."customers" USING "btree" ("organization_id", "created_at");



CREATE INDEX "idx_marketing_automations_org_id" ON "public"."marketing_automations" USING "btree" ("organization_id");



CREATE INDEX "idx_marketing_automations_org_status" ON "public"."marketing_automations" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_marketing_automations_org_type" ON "public"."marketing_automations" USING "btree" ("organization_id", "type");



CREATE UNIQUE INDEX "idx_marketing_campaign_recipients_campaign_customer" ON "public"."marketing_campaign_recipients" USING "btree" ("campaign_id", "customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_marketing_campaign_recipients_campaign_id" ON "public"."marketing_campaign_recipients" USING "btree" ("campaign_id");



CREATE INDEX "idx_marketing_campaign_recipients_campaign_status" ON "public"."marketing_campaign_recipients" USING "btree" ("campaign_id", "status");



CREATE INDEX "idx_marketing_campaign_recipients_customer_id" ON "public"."marketing_campaign_recipients" USING "btree" ("customer_id");



CREATE INDEX "idx_marketing_campaign_recipients_email" ON "public"."marketing_campaign_recipients" USING "btree" ("email");



CREATE INDEX "idx_marketing_campaigns_org_id" ON "public"."marketing_campaigns" USING "btree" ("organization_id");



CREATE INDEX "idx_marketing_campaigns_org_scheduled_at" ON "public"."marketing_campaigns" USING "btree" ("organization_id", "scheduled_at");



CREATE INDEX "idx_marketing_campaigns_org_status" ON "public"."marketing_campaigns" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_marketing_campaigns_segment_id" ON "public"."marketing_campaigns" USING "btree" ("segment_id");



CREATE INDEX "idx_marketing_email_events_campaign_event_type" ON "public"."marketing_email_events" USING "btree" ("campaign_id", "event_type");



CREATE INDEX "idx_marketing_email_events_campaign_id" ON "public"."marketing_email_events" USING "btree" ("campaign_id");



CREATE INDEX "idx_marketing_email_events_customer_id" ON "public"."marketing_email_events" USING "btree" ("customer_id");



CREATE INDEX "idx_marketing_email_events_occurred_at" ON "public"."marketing_email_events" USING "btree" ("occurred_at");



CREATE INDEX "idx_marketing_email_events_recipient_id" ON "public"."marketing_email_events" USING "btree" ("campaign_recipient_id");



CREATE INDEX "idx_marketing_segments_org_active" ON "public"."marketing_segments" USING "btree" ("organization_id", "active");



CREATE INDEX "idx_marketing_segments_org_id" ON "public"."marketing_segments" USING "btree" ("organization_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_notifications_recipient_lookup" ON "public"."notifications" USING "btree" ("organization_id", "recipient_type", "recipient_id", "read_at");



CREATE INDEX "idx_order_item_addons_order_item" ON "public"."order_item_addons" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_item_bundle_comp_order_item" ON "public"."order_item_bundle_components" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_item_theme_cust_item" ON "public"."order_item_theme_customizations" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_item_theme_customizations_item" ON "public"."order_item_theme_customizations" USING "btree" ("order_item_id");



CREATE INDEX "idx_order_item_theme_snapshots_cust" ON "public"."order_item_theme_snapshots" USING "btree" ("customization_id");



CREATE INDEX "idx_order_item_theme_snapshots_customization" ON "public"."order_item_theme_snapshots" USING "btree" ("customization_id");



CREATE UNIQUE INDEX "idx_order_payment_requests_token" ON "public"."order_payment_requests" USING "btree" ("token");



CREATE UNIQUE INDEX "idx_orders_org_idempotency" ON "public"."orders" USING "btree" ("organization_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_orders_org_placed_at" ON "public"."orders" USING "btree" ("organization_id", "placed_at");



CREATE INDEX "idx_org_invitations_email" ON "public"."organization_invitations" USING "btree" ("organization_id", "lower"("email"));



CREATE INDEX "idx_org_invitations_expires_at" ON "public"."organization_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_org_invitations_org_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_org_invitations_token" ON "public"."organization_invitations" USING "btree" ("token");



CREATE INDEX "idx_payments_org_status_paid_at" ON "public"."payments" USING "btree" ("status", "paid_at");



CREATE INDEX "idx_product_themes_product" ON "public"."product_themes" USING "btree" ("product_id");



CREATE INDEX "idx_product_themes_theme" ON "public"."product_themes" USING "btree" ("theme_id");



CREATE UNIQUE INDEX "idx_themes_org_slug" ON "public"."themes" USING "btree" ("organization_id", "slug");



CREATE INDEX "idx_themes_org_sort" ON "public"."themes" USING "btree" ("organization_id", "sort_order");



CREATE UNIQUE INDEX "idx_unique_pending_org_invitation" ON "public"."organization_invitations" USING "btree" ("organization_id", "lower"("email")) WHERE ("accepted_at" IS NULL);



CREATE INDEX "inventory_movements_created_idx" ON "public"."inventory_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "inventory_movements_product_idx" ON "public"."inventory_movements" USING "btree" ("product_id");



CREATE INDEX "inventory_movements_reference_idx" ON "public"."inventory_movements" USING "btree" ("reference_id");



CREATE INDEX "inventory_movements_warehouse_idx" ON "public"."inventory_movements" USING "btree" ("warehouse_id");



CREATE INDEX "inventory_product_idx" ON "public"."inventory" USING "btree" ("product_id");



CREATE UNIQUE INDEX "inventory_product_warehouse_idx" ON "public"."inventory" USING "btree" ("warehouse_id", "product_id");



CREATE UNIQUE INDEX "inventory_reservations_active_order_inventory_idx" ON "public"."inventory_reservations" USING "btree" ("order_id", "inventory_id") WHERE ("status" = 'active'::"public"."inventory_reservation_status");



CREATE INDEX "inventory_reservations_expiration_idx" ON "public"."inventory_reservations" USING "btree" ("expires_at") WHERE ("status" = 'active'::"public"."inventory_reservation_status");



CREATE INDEX "inventory_reservations_inventory_idx" ON "public"."inventory_reservations" USING "btree" ("inventory_id");



CREATE INDEX "inventory_reservations_order_idx" ON "public"."inventory_reservations" USING "btree" ("order_id");



CREATE INDEX "inventory_reservations_status_idx" ON "public"."inventory_reservations" USING "btree" ("status");



CREATE INDEX "inventory_warehouse_idx" ON "public"."inventory" USING "btree" ("warehouse_id");



CREATE INDEX "order_item_addons_order_item_idx" ON "public"."order_item_addons" USING "btree" ("order_item_id");



CREATE INDEX "order_item_addons_product_idx" ON "public"."order_item_addons" USING "btree" ("addon_product_id");



CREATE INDEX "order_item_bundle_components_order_item_idx" ON "public"."order_item_bundle_components" USING "btree" ("order_item_id");



CREATE INDEX "order_items_order_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_items_product_idx" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "order_items_warehouse_idx" ON "public"."order_items" USING "btree" ("warehouse_id");



CREATE INDEX "order_payment_requests_expires_idx" ON "public"."order_payment_requests" USING "btree" ("expires_at");



CREATE INDEX "order_payment_requests_order_idx" ON "public"."order_payment_requests" USING "btree" ("order_id");



CREATE INDEX "order_payment_requests_organization_idx" ON "public"."order_payment_requests" USING "btree" ("organization_id");



CREATE INDEX "order_payment_requests_status_idx" ON "public"."order_payment_requests" USING "btree" ("status");



CREATE INDEX "order_status_history_order_idx" ON "public"."order_status_history" USING "btree" ("order_id", "created_at");



CREATE INDEX "orders_created_at_idx" ON "public"."orders" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "orders_created_by_idx" ON "public"."orders" USING "btree" ("created_by");



CREATE INDEX "orders_customer_idx" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "orders_order_source_idx" ON "public"."orders" USING "btree" ("organization_id", "order_source");



CREATE UNIQUE INDEX "orders_organization_order_number_idx" ON "public"."orders" USING "btree" ("organization_id", "order_number");



CREATE INDEX "orders_status_idx" ON "public"."orders" USING "btree" ("organization_id", "status");



CREATE INDEX "payments_order_idx" ON "public"."payments" USING "btree" ("order_id");



CREATE UNIQUE INDEX "payments_provider_reference_idx" ON "public"."payments" USING "btree" ("provider", "provider_reference");



CREATE INDEX "product_addons_addon_idx" ON "public"."product_addons" USING "btree" ("addon_product_id");



CREATE INDEX "product_addons_parent_idx" ON "public"."product_addons" USING "btree" ("parent_product_id");



CREATE UNIQUE INDEX "product_addons_relationship_idx" ON "public"."product_addons" USING "btree" ("parent_product_id", "addon_product_id");



CREATE INDEX "product_images_product_idx" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "products_created_idx" ON "public"."products" USING "btree" ("created_at" DESC);



CREATE INDEX "products_organization_idx" ON "public"."products" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "products_organization_sku_idx" ON "public"."products" USING "btree" ("organization_id", "sku") WHERE ("sku" IS NOT NULL);



CREATE UNIQUE INDEX "products_organization_slug_idx" ON "public"."products" USING "btree" ("organization_id", "slug");



CREATE INDEX "products_organization_status_idx" ON "public"."products" USING "btree" ("organization_id", "status");



CREATE INDEX "products_status_idx" ON "public"."products" USING "btree" ("organization_id", "status");



CREATE INDEX "products_type_idx" ON "public"."products" USING "btree" ("organization_id", "product_type");



CREATE INDEX "reviews_customer_idx" ON "public"."reviews" USING "btree" ("customer_id");



CREATE UNIQUE INDEX "reviews_one_per_order_product" ON "public"."reviews" USING "btree" ("customer_id", "order_id", "product_id");



CREATE INDEX "reviews_order_idx" ON "public"."reviews" USING "btree" ("order_id");



CREATE INDEX "reviews_product_idx" ON "public"."reviews" USING "btree" ("product_id");



CREATE INDEX "reviews_status_idx" ON "public"."reviews" USING "btree" ("product_id", "status");



CREATE INDEX "stock_notifications_product_idx" ON "public"."stock_notifications" USING "btree" ("product_id");



CREATE UNIQUE INDEX "stock_notifications_unique_idx" ON "public"."stock_notifications" USING "btree" ("customer_id", "product_id", "channel");



CREATE INDEX "stock_receipt_items_receipt_idx" ON "public"."stock_receipt_items" USING "btree" ("stock_receipt_id");



CREATE INDEX "stock_receipts_warehouse_idx" ON "public"."stock_receipts" USING "btree" ("warehouse_id");



CREATE INDEX "warehouses_organization_idx" ON "public"."warehouses" USING "btree" ("organization_id");



CREATE OR REPLACE TRIGGER "carts_updated_at" BEFORE UPDATE ON "public"."carts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "checkout_sessions_updated_at" BEFORE UPDATE ON "public"."checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "customer_addresses_updated_at" BEFORE UPDATE ON "public"."customer_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "discounts_updated_at" BEFORE UPDATE ON "public"."discounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "inventory_updated_at" BEFORE UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_marketing_automations_updated_at" BEFORE UPDATE ON "public"."marketing_automations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_marketing_updated_at"();



CREATE OR REPLACE TRIGGER "trg_marketing_campaign_recipients_validate_customer" BEFORE INSERT OR UPDATE ON "public"."marketing_campaign_recipients" FOR EACH ROW EXECUTE FUNCTION "public"."check_marketing_recipient_customer_org"();



CREATE OR REPLACE TRIGGER "trg_marketing_campaigns_updated_at" BEFORE UPDATE ON "public"."marketing_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."handle_marketing_updated_at"();



CREATE OR REPLACE TRIGGER "trg_marketing_email_events_validate_customer" BEFORE INSERT OR UPDATE ON "public"."marketing_email_events" FOR EACH ROW EXECUTE FUNCTION "public"."check_marketing_email_event_customer"();



CREATE OR REPLACE TRIGGER "trg_marketing_segments_updated_at" BEFORE UPDATE ON "public"."marketing_segments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_marketing_updated_at"();



CREATE OR REPLACE TRIGGER "validate_bundle_item_trigger" BEFORE INSERT OR UPDATE ON "public"."bundle_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_bundle_item"();



CREATE OR REPLACE TRIGGER "validate_order_payment_request_trigger" BEFORE INSERT OR UPDATE ON "public"."order_payment_requests" FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_payment_request"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_bundle_product_id_fkey" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customization_assets"
    ADD CONSTRAINT "customization_assets_customization_id_fkey" FOREIGN KEY ("customization_id") REFERENCES "public"."customizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customizations"
    ADD CONSTRAINT "customizations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_rates"
    ADD CONSTRAINT "delivery_rates_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_rates"
    ADD CONSTRAINT "delivery_rates_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_categories"
    ADD CONSTRAINT "discount_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_categories"
    ADD CONSTRAINT "discount_categories_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_products"
    ADD CONSTRAINT "discount_products_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_products"
    ADD CONSTRAINT "discount_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domain_events"
    ADD CONSTRAINT "domain_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "fk_marketing_campaigns_segment_org" FOREIGN KEY ("segment_id", "organization_id") REFERENCES "public"."marketing_segments"("id", "organization_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_email_events"
    ADD CONSTRAINT "fk_marketing_email_events_recipient_campaign" FOREIGN KEY ("campaign_recipient_id", "campaign_id") REFERENCES "public"."marketing_campaign_recipients"("id", "campaign_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_automations"
    ADD CONSTRAINT "marketing_automations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_automations"
    ADD CONSTRAINT "marketing_automations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_email_events"
    ADD CONSTRAINT "marketing_email_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_email_events"
    ADD CONSTRAINT "marketing_email_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_segments"
    ADD CONSTRAINT "marketing_segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_addons"
    ADD CONSTRAINT "order_item_addons_addon_product_id_fkey" FOREIGN KEY ("addon_product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_item_addons"
    ADD CONSTRAINT "order_item_addons_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_bundle_components"
    ADD CONSTRAINT "order_item_bundle_components_order_item_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_bundle_components"
    ADD CONSTRAINT "order_item_bundle_components_product_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_item_theme_customizations"
    ADD CONSTRAINT "order_item_theme_customizations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_theme_snapshots"
    ADD CONSTRAINT "order_item_theme_snapshots_customization_id_fkey" FOREIGN KEY ("customization_id") REFERENCES "public"."order_item_theme_customizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_item_theme_snapshots"
    ADD CONSTRAINT "order_item_theme_snapshots_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."order_payment_requests"
    ADD CONSTRAINT "order_payment_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_payment_requests"
    ADD CONSTRAINT "order_payment_requests_order_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_payment_requests"
    ADD CONSTRAINT "order_payment_requests_organization_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_addon_product_id_fkey" FOREIGN KEY ("addon_product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_parent_product_id_fkey" FOREIGN KEY ("parent_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_themes"
    ADD CONSTRAINT "product_themes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_themes"
    ADD CONSTRAINT "product_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_images"
    ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_receipt_items"
    ADD CONSTRAINT "stock_receipt_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_receipt_items"
    ADD CONSTRAINT "stock_receipt_items_stock_receipt_id_fkey" FOREIGN KEY ("stock_receipt_id") REFERENCES "public"."stock_receipts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_receipts"
    ADD CONSTRAINT "stock_receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_receipts"
    ADD CONSTRAINT "stock_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warehouse_locations"
    ADD CONSTRAINT "warehouse_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warehouse_locations"
    ADD CONSTRAINT "warehouse_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Org admin manage product themes" ON "public"."product_themes" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_themes"."product_id") AND "public"."is_organization_admin"("p"."organization_id")))));



CREATE POLICY "Org admin manage themes" ON "public"."themes" USING ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "Public read active themes" ON "public"."themes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public read active warehouses" ON "public"."warehouses" FOR SELECT USING ((COALESCE("active", true) = true));



CREATE POLICY "Public read bundle items" ON "public"."bundle_items" FOR SELECT USING (true);



CREATE POLICY "Public read inventory" ON "public"."inventory" FOR SELECT USING (true);



CREATE POLICY "Public read product addons" ON "public"."product_addons" FOR SELECT USING ((COALESCE("active", true) = true));



CREATE POLICY "Public read product themes" ON "public"."product_themes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_themes"."product_id") AND ("p"."status" = 'published'::"public"."product_status")))));



CREATE POLICY "Read order item theme customizations" ON "public"."order_item_theme_customizations" FOR SELECT USING (true);



CREATE POLICY "Read order item theme snapshots" ON "public"."order_item_theme_snapshots" FOR SELECT USING (true);



CREATE POLICY "Service role manage order item theme customizations" ON "public"."order_item_theme_customizations" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Service role manage order item theme snapshots" ON "public"."order_item_theme_snapshots" USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "approved_review_images_public_read" ON "public"."review_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."reviews" "r"
  WHERE (("r"."id" = "review_images"."review_id") AND ("r"."status" = 'approved'::"public"."review_status")))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_admin_select" ON "public"."audit_logs" FOR SELECT USING ("public"."is_organization_admin"("organization_id"));



ALTER TABLE "public"."bundle_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bundle_items_org_admin_all" ON "public"."bundle_items" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "bundle_items"."bundle_product_id") AND "public"."is_organization_admin"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "bundle_items"."bundle_product_id") AND "public"."is_organization_admin"("p"."organization_id")))));



CREATE POLICY "bundle_items_org_member_read" ON "public"."bundle_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "bundle_items"."bundle_product_id") AND "public"."is_organization_member"("p"."organization_id")))));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_admin_all" ON "public"."categories" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "categories_public_read" ON "public"."categories" FOR SELECT USING (true);



ALTER TABLE "public"."checkout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_addresses_self_all" ON "public"."customer_addresses" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_addresses"."customer_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_addresses"."customer_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "customer_reviews_insert" ON "public"."reviews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "reviews"."customer_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "customer_reviews_select_own" ON "public"."reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "reviews"."customer_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_admin_all" ON "public"."customers" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "customers_self_select" ON "public"."customers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "customers_self_update" ON "public"."customers" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."customization_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delivery_rates_public_read" ON "public"."delivery_rates" FOR SELECT USING (("active" = true));



ALTER TABLE "public"."discount_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discount_categories_org_admin_all" ON "public"."discount_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."discounts" "d"
  WHERE (("d"."id" = "discount_categories"."discount_id") AND "public"."is_organization_admin"("d"."organization_id")))));



CREATE POLICY "discount_categories_org_member_read" ON "public"."discount_categories" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."discounts" "d"
  WHERE (("d"."id" = "discount_categories"."discount_id") AND "public"."is_organization_member"("d"."organization_id")))));



ALTER TABLE "public"."discount_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discount_products_org_admin_all" ON "public"."discount_products" USING ((EXISTS ( SELECT 1
   FROM "public"."discounts" "d"
  WHERE (("d"."id" = "discount_products"."discount_id") AND "public"."is_organization_admin"("d"."organization_id")))));



CREATE POLICY "discount_products_org_member_read" ON "public"."discount_products" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."discounts" "d"
  WHERE (("d"."id" = "discount_products"."discount_id") AND "public"."is_organization_member"("d"."organization_id")))));



ALTER TABLE "public"."discounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discounts_admin_all" ON "public"."discounts" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "discounts_org_admin_all" ON "public"."discounts" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "discounts_org_member_read" ON "public"."discounts" FOR SELECT USING ("public"."is_organization_member"("organization_id"));



ALTER TABLE "public"."domain_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locations_admin_all" ON "public"."locations" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "locations_public_read" ON "public"."locations" FOR SELECT USING (true);



ALTER TABLE "public"."marketing_automations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_automations_admin_all" ON "public"."marketing_automations" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "marketing_automations_member_read" ON "public"."marketing_automations" FOR SELECT USING ("public"."is_organization_member"("organization_id"));



ALTER TABLE "public"."marketing_campaign_recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_campaign_recipients_admin_all" ON "public"."marketing_campaign_recipients" USING ("public"."is_organization_admin"("public"."get_campaign_organization_id"("campaign_id"))) WITH CHECK ("public"."is_organization_admin"("public"."get_campaign_organization_id"("campaign_id")));



CREATE POLICY "marketing_campaign_recipients_member_read" ON "public"."marketing_campaign_recipients" FOR SELECT USING ("public"."is_organization_member"("public"."get_campaign_organization_id"("campaign_id")));



ALTER TABLE "public"."marketing_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_campaigns_admin_all" ON "public"."marketing_campaigns" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "marketing_campaigns_member_read" ON "public"."marketing_campaigns" FOR SELECT USING ("public"."is_organization_member"("organization_id"));



ALTER TABLE "public"."marketing_email_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_email_events_admin_all" ON "public"."marketing_email_events" USING ("public"."is_organization_admin"("public"."get_campaign_organization_id"("campaign_id"))) WITH CHECK ("public"."is_organization_admin"("public"."get_campaign_organization_id"("campaign_id")));



CREATE POLICY "marketing_email_events_member_read" ON "public"."marketing_email_events" FOR SELECT USING ("public"."is_organization_member"("public"."get_campaign_organization_id"("campaign_id")));



ALTER TABLE "public"."marketing_segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_segments_admin_all" ON "public"."marketing_segments" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "marketing_segments_member_read" ON "public"."marketing_segments" FOR SELECT USING ("public"."is_organization_member"("organization_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_admin_all" ON "public"."notifications" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "notifications_member_read" ON "public"."notifications" FOR SELECT USING (("public"."is_organization_member"("organization_id") AND (("recipient_type" = 'admin'::"text") OR ("recipient_type" = 'broadcast'::"text"))));



CREATE POLICY "order_bundle_components_org_admin_all" ON "public"."order_item_bundle_components" USING ((EXISTS ( SELECT 1
   FROM ("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
  WHERE (("oi"."id" = "order_item_bundle_components"."order_item_id") AND "public"."is_organization_admin"("o"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
  WHERE (("oi"."id" = "order_item_bundle_components"."order_item_id") AND "public"."is_organization_admin"("o"."organization_id")))));



ALTER TABLE "public"."order_item_addons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_item_addons_self_select" ON "public"."order_item_addons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
     JOIN "public"."customers" "c" ON (("c"."id" = "o"."customer_id")))
  WHERE (("oi"."id" = "order_item_addons"."order_item_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."order_item_bundle_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_item_theme_customizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_item_theme_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_admin_all" ON "public"."order_items" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND "public"."is_organization_admin"("o"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND "public"."is_organization_admin"("o"."organization_id")))));



CREATE POLICY "order_items_self_select" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."customers" "c" ON (("c"."id" = "o"."customer_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."order_payment_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payment_requests_org_admin_all" ON "public"."order_payment_requests" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_status_history_self_select" ON "public"."order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."customers" "c" ON (("c"."id" = "o"."customer_id")))
  WHERE (("o"."id" = "order_status_history"."order_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_admin_all" ON "public"."orders" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "orders_self_select" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "orders"."customer_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_invitations_admin_all" ON "public"."organization_invitations" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "organization_invitations_member_read" ON "public"."organization_invitations" FOR SELECT USING ("public"."is_organization_member"("organization_id"));



CREATE POLICY "organization_invitations_token_read" ON "public"."organization_invitations" FOR SELECT USING ((("accepted_at" IS NULL) AND ("expires_at" > "now"())));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members_admin_modify" ON "public"."organization_members" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "organization_members_select" ON "public"."organization_members" FOR SELECT USING ("public"."is_organization_member"("organization_id"));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_select_member" ON "public"."organizations" FOR SELECT USING ("public"."is_organization_member"("id"));



CREATE POLICY "organizations_update_admin" ON "public"."organizations" FOR UPDATE USING ("public"."is_organization_admin"("id")) WITH CHECK ("public"."is_organization_admin"("id"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_addons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_addons_public_read" ON "public"."product_addons" FOR SELECT USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_addons"."parent_product_id") AND ("p"."status" = 'published'::"public"."product_status"))))));



ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_categories_public_read" ON "public"."product_categories" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_categories"."product_id") AND ("p"."status" = 'published'::"public"."product_status")))));



ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_images_public_read" ON "public"."product_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_images"."product_id") AND ("p"."status" = 'published'::"public"."product_status")))));



ALTER TABLE "public"."product_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_admin_all" ON "public"."products" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



CREATE POLICY "published_products_public_read" ON "public"."products" FOR SELECT USING (("status" = 'published'::"public"."product_status"));



CREATE POLICY "published_reviews_public_read" ON "public"."reviews" FOR SELECT USING (("status" = 'approved'::"public"."review_status"));



ALTER TABLE "public"."review_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_admin_all" ON "public"."reviews" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "reviews"."product_id") AND "public"."is_organization_admin"("p"."organization_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "reviews"."product_id") AND "public"."is_organization_admin"("p"."organization_id")))));



ALTER TABLE "public"."stock_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_notifications_self_all" ON "public"."stock_notifications" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "stock_notifications"."customer_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "stock_notifications"."customer_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."stock_receipt_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_receipts_admin_all" ON "public"."stock_receipts" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));



ALTER TABLE "public"."themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."warehouse_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."warehouses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "warehouses_admin_all" ON "public"."warehouses" USING ("public"."is_organization_admin"("organization_id")) WITH CHECK ("public"."is_organization_admin"("organization_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."assign_product_themes"("p_org_id" "uuid", "p_product_id" "uuid", "p_theme_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_product_themes"("p_org_id" "uuid", "p_product_id" "uuid", "p_theme_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."assign_product_themes"("p_org_id" "uuid", "p_product_id" "uuid", "p_theme_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_product_themes"("p_org_id" "uuid", "p_product_id" "uuid", "p_theme_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_percentage_change_sql"("p_current" numeric, "p_previous" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_percentage_change_sql"("p_current" numeric, "p_previous" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_percentage_change_sql"("p_current" numeric, "p_previous" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_order"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_order"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."change_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."change_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_marketing_email_event_customer"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_marketing_email_event_customer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_marketing_email_event_customer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_marketing_recipient_customer_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_marketing_recipient_customer_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_marketing_recipient_customer_org"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."commit_inventory_reservation"("p_reservation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."commit_inventory_reservation"("p_reservation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."commit_inventory_reservation"("p_reservation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."commit_inventory_reservation"("p_reservation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."commit_order_inventory"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."commit_order_inventory"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."commit_order_inventory"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_payment"("p_order_id" "uuid", "p_provider" "text", "p_provider_reference" "text", "p_amount" numeric, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_payment"("p_order_id" "uuid", "p_provider" "text", "p_provider_reference" "text", "p_amount" numeric, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_payment"("p_order_id" "uuid", "p_provider" "text", "p_provider_reference" "text", "p_amount" numeric, "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_admin_bundle"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_admin_bundle"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_admin_bundle"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_admin_bundle"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_admin_manual_order"("p_org_id" "uuid", "p_customer" "jsonb", "p_shipping_address" "jsonb", "p_items" "jsonb", "p_location_id" "uuid", "p_warehouse_id" "uuid", "p_manual_order_channel" "text", "p_discount_code" "text", "p_shipping_fee" numeric, "p_notes" "text", "p_idempotency_key" "text", "p_manual_discount" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_admin_manual_order"("p_org_id" "uuid", "p_customer" "jsonb", "p_shipping_address" "jsonb", "p_items" "jsonb", "p_location_id" "uuid", "p_warehouse_id" "uuid", "p_manual_order_channel" "text", "p_discount_code" "text", "p_shipping_fee" numeric, "p_notes" "text", "p_idempotency_key" "text", "p_manual_discount" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_admin_manual_order"("p_org_id" "uuid", "p_customer" "jsonb", "p_shipping_address" "jsonb", "p_items" "jsonb", "p_location_id" "uuid", "p_warehouse_id" "uuid", "p_manual_order_channel" "text", "p_discount_code" "text", "p_shipping_fee" numeric, "p_notes" "text", "p_idempotency_key" "text", "p_manual_discount" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_admin_manual_order"("p_org_id" "uuid", "p_customer" "jsonb", "p_shipping_address" "jsonb", "p_items" "jsonb", "p_location_id" "uuid", "p_warehouse_id" "uuid", "p_manual_order_channel" "text", "p_discount_code" "text", "p_shipping_fee" numeric, "p_notes" "text", "p_idempotency_key" "text", "p_manual_discount" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_admin_theme"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_admin_theme"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_admin_theme"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_admin_theme"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_whatsapp_number" "text", "p_warehouse_id" "uuid", "p_location_id" "uuid", "p_shipping_address" "jsonb", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_whatsapp_number" "text", "p_warehouse_id" "uuid", "p_location_id" "uuid", "p_shipping_address" "jsonb", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_whatsapp_number" "text", "p_warehouse_id" "uuid", "p_location_id" "uuid", "p_shipping_address" "jsonb", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."duplicate_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_new_name" "text", "p_new_slug" "text", "p_new_sku" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."duplicate_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_new_name" "text", "p_new_slug" "text", "p_new_sku" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."duplicate_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_new_name" "text", "p_new_slug" "text", "p_new_sku" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_new_name" "text", "p_new_slug" "text", "p_new_sku" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_inventory_reservation"("p_reservation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_inventory_reservation"("p_reservation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."expire_inventory_reservation"("p_reservation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_inventory_reservation"("p_reservation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_inventory_reservations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_inventory_reservations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_inventory_reservations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_inventory_reservations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_checkout"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_checkout"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_checkout"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_customers"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_customers"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_customers"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_inventory"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_inventory"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_inventory"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_overview"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_overview"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_overview"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_prev_from" timestamp with time zone, "p_prev_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_products"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_products"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_products"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_sales_series"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_granularity" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_sales_series"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_granularity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_sales_series"("p_org_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_granularity" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_inventory"("p_product_id" "uuid", "p_warehouse_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_inventory"("p_product_id" "uuid", "p_warehouse_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_inventory"("p_product_id" "uuid", "p_warehouse_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_organization_id"("p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_organization_id"("p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_organization_id"("p_campaign_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_product_available_themes"("p_product_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_product_available_themes"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_available_themes"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_available_themes"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_marketing_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_marketing_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_marketing_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_discount_usage"("p_discount_id" "uuid", "p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_discount_usage"("p_discount_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_discount_usage"("p_discount_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_discount_usage"("p_discount_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_admin"("target_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("target_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("target_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_member"("target_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_member"("target_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_member"("target_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_order_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_order_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_order_transition"("p_from" "public"."order_status", "p_to" "public"."order_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."receive_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."receive_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."receive_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refund_order"("p_order_id" "uuid", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refund_order"("p_order_id" "uuid", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refund_order"("p_order_id" "uuid", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_inventory_reservation"("p_reservation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_inventory_reservation"("p_reservation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_inventory_reservation"("p_reservation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_inventory_reservation"("p_reservation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_order_inventory"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_order_inventory"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_order_inventory"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reorder_admin_themes"("p_org_id" "uuid", "p_theme_orders" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reorder_admin_themes"("p_org_id" "uuid", "p_theme_orders" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_admin_themes"("p_org_id" "uuid", "p_theme_orders" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_admin_themes"("p_org_id" "uuid", "p_theme_orders" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_inventory"("p_order_id" "uuid", "p_inventory_id" "uuid", "p_quantity" integer, "p_expiration_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_inventory"("p_order_id" "uuid", "p_inventory_id" "uuid", "p_quantity" integer, "p_expiration_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_inventory"("p_order_id" "uuid", "p_inventory_id" "uuid", "p_quantity" integer, "p_expiration_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_inventory"("p_order_id" "uuid", "p_inventory_id" "uuid", "p_quantity" integer, "p_expiration_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_order_inventory"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_order_inventory"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_order_inventory"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ship_order"("p_order_id" "uuid", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ship_order"("p_order_id" "uuid", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ship_order"("p_order_id" "uuid", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."toggle_admin_theme_active"("p_org_id" "uuid", "p_theme_id" "uuid", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."toggle_admin_theme_active"("p_org_id" "uuid", "p_theme_id" "uuid", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_admin_theme_active"("p_org_id" "uuid", "p_theme_id" "uuid", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_admin_theme_active"("p_org_id" "uuid", "p_theme_id" "uuid", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_bundle"("p_bundle_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_sku" "text", "p_selling_price" numeric, "p_cost_price" numeric, "p_status" "public"."product_status", "p_category_ids" "uuid"[], "p_images" "jsonb", "p_components" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_theme"("p_org_id" "uuid", "p_theme_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_storage_path" "text", "p_is_active" boolean, "p_sort_order" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_bundle_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_bundle_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_bundle_item"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_order_payment_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_order_payment_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_order_payment_request"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bundle_items" TO "anon";
GRANT ALL ON TABLE "public"."bundle_items" TO "authenticated";
GRANT ALL ON TABLE "public"."bundle_items" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."customer_addresses" TO "anon";
GRANT ALL ON TABLE "public"."customer_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."customization_assets" TO "anon";
GRANT ALL ON TABLE "public"."customization_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."customization_assets" TO "service_role";



GRANT ALL ON TABLE "public"."customizations" TO "anon";
GRANT ALL ON TABLE "public"."customizations" TO "authenticated";
GRANT ALL ON TABLE "public"."customizations" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_rates" TO "anon";
GRANT ALL ON TABLE "public"."delivery_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_rates" TO "service_role";



GRANT ALL ON TABLE "public"."discount_categories" TO "anon";
GRANT ALL ON TABLE "public"."discount_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."discount_categories" TO "service_role";



GRANT ALL ON TABLE "public"."discount_products" TO "anon";
GRANT ALL ON TABLE "public"."discount_products" TO "authenticated";
GRANT ALL ON TABLE "public"."discount_products" TO "service_role";



GRANT ALL ON TABLE "public"."discounts" TO "anon";
GRANT ALL ON TABLE "public"."discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."discounts" TO "service_role";



GRANT ALL ON TABLE "public"."domain_events" TO "anon";
GRANT ALL ON TABLE "public"."domain_events" TO "authenticated";
GRANT ALL ON TABLE "public"."domain_events" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movements" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_reservations" TO "anon";
GRANT ALL ON TABLE "public"."inventory_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_automations" TO "anon";
GRANT ALL ON TABLE "public"."marketing_automations" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_automations" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaign_recipients" TO "anon";
GRANT ALL ON TABLE "public"."marketing_campaign_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_campaign_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_email_events" TO "anon";
GRANT ALL ON TABLE "public"."marketing_email_events" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_email_events" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_segments" TO "anon";
GRANT ALL ON TABLE "public"."marketing_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_segments" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_addons" TO "anon";
GRANT ALL ON TABLE "public"."order_item_addons" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_addons" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_bundle_components" TO "anon";
GRANT ALL ON TABLE "public"."order_item_bundle_components" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_bundle_components" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_theme_customizations" TO "anon";
GRANT ALL ON TABLE "public"."order_item_theme_customizations" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_theme_customizations" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_theme_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."order_item_theme_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_theme_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_payment_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."order_payment_requests" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."product_addons" TO "anon";
GRANT ALL ON TABLE "public"."product_addons" TO "authenticated";
GRANT ALL ON TABLE "public"."product_addons" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."product_themes" TO "anon";
GRANT ALL ON TABLE "public"."product_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."product_themes" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."review_images" TO "anon";
GRANT ALL ON TABLE "public"."review_images" TO "authenticated";
GRANT ALL ON TABLE "public"."review_images" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."stock_notifications" TO "anon";
GRANT ALL ON TABLE "public"."stock_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."stock_receipt_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_receipt_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_receipt_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_receipts" TO "anon";
GRANT ALL ON TABLE "public"."stock_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."themes" TO "anon";
GRANT ALL ON TABLE "public"."themes" TO "authenticated";
GRANT ALL ON TABLE "public"."themes" TO "service_role";



GRANT ALL ON TABLE "public"."warehouse_locations" TO "anon";
GRANT ALL ON TABLE "public"."warehouse_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."warehouse_locations" TO "service_role";



GRANT ALL ON TABLE "public"."warehouses" TO "anon";
GRANT ALL ON TABLE "public"."warehouses" TO "authenticated";
GRANT ALL ON TABLE "public"."warehouses" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































