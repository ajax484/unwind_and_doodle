import { NextRequest, NextResponse } from 'next/server';
import { cancelManualOrder } from '@/services/manual-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const { id: orderId } = await params;

    const { data: paymentReq, error } = await supabase
      .from('order_payment_requests')
      .select('*')
      .eq('order_id', orderId)
      .eq('organization_id', adminContext.organization.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !paymentReq) {
      return NextResponse.json(
        { success: false, error: 'Payment link not found for this order' },
        { status: 404 }
      );
    }

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${origin}/pay/${paymentReq.token}`;

    return NextResponse.json({
      success: true,
      data: {
        paymentRequestId: paymentReq.id,
        token: paymentReq.token,
        paymentUrl,
        status: paymentReq.status,
        amount: Number(paymentReq.amount),
        expiresAt: paymentReq.expires_at,
        sentAt: paymentReq.sent_at,
        paidAt: paymentReq.paid_at,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching payment link';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const { id: orderId } = await params;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'cancel';

    if (action === 'cancel') {
      await cancelManualOrder(
        supabase,
        orderId,
        adminContext.user.id,
        adminContext.organization.id
      );

      return NextResponse.json({
        success: true,
        message: 'Order and payment link cancelled successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error managing payment link';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
