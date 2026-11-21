import { NextRequest, NextResponse } from 'next/server';
import { ReorderCategoriesSchema } from '@/types/admin-product';
import { reorderCategories } from '@/services/admin-product.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { revalidateStorefrontCatalog } from '@/lib/cache-revalidation';

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const rawBody = await req.json();
    const parseResult = ReorderCategoriesSchema.safeParse(rawBody);

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

    const result = await reorderCategories(
      supabase,
      adminContext.organization.id,
      parseResult.data.orderedIds
    );

    revalidateStorefrontCatalog();

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error reordering categories';
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
