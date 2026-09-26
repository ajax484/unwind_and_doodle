import { cookies, headers } from 'next/headers';
import { getServiceSupabaseClient, createEphemeralAuthClient } from './supabase/client';
import { requireOrganizationMember, AdminOrganizationContext } from '../services/auth.service';
import { getRolePermissions } from '../services/permission.service';

export interface AdminServerSession {
  user: {
    id: string;
    email?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: string;
  };
  permissions?: string[];
}

/**
 * Extracts the authentication token from incoming server headers and cookies.
 */
function extractTokenFromStores(
  cookieStore: { get: (name: string) => { value: string } | undefined; getAll: () => { name: string; value: string }[] },
  headerStore: { get: (name: string) => string | null }
): string | null {
  const authHeader = headerStore.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 1. Direct standard cookies
  const directCookie =
    cookieStore.get('sb-access-token')?.value ||
    cookieStore.get('app_session_token')?.value ||
    cookieStore.get('supabase-auth-token')?.value;

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

  // 2. Chunked project-specific cookies (sb-<ref>-auth-token)
  const allCookies = cookieStore.getAll();
  const sbAuthCookies = allCookies.filter(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  if (sbAuthCookies.length > 0) {
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
 * Resolves the authenticated admin session from the server environment (e.g. Next.js Server Components / Layouts).
 * Returns null if not authenticated or not authorized.
 */
export async function getAuthenticatedAdminServer(): Promise<AdminServerSession | null> {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    const token = extractTokenFromStores(cookieStore, headerStore);
    const refreshToken =
      cookieStore.get('sb-refresh-token')?.value ||
      cookieStore.get('app_refresh_token')?.value;

    // Check test environment headers if running in test
    const testAdminId = headerStore.get('x-admin-user-id') || headerStore.get('x-test-admin-id');
    const testAdminEmail = headerStore.get('x-test-admin-email');

    if (!token && !testAdminId && !refreshToken) {
      return null;
    }

    const supabase = getServiceSupabaseClient();

    let adminContext: AdminOrganizationContext;

    if (testAdminId && process.env.NODE_ENV === 'test') {
      adminContext = await requireOrganizationMember(supabase, {
        userId: testAdminId,
        userEmail: testAdminEmail || 'admin@unwindanddoodle.com',
      });
    } else {
      let user: any = null;

      if (token) {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (!userError && userData?.user) {
          user = userData.user;
        }
      }

      if (!user && refreshToken) {
        try {
          const authClient = createEphemeralAuthClient(supabase);
          const { data: refreshData, error: refreshError } = await authClient.auth.refreshSession({
            refresh_token: refreshToken,
          });
          if (!refreshError && refreshData?.user) {
            user = refreshData.user;
          }
        } catch (refreshErr) {
          console.warn('[getAuthenticatedAdminServer] Refresh failed:', refreshErr);
        }
      }

      if (!user) {
        return null;
      }

      adminContext = await requireOrganizationMember(supabase, {
        userId: user.id,
        userEmail: user.email,
        userMetadata: user.user_metadata,
      });
    }

    return {
      user: {
        id: adminContext.user.id,
        email: adminContext.user.email,
      },
      organization: {
        id: adminContext.organization.id,
        name: adminContext.organization.name,
        slug: adminContext.organization.slug,
      },
      membership: {
        id: adminContext.membership.id,
        role: adminContext.membership.role,
      },
      permissions: getRolePermissions(adminContext.membership.role),
    };
  } catch (err) {
    console.warn('[getAuthenticatedAdminServer] Authentication failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
