import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Database } from '../lib/supabase/types';
import { getConfig } from '../lib/config';
import { AdminOrganizationContext, recordAdminAuditLog } from './auth.service';
import { requirePermission } from './permission.service';
import { dispatchTransactionalEmail } from './notification.service';
import {
  Role,
  TeamMember,
  TeamInvitation,
  InviteTeamMemberInput,
  InviteTeamMemberSchema,
  PublicInvitationDetail,
} from '../types/admin-team';

/**
 * Lists all active members of an organization.
 */
export async function listTeamMembers(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<TeamMember[]> {
  const { data: members, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to list team members: ${error.message}`);
  }

  if (!members || members.length === 0) {
    return [];
  }

  // Fetch user profiles/emails from auth.users (via admin client or customer records fallback)
  const userIds = members.map((m) => m.user_id);

  // Try to lookup customer records for display names / emails
  const { data: customers } = await supabase
    .from('customers')
    .select('user_id, email, first_name, last_name')
    .in('user_id', userIds);

  const customerMap = new Map<string, { email: string; fullName?: string }>();
  if (customers) {
    for (const c of customers) {
      if (c.user_id) {
        const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
        customerMap.set(c.user_id, {
          email: c.email,
          fullName: fullName || undefined,
        });
      }
    }
  }

  return members.map((m) => {
    const cust = customerMap.get(m.user_id);
    return {
      id: m.id,
      organizationId: m.organization_id,
      userId: m.user_id,
      role: (m.role || 'staff') as Role,
      createdAt: m.created_at,
      user: {
        id: m.user_id,
        email: cust?.email || `user_${m.user_id.substring(0, 8)}@store.internal`,
        fullName: cust?.fullName,
      },
    };
  });
}

/**
 * Lists pending/active invitations for an organization.
 */
export async function listTeamInvitations(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<TeamInvitation[]> {
  const { data: invitations, error } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at, invited_by, created_at')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list team invitations: ${error.message}`);
  }

  return (invitations || []).map((inv) => ({
    id: inv.id,
    organizationId: inv.organization_id,
    email: inv.email,
    role: (inv.role || 'staff') as Role,
    expiresAt: inv.expires_at,
    acceptedAt: inv.accepted_at,
    invitedBy: inv.invited_by,
    createdAt: inv.created_at,
  }));
}

/**
 * Creates and dispatches a new team invitation.
 */
