import { NextRequest, NextResponse } from 'next/server';
import { UploadProcessedAssetSchema } from '@/types/admin-review-customization';
import { setProcessedAsset } from '@/services/admin-customization.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: customizationId, assetId } = await params;
    if (!customizationId || !assetId) {
      return NextResponse.json(
        { success: false, error: 'Customization ID and Asset ID are required' },
        { status: 400 }
      );
    }

    const rawBody = await req.json();
    const parseResult = UploadProcessedAssetSchema.safeParse(rawBody);

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

    const updatedAsset = await setProcessedAsset(
      supabase,
      customizationId,
      assetId,
      parseResult.data,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: updatedAsset }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error setting processed asset';
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
