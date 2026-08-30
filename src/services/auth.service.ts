import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';

export interface AdminOrganizationContext {
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
  };
}

export interface AdminAuthResult {
  authorized: boolean;
  userId: string;
  organizationId: string;
  role: string;
  context?: AdminOrganizationContext;
}

export interface RequireOrganizationMemberOptions {
  userId: string | null | undefined;
  requestedOrgId?: string | null | undefined;
  allowedRoles?: string[];
  userEmail?: string;
  userMetadata?: Record<string, any>;
}

export const DEFAULT_ADMIN_ROLES = ['owner', 'admin', 'manager', 'staff'] as const;

/**
 * Validates that an authenticated user is an active member of the requested (or primary) organization.
 * Enforces role authorization and returns the full AdminOrganizationContext.
 * Throws descriptive errors on unauthorized attempts to prevent cross-tenant access.
 */
export async function requireOrganizationMember(
  supabase: SupabaseClient<Database>,
  options: RequireOrganizationMemberOptions
): Promise<AdminOrganizationContext> {
  const { userId, requestedOrgId, allowedRoles = DEFAULT_ADMIN_ROLES, userEmail, userMetadata } = options;

  if (!userId || !userId.trim()) {
    throw new Error('Authentication required: Missing user ID');
  }

  // 1. Query organization_members for this user
  let query = supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role')
    .eq('user_id', userId.trim());

  if (requestedOrgId && requestedOrgId.trim()) {
    query = query.eq('organization_id', requestedOrgId.trim());
  }

  const { data: members, error: memberError } = await query;

  if (memberError) {
    throw new Error(`Failed to verify authorization: ${memberError.message}`);
  }

  let member = members && members.length > 0 ? members[0] : null;

  // If no membership found, check if this is the initial setup or designated admin bootstrap
  if (!member) {
    const { count: totalMembersCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true });

    const adminEmailsEnv = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isDesignatedAdmin =
      (userEmail && adminEmailsEnv.includes(userEmail.toLowerCase())) ||
      userMetadata?.role === 'admin' ||
      userMetadata?.role === 'owner' ||
      totalMembersCount === 0 ||
      totalMembersCount === null;

    if (isDesignatedAdmin) {
      // Find or create primary organization
      let { data: primaryOrg } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .limit(1)
        .maybeSingle();

      if (!primaryOrg) {
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({
            name: 'Unwind & Doodle',
            slug: 'unwind-and-doodle',
          } as Database['public']['Tables']['organizations']['Insert'])
          .select('id, name, slug')
          .single();
        primaryOrg = newOrg;
      }

      if (primaryOrg) {
        const { data: autoMember } = await supabase
          .from('organization_members')
          .insert({
            organization_id: primaryOrg.id,
            user_id: userId.trim(),
            role: 'owner',
          } as Database['public']['Tables']['organization_members']['Insert'])
          .select('id, organization_id, user_id, role')
          .single();

        if (autoMember) {
          member = autoMember;
        }
      }
    }
  }

  if (!member) {
    throw new Error('Forbidden: Administrative privileges required');
  }

  // 2. Validate role against allowed roles
  const validRoles = new Set(allowedRoles.map((r) => r.toLowerCase()));
  if (!member.role || !validRoles.has(member.role.toLowerCase())) {
    throw new Error(`Forbidden: Administrative privileges required (role '${member.role}')`);
  }

  // 3. Fetch organization details
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', member.organization_id)
    .maybeSingle();

  if (orgError) {
    throw new Error(`Failed to retrieve organization details: ${orgError.message}`);
  }

  const organization = org || {
    id: member.organization_id,
    name: 'Unwind & Doodle',
    slug: 'unwind-and-doodle',
  };

  return {
    user: {
      id: userId.trim(),
      email: userEmail,
      user_metadata: userMetadata,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    membership: {
      id: member.id,
      organizationId: member.organization_id,
      userId: member.user_id,
      role: member.role,
    },
  };
}

/**
 * Validates that a user is an active organization member with administrative privileges.
 * Preserves backwards compatibility while providing the rich organization context.
 */
export async function requireAdminAuth(
  supabase: SupabaseClient<Database>,
  userId: string | null | undefined,
  requestedOrgId?: string | null | undefined
): Promise<AdminAuthResult> {
  const context = await requireOrganizationMember(supabase, {
    userId,
    requestedOrgId,
    allowedRoles: [...DEFAULT_ADMIN_ROLES],
  });

  return {
    authorized: true,
    userId: context.user.id,
    organizationId: context.organization.id,
    role: context.membership.role,
    context,
  };
}

export interface AdminAuditLogInput {
  organizationId: string;
  actorId?: string | null;
  action: 'create' | 'update' | 'delete' | 'status_change';
  entityType: string;
  entityId: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
}

/**
 * Records an immutable audit log entry for administrative mutations.
 */
export async function recordAdminAuditLog(
  supabase: SupabaseClient<Database>,
  input: AdminAuditLogInput
) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      organization_id: input.organizationId,
      actor_id: input.actorId || null,
      action: input.action as any,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_data: input.beforeData || null,
      after_data: input.afterData || null,
    });

    if (error) {
      console.warn(`[audit_log.error] Failed to insert audit log:`, error.message);
    }
  } catch (err) {
    console.warn(`[audit_log.error] Exception logging admin action:`, err);
  }
}
