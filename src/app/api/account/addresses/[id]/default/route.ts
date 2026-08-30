import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { setDefaultCustomerAddress } from '@/services/customer-account.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = getServiceSupabaseClient();

    const updated = await setDefaultCustomerAddress(
      supabase,
      authContext.customer.id,
      id
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to set default address';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
