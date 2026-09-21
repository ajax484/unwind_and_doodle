-- Migration: Multi-Step Marketing Journeys & Event Cancellation
-- File: supabase/migrations/20260920180000_marketing_automation_journeys.sql

-- 1. Add journey tracking columns to marketing_automation_executions
ALTER TABLE "public"."marketing_automation_executions"
ADD COLUMN IF NOT EXISTS "current_step_id" text,
ADD COLUMN IF NOT EXISTS "step_states" jsonb DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS "config_snapshot" jsonb;

-- 2. Index for querying active journeys by automation and current step
CREATE INDEX IF NOT EXISTS "idx_marketing_automation_executions_journey" 
ON "public"."marketing_automation_executions" ("automation_id", "status", "current_step_id");
