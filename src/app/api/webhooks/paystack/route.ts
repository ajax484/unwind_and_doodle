import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/services/webhook.service';
import { PaystackPaymentProvider } from '@/services/paystack.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers = req.headers;

    const supabase = getServiceSupabaseClient();
    const paystackProvider = new PaystackPaymentProvider();

    const result = await processPaymentWebhook({
      supabase,
      rawBody,
      headers,
      paymentProvider: paystackProvider,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error processing Paystack webhook';
    console.error('Paystack webhook error:', errorMessage);

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
