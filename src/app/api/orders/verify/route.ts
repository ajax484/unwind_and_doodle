import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { PaystackPaymentProvider } from '@/services/payment/paystack.provider';
import { fulfillSuccessfulPayment } from '@/services/payment-fulfillment.service';
import { PAYMENT_STATUS, CURRENCY } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const txRef =
      url.searchParams.get('reference') ||
      url.searchParams.get('trxref') ||
      url.searchParams.get('tx_ref');

    if (!txRef) {
      return NextResponse.json(
        { success: false, error: 'Transaction reference is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // 1. Locate payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_reference', txRef.trim())
      .maybeSingle();

    if (payErr || !payment) {
      return NextResponse.json(
        { success: false, error: `Payment record not found for reference ${txRef}` },
        { status: 404 }
      );
    }

    // 2. Fetch associated order
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, total, status, customer_id, organization_id, discount_id')
      .eq('id', payment.order_id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Associated order not found' },
        { status: 404 }
      );
    }

    // 3. If payment is already marked successful, return immediately
    if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
      return NextResponse.json(
        {
          success: true,
          orderNumber: order.order_number,
          orderStatus: order.status,
          paymentStatus: payment.status,
          verified: true,
        },
        { status: 200 }
      );
    }

    // 4. Verify transaction with Paystack API directly
    const provider = new PaystackPaymentProvider();
    const verifiedTx = await provider.verifyTransaction(txRef);

    if (
      verifiedTx.status === 'successful' &&
      Math.abs(verifiedTx.amount - payment.amount) < 0.01 &&
      verifiedTx.currency.toUpperCase() === CURRENCY.NGN
    ) {
      const cookieSession = req.cookies.get('uad_cart_session')?.value || req.headers.get('x-cart-session');
      const fulfillment = await fulfillSuccessfulPayment({
        supabase,
        orderId: order.id,
        paymentId: payment.id,
        provider: payment.provider,
        reference: txRef,
        verifiedDetails: {
          amount: verifiedTx.amount,
          currency: verifiedTx.currency,
          channel: verifiedTx.channel,
          paidAt: verifiedTx.paidAt,
          providerReference: verifiedTx.providerReference,
        },
        source: 'return_callback',
        cartSessionId: cookieSession || null,
      });

      return NextResponse.json(
        {
          success: true,
          orderNumber: fulfillment.orderNumber,
          orderStatus: fulfillment.orderStatus,
          paymentStatus: fulfillment.paymentStatus,
          verified: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderNumber: order.order_number,
        orderStatus: order.status,
        paymentStatus: payment.status,
        verified: false,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error verifying payment callback';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
