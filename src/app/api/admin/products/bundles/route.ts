import { NextRequest, NextResponse } from 'next/server';
import { AdminBundleFilterSchema, CreateBundleSchema } from '@/types/admin-bundle';
import { listAdminBundles, createAdminBundle } from '@/services/admin-bundle.service';
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
      categoryId: url.searchParams.get('categoryId') || undefined,
      organizationId: adminContext.organization.id,
      sortBy: url.searchParams.get('sortBy') || 'newest',
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    };

    const parseResult = AdminBundleFilterSchema.safeParse(rawFilters);
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

    const data = await listAdminBundles(supabase, {
      ...parseResult.data,
      organizationId: adminContext.organization.id,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    console.error('[GET /api/admin/products/bundles error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error fetching bundle products';
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
    const parseResult = CreateBundleSchema.safeParse(rawBody);

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

    const bundle = await createAdminBundle(
      supabase,
      parseResult.data,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: bundle }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating bundle product';
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
