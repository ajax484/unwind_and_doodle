-- Migration: 20260914160000_delivery_rate_templates.sql
-- Description: Creates reusable delivery_rate_templates table and adds optional template_id to delivery_rates

CREATE TABLE IF NOT EXISTS "public"."delivery_rate_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL,
    "description" "text",
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'NGN' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "delivery_rate_templates_amount_non_negative" CHECK (("amount" >= (0)::numeric))
);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS "delivery_rate_templates_org_idx" ON "public"."delivery_rate_templates"("organization_id");

-- Add optional nullable template_id to delivery_rates for audit and reference tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'delivery_rates'
          AND column_name = 'template_id'
    ) THEN
        ALTER TABLE "public"."delivery_rates"
            ADD COLUMN "template_id" "uuid" REFERENCES "public"."delivery_rate_templates"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Enable Row-Level Security
ALTER TABLE "public"."delivery_rate_templates" ENABLE ROW LEVEL SECURITY;

-- Admins of an organization have full access to their organization's templates
CREATE POLICY "delivery_rate_templates_admin_all" ON "public"."delivery_rate_templates"
    USING ("public"."is_organization_admin"("organization_id"))
    WITH CHECK ("public"."is_organization_admin"("organization_id"));

-- Permissions
GRANT ALL ON TABLE "public"."delivery_rate_templates" TO "anon";
GRANT ALL ON TABLE "public"."delivery_rate_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_rate_templates" TO "service_role";
