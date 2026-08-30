import { NextRequest, NextResponse } from 'next/server';
import { RefundOrderSchema } from '@/types/admin-order';
import { refundAdminOrder } from '@/services/admin-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization guard
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    let reason: string | undefined;
    let customerNote: string | undefined;
    try {
      const rawBody = await req.json();
      const parseResult = RefundOrderSchema.safeParse(rawBody);
      if (parseResult.success) {
        reason = parseResult.data.reason;
        customerNote = parseResult.data.customerNote;
      }
    } catch {
      // Body is optional
    }

    const result = await refundAdminOrder({
      supabase,
      orderId,
      userId: adminContext.user.id,
      organizationId: adminContext.organization.id,
      reason,
      customerNote,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error processing refund';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isNotFound = errorMessage.includes('not found');
    const isAlreadyRefunded = errorMessage.includes('already refunded');

    return NextResponse.json(
      { success: false, error: errorMessage },
      {
        status: isAuthError
          ? 403
          : isNotFound
          ? 404
          : isAlreadyRefunded
          ? 409
          : 500,
      }
    );
  }
}
