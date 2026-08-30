import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { deleteCustomerAccount } from '@/services/customer-account.service';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You must be logged in to delete your account' },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const result = await deleteCustomerAccount(
      supabase,
      authContext.customer.id,
      authContext.userId
    );

    const response = NextResponse.json(result);

    // Clear session cookies
    response.cookies.set('sb-access-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    response.cookies.set('app_session_token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Account deletion failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
