-- Migration: 20260924210000_inventory_rls_policies.sql
-- Description: Adds admin, member, and service role RLS policies for inventory, inventory_movements, and inventory_reservations.

DO $$
BEGIN
    -- 1. Table: inventory
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'inventory'
          AND policyname = 'inventory_admin_all'
    ) THEN
        CREATE POLICY "inventory_admin_all" ON "public"."inventory" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."warehouses" w
                WHERE w.id = "inventory"."warehouse_id"
                  AND "public"."is_organization_admin"(w.organization_id)
            )) OR
            (EXISTS (
                SELECT 1
                FROM "public"."products" p
                WHERE p.id = "inventory"."product_id"
                  AND "public"."is_organization_admin"(p.organization_id)
            ))
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."warehouses" w
                WHERE w.id = "inventory"."warehouse_id"
                  AND "public"."is_organization_admin"(w.organization_id)
            )) OR
            (EXISTS (
                SELECT 1
                FROM "public"."products" p
                WHERE p.id = "inventory"."product_id"
                  AND "public"."is_organization_admin"(p.organization_id)
            ))
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'inventory'
          AND policyname = 'inventory_org_member_read'
    ) THEN
        CREATE POLICY "inventory_org_member_read" ON "public"."inventory" FOR SELECT
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."warehouses" w
                WHERE w.id = "inventory"."warehouse_id"
                  AND "public"."is_organization_member"(w.organization_id)
            )) OR
            (EXISTS (
                SELECT 1
                FROM "public"."products" p
                WHERE p.id = "inventory"."product_id"
                  AND "public"."is_organization_member"(p.organization_id)
            ))
        );
    END IF;

    -- 2. Table: inventory_movements
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'inventory_movements'
          AND policyname = 'inventory_movements_admin_all'
    ) THEN
        CREATE POLICY "inventory_movements_admin_all" ON "public"."inventory_movements" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."warehouses" w
                WHERE w.id = "inventory_movements"."warehouse_id"
                  AND "public"."is_organization_admin"(w.organization_id)
            )) OR
            (EXISTS (
                SELECT 1
                FROM "public"."products" p
                WHERE p.id = "inventory_movements"."product_id"
                  AND "public"."is_organization_admin"(p.organization_id)
            ))
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."warehouses" w
                WHERE w.id = "inventory_movements"."warehouse_id"
                  AND "public"."is_organization_admin"(w.organization_id)
            )) OR
            (EXISTS (
                SELECT 1
                FROM "public"."products" p
                WHERE p.id = "inventory_movements"."product_id"
                  AND "public"."is_organization_admin"(p.organization_id)
            ))
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'inventory_movements'
          AND policyname = 'inventory_movements_org_member_read'
    ) THEN
        CREATE POLICY "inventory_movements_org_member_read" ON "public"."inventory_movements" FOR SELECT
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."warehouses" w
                WHERE w.id = "inventory_movements"."warehouse_id"
                  AND "public"."is_organization_member"(w.organization_id)
            )) OR
            (EXISTS (
                SELECT 1
                FROM "public"."products" p
                WHERE p.id = "inventory_movements"."product_id"
                  AND "public"."is_organization_member"(p.organization_id)
            ))
        );
    END IF;

    -- 3. Table: inventory_reservations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'inventory_reservations'
          AND policyname = 'inventory_reservations_admin_all'
    ) THEN
        CREATE POLICY "inventory_reservations_admin_all" ON "public"."inventory_reservations" FOR ALL
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."orders" o
                WHERE o.id = "inventory_reservations"."order_id"
                  AND "public"."is_organization_admin"(o.organization_id)
            ))
        )
        WITH CHECK (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."orders" o
                WHERE o.id = "inventory_reservations"."order_id"
                  AND "public"."is_organization_admin"(o.organization_id)
            ))
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'inventory_reservations'
          AND policyname = 'inventory_reservations_org_member_read'
    ) THEN
        CREATE POLICY "inventory_reservations_org_member_read" ON "public"."inventory_reservations" FOR SELECT
        USING (
            "auth"."role"() = 'service_role' OR
            (EXISTS (
                SELECT 1
                FROM "public"."orders" o
                WHERE o.id = "inventory_reservations"."order_id"
                  AND "public"."is_organization_member"(o.organization_id)
            ))
        );
    END IF;
END $$;
