import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { requirePermission } from '@/services/permission.service';
import {
  getAnalyticsOverview,
  getAnalyticsSalesSeries,
  getAnalyticsProducts,
  getAnalyticsCustomers,
  getAnalyticsInventory,
  getAnalyticsCheckout,
} from '@/services/analytics.service';
import { resolveAnalyticsDateRange, getAdaptiveInterval } from '@/lib/date-utils';
import { AnalyticsDateRangePreset } from '@/types/analytics';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    
    // 1. Authenticate admin user & resolve organization
    const adminContext = await getAuthenticatedAdmin(req);

    // 2. Authorize via Teams & Permissions RBAC
    requirePermission(adminContext, 'analytics.read');

    const organizationId = adminContext.organization.id;

    // 3. Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || searchParams.get('tab') || 'overview';
    const preset = (searchParams.get('preset') as AnalyticsDateRangePreset) || 'last_30_days';
    const customFrom = searchParams.get('from') || undefined;
    const customTo = searchParams.get('to') || undefined;

    // 4. Resolve date boundaries
    const dateRange = resolveAnalyticsDateRange(preset, customFrom, customTo);
    const requestedGranularity = searchParams.get('granularity') as 'day' | 'week' | 'month' | null;
    const granularity = requestedGranularity || getAdaptiveInterval(dateRange.from, dateRange.to);

    const queryOptions = {
      organizationId,
      range: dateRange,
      granularity,
    };

    let data: unknown;

    switch (type) {
      case 'overview':
        data = await getAnalyticsOverview(supabase, queryOptions);
        break;

      case 'series':
        data = await getAnalyticsSalesSeries(supabase, queryOptions);
        break;

      case 'products':
        data = await getAnalyticsProducts(supabase, queryOptions);
        break;

      case 'customers':
        data = await getAnalyticsCustomers(supabase, queryOptions);
        break;

      case 'inventory':
        data = await getAnalyticsInventory(supabase, queryOptions);
        break;

      case 'checkout':
        data = await getAnalyticsCheckout(supabase, queryOptions);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Invalid analytics type '${type}'` },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        data,
        range: dateRange,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching analytics data';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('privileges') ||
      errorMessage.includes('Unauthorized');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}
