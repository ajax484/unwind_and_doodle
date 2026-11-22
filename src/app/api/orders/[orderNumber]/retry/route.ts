import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { verifyOrderAccessToken } from '@/lib/order-token';
import { getPaymentRetryEligibility, retryPayment, PaymentProviderName } from '@/services/payment';
import {
  classifyCheckoutReasonCode,
  logCheckoutError,
  logCheckoutEvent,
  logCheckoutWarning,
  resolveRequestId,
} from '@/lib/observability/checkout-logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const requestId = resolveRequestId(req.headers);
  try {
    const supabase = getServiceSupabaseClient();
    const { orderNumber } = await params;

    if (!orderNumber) {
      const res = NextResponse.json(
        { success: false, error: 'Order number is required', requestId },
        { status: 400 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || req.headers.get('x-order-token');
    const authContext = await getAuthenticatedCustomer(req);

    const eligibility = await getPaymentRetryEligibility(supabase, orderNumber, {
      customerId: authContext?.customer.id || null,
      customerEmail: authContext?.customer.email || null,
      token: token || null,
    });

    if (!eligibility.eligible && eligibility.errorCode === 'ORDER_NOT_FOUND') {
      const res = NextResponse.json(
        { success: false, error: 'Order not found', reasonCode: 'NOT_FOUND', requestId },
        { status: 404 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    if (!eligibility.eligible && eligibility.errorCode === 'UNAUTHORIZED') {
      const res = NextResponse.json(
        { success: false, error: eligibility.reason, reasonCode: 'UNAUTHORIZED', requestId, requiresVerification: true },
        { status: 401 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const res = NextResponse.json(
      {
        success: true,
        requestId,
        data: eligibility,
      },
      { status: 200 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error checking retry eligibility';
    const reasonCode = classifyCheckoutReasonCode(error, 'PAYMENT_VERIFICATION_FAILED');
    logCheckoutError(error, {
      requestId,
      stage: 'payment_retry',
      event: 'payment_retry.eligibility_failed',
      reasonCode,
      statusCode: 500,
    });
    const res = NextResponse.json({ success: false, error: message, reasonCode, requestId }, { status: 500 });
    res.headers.set('x-request-id', requestId);
    return res;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const requestId = resolveRequestId(req.headers);
  const startedAt = Date.now();
  let orderNumber: string | undefined;
  let paymentMethod: PaymentProviderName | undefined;

  try {
    const supabase = getServiceSupabaseClient();
    ({ orderNumber } = await params);

    if (!orderNumber) {
      const res = NextResponse.json(
        { success: false, error: 'Order number is required', reasonCode: 'VALIDATION_ERROR', requestId },
        { status: 400 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const body = await req.json().catch(() => ({}));
    paymentMethod = body.paymentMethod as PaymentProviderName;
    const callbackUrl = body.callbackUrl as string | undefined;

    if (!paymentMethod || !['paystack', 'flutterwave', 'manual'].includes(paymentMethod)) {
      logCheckoutWarning({
        requestId,
        stage: 'payment_retry',
        event: 'payment_retry.invalid_method',
        reasonCode: 'VALIDATION_ERROR',
        orderNumber,
        statusCode: 400,
      });
      const res = NextResponse.json(
        { success: false, error: 'Invalid or missing payment method', reasonCode: 'VALIDATION_ERROR', requestId },
        { status: 400 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || body.token || req.headers.get('x-order-token');
    const authContext = await getAuthenticatedCustomer(req);

    // Verify access token if guest
    if (token) {
      const verification = verifyOrderAccessToken(token, orderNumber);
      if (!verification.valid && !authContext) {
        logCheckoutWarning({
          requestId,
          stage: 'payment_retry',
          event: 'payment_retry.invalid_token',
          reasonCode: 'UNAUTHORIZED',
          orderNumber,
          statusCode: 401,
        });
        const res = NextResponse.json(
          { success: false, error: 'Invalid order access token', reasonCode: 'UNAUTHORIZED', requestId },
          { status: 401 }
        );
        res.headers.set('x-request-id', requestId);
        return res;
      }
    }

    const result = await retryPayment({
      supabase,
      orderIdentifier: orderNumber,
      paymentMethod,
      callbackUrl,
      customerContext: {
        customerId: authContext?.customer.id || null,
        customerEmail: authContext?.customer.email || null,
        token: token || null,
      },
    });

    logCheckoutEvent({
      requestId,
      stage: 'payment_retry',
      event: 'payment_retry.succeeded',
      orderNumber,
      provider: paymentMethod,
      durationMs: Date.now() - startedAt,
      statusCode: 200,
    });

    const res = NextResponse.json(
      {
        success: true,
        requestId,
        data: result,
      },
      { status: 200 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error retrying payment';
    const isClientError =
      message.includes('not available') ||
      message.includes('already been successfully paid') ||
      message.includes('cancelled') ||
      message.includes('eligible') ||
      message.includes('permission');
    const reasonCode = classifyCheckoutReasonCode(error, 'PAYMENT_INIT_FAILED');

    logCheckoutError(
      error,
      {
        requestId,
        stage: 'payment_retry',
        event: 'payment_retry.failed',
        reasonCode,
        orderNumber,
        provider: paymentMethod,
        durationMs: Date.now() - startedAt,
        statusCode: isClientError ? 400 : 500,
      },
      { level: isClientError ? 'warning' : 'error' }
    );

    const res = NextResponse.json(
      { success: false, error: message, reasonCode, requestId },
      { status: isClientError ? 400 : 500 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }
}
