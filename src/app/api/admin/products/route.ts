import { NextRequest, NextResponse } from 'next/server';
import { AdminProductFilterSchema, CreateProductSchema } from '@/types/admin-product';
import { listAdminProducts, createAdminProduct } from '@/services/admin-product.service';
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
      product_type: url.searchParams.get('product_type') || undefined,
      categoryId: url.searchParams.get('categoryId') || undefined,
      organizationId: adminContext.organization.id,
      sortBy: url.searchParams.get('sortBy') || 'newest',
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    };

    const parseResult = AdminProductFilterSchema.safeParse(rawFilters);
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

    const data = await listAdminProducts(supabase, {
      ...parseResult.data,
      organizationId: adminContext.organization.id,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    console.error('[GET /api/admin/products error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error fetching products';
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
    const parseResult = CreateProductSchema.safeParse(rawBody);

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

    const product = await createAdminProduct(
      supabase,
      parseResult.data,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating product';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isDuplicate = errorMessage.includes('already exists');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : isDuplicate ? 409 : 500 }
    );
  }
}
