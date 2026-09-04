import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  can,
  hasPermission,
  requirePermission,
  getRolePermissions,
} from '@/services/permission.service';
import {
  listTeamMembers,
  listTeamInvitations,
  createTeamInvitation,
  resendTeamInvitation,
  cancelTeamInvitation,
  getInvitationByToken,
  acceptTeamInvitation,
  updateMemberRole,
  removeTeamMember,
} from '@/services/team.service';
import { AdminOrganizationContext } from '@/services/auth.service';
import { AcceptInvitationBodySchema } from '@/types/admin-team';

describe('Teams & Permissions System', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const ORG_A_ID = 'org-unwind-lagos-01';
  const ORG_B_ID = 'org-other-store-02';

  const OWNER_USER_ID = 'usr-owner-olivia-001';
  const ADMIN_USER_ID = 'usr-admin-alice-101';
  const STAFF_USER_ID = 'usr-staff-sam-202';
  const NEW_USER_ID = 'usr-invited-dave-303';

  const ownerContext: AdminOrganizationContext = {
    user: { id: OWNER_USER_ID, email: 'olivia@unwindanddoodle.com' },
    organization: { id: ORG_A_ID, name: 'Unwind & Doodle Lagos', slug: 'unwind-lagos' },
    membership: { id: 'mem-owner-01', organizationId: ORG_A_ID, userId: OWNER_USER_ID, role: 'owner' },
  };

  const adminContext: AdminOrganizationContext = {
    user: { id: ADMIN_USER_ID, email: 'alice@unwindanddoodle.com' },
    organization: { id: ORG_A_ID, name: 'Unwind & Doodle Lagos', slug: 'unwind-lagos' },
    membership: { id: 'mem-admin-01', organizationId: ORG_A_ID, userId: ADMIN_USER_ID, role: 'admin' },
  };

  const staffContext: AdminOrganizationContext = {
    user: { id: STAFF_USER_ID, email: 'sam@unwindanddoodle.com' },
    organization: { id: ORG_A_ID, name: 'Unwind & Doodle Lagos', slug: 'unwind-lagos' },
    membership: { id: 'mem-staff-01', organizationId: ORG_A_ID, userId: STAFF_USER_ID, role: 'staff' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: ORG_A_ID, name: 'Unwind & Doodle Lagos', slug: 'unwind-lagos' },
        { id: ORG_B_ID, name: 'Other Store', slug: 'other-store' },
      ],
      organization_members: [
        { id: 'mem-owner-01', organization_id: ORG_A_ID, user_id: OWNER_USER_ID, role: 'owner', created_at: new Date().toISOString() },
        { id: 'mem-admin-01', organization_id: ORG_A_ID, user_id: ADMIN_USER_ID, role: 'admin', created_at: new Date().toISOString() },
        { id: 'mem-staff-01', organization_id: ORG_A_ID, user_id: STAFF_USER_ID, role: 'staff', created_at: new Date().toISOString() },
      ],
      organization_invitations: [
        {
          id: 'inv-pending-01',
          organization_id: ORG_A_ID,
          email: 'dave@example.com',
          role: 'staff',
          token: 'tok_valid_dave_1234567890abcdef',
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          accepted_at: null,
          invited_by: ADMIN_USER_ID,
          created_at: new Date().toISOString(),
        },
        {
          id: 'inv-expired-02',
          organization_id: ORG_A_ID,
          email: 'expired@example.com',
          role: 'staff',
          token: 'tok_expired_9876543210abcdef',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // expired yesterday
          accepted_at: null,
          invited_by: ADMIN_USER_ID,
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'inv-accepted-03',
          organization_id: ORG_A_ID,
          email: 'accepted@example.com',
          role: 'admin',
          token: 'tok_accepted_5555555555abcdef',
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          accepted_at: new Date().toISOString(),
          invited_by: OWNER_USER_ID,
          created_at: new Date().toISOString(),
        },
      ],
      customers: [
        { id: 'cust-01', user_id: OWNER_USER_ID, email: 'olivia@unwindanddoodle.com', first_name: 'Olivia', last_name: 'Owner' },
        { id: 'cust-02', user_id: ADMIN_USER_ID, email: 'alice@unwindanddoodle.com', first_name: 'Alice', last_name: 'Admin' },
        { id: 'cust-03', user_id: STAFF_USER_ID, email: 'sam@unwindanddoodle.com', first_name: 'Sam', last_name: 'Staff' },
      ],
      audit_logs: [],
    });
  });

  describe('1. Role & Permission Matrix', () => {
    it('Owner should possess all operational, team, and organization administrative permissions', () => {
      expect(can('owner', 'products.manage')).toBe(true);
      expect(can('owner', 'orders.manage')).toBe(true);
      expect(can('owner', 'team.manage')).toBe(true);
      expect(can('owner', 'organization.manage')).toBe(true);
      expect(can('owner', 'billing.manage')).toBe(true);
      expect(hasPermission(ownerContext, 'team.manage')).toBe(true);
      expect(() => requirePermission(ownerContext, 'organization.manage')).not.toThrow();
    });

    it('Admin should have operational and team management capabilities, but NOT organization/billing ownership', () => {
      expect(can('admin', 'products.manage')).toBe(true);
      expect(can('admin', 'inventory.manage')).toBe(true);
      expect(can('admin', 'orders.manage')).toBe(true);
      expect(can('admin', 'team.manage')).toBe(true);
      expect(can('admin', 'discounts.manage')).toBe(true);
      expect(can('admin', 'organization.read')).toBe(true);

      // Denied
      expect(can('admin', 'organization.manage')).toBe(false);
      expect(can('admin', 'billing.manage')).toBe(false);
      expect(hasPermission(adminContext, 'team.manage')).toBe(true);
      expect(hasPermission(adminContext, 'billing.manage')).toBe(false);
      expect(() => requirePermission(adminContext, 'organization.manage')).toThrow('Forbidden');
    });

    it('Staff should have operational capabilities but NO team management or settings permissions', () => {
      expect(can('staff', 'products.read')).toBe(true);
      expect(can('staff', 'products.manage')).toBe(true);
      expect(can('staff', 'orders.manage')).toBe(true);
      expect(can('staff', 'inventory.manage')).toBe(true);
      expect(can('staff', 'discounts.read')).toBe(true);
      expect(can('staff', 'organization.read')).toBe(true);

      // Denied
      expect(can('staff', 'team.read')).toBe(false);
      expect(can('staff', 'team.manage')).toBe(false);
      expect(can('staff', 'discounts.manage')).toBe(false);
      expect(can('staff', 'organization.manage')).toBe(false);
      expect(can('staff', 'billing.manage')).toBe(false);

      expect(hasPermission(staffContext, 'team.manage')).toBe(false);
      expect(() => requirePermission(staffContext, 'team.read')).toThrow('Forbidden');
    });

    it('should return correct permissions list via getRolePermissions', () => {
      const ownerPerms = getRolePermissions('owner');
      const staffPerms = getRolePermissions('staff');

      expect(ownerPerms.length).toBeGreaterThan(staffPerms.length);
      expect(ownerPerms).toContain('billing.manage');
      expect(staffPerms).not.toContain('team.manage');
      expect(staffPerms).toContain('orders.manage');
    });
  });

  describe('2. Team Member Management', () => {
    it('should list all members of an organization with enriched user details', async () => {
      const members = await listTeamMembers(mockSupabase as any, ORG_A_ID);
      expect(members.length).toBe(3);
      expect(members.some((m) => m.role === 'owner')).toBe(true);
      expect(members.some((m) => m.role === 'admin')).toBe(true);
      expect(members.some((m) => m.role === 'staff')).toBe(true);
      expect(members.find((m) => m.role === 'owner')?.user.email).toBe('olivia@unwindanddoodle.com');
    });

    it('Owner can promote a staff member to admin', async () => {
      const staffMember = (await listTeamMembers(mockSupabase as any, ORG_A_ID)).find((m) => m.role === 'staff')!;
      const updated = await updateMemberRole(mockSupabase as any, ownerContext, staffMember.id, 'admin');

      expect(updated.role).toBe('admin');
      const refreshed = await listTeamMembers(mockSupabase as any, ORG_A_ID);
      expect(refreshed.find((m) => m.id === staffMember.id)?.role).toBe('admin');
    });

    it('Admin cannot modify an Owner role', async () => {
      const ownerMember = (await listTeamMembers(mockSupabase as any, ORG_A_ID)).find((m) => m.role === 'owner')!;
      await expect(
        updateMemberRole(mockSupabase as any, adminContext, ownerMember.id, 'staff')
      ).rejects.toThrow('Forbidden: Only organization owners can modify another owner');
    });

    it('User cannot modify their own role', async () => {
      const adminMember = (await listTeamMembers(mockSupabase as any, ORG_A_ID)).find((m) => m.role === 'admin')!;
      await expect(
        updateMemberRole(mockSupabase as any, adminContext, adminMember.id, 'owner')
      ).rejects.toThrow('Forbidden: You cannot modify your own role');
    });

    it('Cannot demote the last remaining owner', async () => {
      const ownerMember = (await listTeamMembers(mockSupabase as any, ORG_A_ID)).find((m) => m.role === 'owner')!;
      // Temporarily test another owner context attempting to demote the only owner
      const anotherOwnerContext: AdminOrganizationContext = {
        ...ownerContext,
        user: { id: 'usr-owner-two', email: 'owner2@unwindanddoodle.com' },
      };
      await expect(
        updateMemberRole(mockSupabase as any, anotherOwnerContext, ownerMember.id, 'admin')
      ).rejects.toThrow('Cannot demote the last remaining owner');
    });

    it('Owner cannot be removed from the organization', async () => {
      const ownerMember = (await listTeamMembers(mockSupabase as any, ORG_A_ID)).find((m) => m.role === 'owner')!;
      await expect(
        removeTeamMember(mockSupabase as any, adminContext, ownerMember.id)
      ).rejects.toThrow('Forbidden: Organization owners cannot be removed');
    });

    it('Admin can remove a staff member', async () => {
      const staffMember = (await listTeamMembers(mockSupabase as any, ORG_A_ID)).find((m) => m.role === 'staff')!;
      const result = await removeTeamMember(mockSupabase as any, adminContext, staffMember.id);
      expect(result.success).toBe(true);

      const members = await listTeamMembers(mockSupabase as any, ORG_A_ID);
      expect(members.some((m) => m.id === staffMember.id)).toBe(false);
    });

    it('Staff member cannot remove other team members', async () => {
      const adminMember = (await listTeamMembers(mockSupabase as any, ORG_A_ID)).find((m) => m.role === 'admin')!;
      await expect(
        removeTeamMember(mockSupabase as any, staffContext, adminMember.id)
      ).rejects.toThrow('Forbidden: Insufficient privileges');
    });
  });

  describe('3. Invitation Flow & Edge Cases', () => {
    it('Admin can invite a new staff member and generates a secure token', async () => {
      const invitation = await createTeamInvitation(mockSupabase as any, adminContext, {
        email: 'newhire@unwindanddoodle.com',
        role: 'staff',
      });

      expect(invitation.email).toBe('newhire@unwindanddoodle.com');
      expect(invitation.role).toBe('staff');
      expect(invitation.expiresAt).toBeDefined();

      const activeInvites = await listTeamInvitations(mockSupabase as any, ORG_A_ID);
      expect(activeInvites.some((inv) => inv.email === 'newhire@unwindanddoodle.com')).toBe(true);
    });

    it('Rejects self-invitation', async () => {
      await expect(
        createTeamInvitation(mockSupabase as any, adminContext, {
          email: 'alice@unwindanddoodle.com',
          role: 'admin',
        })
      ).rejects.toThrow('You cannot invite yourself');
    });

    it('Rejects inviting an existing organization member', async () => {
      await expect(
        createTeamInvitation(mockSupabase as any, adminContext, {
          email: 'sam@unwindanddoodle.com',
          role: 'admin',
        })
      ).rejects.toThrow('already a member of this organization');
    });

    it('Rejects duplicate active invitations', async () => {
      await expect(
        createTeamInvitation(mockSupabase as any, adminContext, {
          email: 'dave@example.com',
          role: 'staff',
        })
      ).rejects.toThrow('An active invitation for \'dave@example.com\' already exists');
    });

    it('Admin cannot invite an Owner', async () => {
      await expect(
        createTeamInvitation(mockSupabase as any, adminContext, {
          email: 'newowner@example.com',
          role: 'owner',
        })
      ).rejects.toThrow('Forbidden: Only organization owners can invite or assign the owner role');
    });

    it('Staff member cannot send invitations', async () => {
      await expect(
        createTeamInvitation(mockSupabase as any, staffContext, {
          email: 'someone@example.com',
          role: 'staff',
        })
      ).rejects.toThrow('Forbidden: Insufficient privileges');
    });

    it('Admin can resend an active invitation and extend expiry', async () => {
      const resent = await resendTeamInvitation(mockSupabase as any, adminContext, 'inv-pending-01');
      expect(resent.email).toBe('dave@example.com');
      expect(new Date(resent.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('Admin can cancel a pending invitation', async () => {
      const result = await cancelTeamInvitation(mockSupabase as any, adminContext, 'inv-pending-01');
      expect(result.success).toBe(true);

      const invites = await listTeamInvitations(mockSupabase as any, ORG_A_ID);
      expect(invites.some((inv) => inv.id === 'inv-pending-01')).toBe(false);
    });
  });

  describe('4. Invitation Acceptance Flow', () => {
    it('Retrieves public metadata by token safely', async () => {
      const detail = await getInvitationByToken(
        mockSupabase as any,
        'tok_valid_dave_1234567890abcdef'
      );

      expect(detail.organizationName).toBe('Unwind & Doodle Lagos');
      expect(detail.email).toBe('dave@example.com');
      expect(detail.role).toBe('staff');
      expect(detail.isExpired).toBe(false);
      expect(detail.isAccepted).toBe(false);
    });

    it('Authenticated user with matching email can accept invitation and join org', async () => {
      const user = { id: NEW_USER_ID, email: 'dave@example.com' };
      const result = await acceptTeamInvitation(
        mockSupabase as any,
        user,
        'tok_valid_dave_1234567890abcdef'
      );

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(ORG_A_ID);
      expect(result.role).toBe('staff');

      // Verify membership was created
      const members = await listTeamMembers(mockSupabase as any, ORG_A_ID);
      expect(members.some((m) => m.userId === NEW_USER_ID)).toBe(true);
    });

    it('Rejects acceptance if authenticated email does not match invitation email', async () => {
      const user = { id: 'usr-wrong-email', email: 'wrong@example.com' };
      await expect(
        acceptTeamInvitation(
          mockSupabase as any,
          user,
          'tok_valid_dave_1234567890abcdef'
        )
      ).rejects.toThrow('Email mismatch');
    });

    it('Rejects expired invitations', async () => {
      const user = { id: 'usr-expired', email: 'expired@example.com' };
      await expect(
        acceptTeamInvitation(
          mockSupabase as any,
          user,
          'tok_expired_9876543210abcdef'
        )
      ).rejects.toThrow('This invitation has expired');
    });

    it('Rejects already accepted invitations (prevents reuse)', async () => {
      const user = { id: 'usr-accepted', email: 'accepted@example.com' };
      await expect(
        acceptTeamInvitation(
          mockSupabase as any,
          user,
          'tok_accepted_5555555555abcdef'
        )
      ).rejects.toThrow('already been accepted');
    });

    it('AcceptInvitationBodySchema validates password length and optional full name', () => {
      const invalid = AcceptInvitationBodySchema.safeParse({ password: '123' });
      expect(invalid.success).toBe(false);

      const valid = AcceptInvitationBodySchema.safeParse({
        password: 'securePassword123',
        fullName: 'Dave Doe',
      });
      expect(valid.success).toBe(true);

      const empty = AcceptInvitationBodySchema.safeParse({});
      expect(empty.success).toBe(true);
    });
  });
});