export async function createTeamInvitation(
  supabase: SupabaseClient<Database>,
  context: AdminOrganizationContext,
  rawInput: InviteTeamMemberInput
): Promise<TeamInvitation> {
  requirePermission(context, 'team.manage');

  const input = InviteTeamMemberSchema.parse(rawInput);
  const normalizedEmail = input.email.trim().toLowerCase();

  // Edge case 1: Self invite
  if (context.user.email && context.user.email.toLowerCase() === normalizedEmail) {
    throw new Error('Invalid invitation: You cannot invite yourself to the organization');
  }

  // Edge case 2: Admin attempting to assign 'owner' role without being owner
  if (input.role === 'owner' && context.membership.role !== 'owner') {
    throw new Error('Forbidden: Only organization owners can invite or assign the owner role');
  }

  // Edge case 3: Check if this email is already a member
  const members = await listTeamMembers(supabase, context.organization.id);
  const existingMember = members.find((m) => m.user.email.toLowerCase() === normalizedEmail);
  if (existingMember) {
    throw new Error(`Invalid invitation: User '${normalizedEmail}' is already a member of this organization`);
  }

  // Edge case 4: Check if there's already an active unexpired invitation
  const { data: existingInvites } = await supabase
    .from('organization_invitations')
    .select('id, expires_at, accepted_at')
    .eq('organization_id', context.organization.id)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  if (existingInvites && existingInvites.length > 0) {
    throw new Error(
      `An active invitation for '${normalizedEmail}' already exists. You can resend or cancel it from the pending invitations list.`
    );
  }

  // Generate cryptographically secure 32-byte hex token (64 characters)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: context.organization.id,
      email: normalizedEmail,
      role: input.role,
      token,
      expires_at: expiresAt,
      invited_by: context.user.id,
    })
    .select('id, organization_id, email, role, expires_at, accepted_at, invited_by, created_at')
    .single();

  if (error || !invitation) {
    throw new Error(`Failed to create team invitation: ${error?.message || 'Database insert failed'}`);
  }

  // Dispatch transactional email
  const { appUrl } = getConfig();
  const inviteUrl = `${appUrl}/invite/${token}`;

  await dispatchTransactionalEmail({
    to: normalizedEmail,
    subject: `You've been invited to join ${context.organization.name} — Unwind and Doodle`,
    template: 'team_invitation',
    data: {
      inviteUrl,
      organizationName: context.organization.name,
      role: input.role,
      invitedBy: context.user.email || 'An administrator',
      expiresAt,
    },
  });

  // Record audit log (NEVER log the token)
  await recordAdminAuditLog(supabase, {
    organizationId: context.organization.id,
    actorId: context.user.id,
    action: 'create',
    entityType: 'organization_invitation',
    entityId: invitation.id,
    afterData: {
      email: normalizedEmail,
      role: input.role,
      expiresAt,
    },
  });

  return {
    id: invitation.id,
    organizationId: invitation.organization_id,
    email: invitation.email,
    role: invitation.role as Role,
    expiresAt: invitation.expires_at,
    acceptedAt: invitation.accepted_at,
    invitedBy: invitation.invited_by,
    createdAt: invitation.created_at,
  };
}

/**
 * Resends an existing active invitation and extends its expiration.
 */
