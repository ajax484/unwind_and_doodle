-- Migration: 20260916200000_customer_addresses_admin_policy.sql
-- Description: Adds admin & service role RLS policy to customer_addresses table

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customer_addresses'
          AND policyname = 'customer_addresses_admin_all'
    ) THEN
        CREATE POLICY "customer_addresses_admin_all" ON "public"."customer_addresses" FOR ALL
        USING ((EXISTS (
            SELECT 1
            FROM "public"."customers" c
            WHERE c.id = customer_addresses.customer_id
              AND "public"."is_organization_admin"(c.organization_id)
        )))
        WITH CHECK ((EXISTS (
            SELECT 1
            FROM "public"."customers" c
            WHERE c.id = customer_addresses.customer_id
              AND "public"."is_organization_admin"(c.organization_id)
        )));
    END IF;
END $$;
