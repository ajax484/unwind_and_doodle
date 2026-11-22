import { NextRequest, NextResponse } from 'next/server';
import { BulkUpdateProductsSchema } from '@/types/admin-product';
import { bulkUpdateAdminProducts } from '@/services/admin-product.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { revalidateStorefrontCatalog } from '@/lib/cache-revalidation';

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const body = await req.json();
    const parsed = BulkUpdateProductsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid bulk update payload',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await bulkUpdateAdminProducts(
      supabase,
      parsed.data,
      adminContext.user.id,
      adminContext.organization.id
    );

    revalidateStorefrontCatalog();

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bulk update failed';
    const isAuth =
      message.includes('Forbidden') ||
      message.includes('Authentication required') ||
      message.includes('unauthorized') ||
      message.includes('privileges');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}
