-- Migration: Post-Delivery Retention Idempotency & Delivery Source Tracking
-- File: supabase/migrations/20260922140000_post_delivery_retention_idempotency.sql

-- 1. Add order_id and delivery_source columns to marketing_automation_executions
ALTER TABLE "public"."marketing_automation_executions"
ADD COLUMN IF NOT EXISTS "order_id" uuid,
ADD COLUMN IF NOT EXISTS "delivery_source" text DEFAULT 'actual';

-- 2. Add foreign key from marketing_automation_executions to orders if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'marketing_automation_executions_order_id_fkey'
    ) THEN
        ALTER TABLE "public"."marketing_automation_executions"
        ADD CONSTRAINT "marketing_automation_executions_order_id_fkey"
        FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create unique partial index on (automation_id, order_id) to prevent duplicate executions for the same order
CREATE UNIQUE INDEX IF NOT EXISTS "idx_marketing_automation_executions_auto_order"
ON "public"."marketing_automation_executions" ("automation_id", "order_id")
WHERE "order_id" IS NOT NULL;

-- 4. Index for querying executions by order_id
CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_order_id"
ON "public"."marketing_automation_executions" ("order_id");
