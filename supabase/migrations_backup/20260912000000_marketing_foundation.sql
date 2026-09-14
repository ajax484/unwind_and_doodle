-- Migration: 20260912000000_marketing_foundation.sql
-- Description: Establishes the database foundation for the marketing layer (Segments, Campaigns, Recipients, Email Events, Automations).
-- Hardened with Security Definer campaign lookup for non-recursive RLS, customer-tenant integrity triggers, and event consistency triggers.

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_campaign_type') THEN
    CREATE TYPE public.marketing_campaign_type AS ENUM ('email');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_campaign_status') THEN
    CREATE TYPE public.marketing_campaign_status AS ENUM (
      'draft',
      'scheduled',
      'sending',
      'sent',
      'cancelled',
      'failed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_recipient_status') THEN
    CREATE TYPE public.marketing_recipient_status AS ENUM (
      'pending',
      'sending',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'bounced',
      'failed',
      'unsubscribed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_automation_type') THEN
    CREATE TYPE public.marketing_automation_type AS ENUM (
      'welcome',
      'abandoned_checkout',
      'post_purchase',
      'win_back'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_automation_status') THEN
    CREATE TYPE public.marketing_automation_status AS ENUM (
      'draft',
      'active',
      'paused'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketing_email_event_type') THEN
    CREATE TYPE public.marketing_email_event_type AS ENUM (
      'sent',
      'delivered',
      'opened',
      'clicked',
      'bounced',
      'failed',
      'unsubscribed'
    );
  END IF;
END $$;

-- ============================================================================
-- 2. TABLES & INDEXES (in dependency order)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 marketing_segments
-- ----------------------------------------------------------------------------
CREATE TABLE public.marketing_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Cross-tenant integrity constraint allowing composite FK from marketing_campaigns
  CONSTRAINT uq_marketing_segments_id_org UNIQUE (id, organization_id)
);

CREATE INDEX idx_marketing_segments_org_id 
  ON public.marketing_segments (organization_id);

CREATE INDEX idx_marketing_segments_org_active 
  ON public.marketing_segments (organization_id, active);

-- ----------------------------------------------------------------------------
-- 2.2 marketing_campaigns
-- ----------------------------------------------------------------------------
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.marketing_campaign_type NOT NULL DEFAULT 'email'::public.marketing_campaign_type,
  status public.marketing_campaign_status NOT NULL DEFAULT 'draft'::public.marketing_campaign_status,
  subject TEXT NULL,
  preview_text TEXT NULL,
  sender_name TEXT NULL,
  sender_email TEXT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  segment_id UUID NULL,
  scheduled_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Enforce segment belongs to the same organization as the campaign
  CONSTRAINT fk_marketing_campaigns_segment_org 
    FOREIGN KEY (segment_id, organization_id) 
    REFERENCES public.marketing_segments(id, organization_id) 
    ON DELETE SET NULL,
  -- Composite unique for child recipient and event relationship validation
  CONSTRAINT uq_marketing_campaigns_id_org UNIQUE (id, organization_id)
);

CREATE INDEX idx_marketing_campaigns_org_id 
  ON public.marketing_campaigns (organization_id);

CREATE INDEX idx_marketing_campaigns_org_status 
  ON public.marketing_campaigns (organization_id, status);

CREATE INDEX idx_marketing_campaigns_org_scheduled_at 
  ON public.marketing_campaigns (organization_id, scheduled_at);

CREATE INDEX idx_marketing_campaigns_segment_id 
  ON public.marketing_campaigns (segment_id);

-- ----------------------------------------------------------------------------
-- 2.3 marketing_campaign_recipients
-- ----------------------------------------------------------------------------
CREATE TABLE public.marketing_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status public.marketing_recipient_status NOT NULL DEFAULT 'pending'::public.marketing_recipient_status,
  sent_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  clicked_at TIMESTAMPTZ NULL,
  unsubscribed_at TIMESTAMPTZ NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Uniqueness per campaign and email snapshot
  CONSTRAINT uq_marketing_campaign_recipients_campaign_email UNIQUE (campaign_id, email),
  -- Composite unique allowing marketing_email_events to enforce matching campaign_id
  CONSTRAINT uq_marketing_campaign_recipients_id_campaign UNIQUE (id, campaign_id)
);

