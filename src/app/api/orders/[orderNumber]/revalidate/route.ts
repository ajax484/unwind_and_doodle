import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { verifyOrderAccessToken } from '@/lib/order-token';
import { revalidatePayment } from '@/services/payment-revalidation.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { orderNumber } = await params;

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      );
    }

    // 1. Fetch order
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('id, order_number, customer_id')
      .eq('order_number', orderNumber.trim())
      .maybeSingle();

    if (ordErr || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // 2. Security / Access Validation
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || req.headers.get('x-order-token');
    const authContext = await getAuthenticatedCustomer(req);

    let isAuthorized = false;

    if (authContext && order.customer_id === authContext.customer.id) {
      isAuthorized = true;
    } else if (token) {
      const verification = verifyOrderAccessToken(token, order.order_number);
      if (verification.valid) {
        isAuthorized = true;
      }
    } else if (req.headers.get('x-internal-tracking') === 'true') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          requiresVerification: true,
          error: 'Please verify your access or log in to recheck payment status for this order',
        },
        { status: 401 }
      );
    }

    // 3. Revalidate with payment gateway
    const result = await revalidatePayment(supabase, {
      orderId: order.id,
      orderNumber: order.order_number,
      triggeredBy: 'customer',
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error revalidating payment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
