import { NextRequest, NextResponse } from 'next/server';
import { createAdminManualOrder } from '@/services/manual-order.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const body = await req.json();

    const result = await createAdminManualOrder(
      supabase,
      body,
      adminContext.user.id,
      adminContext.organization.id,
      req.nextUrl.origin
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating manual order';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');
    const isValidationError =
      errorMessage.includes('required') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('Insufficient');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : isValidationError ? 400 : 500 }
    );
  }
}
