import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { processEmailWebhook } from '@/services/marketing-webhook.service';

/**
 * Endpoint for receiving email provider webhook delivery lifecycle events.
 *
 * Enforces cryptographic signature verification before payload processing.
 * Normalizes provider events, updates recipient status with non-regressing
 * lifecycle rules, records marketing_email_events, and syncs unsubscribes.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers = req.headers;

    const supabase = getServiceSupabaseClient();

    const result = await processEmailWebhook({
      supabase,
      rawBody,
      headers,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error processing email webhook';

    const isSignatureError = errorMessage.includes('Invalid email webhook signature');
    const isMalformedJson = errorMessage.includes('Malformed webhook JSON payload');

    if (isSignatureError) {
      console.warn('[email_webhook.signature_rejected]', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid webhook signature' },
        { status: 401 }
      );
    }

    if (isMalformedJson) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: Malformed webhook payload' },
        { status: 400 }
      );
    }

    console.error('[email_webhook.internal_error]', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}