export async function resendTeamInvitation(
  supabase: SupabaseClient<Database>,
  context: AdminOrganizationContext,
  invitationId: string
): Promise<TeamInvitation> {
  requirePermission(context, 'team.manage');

  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('organization_id', context.organization.id)
    .maybeSingle();

  if (error || !invitation) {
    throw new Error('Invitation not found or does not belong to this organization');
  }

  if (invitation.accepted_at) {
    throw new Error('Cannot resend: This invitation has already been accepted');
  }

  // Extend expiration by another 7 days
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  // Refresh token for security
  const newToken = crypto.randomBytes(32).toString('hex');

  const { data: updated, error: updateError } = await supabase
    .from('organization_invitations')
    .update({
      token: newToken,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .select('id, organization_id, email, role, expires_at, accepted_at, invited_by, created_at')
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update invitation: ${updateError?.message || 'Update failed'}`);
  }

  // Dispatch email
  const { appUrl } = getConfig();
  const inviteUrl = `${appUrl}/invite/${newToken}`;

  await dispatchTransactionalEmail({
    to: updated.email,
    subject: `Invitation Reminder: Join ${context.organization.name} — Unwind and Doodle`,
    template: 'team_invitation',
    data: {
      inviteUrl,
      organizationName: context.organization.name,
      role: updated.role,
      invitedBy: context.user.email || 'An administrator',
      expiresAt: newExpiresAt,
    },
  });

  // Record audit log
  await recordAdminAuditLog(supabase, {
    organizationId: context.organization.id,
    actorId: context.user.id,
    action: 'update',
    entityType: 'organization_invitation',
    entityId: updated.id,
    afterData: {
      action: 'resend',
      email: updated.email,
      expiresAt: newExpiresAt,
    },
  });

  return {
    id: updated.id,
    organizationId: updated.organization_id,
    email: updated.email,
    role: updated.role as Role,
    expiresAt: updated.expires_at,
    acceptedAt: updated.accepted_at,
    invitedBy: updated.invited_by,
    createdAt: updated.created_at,
  };
}

/**
 * Cancels/revokes a pending invitation.
 */
export async function cancelTeamInvitation(
  supabase: SupabaseClient<Database>,
  context: AdminOrganizationContext,
  invitationId: string
): Promise<{ success: boolean }> {
  requirePermission(context, 'team.manage');

  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, email, role, accepted_at')
    .eq('id', invitationId)
    .eq('organization_id', context.organization.id)
    .maybeSingle();

  if (error || !invitation) {
    throw new Error('Invitation not found or does not belong to this organization');
  }

  if (invitation.accepted_at) {
    throw new Error('Cannot cancel: This invitation has already been accepted');
  }

  const { error: deleteError } = await supabase
    .from('organization_invitations')
    .delete()
    .eq('id', invitationId);

  if (deleteError) {
    throw new Error(`Failed to cancel invitation: ${deleteError.message}`);
  }

  // Record audit log
  await recordAdminAuditLog(supabase, {
    organizationId: context.organization.id,
    actorId: context.user.id,
    action: 'delete',
    entityType: 'organization_invitation',
    entityId: invitationId,
    beforeData: {
      email: invitation.email,
      role: invitation.role,
    },
  });

  return { success: true };
}

/**
 * Retrieves public-safe invitation details by token.
 */
export async function getInvitationByToken(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<PublicInvitationDetail> {
  if (!token || token.trim().length < 10) {
    throw new Error('Invalid invitation token');
  }

  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at')
    .eq('token', token.trim())
    .maybeSingle();

  if (error || !invitation) {
    throw new Error('Invalid or expired invitation token');
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, slug')
    .eq('id', invitation.organization_id)
    .maybeSingle();

  const isExpired = new Date(invitation.expires_at).getTime() < Date.now();
  const isAccepted = Boolean(invitation.accepted_at);

  return {
    organizationName: org?.name || 'Unwind & Doodle Store',
    organizationSlug: org?.slug || 'unwind-store',
    email: invitation.email,
    role: invitation.role as Role,
    expiresAt: invitation.expires_at,
    isExpired,
    isAccepted,
  };
}

/**
 * Accepts an invitation for an authenticated user.
 */
export async function acceptTeamInvitation(
  supabase: SupabaseClient<Database>,
  user: { id: string; email?: string; user_metadata?: Record<string, any> },
  token: string
): Promise<{ success: boolean; organizationId: string; role: Role }> {
  if (!user || !user.id) {
    throw new Error('Authentication required: Please sign in to accept this invitation');
  }

  if (!user.email) {
    throw new Error('Authentication error: User account does not have a verified email');
  }

  if (!token || token.trim().length < 10) {
    throw new Error('Invalid invitation token');
  }

  // 1. Fetch invitation record
  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at')
    .eq('token', token.trim())
    .maybeSingle();

  if (error || !invitation) {
    throw new Error('Invalid invitation: The link is invalid or does not exist');
  }

  if (invitation.accepted_at) {
    throw new Error('This invitation has already been accepted and cannot be reused');
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new Error('This invitation has expired. Please ask an administrator to send a new invite.');
  }

  // 2. Verify email matches
  if (user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
    throw new Error(
      `Email mismatch: This invitation was issued for '${invitation.email}', but you are currently signed in as '${user.email}'. Please sign in with the invited email account.`
    );
  }

  // 3. Check if already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    // Mark invitation as accepted since user is already member
    await supabase
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return {
      success: true,
      organizationId: invitation.organization_id,
      role: existingMember.role as Role,
    };
  }

  // 4. Create membership
  const { data: newMember, error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
    })
    .select('id, organization_id, user_id, role')
    .single();

  if (memberError || !newMember) {
    throw new Error(`Failed to join organization: ${memberError?.message || 'Insert membership failed'}`);
  }

  // 5. Mark invitation accepted
  await supabase
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // 6. Record audit log
  await recordAdminAuditLog(supabase, {
    organizationId: invitation.organization_id,
    actorId: user.id,
    action: 'create',
    entityType: 'organization_member',
    entityId: newMember.id,
    afterData: {
      email: user.email,
      role: invitation.role,
      invitationId: invitation.id,
    },
  });

  return {
    success: true,
    organizationId: invitation.organization_id,
    role: invitation.role as Role,
  };
}

/**
 * Updates a member's role within an organization.
 */
export async function updateMemberRole(
  supabase: SupabaseClient<Database>,
  context: AdminOrganizationContext,
  memberId: string,
  newRole: Role
): Promise<TeamMember> {
  requirePermission(context, 'team.manage');

  // Fetch target member
  const { data: targetMember, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, created_at')
    .eq('id', memberId)
    .eq('organization_id', context.organization.id)
    .maybeSingle();

  if (error || !targetMember) {
    throw new Error('Team member not found in this organization');
  }

  // Edge case 1: User attempting to modify their own role
  if (targetMember.user_id === context.user.id) {
    throw new Error('Forbidden: You cannot modify your own role');
  }

  // Edge case 2: Target is an owner
  if (targetMember.role === 'owner' && context.membership.role !== 'owner') {
    throw new Error('Forbidden: Only organization owners can modify another owner');
  }

  // Edge case 3: Admin attempting to assign 'owner' role without being owner
  if (newRole === 'owner' && context.membership.role !== 'owner') {
    throw new Error('Forbidden: Only organization owners can assign the owner role');
  }

  // Edge case 4: Demoting the last owner of the organization
  if (targetMember.role === 'owner' && newRole !== 'owner') {
    const { count: ownerCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', context.organization.id)
      .eq('role', 'owner');

    if ((ownerCount || 0) <= 1) {
      throw new Error('Cannot demote the last remaining owner of the organization');
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .select('id, organization_id, user_id, role, created_at')
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update member role: ${updateError?.message || 'Update failed'}`);
  }

  // Record audit log
  await recordAdminAuditLog(supabase, {
    organizationId: context.organization.id,
    actorId: context.user.id,
    action: 'update',
    entityType: 'organization_member',
    entityId: memberId,
    beforeData: { role: targetMember.role },
    afterData: { role: newRole },
  });

  return {
    id: updated.id,
    organizationId: updated.organization_id,
    userId: updated.user_id,
    role: updated.role as Role,
    createdAt: updated.created_at,
    user: {
      id: updated.user_id,
      email: `user_${updated.user_id.substring(0, 8)}@store.internal`,
    },
  };
}

