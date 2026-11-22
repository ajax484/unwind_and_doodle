-- Tier 2.1: Admin-Editable Homepage Copy & Section Order (CAT-4)

CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_settings_org
  ON public.homepage_settings (organization_id);

ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read homepage settings" ON public.homepage_settings;
CREATE POLICY "Public can read homepage settings"
  ON public.homepage_settings
  FOR SELECT
  USING (true);
