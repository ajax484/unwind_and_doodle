-- Migration: Add organization_email_settings, email_delivery_logs, and campaign reply_to_email
-- File: supabase/migrations/20261121160000_email_settings_and_delivery_logs.sql

-- 1. Store-wide email settings (Reply-To & default sender identity)
CREATE TABLE IF NOT EXISTS "public"."organization_email_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reply_to_email" "text",
    "default_sender_name" "text",
    "default_sender_email" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_email_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organization_email_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "organization_email_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "organization_email_settings_org_unique" UNIQUE ("organization_id")
);

CREATE INDEX IF NOT EXISTS "idx_org_email_settings_org" ON "public"."organization_email_settings" ("organization_id");

ALTER TABLE "public"."organization_email_settings" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'organization_email_settings'
        AND policyname = 'Organization members can view email settings'
    ) THEN
        CREATE POLICY "Organization members can view email settings"
            ON "public"."organization_email_settings"
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "organization_email_settings"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'organization_email_settings'
        AND policyname = 'Organization admins can manage email settings'
    ) THEN
        CREATE POLICY "Organization admins can manage email settings"
            ON "public"."organization_email_settings"
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "organization_email_settings"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                    AND "organization_members"."role" IN ('owner', 'admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "organization_email_settings"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                    AND "organization_members"."role" IN ('owner', 'admin')
                )
            );
    END IF;
END $$;

-- 2. Persistent Email Delivery Logs (transactional, test, marketing)
CREATE TABLE IF NOT EXISTS "public"."email_delivery_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "channel" "text" DEFAULT 'transactional'::"text" NOT NULL,
    "template_key" "text",
    "campaign_id" "uuid",
    "to_email" "text" NOT NULL,
    "from_email" "text",
    "reply_to_email" "text",
    "subject" "text" NOT NULL,
    "status" "text" NOT NULL,
    "provider_message_id" "text",
    "transport_mode" "text" DEFAULT 'smtp'::"text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_delivery_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "email_delivery_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE SET NULL,
    CONSTRAINT "email_delivery_logs_status_check" CHECK ("status" IN ('sent', 'failed', 'simulated')),
    CONSTRAINT "email_delivery_logs_channel_check" CHECK ("channel" IN ('transactional', 'marketing', 'automation', 'test'))
);

CREATE INDEX IF NOT EXISTS "idx_email_delivery_logs_org_created" ON "public"."email_delivery_logs" ("organization_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_email_delivery_logs_status_created" ON "public"."email_delivery_logs" ("status", "created_at" DESC);

ALTER TABLE "public"."email_delivery_logs" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'email_delivery_logs'
        AND policyname = 'Organization admins can view email delivery logs'
    ) THEN
        CREATE POLICY "Organization admins can view email delivery logs"
            ON "public"."email_delivery_logs"
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM "public"."organization_members"
                    WHERE "organization_members"."organization_id" = "email_delivery_logs"."organization_id"
                    AND "organization_members"."user_id" = auth.uid()
                    AND "organization_members"."role" IN ('owner', 'admin')
                )
            );
    END IF;
END $$;

-- 3. Optional per-campaign Reply-To override on marketing_campaigns
ALTER TABLE "public"."marketing_campaigns"
    ADD COLUMN IF NOT EXISTS "reply_to_email" "text";
