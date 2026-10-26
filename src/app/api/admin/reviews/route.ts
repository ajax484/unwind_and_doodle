import { NextRequest, NextResponse } from 'next/server';
import { AdminReviewFilterSchema, CreateManualReviewSchema } from '@/types/admin-review-customization';
import { listAdminReviews, createManualReview } from '@/services/admin-review.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const url = new URL(req.url);
    const rawFilters = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      rating: url.searchParams.get('rating') || undefined,
      productId: url.searchParams.get('productId') || undefined,
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    };

    const parseResult = AdminReviewFilterSchema.safeParse(rawFilters);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filter parameters',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = await listAdminReviews(supabase, {
      ...parseResult.data,
      organizationId: adminContext.organization.id,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching reviews';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const rawBody = await req.json();
    const parseResult = CreateManualReviewSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid review payload',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const review = await createManualReview(
      supabase,
      parseResult.data,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json(
      {
        success: true,
        data: review,
        message: 'Review created successfully',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating manual review';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 400 }
    );
  }
}
