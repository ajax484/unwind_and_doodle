import { NextRequest, NextResponse } from 'next/server';
import { getPaymentMethods, updatePaymentMethod } from '@/services/payment-settings.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { updatePaymentMethodSchema } from '@/types/payment-settings';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const methods = await getPaymentMethods(supabase, adminContext.organization.id);
    return NextResponse.json({ success: true, data: methods }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching payment methods';
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

export async function PUT(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const role = adminContext.membership.role?.toLowerCase();
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only owners and admins can update payment settings' },
        { status: 403 }
      );
    }

    const rawBody = await req.json();
    const parseResult = updatePaymentMethodSchema.safeParse(rawBody);

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

    const updated = await updatePaymentMethod(
      supabase,
      adminContext.organization.id,
      parseResult.data,
      adminContext.user.id
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating payment method';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');

    const isValidationError =
      errorMessage.includes('at least one payment method') ||
      errorMessage.includes('Bank name, account name, and account number are required');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : isValidationError ? 400 : 500 }
    );
  }
}