/**
 * Removes a member from an organization.
 */
export async function removeTeamMember(
  supabase: SupabaseClient<Database>,
  context: AdminOrganizationContext,
  memberId: string
): Promise<{ success: boolean }> {
  requirePermission(context, 'team.manage');

  // Fetch target member
  const { data: targetMember, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role')
    .eq('id', memberId)
    .eq('organization_id', context.organization.id)
    .maybeSingle();

  if (error || !targetMember) {
    throw new Error('Team member not found in this organization');
  }

  // Edge case 1: Target is owner -> Owner cannot be removed
  if (targetMember.role === 'owner') {
    throw new Error('Forbidden: Organization owners cannot be removed from the organization');
  }

  // Edge case 2: Admin attempting to remove oneself if they are the only remaining admin/owner
  if (targetMember.user_id === context.user.id) {
    const { count: adminCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', context.organization.id)
      .in('role', ['admin', 'owner']);

    if ((adminCount || 0) <= 1) {
      throw new Error('Cannot remove the last remaining administrative member of the organization');
    }
  }

  const { error: deleteError } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId);

  if (deleteError) {
    throw new Error(`Failed to remove team member: ${deleteError.message}`);
  }

  // Record audit log
  await recordAdminAuditLog(supabase, {
    organizationId: context.organization.id,
    actorId: context.user.id,
    action: 'delete',
    entityType: 'organization_member',
    entityId: memberId,
    beforeData: {
      userId: targetMember.user_id,
      role: targetMember.role,
    },
  });

  return { success: true };
}
