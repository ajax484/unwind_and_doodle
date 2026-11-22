import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/services/webhook.service';
import { getPaymentProvider } from '@/services/payment';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  classifyCheckoutReasonCode,
  logCheckoutError,
  logCheckoutEvent,
  resolveRequestId,
} from '@/lib/observability/checkout-logger';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req.headers);
  const startedAt = Date.now();

  try {
    logCheckoutEvent({
      requestId,
      stage: 'webhook',
      event: 'webhook.received',
      provider: 'flutterwave',
    });

    const rawBody = await req.text();
    const headers = req.headers;

    const supabase = getServiceSupabaseClient();
    const flutterwaveProvider = getPaymentProvider('flutterwave');

    const result = await processPaymentWebhook({
      supabase,
      rawBody,
      headers,
      paymentProvider: flutterwaveProvider,
      requestId,
    });

    logCheckoutEvent({
      requestId,
      stage: 'webhook',
      event: 'webhook.processed',
      provider: 'flutterwave',
      orderId: result.orderId,
      paymentId: result.paymentId,
      durationMs: Date.now() - startedAt,
      statusCode: 200,
      metadata: { alreadyProcessed: Boolean(result.alreadyProcessed) },
    });

    const res = NextResponse.json({ ...result, requestId }, { status: 200 });
    res.headers.set('x-request-id', requestId);
    return res;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error processing Flutterwave webhook';

    const isClientError =
      errorMessage.includes('Invalid') ||
      errorMessage.includes('mismatch') ||
      errorMessage.includes('Payment not found');
    const reasonCode = classifyCheckoutReasonCode(error, 'PAYMENT_VERIFICATION_FAILED');

    logCheckoutError(
      error,
      {
        requestId,
        stage: 'webhook',
        event: 'webhook.failed',
        reasonCode,
        provider: 'flutterwave',
        durationMs: Date.now() - startedAt,
        statusCode: isClientError ? 400 : 500,
      },
      { level: isClientError ? 'warning' : 'error' }
    );

    const res = NextResponse.json(
      {
        success: false,
        error: errorMessage,
        reasonCode,
        requestId,
      },
      { status: isClientError ? 400 : 500 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }
}
