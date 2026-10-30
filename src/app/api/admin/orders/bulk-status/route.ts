import { NextRequest, NextResponse } from 'next/server';
import { BulkUpdateOrderStatusSchema } from '@/types/admin-order';
import { bulkUpdateOrderStatus } from '@/services/admin-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { OrderStatus } from '@/lib/supabase/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization & Tenant Guard
    const adminContext = await getAuthenticatedAdmin(req);

    const rawBody = await req.json();
    const parseResult = BulkUpdateOrderStatusSchema.safeParse(rawBody);

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

    const result = await bulkUpdateOrderStatus(supabase, {
      orderIds: parseResult.data.orderIds,
      targetStatus: parseResult.data.targetStatus as OrderStatus,
      note: parseResult.data.note,
      organizationId: adminContext.organization.id,
      userId: adminContext.user.id,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error bulk updating order status';
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

