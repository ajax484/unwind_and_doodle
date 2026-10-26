import { NextRequest, NextResponse } from 'next/server';
import { requestOrderReview } from '@/services/admin-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization guard
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const result = await requestOrderReview(
      supabase,
      orderId,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error sending review request';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isNotFound = errorMessage.includes('not found');
    const isBadRequest =
      errorMessage.includes('already sent') ||
      errorMessage.includes('received orders') ||
      errorMessage.includes('email address');

    const status = isAuthError ? 403 : isNotFound ? 404 : isBadRequest ? 400 : 500;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}
