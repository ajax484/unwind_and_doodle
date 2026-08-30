import { NextRequest, NextResponse } from 'next/server';
import { AdminCustomerFilterSchema } from '@/types/admin-customer';
import { exportAdminCustomersCsv } from '@/services/admin-customer.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const url = new URL(req.url);
    const rawFilters = {
      search: url.searchParams.get('search') || undefined,
      accountType: url.searchParams.get('accountType') || undefined,
      marketingConsent: url.searchParams.get('marketingConsent') || undefined,
      orderActivity: url.searchParams.get('orderActivity') || undefined,
    };

    const parseResult = AdminCustomerFilterSchema.safeParse(rawFilters);
    const filters = parseResult.success ? parseResult.data : {};

    const csvData = await exportAdminCustomersCsv(
      supabase,
      adminContext.organization.id,
      adminContext.user.id,
      filters
    );

    const filename = `customers-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error exporting customers';
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
