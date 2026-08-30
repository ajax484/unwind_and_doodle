import { NextRequest, NextResponse } from 'next/server';
import { duplicateAdminBundle } from '@/services/admin-bundle.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: bundleId } = await params;
    if (!bundleId) {
      return NextResponse.json(
        { success: false, error: 'Bundle ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const overrides = {
      name: body.name,
      slug: body.slug,
      sku: body.sku,
    };

    const duplicated = await duplicateAdminBundle(
      supabase,
      bundleId,
      adminContext.user.id,
      adminContext.organization.id,
      overrides
    );

    return NextResponse.json({ success: true, data: duplicated }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error duplicating bundle product';
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