CREATE INDEX idx_marketing_campaign_recipients_campaign_id 
  ON public.marketing_campaign_recipients (campaign_id);

CREATE INDEX idx_marketing_campaign_recipients_campaign_status 
  ON public.marketing_campaign_recipients (campaign_id, status);

CREATE INDEX idx_marketing_campaign_recipients_customer_id 
  ON public.marketing_campaign_recipients (customer_id);

CREATE INDEX idx_marketing_campaign_recipients_email 
  ON public.marketing_campaign_recipients (email);

-- Enforce uniqueness of customer_id per campaign when present
CREATE UNIQUE INDEX idx_marketing_campaign_recipients_campaign_customer 
  ON public.marketing_campaign_recipients (campaign_id, customer_id) 
  WHERE customer_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2.4 marketing_email_events
-- ----------------------------------------------------------------------------
CREATE TABLE public.marketing_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  campaign_recipient_id UUID NOT NULL,
  customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  event_type public.marketing_email_event_type NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Enforce that the event's campaign matches the recipient's campaign
  CONSTRAINT fk_marketing_email_events_recipient_campaign 
    FOREIGN KEY (campaign_recipient_id, campaign_id) 
    REFERENCES public.marketing_campaign_recipients(id, campaign_id) 
    ON DELETE CASCADE
);

CREATE INDEX idx_marketing_email_events_campaign_id 
  ON public.marketing_email_events (campaign_id);

CREATE INDEX idx_marketing_email_events_recipient_id 
  ON public.marketing_email_events (campaign_recipient_id);

CREATE INDEX idx_marketing_email_events_customer_id 
  ON public.marketing_email_events (customer_id);

CREATE INDEX idx_marketing_email_events_occurred_at 
  ON public.marketing_email_events (occurred_at);

CREATE INDEX idx_marketing_email_events_campaign_event_type 
  ON public.marketing_email_events (campaign_id, event_type);

-- ----------------------------------------------------------------------------
-- 2.5 marketing_automations
-- ----------------------------------------------------------------------------
CREATE TABLE public.marketing_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.marketing_automation_type NOT NULL,
  status public.marketing_automation_status NOT NULL DEFAULT 'draft'::public.marketing_automation_status,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketing_automations_org_id 
  ON public.marketing_automations (organization_id);

CREATE INDEX idx_marketing_automations_org_status 
  ON public.marketing_automations (organization_id, status);

CREATE INDEX idx_marketing_automations_org_type 
  ON public.marketing_automations (organization_id, type);

