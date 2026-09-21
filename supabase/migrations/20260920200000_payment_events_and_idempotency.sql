-- Migration: 20260920200000_payment_events_and_idempotency.sql
-- Description: Create payment_events table for webhook idempotency, audit trail, and performance indexes for payment sweeps.

CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'processed',
    processed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint ensuring provider event deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_event 
ON public.payment_events (provider, provider_event_id);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events (created_at DESC);

-- Index for pending payment revalidation sweep queries
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON public.payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON public.payments (provider_reference);

-- Enable RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to payment_events"
ON public.payment_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view payment events for their organization
CREATE POLICY "Users can view payment events for their organization"
ON public.payment_events
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);
