import { NextRequest, NextResponse } from 'next/server';
import { UpdateLocationSchema } from '@/types/admin-inventory';
import { updateLocation } from '@/services/admin-warehouse.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { locationId } = await params;
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const rawBody = await req.json();
    const parseResult = UpdateLocationSchema.safeParse(rawBody);

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

    const updated = await updateLocation(
      supabase,
      locationId,
      parseResult.data,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating location';
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
