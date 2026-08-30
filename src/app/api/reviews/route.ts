import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { submitReview, getProductReviews, getCustomerReviews } from '@/services/review.service';
import { z } from 'zod';

const SubmitReviewSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(150).optional().nullable(),
  body: z.string().max(2000).optional().nullable(),
  images: z
    .array(
      z.object({
        storagePath: z.string().min(1),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .max(5)
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You must be logged in to leave a review' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = SubmitReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid review submission' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const review = await submitReview(
      supabase,
      authContext.customer.id,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Thank you! Your review has been submitted for moderation.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit review';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const myReviews = searchParams.get('mine') === 'true';

    const supabase = getServiceSupabaseClient();

    if (myReviews) {
      const authContext = await getAuthenticatedCustomer(req);
      if (!authContext) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      const reviews = await getCustomerReviews(supabase, authContext.customer.id);
      return NextResponse.json({ success: true, data: reviews });
    }

    if (productId) {
      const reviews = await getProductReviews(supabase, productId);
      return NextResponse.json({ success: true, data: reviews });
    }

    return NextResponse.json(
      { success: false, error: 'productId or mine=true parameter is required' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch reviews';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
