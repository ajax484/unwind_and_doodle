-- Migration: Add marketing_automation_executions table for idempotent delayed automation execution
-- File: supabase/migrations/20260916120000_marketing_automation_executions.sql

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_automation_execution_status') THEN
        CREATE TYPE "public"."marketing_automation_execution_status" AS ENUM (
            'pending',
            'processing',
            'completed',
            'skipped',
            'failed'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."marketing_automation_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "automation_id" "uuid" NOT NULL,
    "domain_event_id" "text" NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "customer_email" "text" NOT NULL,
    "status" "public"."marketing_automation_execution_status" DEFAULT 'pending'::"public"."marketing_automation_execution_status" NOT NULL,
    "scheduled_for" timestamp with time zone DEFAULT "now"() NOT NULL,
    "executed_at" timestamp with time zone,
    "skip_reason" "text",
    "error_message" "text",
    "provider_message_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "marketing_automation_executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketing_automation_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_automation_executions_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "public"."marketing_automations"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_automation_executions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_automation_executions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL,
    CONSTRAINT "marketing_automation_executions_auto_event_unique" UNIQUE ("automation_id", "domain_event_id")
);

CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_org_id" ON "public"."marketing_automation_executions" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_due" ON "public"."marketing_automation_executions" ("status", "scheduled_for");
CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_auto_status" ON "public"."marketing_automation_executions" ("automation_id", "status");

-- RLS
ALTER TABLE "public"."marketing_automation_executions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketing_automation_executions' 
        AND policyname = 'marketing_automation_executions_admin_all'
    ) THEN
        CREATE POLICY "marketing_automation_executions_admin_all" ON "public"."marketing_automation_executions"
            USING ("public"."is_organization_admin"("organization_id"))
            WITH CHECK ("public"."is_organization_admin"("organization_id"));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketing_automation_executions' 
        AND policyname = 'marketing_automation_executions_member_read'
    ) THEN
        CREATE POLICY "marketing_automation_executions_member_read" ON "public"."marketing_automation_executions"
            FOR SELECT USING ("public"."is_organization_member"("organization_id"));
    END IF;
END $$;
