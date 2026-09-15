-- Migration: Add optional description column to categories
-- File: supabase/migrations/20260915170000_add_category_description.sql

ALTER TABLE "public"."categories" 
ADD COLUMN IF NOT EXISTS "description" text DEFAULT NULL;
