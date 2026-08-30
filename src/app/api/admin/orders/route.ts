import { NextRequest, NextResponse } from 'next/server';
import { AdminOrderFilterSchema } from '@/types/admin-order';
import { listAdminOrders } from '@/services/admin-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization & Tenant Context Guard
    const adminContext = await getAuthenticatedAdmin(req);

    // 2. Parse query parameters
    const url = new URL(req.url);
    const rawFilters = {
      status: url.searchParams.get('status') || undefined,
      paymentStatus: url.searchParams.get('paymentStatus') || undefined,
      warehouseId: url.searchParams.get('warehouseId') || undefined,
      locationId: url.searchParams.get('locationId') || undefined,
      organizationId: adminContext.organization.id,
      search: url.searchParams.get('search') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      sortBy: url.searchParams.get('sortBy') || 'newest',
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    };

    const parseResult = AdminOrderFilterSchema.safeParse(rawFilters);
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

    const data = await listAdminOrders(supabase, {
      ...parseResult.data,
      organizationId: adminContext.organization.id,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching admin orders';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('authorization') ||
      errorMessage.includes('privileges') ||
      errorMessage.includes('Unauthorized');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}
