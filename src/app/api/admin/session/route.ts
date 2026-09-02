import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getRolePermissions } from '@/services/permission.service';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);

    return NextResponse.json({
      success: true,
      authenticated: true,
      data: {
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
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Admin session verification failed';
    const isUnauthenticated =
      msg.includes('Authentication required') ||
      msg.includes('No session token') ||
      msg.includes('Invalid or expired session');
    const isUnauthorized =
      msg.includes('Forbidden') ||
      msg.includes('Administrative privileges required') ||
      msg.includes('not a member') ||
      msg.includes('Insufficient privileges') ||
      msg.includes('authorization');

    return NextResponse.json(
      {
        success: false,
        authenticated: !isUnauthenticated,
        error: msg,
        code: isUnauthenticated ? 'UNAUTHENTICATED' : isUnauthorized ? 'FORBIDDEN' : 'SERVER_ERROR',
      },
      { status: isUnauthenticated ? 401 : isUnauthorized ? 403 : 500 }
    );
  }
}
