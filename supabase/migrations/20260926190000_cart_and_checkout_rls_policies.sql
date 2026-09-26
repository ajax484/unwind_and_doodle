-- Migration: 20260926190000_cart_and_checkout_rls_policies.sql
-- Description: Adds RLS policies for carts, cart_items, checkout_sessions, customizations, and customization_assets.

DO $$
BEGIN
    -- 1. Table: carts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'carts'
          AND policyname = 'carts_service_and_admin_all'
    ) THEN
        CREATE POLICY "carts_service_and_admin_all" ON "public"."carts" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            "public"."is_organization_admin"("organization_id")
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            "public"."is_organization_admin"("organization_id")
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'carts'
          AND policyname = 'carts_customer_and_anon_all'
    ) THEN
        CREATE POLICY "carts_customer_and_anon_all" ON "public"."carts" FOR ALL
        USING (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        )
        WITH CHECK (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        );
    END IF;

    -- 2. Table: cart_items
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cart_items'
          AND policyname = 'cart_items_service_and_admin_all'
    ) THEN
        CREATE POLICY "cart_items_service_and_admin_all" ON "public"."cart_items" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1 FROM "public"."carts" c
                WHERE c.id = "cart_items"."cart_id"
                  AND "public"."is_organization_admin"(c.organization_id)
            ))
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1 FROM "public"."carts" c
                WHERE c.id = "cart_items"."cart_id"
                  AND "public"."is_organization_admin"(c.organization_id)
            ))
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cart_items'
          AND policyname = 'cart_items_customer_and_anon_all'
    ) THEN
        CREATE POLICY "cart_items_customer_and_anon_all" ON "public"."cart_items" FOR ALL
        USING (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        )
        WITH CHECK (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        );
    END IF;

    -- 3. Table: checkout_sessions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'checkout_sessions'
          AND policyname = 'checkout_sessions_service_and_admin_all'
    ) THEN
        CREATE POLICY "checkout_sessions_service_and_admin_all" ON "public"."checkout_sessions" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            "public"."is_organization_admin"("organization_id")
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            "public"."is_organization_admin"("organization_id")
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'checkout_sessions'
          AND policyname = 'checkout_sessions_customer_and_anon_all'
    ) THEN
        CREATE POLICY "checkout_sessions_customer_and_anon_all" ON "public"."checkout_sessions" FOR ALL
        USING (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        )
        WITH CHECK (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        );
    END IF;

    -- 4. Table: customizations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customizations'
          AND policyname = 'customizations_service_and_admin_all'
    ) THEN
        CREATE POLICY "customizations_service_and_admin_all" ON "public"."customizations" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1 FROM "public"."order_items" oi
                JOIN "public"."orders" o ON o.id = oi.order_id
                WHERE oi.id = "customizations"."order_item_id"
                  AND "public"."is_organization_admin"(o.organization_id)
            ))
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1 FROM "public"."order_items" oi
                JOIN "public"."orders" o ON o.id = oi.order_id
                WHERE oi.id = "customizations"."order_item_id"
                  AND "public"."is_organization_admin"(o.organization_id)
            ))
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customizations'
          AND policyname = 'customizations_customer_and_anon_all'
    ) THEN
        CREATE POLICY "customizations_customer_and_anon_all" ON "public"."customizations" FOR ALL
        USING (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        )
        WITH CHECK (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        );
    END IF;

    -- 5. Table: customization_assets
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customization_assets'
          AND policyname = 'customization_assets_service_and_admin_all'
    ) THEN
        CREATE POLICY "customization_assets_service_and_admin_all" ON "public"."customization_assets" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1 FROM "public"."customizations" c
                JOIN "public"."order_items" oi ON oi.id = c.order_item_id
                JOIN "public"."orders" o ON o.id = oi.order_id
                WHERE c.id = "customization_assets"."customization_id"
                  AND "public"."is_organization_admin"(o.organization_id)
            ))
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1 FROM "public"."customizations" c
                JOIN "public"."order_items" oi ON oi.id = c.order_item_id
                JOIN "public"."orders" o ON o.id = oi.order_id
                WHERE c.id = "customization_assets"."customization_id"
                  AND "public"."is_organization_admin"(o.organization_id)
            ))
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customization_assets'
          AND policyname = 'customization_assets_customer_and_anon_all'
    ) THEN
        CREATE POLICY "customization_assets_customer_and_anon_all" ON "public"."customization_assets" FOR ALL
        USING (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        )
        WITH CHECK (
            "auth"."role"() = 'anon' OR
            "auth"."role"() = 'authenticated'
        );
    END IF;
END $$;
