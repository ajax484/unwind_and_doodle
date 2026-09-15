import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/services/user-context.service';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUserContext(req);

    if (!authContext.authenticated) {
      const response = NextResponse.json(
        {
          success: true,
          authenticated: false,
          user: null,
          userType: 'anonymous',
          customer: null,
          organization: null,
          membership: null,
        },
        { status: 200 }
      );

      if (authContext.shouldClearCookies) {
        clearAuthCookies(response);
      }

      return response;
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      data: {
        userId: authContext.user.id,
        user: authContext.user,
        userType: authContext.userType,
        customer: authContext.customer,
        organization: authContext.organization,
        membership: authContext.membership,
        permissions: authContext.permissions,
      },
    });

    if (authContext.refreshedSession) {
      setAuthCookies(response, authContext.refreshedSession);
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session verification failed';
    return NextResponse.json({ success: false, authenticated: false, error: msg }, { status: 500 });
  }
}
