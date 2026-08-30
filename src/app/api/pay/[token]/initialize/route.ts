import { NextRequest, NextResponse } from 'next/server';
import { initializePaymentRequestTransaction } from '@/services/manual-order.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
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

    const body = await req.json().catch(() => ({}));
    const callbackUrl = body.callbackUrl || `${req.nextUrl.origin}/order/callback`;

    const result = await initializePaymentRequestTransaction(supabase, token, callbackUrl);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error initializing payment transaction';
    const isValidationError =
      errorMessage.includes('paid') ||
      errorMessage.includes('expired') ||
      errorMessage.includes('cancelled') ||
      errorMessage.includes('invalid');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
