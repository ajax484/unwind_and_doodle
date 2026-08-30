import { NextRequest, NextResponse } from 'next/server';
import { CheckoutRequestSchema } from '@/types/checkout';
import { processCheckout } from '@/services/checkout.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = CheckoutRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const result = await processCheckout({
      supabase,
      request: parseResult.data,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during checkout';
    console.error('Checkout processing error:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 400 }
    );
  }
}
