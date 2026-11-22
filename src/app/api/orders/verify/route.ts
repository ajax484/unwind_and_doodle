import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getPaymentProvider } from '@/services/payment';
import { fulfillSuccessfulPayment } from '@/services/payment-fulfillment.service';
import { PAYMENT_STATUS, CURRENCY } from '@/lib/constants';
import { generateOrderAccessToken } from '@/lib/order-token';
import {
  classifyCheckoutReasonCode,
  classifyPaymentStatusReason,
  logCheckoutError,
  logCheckoutEvent,
  logCheckoutWarning,
  resolveRequestId,
} from '@/lib/observability/checkout-logger';
import '@/services/notification.service';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req.headers);
  const startedAt = Date.now();
  let txRef: string | null = null;

  try {
    const url = new URL(req.url);
    txRef =
      url.searchParams.get('reference') ||
      url.searchParams.get('trxref') ||
      url.searchParams.get('tx_ref');

    if (!txRef) {
      logCheckoutWarning({
        requestId,
        stage: 'payment_verify',
        event: 'payment_verify.missing_reference',
        reasonCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
      const res = NextResponse.json(
        { success: false, error: 'Transaction reference is required', reasonCode: 'VALIDATION_ERROR', requestId },
        { status: 400 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const supabase = getServiceSupabaseClient();

    // 1. Locate payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_reference', txRef.trim())
      .maybeSingle();

    if (payErr || !payment) {
      logCheckoutWarning({
        requestId,
        stage: 'payment_verify',
        event: 'payment_verify.payment_not_found',
        reasonCode: 'NOT_FOUND',
        reference: txRef.trim(),
        statusCode: 404,
      });
      const res = NextResponse.json(
        { success: false, error: `Payment record not found for reference ${txRef}`, reasonCode: 'NOT_FOUND', requestId },
        { status: 404 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    // 2. Fetch associated order
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, total, status, customer_id, organization_id, discount_id')
      .eq('id', payment.order_id)
      .maybeSingle();

    if (!order) {
      logCheckoutWarning({
        requestId,
        stage: 'payment_verify',
        event: 'payment_verify.order_not_found',
        reasonCode: 'NOT_FOUND',
        paymentId: payment.id,
        reference: txRef.trim(),
        statusCode: 404,
      });
      const res = NextResponse.json(
        { success: false, error: 'Associated order not found', reasonCode: 'NOT_FOUND', requestId },
        { status: 404 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    let customerEmail = 'guest@order.internal';
    if (order.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('email')
        .eq('id', order.customer_id)
        .maybeSingle();
      if (cust?.email) customerEmail = cust.email;
    }
    const orderToken = generateOrderAccessToken(order.order_number, customerEmail);

    // 3. If payment is already marked successful, return immediately
    if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
      const res = NextResponse.json(
        {
          success: true,
          requestId,
          orderNumber: order.order_number,
          orderStatus: order.status,
          paymentStatus: payment.status,
          totalAmount: order.total || payment.amount,
          currency: payment.currency || CURRENCY.NGN,
          token: orderToken,
          verified: true,
        },
        { status: 200 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    // 4. Verify transaction with the historical payment's provider API directly
    const provider = getPaymentProvider(payment.provider);
    const verifiedTx = await provider.verifyTransaction(txRef);

    const amountMatches = Math.abs(verifiedTx.amount - payment.amount) < 0.01;
    const currencyMatches = verifiedTx.currency.toUpperCase() === CURRENCY.NGN;

    if (verifiedTx.status === 'successful' && amountMatches && currencyMatches) {
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

      logCheckoutEvent({
        requestId,
        stage: 'payment_verify',
        event: 'payment_verify.succeeded',
        orderId: order.id,
        orderNumber: fulfillment.orderNumber,
        paymentId: payment.id,
        provider: payment.provider,
        reference: txRef,
        durationMs: Date.now() - startedAt,
        statusCode: 200,
      });

      const res = NextResponse.json(
        {
          success: true,
          requestId,
          orderNumber: fulfillment.orderNumber,
          orderStatus: fulfillment.orderStatus,
          paymentStatus: fulfillment.paymentStatus,
          totalAmount: order.total || payment.amount,
          currency: payment.currency || CURRENCY.NGN,
          token: orderToken,
          verified: true,
        },
        { status: 200 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const reasonCode =
      verifiedTx.status !== 'successful'
        ? classifyPaymentStatusReason(verifiedTx.status)
        : !amountMatches
        ? 'AMOUNT_MISMATCH'
        : 'CURRENCY_MISMATCH';

    logCheckoutWarning({
      requestId,
      stage: 'payment_verify',
      event: 'payment_verify.not_verified',
      reasonCode,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentId: payment.id,
      provider: payment.provider,
      reference: txRef,
      durationMs: Date.now() - startedAt,
      statusCode: 200,
      metadata: {
        providerStatus: verifiedTx.status,
        expectedAmount: payment.amount,
        verifiedAmount: verifiedTx.amount,
        verifiedCurrency: verifiedTx.currency,
      },
    });

    const res = NextResponse.json(
      {
        success: true,
        requestId,
        orderNumber: order.order_number,
        orderStatus: order.status,
        paymentStatus: payment.status,
        paymentReasonCode: reasonCode,
        totalAmount: order.total || payment.amount,
        currency: payment.currency || CURRENCY.NGN,
        token: orderToken,
        verified: false,
      },
      { status: 200 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error verifying payment callback';
    const reasonCode = classifyCheckoutReasonCode(error, 'PAYMENT_VERIFICATION_FAILED');
    logCheckoutError(error, {
      requestId,
      stage: 'payment_verify',
      event: 'payment_verify.failed',
      reasonCode,
      reference: txRef || undefined,
      durationMs: Date.now() - startedAt,
      statusCode: 500,
    });
    const res = NextResponse.json(
      { success: false, error: message, reasonCode, requestId },
      { status: 500 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }
}
