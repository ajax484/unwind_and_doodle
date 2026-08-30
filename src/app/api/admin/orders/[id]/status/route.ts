import { NextRequest, NextResponse } from 'next/server';
import { TransitionOrderStatusSchema } from '@/types/admin-order';
import { transitionOrderStatus } from '@/services/order-state-machine.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function PATCH(
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

    // Verify order belongs to admin organization
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, organization_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, error: `Order not found: ${orderId}` },
        { status: 404 }
      );
    }

    if (order.organization_id !== adminContext.organization.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Order belongs to another organization' },
        { status: 403 }
      );
    }

    const rawBody = await req.json();
    const parseResult = TransitionOrderStatusSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { status: targetStatus, note, trackingNumber, carrier } = parseResult.data;

    const result = await transitionOrderStatus({
      supabase,
      orderId,
      targetStatus,
      userId: adminContext.user.id,
      note: note || (trackingNumber ? `Shipped via ${carrier || 'Carrier'} (Tracking: ${trackingNumber})` : null),
      metadata: trackingNumber || carrier ? { trackingNumber, carrier } : undefined,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error transitioning order status';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('authorization') ||
      errorMessage.includes('privileges') ||
      errorMessage.includes('Unauthorized');
    const isInvalidTransition = errorMessage.includes('Invalid status transition');
    const isNotFound = errorMessage.includes('not found');

    return NextResponse.json(
      { success: false, error: errorMessage },
      {
        status: isAuthError
          ? 403
          : isNotFound
          ? 404
          : isInvalidTransition
          ? 400
          : 500,
      }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}