-- ============================================================================
-- 3. HELPER & TRIGGER FUNCTIONS (defined after tables exist)
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_marketing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Security Definer helper: resolves campaign organization_id without triggering recursive RLS
CREATE OR REPLACE FUNCTION public.get_campaign_organization_id(p_campaign_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.marketing_campaigns
  WHERE id = p_campaign_id;
$$;

-- Integrity Trigger Function: ensures recipient's customer belongs to the exact same organization as the campaign
CREATE OR REPLACE FUNCTION public.check_marketing_recipient_customer_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_campaign_org_id UUID;
  v_customer_org_id UUID;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    SELECT organization_id INTO v_campaign_org_id
    FROM public.marketing_campaigns
    WHERE id = NEW.campaign_id;

    SELECT organization_id INTO v_customer_org_id
    FROM public.customers
    WHERE id = NEW.customer_id;

    IF v_customer_org_id IS NULL OR v_campaign_org_id IS NULL OR v_customer_org_id <> v_campaign_org_id THEN
      RAISE EXCEPTION 'Customer organization mismatch: customer % does not belong to campaign organization %', 
        NEW.customer_id, v_campaign_org_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Consistency Trigger Function: ensures marketing_email_events.customer_id matches marketing_campaign_recipients.customer_id
CREATE OR REPLACE FUNCTION public.check_marketing_email_event_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recipient_cust_id UUID;
BEGIN
  SELECT customer_id INTO v_recipient_cust_id
  FROM public.marketing_campaign_recipients
  WHERE id = NEW.campaign_recipient_id;

  -- Automatically populate customer_id if omitted
  IF NEW.customer_id IS NULL THEN
    NEW.customer_id := v_recipient_cust_id;
  ELSIF NEW.customer_id IS DISTINCT FROM v_recipient_cust_id THEN
    RAISE EXCEPTION 'Event customer mismatch: event customer % does not match recipient customer %',
      NEW.customer_id, v_recipient_cust_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_marketing_segments_updated_at ON public.marketing_segments;
CREATE TRIGGER trg_marketing_segments_updated_at
  BEFORE UPDATE ON public.marketing_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_marketing_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_marketing_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_automations_updated_at ON public.marketing_automations;
CREATE TRIGGER trg_marketing_automations_updated_at
  BEFORE UPDATE ON public.marketing_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_marketing_updated_at();

-- Integrity & Consistency triggers
DROP TRIGGER IF EXISTS trg_marketing_campaign_recipients_validate_customer ON public.marketing_campaign_recipients;
CREATE TRIGGER trg_marketing_campaign_recipients_validate_customer
  BEFORE INSERT OR UPDATE ON public.marketing_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.check_marketing_recipient_customer_org();

DROP TRIGGER IF EXISTS trg_marketing_email_events_validate_customer ON public.marketing_email_events;
CREATE TRIGGER trg_marketing_email_events_validate_customer
  BEFORE INSERT OR UPDATE ON public.marketing_email_events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_marketing_email_event_customer();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies: marketing_segments
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS marketing_segments_admin_all ON public.marketing_segments;
CREATE POLICY marketing_segments_admin_all ON public.marketing_segments
  FOR ALL
  USING (
    public.is_organization_admin(organization_id)
  )
  WITH CHECK (
    public.is_organization_admin(organization_id)
  );

DROP POLICY IF EXISTS marketing_segments_member_read ON public.marketing_segments;
CREATE POLICY marketing_segments_member_read ON public.marketing_segments
  FOR SELECT
  USING (
    public.is_organization_member(organization_id)
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: marketing_campaigns
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS marketing_campaigns_admin_all ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_admin_all ON public.marketing_campaigns
  FOR ALL
  USING (
    public.is_organization_admin(organization_id)
  )
  WITH CHECK (
    public.is_organization_admin(organization_id)
  );

DROP POLICY IF EXISTS marketing_campaigns_member_read ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_member_read ON public.marketing_campaigns
  FOR SELECT
  USING (
    public.is_organization_member(organization_id)
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: marketing_campaign_recipients (via get_campaign_organization_id helper)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS marketing_campaign_recipients_admin_all ON public.marketing_campaign_recipients;
CREATE POLICY marketing_campaign_recipients_admin_all ON public.marketing_campaign_recipients
  FOR ALL
  USING (
    public.is_organization_admin(public.get_campaign_organization_id(campaign_id))
  )
  WITH CHECK (
    public.is_organization_admin(public.get_campaign_organization_id(campaign_id))
  );

DROP POLICY IF EXISTS marketing_campaign_recipients_member_read ON public.marketing_campaign_recipients;
CREATE POLICY marketing_campaign_recipients_member_read ON public.marketing_campaign_recipients
  FOR SELECT
  USING (
    public.is_organization_member(public.get_campaign_organization_id(campaign_id))
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: marketing_email_events (via get_campaign_organization_id helper)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS marketing_email_events_admin_all ON public.marketing_email_events;
CREATE POLICY marketing_email_events_admin_all ON public.marketing_email_events
  FOR ALL
  USING (
    public.is_organization_admin(public.get_campaign_organization_id(campaign_id))
  )
  WITH CHECK (
    public.is_organization_admin(public.get_campaign_organization_id(campaign_id))
  );

DROP POLICY IF EXISTS marketing_email_events_member_read ON public.marketing_email_events;
CREATE POLICY marketing_email_events_member_read ON public.marketing_email_events
  FOR SELECT
  USING (
    public.is_organization_member(public.get_campaign_organization_id(campaign_id))
  );

-- ----------------------------------------------------------------------------
-- RLS Policies: marketing_automations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS marketing_automations_admin_all ON public.marketing_automations;
CREATE POLICY marketing_automations_admin_all ON public.marketing_automations
  FOR ALL
  USING (
    public.is_organization_admin(organization_id)
  )
  WITH CHECK (
    public.is_organization_admin(organization_id)
  );

DROP POLICY IF EXISTS marketing_automations_member_read ON public.marketing_automations;
CREATE POLICY marketing_automations_member_read ON public.marketing_automations
  FOR SELECT
  USING (
    public.is_organization_member(organization_id)
  );
