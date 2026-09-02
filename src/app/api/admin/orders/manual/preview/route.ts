import { NextRequest, NextResponse } from 'next/server';
import { previewManualOrderPricing } from '@/services/manual-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            subtotal: 0,
            addOnsTotal: 0,
            discountTotal: 0,
            deliveryFee: 0,
            total: 0,
            currency: 'NGN',
            itemBreakdowns: [],
          },
        },
        { status: 200 }
      );
    }

    const preview = await previewManualOrderPricing(supabase, {
      items: body.items,
      locationId: body.locationId,
      warehouseId: body.warehouseId,
      discountCode: body.discountCode,
      manualDiscount: body.manualDiscount,
      organizationId: adminContext.organization.id,
    });

    return NextResponse.json({ success: true, data: preview }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error calculating manual order preview';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 400 }
    );
  }
}
