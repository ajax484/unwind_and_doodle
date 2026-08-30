import { NextRequest, NextResponse } from 'next/server';
import { UpdateProductAddonSchema } from '@/types/admin-product';
import { updateProductAddon, removeProductAddon } from '@/services/admin-product.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: parentProductId, addonId } = await params;
    if (!parentProductId || !addonId) {
      return NextResponse.json(
        { success: false, error: 'Parent product ID and Addon ID are required' },
        { status: 400 }
      );
    }

    const rawBody = await req.json();
    const parseResult = UpdateProductAddonSchema.safeParse(rawBody);

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

    const updated = await updateProductAddon(
      supabase,
      parentProductId,
      addonId,
      parseResult.data,
      adminContext.organization.id,
      adminContext.user.id
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating add-on';
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: parentProductId, addonId } = await params;
    if (!parentProductId || !addonId) {
      return NextResponse.json(
        { success: false, error: 'Parent product ID and Addon ID are required' },
        { status: 400 }
      );
    }

    const result = await removeProductAddon(
      supabase,
      parentProductId,
      addonId,
      adminContext.organization.id,
      adminContext.user.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error removing add-on';
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
