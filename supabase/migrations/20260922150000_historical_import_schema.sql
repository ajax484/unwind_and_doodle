-- Migration: Historical Customer, Order & Product Import Schema
-- File: supabase/migrations/20260922150000_historical_import_schema.sql

-- 1. Create import_batches table
CREATE TABLE IF NOT EXISTS "public"."import_batches" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "source_system" text NOT NULL DEFAULT 'bumpa',
    "status" text NOT NULL DEFAULT 'pending',
    "file_name" text NOT NULL,
    "total_rows" integer NOT NULL DEFAULT 0,
    "customers_count" integer NOT NULL DEFAULT 0,
    "orders_count" integer NOT NULL DEFAULT 0,
    "items_count" integer NOT NULL DEFAULT 0,
    "mapped_products_count" integer NOT NULL DEFAULT 0,
    "unmapped_products_count" integer NOT NULL DEFAULT 0,
    "ambiguous_products_count" integer NOT NULL DEFAULT 0,
    "warning_count" integer NOT NULL DEFAULT 0,
    "error_count" integer NOT NULL DEFAULT 0,
    "summary" jsonb DEFAULT '{}'::jsonb,
    "errors" jsonb DEFAULT '[]'::jsonb,
    "warnings" jsonb DEFAULT '[]'::jsonb,
    "field_mappings" jsonb DEFAULT '{}'::jsonb,
    "product_mappings" jsonb DEFAULT '{}'::jsonb,
    "created_by" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at" timestamp with time zone
);

-- 2. Create historical_product_mappings table
CREATE TABLE IF NOT EXISTS "public"."historical_product_mappings" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "source_system" text NOT NULL DEFAULT 'bumpa',
    "historical_title" text NOT NULL,
    "normalized_title" text NOT NULL,
    "canonical_product_id" uuid REFERENCES "public"."products"("id") ON DELETE SET NULL,
    "status" text NOT NULL DEFAULT 'unmapped',
    "confidence" numeric(4, 2) DEFAULT 1.00,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "chk_historical_product_mappings_status" CHECK ("status" IN ('mapped', 'unmapped', 'ignored'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_hist_prod_map_org_source_norm_title"
ON "public"."historical_product_mappings" ("organization_id", "source_system", "normalized_title");

-- 3. Extend customers with provenance and import batch tracking
ALTER TABLE "public"."customers"
ADD COLUMN IF NOT EXISTS "source_system" text,
ADD COLUMN IF NOT EXISTS "source_record_id" text,
ADD COLUMN IF NOT EXISTS "import_batch_id" uuid REFERENCES "public"."import_batches"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_customers_org_source_record"
ON "public"."customers" ("organization_id", "source_system", "source_record_id")
WHERE "source_system" IS NOT NULL AND "source_record_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_customers_import_batch_id"
ON "public"."customers" ("import_batch_id");

-- 4. Extend orders with provenance and import batch tracking
ALTER TABLE "public"."orders"
ADD COLUMN IF NOT EXISTS "source_system" text,
ADD COLUMN IF NOT EXISTS "source_record_id" text,
ADD COLUMN IF NOT EXISTS "import_batch_id" uuid REFERENCES "public"."import_batches"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_orders_org_source_record"
ON "public"."orders" ("organization_id", "source_system", "source_record_id")
WHERE "source_system" IS NOT NULL AND "source_record_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_orders_import_batch_id"
ON "public"."orders" ("import_batch_id");

-- 5. Extend order_items to allow unmapped products and provenance
ALTER TABLE "public"."order_items"
ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "public"."order_items"
ADD COLUMN IF NOT EXISTS "mapping_status" text NOT NULL DEFAULT 'mapped',
ADD COLUMN IF NOT EXISTS "historical_product_title" text,
ADD COLUMN IF NOT EXISTS "import_batch_id" uuid REFERENCES "public"."import_batches"("id") ON DELETE SET NULL;

-- 6. Enable Row-Level Security
ALTER TABLE "public"."import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."historical_product_mappings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to import_batches"
ON "public"."import_batches"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "import_batches_org_policy"
ON "public"."import_batches"
FOR ALL
TO authenticated
USING (public.is_organization_member("organization_id"))
WITH CHECK (public.is_organization_member("organization_id"));

CREATE POLICY "Service role has full access to historical_product_mappings"
ON "public"."historical_product_mappings"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "historical_product_mappings_org_policy"
ON "public"."historical_product_mappings"
FOR ALL
TO authenticated
USING (public.is_organization_member("organization_id"))
WITH CHECK (public.is_organization_member("organization_id"));
