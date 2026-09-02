import { NextRequest, NextResponse } from 'next/server';
import { getPaymentRequestByToken, updateCustomerOrderDetails } from '@/services/manual-order.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Payment token is required' },
        { status: 400 }
      );
    }

    const detail = await getPaymentRequestByToken(supabase, token);

    return NextResponse.json({ success: true, data: detail });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching payment request';
    const isNotFound = errorMessage.includes('not found') || errorMessage.includes('invalid');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { token } = await params;
    const body = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Payment token is required' },
        { status: 400 }
      );
    }

    const updatedDetail = await updateCustomerOrderDetails(supabase, {
      token,
      ...body,
    });

    return NextResponse.json({ success: true, data: updatedDetail });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating customer order details';
    const isNotFound = errorMessage.includes('not found') || errorMessage.includes('invalid');
    const isBadRequest = errorMessage.includes('Cannot modify') || errorMessage.includes('expired') || errorMessage.includes('required');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isNotFound ? 404 : isBadRequest ? 400 : 500 }
    );
  }
}
