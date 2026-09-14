import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { deleteAdminProductMedia } from '@/services/admin-product.service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: productId, mediaId } = await params;
    if (!productId || !mediaId) {
      return NextResponse.json(
        { success: false, error: 'Product ID and Media ID are required' },
        { status: 400 }
      );
    }

    const result = await deleteAdminProductMedia(
      supabase,
      productId,
      mediaId,
      adminContext.organization.id
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Media deleted successfully',
        warning: result.storageDeleteFailed ? 'Database record removed, but storage object deletion failed.' : undefined,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting product media';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isNotFound = errorMessage.includes('not found');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : isNotFound ? 404 : 500 }
    );
  }
}
