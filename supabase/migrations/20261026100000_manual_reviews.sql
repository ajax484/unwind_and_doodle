-- Migration: Add manual review support
-- Date: 2026-10-26

-- 1. Make customer_id and order_id nullable to allow standalone manual reviews
ALTER TABLE "public"."reviews" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "public"."reviews" ALTER COLUMN "order_id" DROP NOT NULL;

-- 2. Add reviewer_name, is_manual, and source columns
ALTER TABLE "public"."reviews" ADD COLUMN IF NOT EXISTS "reviewer_name" text;
ALTER TABLE "public"."reviews" ADD COLUMN IF NOT EXISTS "is_manual" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."reviews" ADD COLUMN IF NOT EXISTS "source" text;

-- 3. Add constraint: must have either customer_id or reviewer_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_attribution_check'
  ) THEN
    ALTER TABLE "public"."reviews"
      ADD CONSTRAINT "reviews_attribution_check"
      CHECK (customer_id IS NOT NULL OR (reviewer_name IS NOT NULL AND length(trim(reviewer_name)) > 0));
  END IF;
END $$;
