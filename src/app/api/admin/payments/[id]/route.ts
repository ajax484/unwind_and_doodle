import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getAdminPaymentDetail } from '@/services/payment-management.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization Guard
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: paymentId } = await params;
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const data = await getAdminPaymentDetail(
      supabase,
      paymentId,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error fetching payment detail';
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
