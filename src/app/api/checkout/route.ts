import { NextRequest, NextResponse } from 'next/server';
import { CheckoutRequestSchema } from '@/types/checkout';
import { processCheckout } from '@/services/checkout.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  classifyCheckoutReasonCode,
  logCheckoutError,
  logCheckoutEvent,
  logCheckoutWarning,
  resolveRequestId,
} from '@/lib/observability/checkout-logger';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req.headers);
  const startedAt = Date.now();

  try {
    const rawBody = await req.json();
    const parseResult = CheckoutRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const details = parseResult.error.flatten().fieldErrors;
      logCheckoutWarning({
        requestId,
        stage: 'checkout',
        event: 'checkout.validation_failed',
        reasonCode: 'VALIDATION_ERROR',
        statusCode: 400,
        durationMs: Date.now() - startedAt,
        metadata: { invalidFields: Object.keys(details) },
      });

      const res = NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          reasonCode: 'VALIDATION_ERROR',
          requestId,
          details,
        },
        { status: 400 }
      );
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const supabase = getServiceSupabaseClient();
    const result = await processCheckout({
      supabase,
      request: parseResult.data,
      requestId,
    });

    logCheckoutEvent({
      requestId,
      stage: 'checkout',
      event: 'checkout.completed',
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      paymentId: result.paymentId,
      provider: result.provider,
      reference: result.paymentReference,
      statusCode: 201,
      durationMs: Date.now() - startedAt,
    });

    const res = NextResponse.json(
      {
        success: true,
        requestId,
        data: result,
      },
      { status: 201 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during checkout';
    const reasonCode = classifyCheckoutReasonCode(error, 'ORDER_CREATION_FAILED');

    logCheckoutError(error, {
      requestId,
      stage: 'checkout',
      event: 'checkout.failed',
      reasonCode,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });

    const res = NextResponse.json(
      {
        success: false,
        error: errorMessage,
        reasonCode,
        requestId,
      },
      { status: 400 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }
}
