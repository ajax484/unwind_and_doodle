import { NextRequest } from 'next/server';
import { getServiceSupabaseClient } from './supabase/client';
import { CustomerProfile, getCustomerProfile, linkOrCreateCustomerAccount } from '../services/customer-account.service';
import { AdminOrganizationContext, requireOrganizationMember } from '../services/auth.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase/types';

export interface AuthenticatedCustomerContext {
  userId: string;
  customer: CustomerProfile;
}

/**
 * Extracts auth token from Authorization Bearer header or standard Supabase session cookies.
 */
export function extractAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 1. Check direct standard access token cookies
  const directCookie =
    req.cookies.get('sb-access-token')?.value ||
    req.cookies.get('app_session_token')?.value ||
    req.cookies.get('supabase-auth-token')?.value;

  if (directCookie) {
    try {
      if (directCookie.startsWith('[')) {
        const parsed = JSON.parse(directCookie);
        return parsed[0] || null;
      }
      if (directCookie.startsWith('{')) {
        const parsed = JSON.parse(directCookie);
        return parsed.access_token || parsed.currentSession?.access_token || null;
      }
      return directCookie;
    } catch {
      return directCookie;
    }
  }

  // 2. Check project-specific supabase cookies (e.g. sb-<ref>-auth-token or sb-<ref>-auth-token.0)
  const allCookies = req.cookies.getAll();
  const sbAuthCookies = allCookies.filter(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  if (sbAuthCookies.length > 0) {
    // Sort chunked cookies (.0, .1, etc.)
    sbAuthCookies.sort((a, b) => a.name.localeCompare(b.name));
    const combinedValue = sbAuthCookies.map((c) => c.value).join('');

    try {
      let decoded = combinedValue;
      try {
        decoded = decodeURIComponent(combinedValue);
      } catch {}

      if (decoded.startsWith('base64-')) {
        decoded = Buffer.from(decoded.substring(7), 'base64').toString('utf-8');
      }

      if (decoded.startsWith('[')) {
        const parsed = JSON.parse(decoded);
        return parsed[0] || null;
      }
      if (decoded.startsWith('{')) {
        const parsed = JSON.parse(decoded);
        return parsed.access_token || parsed.currentSession?.access_token || null;
      }
      return decoded;
    } catch {
      return combinedValue;
    }
  }

  return null;
}

/**
 * Extracts and verifies the authenticated user and their linked customer profile from request headers/cookies.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedCustomer(
  req: NextRequest
): Promise<AuthenticatedCustomerContext | null> {
  const supabase = getServiceSupabaseClient();

  const token = extractAuthToken(req);

  // Support mock headers in test environment if specified
  const testUserId = req.headers.get('x-test-user-id');
  const testEmail = req.headers.get('x-test-email');
  if (testUserId && testEmail && process.env.NODE_ENV === 'test') {
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: testUserId,
      email: testEmail,
    });
    return { userId: testUserId, customer };
  }

  if (!token) {
    return null;
  }

  try {
    const { data: userData, error } = await supabase.auth.getUser(token);
    if (error || !userData?.user) {
      return null;
    }

    const user = userData.user;
    let customer = await getCustomerProfile(supabase, { userId: user.id });

    if (!customer && user.email) {
      // Automatically link or create customer profile
      customer = await linkOrCreateCustomerAccount(supabase, {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      });
    }

    if (!customer) {
      return null;
    }

    return {
      userId: user.id,
      customer,
    };
  } catch (err) {
    console.warn(`Auth token verification failed:`, err);
    return null;
  }
}

/**
 * Extracts, verifies, and resolves the AdminOrganizationContext for an incoming Next.js API request.
 * Throws an error (with status code indicators) if unauthenticated, not an org member, or unauthorized.
 */
export async function getAuthenticatedAdmin(
  req: NextRequest,
  requestedOrgId?: string,
  customClient?: SupabaseClient<Database>
): Promise<AdminOrganizationContext> {
  const token = extractAuthToken(req);
  const testAdminId = req.headers.get('x-admin-user-id') || req.headers.get('x-test-admin-id');
  const testAdminEmail = req.headers.get('x-test-admin-email');

  if (!token && !testAdminId) {
    throw new Error('Authentication required: No session token provided');
  }

  const supabase = getServiceSupabaseClient(customClient);

  // Test environment bypass headers if present in tests
  if (testAdminId && process.env.NODE_ENV === 'test') {
    return requireOrganizationMember(supabase, {
      userId: testAdminId,
      requestedOrgId: requestedOrgId || req.headers.get('x-organization-id') || undefined,
      userEmail: testAdminEmail || 'admin@unwindanddoodle.com',
    });
  }

  if (!token) {
    throw new Error('Authentication required: No session token provided');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new Error('Authentication required: Invalid or expired session');
  }

  const user = userData.user;

  // Resolve membership and organization context
  return requireOrganizationMember(supabase, {
    userId: user.id,
    requestedOrgId: requestedOrgId || req.headers.get('x-organization-id') || undefined,
    userEmail: user.email,
    userMetadata: user.user_metadata,
  });
}
