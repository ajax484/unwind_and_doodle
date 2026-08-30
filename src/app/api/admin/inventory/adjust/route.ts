import { NextRequest, NextResponse } from 'next/server';
import { StockAdjustmentSchema } from '@/types/admin-inventory';
import { adjustInventoryStock } from '@/services/admin-inventory.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const rawBody = await req.json();
    const parseResult = StockAdjustmentSchema.safeParse(rawBody);

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

    const result = await adjustInventoryStock(
      supabase,
      parseResult.data,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error adjusting inventory';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isBadRequest = errorMessage.includes('rejected') || errorMessage.includes('negative');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : isBadRequest ? 400 : 500 }
    );
  }
}
