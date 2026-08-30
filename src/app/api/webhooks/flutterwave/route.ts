import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/services/webhook.service';
import { FlutterwavePaymentProvider } from '@/services/payment/flutterwave.provider';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers = req.headers;

    const supabase = getServiceSupabaseClient();
    const flutterwaveProvider = new FlutterwavePaymentProvider();

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

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: isClientError ? 400 : 500 }
    );
  }
}
