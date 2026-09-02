import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/services/user-context.service';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUserContext(req);

    if (!authContext.authenticated) {
      return NextResponse.json(
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
    }

    return NextResponse.json({
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session verification failed';
    return NextResponse.json({ success: false, authenticated: false, error: msg }, { status: 500 });
  }
}
