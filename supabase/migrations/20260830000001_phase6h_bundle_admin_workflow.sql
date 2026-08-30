-- 0. Authorization helper function
CREATE OR REPLACE FUNCTION public.is_organization_admin(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.role() = 'service_role' OR EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;

-- 1. Atomic function to create a new bundle product and its components
DROP FUNCTION IF EXISTS public.create_admin_bundle(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, public.product_status, UUID[], JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_admin_bundle(
  p_org_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_selling_price NUMERIC DEFAULT 0,
  p_cost_price NUMERIC DEFAULT 0,
  p_status public.product_status DEFAULT 'draft'::public.product_status,
  p_category_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_images JSONB DEFAULT '[]'::JSONB,
  p_components JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 2. Atomic function to update an existing bundle product and replace its components
DROP FUNCTION IF EXISTS public.update_admin_bundle(UUID, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, public.product_status, UUID[], JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.update_admin_bundle(
  p_bundle_id UUID,
  p_org_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_selling_price NUMERIC DEFAULT 0,
  p_cost_price NUMERIC DEFAULT 0,
  p_status public.product_status DEFAULT 'draft'::public.product_status,
  p_category_ids UUID[] DEFAULT NULL,
  p_images JSONB DEFAULT NULL,
  p_components JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 3. Atomic function to duplicate an existing bundle product
DROP FUNCTION IF EXISTS public.duplicate_admin_bundle(UUID, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.duplicate_admin_bundle(
  p_bundle_id UUID,
  p_org_id UUID,
  p_new_name TEXT,
  p_new_slug TEXT,
  p_new_sku TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Function Execution Permissions
REVOKE ALL ON FUNCTION public.create_admin_bundle FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_bundle TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.update_admin_bundle FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_bundle TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.duplicate_admin_bundle FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_admin_bundle TO service_role, authenticated;
