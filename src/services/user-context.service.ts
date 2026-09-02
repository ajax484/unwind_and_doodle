import { NextRequest } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { getServiceSupabaseClient } from '../lib/supabase/client';
import { extractAuthToken } from '../lib/auth-helpers';
import { Role, Permission } from '../types/admin-team';
import { getRolePermissions } from './permission.service';
import { CustomerProfile, getCustomerProfile, linkOrCreateCustomerAccount } from './customer-account.service';

export interface AuthenticatedUserBase {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export interface AuthenticatedMerchantUserContext {
  authenticated: true;
  user: AuthenticatedUserBase;
  userType: 'merchant';
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    organizationId: string;
    userId: string;
    role: Role;
  };
  permissions: Permission[];
  customer: null;
}

export interface AuthenticatedCustomerUserContext {
  authenticated: true;
  user: AuthenticatedUserBase;
  userType: 'customer';
  organization: null;
  membership: null;
  permissions: Permission[];
  customer: CustomerProfile;
}

export interface AuthenticatedUnassignedUserContext {
  authenticated: true;
  user: AuthenticatedUserBase;
  userType: 'unassigned';
  organization: null;
  membership: null;
  permissions: Permission[];
  customer: null;
}

export interface AnonymousUserContext {
  authenticated: false;
  user: null;
  userType: 'anonymous';
  organization: null;
  membership: null;
  permissions: Permission[];
  customer: null;
}

export type AuthenticatedUserContext =
  | AuthenticatedMerchantUserContext
  | AuthenticatedCustomerUserContext
  | AuthenticatedUnassignedUserContext
  | AnonymousUserContext;

/**
 * Resolves the authenticated user into the application's domain model.
 * Deterministically checks organization membership first (for merchant/admin access)
 * and customer profiles (for storefront customer access).
 */
export async function getAuthenticatedUserContext(
  req: NextRequest,
  customClient?: SupabaseClient<Database>
): Promise<AuthenticatedUserContext> {
  const supabase = getServiceSupabaseClient(customClient);

  // 1. Support test environment bypass headers in test mode
  const testAdminId = req.headers.get('x-admin-user-id') || req.headers.get('x-test-admin-id');
  const testAdminEmail = req.headers.get('x-test-admin-email');
  if (testAdminId && process.env.NODE_ENV === 'test') {
    const { data: member } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role')
      .eq('user_id', testAdminId)
      .maybeSingle();

    if (member) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', member.organization_id)
        .maybeSingle();

      const role = (member.role || 'staff') as Role;
      return {
        authenticated: true,
        user: {
          id: testAdminId,
          email: testAdminEmail || 'admin@unwindanddoodle.com',
        },
        userType: 'merchant',
        organization: org || {
          id: member.organization_id,
          name: 'Unwind & Doodle',
          slug: 'unwind-and-doodle',
        },
        membership: {
          id: member.id,
          organizationId: member.organization_id,
          userId: member.user_id,
          role,
        },
        permissions: getRolePermissions(role),
        customer: null,
      };
    }
  }

  const testUserId = req.headers.get('x-test-user-id');
  const testEmail = req.headers.get('x-test-email');
  if (testUserId && testEmail && process.env.NODE_ENV === 'test') {
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: testUserId,
      email: testEmail,
    });
    return {
      authenticated: true,
      user: {
        id: testUserId,
        email: testEmail,
      },
      userType: 'customer',
      organization: null,
      membership: null,
      permissions: [],
      customer,
    };
  }

  // 2. Extract token from Authorization Bearer header or Supabase cookies
  const token = extractAuthToken(req);
  if (!token) {
    return {
      authenticated: false,
      user: null,
      userType: 'anonymous',
      organization: null,
      membership: null,
      permissions: [],
      customer: null,
    };
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return {
        authenticated: false,
        user: null,
        userType: 'anonymous',
        organization: null,
        membership: null,
        permissions: [],
        customer: null,
      };
    }

    const authUser = userData.user;
    const userSummary: AuthenticatedUserBase = {
      id: authUser.id,
      email: authUser.email,
      user_metadata: authUser.user_metadata,
    };

    // 3. Check for Organization Membership (Merchant/Admin context)
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role')
      .eq('user_id', authUser.id)
      .limit(1);

    if (!memberError && members && members.length > 0) {
      const member = members[0];
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', member.organization_id)
        .maybeSingle();

      const role = (member.role || 'staff') as Role;
      return {
        authenticated: true,
        user: userSummary,
        userType: 'merchant',
        organization: org || {
          id: member.organization_id,
          name: 'Unwind & Doodle',
          slug: 'unwind-and-doodle',
        },
        membership: {
          id: member.id,
          organizationId: member.organization_id,
          userId: member.user_id,
          role,
        },
        permissions: getRolePermissions(role),
        customer: null,
      };
    }

    // 4. Check for Customer Profile (Customer context)
    let customer = await getCustomerProfile(supabase, { userId: authUser.id });
    if (!customer && authUser.email) {
      // Look up by email or link customer record
      customer = await linkOrCreateCustomerAccount(supabase, {
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata,
      });
    }

    if (customer) {
      return {
        authenticated: true,
        user: userSummary,
        userType: 'customer',
        organization: null,
        membership: null,
        permissions: [],
        customer,
      };
    }

    // 5. Unassigned authenticated user (e.g. pending invitation accept)
    return {
      authenticated: true,
      user: userSummary,
      userType: 'unassigned',
      organization: null,
      membership: null,
      permissions: [],
      customer: null,
    };
  } catch (err) {
    console.warn(`[getAuthenticatedUserContext] Exception resolving user context:`, err);
    return {
      authenticated: false,
      user: null,
      userType: 'anonymous',
      organization: null,
      membership: null,
      permissions: [],
      customer: null,
    };
  }
}
