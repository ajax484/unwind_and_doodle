-- Migration: Productionize Marketing Automation Background Processing Queue
-- File: supabase/migrations/20260920000000_marketing_automation_production_queue.sql

-- 1. Add retry columns if not already present
ALTER TABLE "public"."marketing_automation_executions"
ADD COLUMN IF NOT EXISTS "retry_count" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "max_retries" integer DEFAULT 3 NOT NULL;

-- 2. Create index for fast status, scheduling, and stale recovery queries
CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_claim" 
ON "public"."marketing_automation_executions" ("status", "scheduled_for", "updated_at");

CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_org_status_scheduled" 
ON "public"."marketing_automation_executions" ("organization_id", "status", "scheduled_for");

-- 3. Atomic claiming RPC function with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION "public"."claim_due_marketing_automation_executions"(
    "p_limit" integer DEFAULT 50,
    "p_stale_seconds" integer DEFAULT 300,
    "p_organization_id" uuid DEFAULT NULL
)
RETURNS SETOF "public"."marketing_automation_executions"
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stale_cutoff timestamp with time zone;
    v_now timestamp with time zone;
BEGIN
    v_now := clock_timestamp();
    v_stale_cutoff := v_now - (p_stale_seconds || ' seconds')::interval;

    RETURN QUERY
    WITH eligible AS (
        SELECT id
        FROM "public"."marketing_automation_executions"
        WHERE (
            -- Either strictly due pending jobs
            ("status" = 'pending' AND "scheduled_for" <= v_now)
            OR
            -- Or stale processing jobs that can be retried
            ("status" = 'processing' AND "updated_at" <= v_stale_cutoff AND "retry_count" < "max_retries")
        )
        AND (p_organization_id IS NULL OR "organization_id" = p_organization_id)
        ORDER BY "scheduled_for" ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    UPDATE "public"."marketing_automation_executions" m
    SET
        "status" = 'processing',
        "retry_count" = CASE 
            WHEN m.status = 'processing' THEN m.retry_count + 1 
            ELSE m.retry_count 
        END,
        "updated_at" = v_now
    FROM eligible
    WHERE m.id = eligible.id
    RETURNING m.*;
END;
$$;
