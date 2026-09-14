-- Migration: Teams & Permissions System
-- Creates organization_invitations table, constraints, indexes, and RLS policies

-- 1. Create organization_invitations table
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for organization_invitations
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON public.organization_invitations (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations (token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations (organization_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires_at ON public.organization_invitations (expires_at);

-- Partial unique index to prevent duplicate pending invitations for the same email within an organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_org_invitation 
ON public.organization_invitations (organization_id, LOWER(email)) 
WHERE accepted_at IS NULL;

-- 3. Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for organization_invitations
DROP POLICY IF EXISTS organization_invitations_admin_all ON public.organization_invitations;
CREATE POLICY organization_invitations_admin_all ON public.organization_invitations
  FOR ALL
  USING (
    public.is_organization_admin(organization_id)
  )
  WITH CHECK (
    public.is_organization_admin(organization_id)
  );

DROP POLICY IF EXISTS organization_invitations_member_read ON public.organization_invitations;
CREATE POLICY organization_invitations_member_read ON public.organization_invitations
  FOR SELECT
  USING (
    public.is_organization_member(organization_id)
  );

-- 5. Ensure organization_members has proper role check and RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_role_check'
  ) THEN
    ALTER TABLE public.organization_members 
    ADD CONSTRAINT organization_members_role_check 
    CHECK (role IN ('owner', 'admin', 'staff', 'manager'));
  END IF;
END $$;

DROP POLICY IF EXISTS organization_members_admin_modify ON public.organization_members;
CREATE POLICY organization_members_admin_modify ON public.organization_members
  FOR ALL
  USING (
    public.is_organization_admin(organization_id)
  )
  WITH CHECK (
    public.is_organization_admin(organization_id)
  );
