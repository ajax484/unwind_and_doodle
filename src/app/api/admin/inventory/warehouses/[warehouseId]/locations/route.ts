import { NextRequest, NextResponse } from 'next/server';
import {
  assignWarehouseLocations,
  unassignWarehouseLocation,
} from '@/services/admin-warehouse.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { warehouseId } = await params;
    const body = await req.json();
    const locationIds = body?.locationIds;

    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Array of location IDs is required' },
        { status: 400 }
      );
    }

    const result = await assignWarehouseLocations(
      supabase,
      warehouseId,
      locationIds,
      adminContext.organization.id,
      adminContext.user.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error assigning locations';
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { warehouseId } = await params;
    const url = new URL(req.url);
    const locationId = url.searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const result = await unassignWarehouseLocation(
      supabase,
      warehouseId,
      locationId,
      adminContext.organization.id,
      adminContext.user.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error unassigning location';
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
