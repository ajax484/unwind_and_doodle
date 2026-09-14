-- Migration: In-App Notification Center
-- Creates notifications table, indexes, constraints, and RLS policies

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'admin', 'broadcast')),
  recipient_id UUID NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('order', 'inventory', 'review', 'customization', 'stock', 'system')),
  link TEXT NULL,
  metadata JSONB NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for efficient lookup & unread counters
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_lookup 
ON public.notifications (organization_id, recipient_type, recipient_id, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications (organization_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Organization Admins can manage and read all notifications in their organization
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications
  FOR ALL
  USING (
    public.is_organization_admin(organization_id)
  )
  WITH CHECK (
    public.is_organization_admin(organization_id)
  );

-- Organization Members can read admin notifications in their organization
DROP POLICY IF EXISTS notifications_member_read ON public.notifications;
CREATE POLICY notifications_member_read ON public.notifications
  FOR SELECT
  USING (
    public.is_organization_member(organization_id) AND (recipient_type = 'admin' OR recipient_type = 'broadcast')
  );

-- Service role bypasses RLS for server-side API routes & event handlers
