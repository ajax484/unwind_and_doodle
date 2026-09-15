-- Migration: 20260915183000_bundle_product_media_support.sql
-- Description: Sync bundle images and media into product_media table in create_admin_bundle and update_admin_bundle

CREATE OR REPLACE FUNCTION "public"."create_admin_bundle"(
  "p_org_id" "uuid",
  "p_name" "text",
  "p_slug" "text",
  "p_description" "text" DEFAULT NULL::"text",
  "p_sku" "text" DEFAULT NULL::"text",
  "p_selling_price" numeric DEFAULT 0,
  "p_cost_price" numeric DEFAULT 0,
  "p_status" "public"."product_status" DEFAULT 'draft'::"public"."product_status",
  "p_category_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
  "p_images" "jsonb" DEFAULT '[]'::"jsonb",
  "p_components" "jsonb" DEFAULT '[]'::"jsonb"
) RETURNS "uuid"
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
  -- 1. Verify caller authorization
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

  -- 5. Validate each component product
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

  -- 6. Validate categories if provided
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

  -- 7. Insert base product record
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

  -- 9. Insert images and sync product_media
  IF p_images IS NOT NULL AND jsonb_array_length(p_images) > 0 THEN
    FOR v_img IN SELECT * FROM jsonb_array_elements(p_images) LOOP
      IF COALESCE(v_img->>'type', 'image') = 'image' THEN
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
      END IF;

      INSERT INTO public.product_media (
        product_id,
        type,
        storage_path,
        thumbnail_path,
        alt_text,
        sort_order
      ) VALUES (
        v_bundle_id,
        COALESCE(v_img->>'type', 'image')::public.product_media_type,
        v_img->>'storage_path',
        v_img->>'thumbnail_path',
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


CREATE OR REPLACE FUNCTION "public"."update_admin_bundle"(
  "p_bundle_id" "uuid",
  "p_org_id" "uuid",
  "p_name" "text",
  "p_slug" "text",
  "p_description" "text" DEFAULT NULL::"text",
  "p_sku" "text" DEFAULT NULL::"text",
  "p_selling_price" numeric DEFAULT 0,
  "p_cost_price" numeric DEFAULT 0,
  "p_status" "public"."product_status" DEFAULT 'draft'::"public"."product_status",
  "p_category_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_images" "jsonb" DEFAULT NULL::"jsonb",
  "p_components" "jsonb" DEFAULT NULL::"jsonb"
) RETURNS "uuid"
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

  -- 8. Replace images and sync product_media if provided
  IF p_images IS NOT NULL THEN
    DELETE FROM public.product_images WHERE product_id = p_bundle_id;
    DELETE FROM public.product_media WHERE product_id = p_bundle_id;
    IF jsonb_array_length(p_images) > 0 THEN
      FOR v_img IN SELECT * FROM jsonb_array_elements(p_images) LOOP
        IF COALESCE(v_img->>'type', 'image') = 'image' THEN
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
        END IF;

        INSERT INTO public.product_media (
          product_id,
          type,
          storage_path,
          thumbnail_path,
          alt_text,
          sort_order
        ) VALUES (
          p_bundle_id,
          COALESCE(v_img->>'type', 'image')::public.product_media_type,
          v_img->>'storage_path',
          v_img->>'thumbnail_path',
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
