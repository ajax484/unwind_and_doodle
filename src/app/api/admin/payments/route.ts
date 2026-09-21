import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { listAdminPayments } from '@/services/payment-management.service';
import { AdminPaymentFilterSchema } from '@/types/payment-management';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authorization Guard
    const adminContext = await getAuthenticatedAdmin(req);

    // 2. Parse query parameters
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    const parseResult = AdminPaymentFilterSchema.safeParse(searchParams);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query filters',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const filters = parseResult.data;

    // 3. Query payments for organization
    const data = await listAdminPayments(supabase, {
      ...filters,
      organizationId: adminContext.organization.id,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error fetching payments';
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
