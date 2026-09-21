import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { refundPayment } from '@/services/payment-management.service';
import { ProcessRefundSchema } from '@/types/payment-management';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization Guard
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: paymentId } = await params;
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = ProcessRefundSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid refund payload',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { amount, reason, customerNote } = parseResult.data;

    const result = await refundPayment({
      supabase,
      paymentId,
      amount,
      reason,
      customerNote,
      adminContext: {
        userId: adminContext.user.id,
        organizationId: adminContext.organization.id,
        role: adminContext.membership.role,
        userEmail: adminContext.user.email,
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error processing refund';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isNotFound = errorMessage.includes('not found');
    const isBadRequest =
      errorMessage.includes('exceeds') ||
      errorMessage.includes('Cannot refund') ||
      errorMessage.includes('already been fully refunded') ||
      errorMessage.includes('Invalid refund amount');

    return NextResponse.json(
      { success: false, error: errorMessage },
      {
        status: isAuthError
          ? 403
          : isNotFound
          ? 404
          : isBadRequest
          ? 400
          : 500,
      }
    );
  }
}
