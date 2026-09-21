import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { verifyOrderAccessToken } from '@/lib/order-token';
import { getPaymentRetryEligibility, retryPayment, PaymentProviderName } from '@/services/payment';

export async function GET(
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

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || req.headers.get('x-order-token');
    const authContext = await getAuthenticatedCustomer(req);

    const eligibility = await getPaymentRetryEligibility(supabase, orderNumber, {
      customerId: authContext?.customer.id || null,
      customerEmail: authContext?.customer.email || null,
      token: token || null,
    });

    if (!eligibility.eligible && eligibility.errorCode === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!eligibility.eligible && eligibility.errorCode === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: eligibility.reason, requiresVerification: true },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: eligibility,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error checking retry eligibility';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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

    const body = await req.json().catch(() => ({}));
    const paymentMethod = body.paymentMethod as PaymentProviderName;
    const callbackUrl = body.callbackUrl as string | undefined;

    if (!paymentMethod || !['paystack', 'flutterwave', 'manual'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing payment method' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || body.token || req.headers.get('x-order-token');
    const authContext = await getAuthenticatedCustomer(req);

    // Verify access token if guest
    if (token) {
      const verification = verifyOrderAccessToken(token, orderNumber);
      if (!verification.valid && !authContext) {
        return NextResponse.json(
          { success: false, error: 'Invalid order access token' },
          { status: 401 }
        );
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

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error retrying payment';
    const isClientError =
      message.includes('not available') ||
      message.includes('already been successfully paid') ||
      message.includes('cancelled') ||
      message.includes('eligible') ||
      message.includes('permission');

    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
