-- Tier 1.1: Email Automations — Consent Provenance, Idempotency & Test-Run Visibility
-- EML-AUTO-1, EML-AUTO-5, EML-AUTO-6

-- 1. Add marketing subscription provenance columns to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS marketing_subscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_subscription_source text;

-- Backfill existing consented subscribers so they are recognized as already subscribed
UPDATE public.customers
SET
  marketing_subscribed_at = COALESCE(marketing_subscribed_at, created_at, now()),
  marketing_subscription_source = COALESCE(marketing_subscription_source, 'legacy')
WHERE email_marketing_consent = true
  AND marketing_subscribed_at IS NULL;

-- 2. Add trigger_event_type and is_test_run to marketing_automation_executions
ALTER TABLE public.marketing_automation_executions
  ADD COLUMN IF NOT EXISTS trigger_event_type text,
  ADD COLUMN IF NOT EXISTS is_test_run boolean NOT NULL DEFAULT false;

-- 3. Composite idempotency index for (automation_id, customer_email, domain_event_id) on live runs
CREATE UNIQUE INDEX IF NOT EXISTS idx_mae_idempotency_auto_customer_event
  ON public.marketing_automation_executions (automation_id, lower(customer_email), domain_event_id)
  WHERE is_test_run = false AND domain_event_id IS NOT NULL;

-- 4. Fast lookup indexes for per-customer automation history (EML-AUTO-6)
CREATE INDEX IF NOT EXISTS idx_mae_org_customer_created
  ON public.marketing_automation_executions (organization_id, customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mae_org_email_created
  ON public.marketing_automation_executions (organization_id, lower(customer_email), created_at DESC);

-- 5. Partial index for active executions (EML-AUTO-2 / EML-AUTO-3 exits & EML-AUTO-5 priority suppression)
CREATE INDEX IF NOT EXISTS idx_mae_active_org_email
  ON public.marketing_automation_executions (organization_id, lower(customer_email), status)
  WHERE status IN ('pending', 'processing') AND is_test_run = false;
