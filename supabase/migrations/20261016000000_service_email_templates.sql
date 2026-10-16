-- Migration: Add service_email_templates table for customizable transactional emails
-- File: supabase/migrations/20261016000000_service_email_templates.sql

CREATE TABLE IF NOT EXISTS "public"."service_email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "template_key" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "body_text" "text",
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "service_email_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "service_email_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "service_email_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "service_email_templates_org_key_unique" UNIQUE ("organization_id", "template_key")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_service_email_templates_org_key" ON "public"."service_email_templates" ("organization_id", "template_key");
CREATE INDEX IF NOT EXISTS "idx_service_email_templates_active" ON "public"."service_email_templates" ("organization_id", "is_active");

-- Enable Row Level Security
ALTER TABLE "public"."service_email_templates" ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_email_templates' 
        AND policyname = 'Organization members can view service email templates'
    ) THEN
        CREATE POLICY "Organization members can view service email templates"
            ON "public"."service_email_templates"
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "service_email_templates"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_email_templates' 
        AND policyname = 'Organization admins can manage service email templates'
    ) THEN
        CREATE POLICY "Organization admins can manage service email templates"
            ON "public"."service_email_templates"
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "service_email_templates"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                    AND "organization_members"."role" IN ('owner', 'admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "service_email_templates"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                    AND "organization_members"."role" IN ('owner', 'admin')
                )
            );
    END IF;
END $$;
