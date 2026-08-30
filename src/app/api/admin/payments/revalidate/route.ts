import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { revalidatePayment, sweepPendingPayments } from '@/services/payment-revalidation.service';

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization Guard
    const adminContext = await getAuthenticatedAdmin(req);

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { paymentId, reference, orderId, orderNumber, sweep, maxAgeHours, limit } = body;

    // A. Sweep batch of pending payments
    if (sweep === true) {
      const sweepResult = await sweepPendingPayments(supabase, {
        organizationId: adminContext.organization.id,
        maxAgeHours: typeof maxAgeHours === 'number' ? maxAgeHours : 24,
        limit: typeof limit === 'number' ? limit : 50,
      });

      return NextResponse.json({ success: true, data: sweepResult }, { status: 200 });
    }

    // B. Revalidate single payment/order
    if (!paymentId && !reference && !orderId && !orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide at least one identifier (paymentId, reference, orderId, orderNumber, or sweep: true)',
        },
        { status: 400 }
      );
    }

    const result = await revalidatePayment(supabase, {
      paymentId,
      reference,
      orderId,
      orderNumber,
      triggeredBy: 'admin',
      actorId: adminContext.user.id,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error revalidating payment';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('authorization') ||
      errorMessage.includes('privileges') ||
      errorMessage.includes('Unauthorized');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}
