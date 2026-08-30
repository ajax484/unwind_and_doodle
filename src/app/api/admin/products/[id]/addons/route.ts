import { NextRequest, NextResponse } from 'next/server';
import { ProductAddonSchema } from '@/types/admin-product';
import { addProductAddon } from '@/services/admin-product.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: parentProductId } = await params;
    if (!parentProductId) {
      return NextResponse.json(
        { success: false, error: 'Parent product ID is required' },
        { status: 400 }
      );
    }

    const rawBody = await req.json();
    const parseResult = ProductAddonSchema.safeParse(rawBody);

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

    const result = await addProductAddon(
      supabase,
      parentProductId,
      parseResult.data,
      adminContext.organization.id,
      adminContext.user.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error adding add-on';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isSelfSelection = errorMessage.includes('cannot be attached as an add-on to itself');
    const isDuplicate = errorMessage.includes('already linked');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : isSelfSelection || isDuplicate ? 400 : 500 }
    );
  }
}
