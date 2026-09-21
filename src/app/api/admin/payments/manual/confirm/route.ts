import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { confirmManualPayment } from '@/services/manual-payment.service';

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization Guard (enforces authenticated admin and organization membership)
    const adminContext = await getAuthenticatedAdmin(req);

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { paymentId, orderId, note } = body;

    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'paymentId is required and must be a string',
        },
        { status: 400 }
      );
    }

    // 3. Authoritatively confirm the manual payment
    const result = await confirmManualPayment({
      supabase,
      paymentId: paymentId.trim(),
      orderId: typeof orderId === 'string' ? orderId.trim() : undefined,
      adminContext: {
        userId: adminContext.user.id,
        organizationId: adminContext.organization.id,
        role: adminContext.membership.role,
        userEmail: adminContext.user.email,
      },
      note: typeof note === 'string' ? note.trim() : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: result.alreadyProcessed
          ? 'Payment was already confirmed previously'
          : 'Bank transfer payment confirmed successfully and order fulfilled',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error confirming manual payment';

    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('authorization') ||
      errorMessage.includes('privileges') ||
      errorMessage.includes('Unauthorized');

    const isNotFound = errorMessage.includes('not found');
    const isBadRequest =
      errorMessage.includes('Cannot confirm') ||
      errorMessage.includes('is required') ||
      errorMessage.includes('not associated') ||
      errorMessage.includes('Cannot manually confirm');

    const status = isAuthError ? 403 : isNotFound ? 404 : isBadRequest ? 400 : 500;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}
