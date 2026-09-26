import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient, createEphemeralAuthClient } from './supabase/client';
import { CustomerProfile, getCustomerProfile, linkOrCreateCustomerAccount } from '../services/customer-account.service';
import { AdminOrganizationContext, requireOrganizationMember } from '../services/auth.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase/types';

export interface AuthenticatedCustomerContext {
  userId: string;
  customer: CustomerProfile;
}

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: 'sb-access-token',
  REFRESH_TOKEN: 'sb-refresh-token',
  LEGACY_SESSION: 'app_session_token',
  LEGACY_SUPABASE: 'supabase-auth-token',
} as const;

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
 * Extracts refresh token from standard Supabase refresh cookies.
 */
export function extractRefreshToken(req: NextRequest): string | null {
  return (
    req.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value ||
    req.cookies.get('app_refresh_token')?.value ||
    null
  );
}

/**
 * Attaches standard 30-day sliding session cookies to a response.
 */
export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken?: string | null },
  options?: { maxAge?: number }
): void {
  const maxAge = options?.maxAge ?? AUTH_COOKIE_MAX_AGE;
  const isProd = process.env.NODE_ENV === 'production';

  res.cookies.set(AUTH_COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  if (tokens.refreshToken) {
    res.cookies.set(AUTH_COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
}

/**
 * Clears all authentication cookies from response.
 */
export function clearAuthCookies(res: NextResponse): void {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieNames = [
    AUTH_COOKIE_NAMES.ACCESS_TOKEN,
    AUTH_COOKIE_NAMES.REFRESH_TOKEN,
    AUTH_COOKIE_NAMES.LEGACY_SESSION,
    AUTH_COOKIE_NAMES.LEGACY_SUPABASE,
  ];

  for (const name of cookieNames) {
    res.cookies.set(name, '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
}

/**
 * Attempts to refresh a Supabase session using the provided refresh token.
 */
export async function refreshSupabaseSession(
  refreshToken: string,
  customClient?: SupabaseClient<Database>
) {
  try {
    const supabase = createEphemeralAuthClient(getServiceSupabaseClient(customClient));
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session || !data?.user) {
      return null;
    }

    return {
      session: data.session,
      user: data.user,
    };
  } catch (err) {
    console.warn('[refreshSupabaseSession] Refresh failed:', err instanceof Error ? err.message : err);
    return null;
  }
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
  if (testUserId && testEmail && (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST))) {
    const customer = await linkOrCreateCustomerAccount(supabase, {
      id: testUserId,
      email: testEmail,
    });
    return { userId: testUserId, customer };
  }

  let user: any = null;

  if (token) {
    try {
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (!error && userData?.user) {
        user = userData.user;
      }
    } catch (err) {
      console.warn(`Auth token verification failed:`, err);
    }
  }

  // Fallback: Attempt refresh using refresh token if access token was missing or expired
  if (!user) {
    const refreshToken = extractRefreshToken(req);
    if (refreshToken) {
      const refreshed = await refreshSupabaseSession(refreshToken, supabase);
      if (refreshed?.user) {
        user = refreshed.user;
      }
    }
  }

  if (!user) {
    return null;
  }

  try {
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
    console.warn(`Customer resolution failed:`, err);
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

  const supabase = getServiceSupabaseClient(customClient);

  // Test environment bypass headers if present in tests
  if (testAdminId && (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST))) {
    return requireOrganizationMember(supabase, {
      userId: testAdminId,
      requestedOrgId: requestedOrgId || req.headers.get('x-organization-id') || undefined,
      userEmail: testAdminEmail || 'admin@unwindanddoodle.com',
    });
  }

  if (!token && !testAdminId && !extractRefreshToken(req)) {
    throw new Error('Authentication required: No session token provided');
  }

  let user: any = null;

  if (token) {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (!userError && userData?.user) {
      user = userData.user;
    }
  }

  // Fallback: Attempt refresh using refresh token if access token was missing or expired
  if (!user) {
    const refreshToken = extractRefreshToken(req);
    if (refreshToken) {
      const refreshed = await refreshSupabaseSession(refreshToken, supabase);
      if (refreshed?.user) {
        user = refreshed.user;
      }
    }
  }

  if (!user) {
    throw new Error('Authentication required: Invalid or expired session');
  }

  // Resolve membership and organization context
  return requireOrganizationMember(supabase, {
    userId: user.id,
    requestedOrgId: requestedOrgId || req.headers.get('x-organization-id') || undefined,
    userEmail: user.email,
    userMetadata: user.user_metadata,
  });
}
