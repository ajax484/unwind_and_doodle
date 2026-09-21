-- Migration: Add organization_payment_methods table
-- File: supabase/migrations/20260920190000_organization_payment_methods.sql

CREATE TABLE IF NOT EXISTS "public"."organization_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "enabled" BOOLEAN DEFAULT false NOT NULL,
    "display_title" "text",
    "display_description" "text",
    "bank_name" "text",
    "account_name" "text",
    "account_number" "text",
    "instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_payment_methods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organization_payment_methods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "organization_payment_methods_provider_check" CHECK ("provider" IN ('paystack', 'flutterwave', 'manual')),
    CONSTRAINT "organization_payment_methods_org_provider_unique" UNIQUE ("organization_id", "provider")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_org_payment_methods_org_id" ON "public"."organization_payment_methods" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_org_payment_methods_org_enabled" ON "public"."organization_payment_methods" ("organization_id", "enabled");

-- Enable Row Level Security
ALTER TABLE "public"."organization_payment_methods" ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_payment_methods' 
        AND policyname = 'Organization members can view payment methods'
    ) THEN
        CREATE POLICY "Organization members can view payment methods"
            ON "public"."organization_payment_methods"
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "organization_payment_methods"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_payment_methods' 
        AND policyname = 'Organization admins can manage payment methods'
    ) THEN
        CREATE POLICY "Organization admins can manage payment methods"
            ON "public"."organization_payment_methods"
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "organization_payment_methods"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                    AND "organization_members"."role" IN ('owner', 'admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "organization_payment_methods"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                    AND "organization_members"."role" IN ('owner', 'admin')
                )
            );
    END IF;
END $$;

-- Backfill default records for existing organizations (Paystack enabled, Flutterwave & Manual disabled)
INSERT INTO "public"."organization_payment_methods" ("organization_id", "provider", "enabled", "display_title", "display_description")
SELECT 
    id AS organization_id,
    'paystack' AS provider,
    true AS enabled,
    'Paystack' AS display_title,
    'Pay securely with Card, Bank Transfer, USSD, or Mobile Money via Paystack.' AS display_description
FROM "public"."organizations"
ON CONFLICT ("organization_id", "provider") DO NOTHING;

INSERT INTO "public"."organization_payment_methods" ("organization_id", "provider", "enabled", "display_title", "display_description")
SELECT 
    id AS organization_id,
    'flutterwave' AS provider,
    false AS enabled,
    'Flutterwave' AS display_title,
    'Accept payments seamlessly through Flutterwave gateway.' AS display_description
FROM "public"."organizations"
ON CONFLICT ("organization_id", "provider") DO NOTHING;

INSERT INTO "public"."organization_payment_methods" ("organization_id", "provider", "enabled", "display_title", "display_description")
SELECT 
    id AS organization_id,
    'manual' AS provider,
    false AS enabled,
    'Direct Bank Transfer' AS display_title,
    'Pay directly to our bank account. Your order will be processed after confirmation.' AS display_description
FROM "public"."organizations"
ON CONFLICT ("organization_id", "provider") DO NOTHING;
