import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/services/webhook.service';
import { getPaymentProvider } from '@/services/payment';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { captureError, recordBreadcrumb } from '@/lib/observability/error-monitoring';

export async function POST(req: NextRequest) {
  try {
    recordBreadcrumb({
      category: 'webhook',
      message: 'Received Flutterwave webhook request',
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
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error processing Flutterwave webhook';
    console.error('Flutterwave webhook error:', errorMessage);

    const isClientError =
      errorMessage.includes('Invalid') ||
      errorMessage.includes('mismatch') ||
      errorMessage.includes('Payment not found');

    captureError(error, {
      tags: { operation: 'webhook.flutterwave', isClientError },
      level: isClientError ? 'warning' : 'error',
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: isClientError ? 400 : 500 }
    );
  }
}
