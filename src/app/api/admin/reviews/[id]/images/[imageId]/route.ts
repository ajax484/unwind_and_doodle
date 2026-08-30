import { NextRequest, NextResponse } from 'next/server';
import { deleteReviewImage } from '@/services/admin-review.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: reviewId, imageId } = await params;
    if (!reviewId || !imageId) {
      return NextResponse.json(
        { success: false, error: 'Review ID and Image ID are required' },
        { status: 400 }
      );
    }

    const result = await deleteReviewImage(
      supabase,
      reviewId,
      imageId,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting review image';
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
