import { NextRequest, NextResponse } from 'next/server';
import { createManualPaymentAttemptForOrder } from '@/services/manual-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);
    const { id: orderId } = await params;

    const body = await req.json().catch(() => ({}));

    const result = await createManualPaymentAttemptForOrder(
      supabase,
      orderId,
      {
        userId: adminContext.user.id,
        organizationId: adminContext.organization.id,
        role: adminContext.membership.role,
        userEmail: adminContext.user.email,
      },
      {
        note: body.note,
        alreadyPaid: Boolean(body.alreadyPaid),
      }
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating manual payment attempt';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isValidationError =
      errorMessage.includes('required') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('Cannot') ||
      errorMessage.includes('not enabled');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : isValidationError ? 400 : 500 }
    );
  }
}
