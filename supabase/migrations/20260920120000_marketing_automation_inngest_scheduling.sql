-- Migration: Inngest Durable Scheduling Engine for Marketing Automations
-- File: supabase/migrations/20260920120000_marketing_automation_inngest_scheduling.sql

-- 1. Add engine column to marketing_automation_executions table
ALTER TABLE "public"."marketing_automation_executions"
ADD COLUMN IF NOT EXISTS "engine" text DEFAULT 'inngest' NOT NULL;

-- 2. Index for filtering and claiming by engine and status
CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_engine_status_due" 
ON "public"."marketing_automation_executions" ("engine", "status", "scheduled_for");

-- 3. Update atomic claiming RPC function to isolate legacy polling from Inngest-managed executions
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
            -- Only claim legacy executions (Inngest owns its own durable waiting & execution)
            ("engine" IS NULL OR "engine" = 'legacy')
            AND
            (
                -- Either strictly due pending jobs
                ("status" = 'pending' AND "scheduled_for" <= v_now)
                OR
                -- Or stale processing jobs that can be retried
                ("status" = 'processing' AND "updated_at" <= v_stale_cutoff AND "retry_count" < "max_retries")
            )
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
