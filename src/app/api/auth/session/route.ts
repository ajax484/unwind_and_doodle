import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, authenticated: false, customer: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      data: {
        userId: authContext.userId,
        customer: authContext.customer,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session verification failed';
    return NextResponse.json({ success: false, authenticated: false, error: msg }, { status: 500 });
  }
}
