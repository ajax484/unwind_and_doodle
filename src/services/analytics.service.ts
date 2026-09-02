import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import {
  AnalyticsDateRange,
  AnalyticsOverviewData,
  SalesSeriesPoint,
  ProductAnalyticsData,
  CustomerAnalyticsData,
  InventoryAnalyticsData,
  CheckoutAnalyticsData,
} from '../types/analytics';

export interface AnalyticsQueryOptions {
  organizationId: string;
  range: AnalyticsDateRange;
  granularity?: 'day' | 'week' | 'month';
}

/**
 * Fetches high-level executive analytics overview:
 * - KPI summary cards with preceding-period comparisons
 * - Sales by source & manual channels
 * - Order status distribution
 * - Top delivery locations
 * - Top 5 selling products snapshot
 */
export async function getAnalyticsOverview(
  supabase: SupabaseClient<Database>,
  options: AnalyticsQueryOptions
): Promise<AnalyticsOverviewData> {
  const { organizationId, range } = options;

  // Call Postgres RPC for organization-scoped overview
  const { data: overviewData, error: overviewErr } = await (supabase.rpc as any)(
    'get_analytics_overview',
    {
      p_org_id: organizationId,
      p_from: range.from,
      p_to: range.to,
      p_prev_from: range.previousFrom,
      p_prev_to: range.previousTo,
    }
  );

  if (overviewErr) {
    throw new Error(`Failed to fetch analytics overview: ${overviewErr.message}`);
  }

  // Also fetch sales time-series for overview charts
  const series = await getAnalyticsSalesSeries(supabase, options);

  const parsed = overviewData as Partial<AnalyticsOverviewData>;

  return {
    kpis: parsed.kpis || {
      revenue: { current: 0, previous: 0, percentageChange: 0 },
      orders: { current: 0, previous: 0, percentageChange: 0 },
      paidOrders: { current: 0, previous: 0, percentageChange: 0 },
      aov: { current: 0, previous: 0, percentageChange: 0 },
      newCustomers: { current: 0, previous: 0, percentageChange: 0 },
      grossOrderValue: { current: 0, previous: 0, percentageChange: 0 },
      totalDiscountGiven: { current: 0, previous: 0, percentageChange: 0 },
    },
    salesBySource: parsed.salesBySource || [],
    salesByChannel: parsed.salesByChannel || [],
    orderStatusBreakdown: parsed.orderStatusBreakdown || [],
    topLocations: parsed.topLocations || [],
    topProducts: parsed.topProducts || [],
    recentSeries: series,
  };
}

/**
 * Fetches time-series data for revenue and orders over time with adaptive granularity.
 * Guaranteed zero-filled for missing dates.
 */
export async function getAnalyticsSalesSeries(
  supabase: SupabaseClient<Database>,
  options: AnalyticsQueryOptions
): Promise<SalesSeriesPoint[]> {
  const { organizationId, range, granularity = 'day' } = options;

  const { data: seriesData, error } = await (supabase.rpc as any)(
    'get_analytics_sales_series',
    {
      p_org_id: organizationId,
      p_from: range.from,
      p_to: range.to,
      p_granularity: granularity,
    }
  );

  if (error) {
    throw new Error(`Failed to fetch sales series: ${error.message}`);
  }

  return (seriesData as SalesSeriesPoint[]) || [];
}

/**
 * Fetches detailed product performance metrics:
 * - Top selling products snapshot
 * - Bundle sales vs component demand (for warehouse planning)
 * - Coloring-book theme customization popularity
 * - Add-on sales and attach rate
 */
export async function getAnalyticsProducts(
  supabase: SupabaseClient<Database>,
  options: AnalyticsQueryOptions
): Promise<ProductAnalyticsData> {
  const { organizationId, range } = options;

  const { data, error } = await (supabase.rpc as any)('get_analytics_products', {
    p_org_id: organizationId,
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    throw new Error(`Failed to fetch product analytics: ${error.message}`);
  }

  const parsed = data as Partial<ProductAnalyticsData>;

  return {
    topProducts: parsed.topProducts || [],
    bundleSales: parsed.bundleSales || [],
    componentDemand: parsed.componentDemand || [],
    themePopularity: parsed.themePopularity || [],
    addonPerformance: parsed.addonPerformance || [],
  };
}

/**
 * Fetches customer cohort and behavior analytics:
 * - New vs returning customer cohorts
 * - Repeat purchase rate
 * - Guest vs registered orders
 * - Top customers by spending
 */
export async function getAnalyticsCustomers(
  supabase: SupabaseClient<Database>,
  options: AnalyticsQueryOptions
): Promise<CustomerAnalyticsData> {
  const { organizationId, range } = options;

  const { data, error } = await (supabase.rpc as any)('get_analytics_customers', {
    p_org_id: organizationId,
    p_from: range.from,
    p_to: range.to,
    p_prev_from: range.previousFrom,
    p_prev_to: range.previousTo,
  });

  if (error) {
    throw new Error(`Failed to fetch customer analytics: ${error.message}`);
  }

  const parsed = data as Partial<CustomerAnalyticsData>;

  return {
    kpis: parsed.kpis || {
      newCustomers: { current: 0, previous: 0, percentageChange: 0 },
      purchasingCustomers: { current: 0, previous: 0, percentageChange: 0 },
      returningCustomers: { current: 0, previous: 0, percentageChange: 0 },
      repeatPurchaseRate: { current: 0, previous: 0, percentageChange: 0 },
      guestOrders: { current: 0, previous: 0, percentageChange: 0 },
      registeredOrders: { current: 0, previous: 0, percentageChange: 0 },
      newAccounts: { current: 0, previous: 0, percentageChange: 0 },
    },
    topCustomers: parsed.topCustomers || [],
  };
}

/**
 * Fetches inventory status and movement tracking:
 * - Total, available, and reserved stock
 * - Low stock and out-of-stock items
 * - Movement breakdown by type (sales, receipts, adjustments, reservations)
 * - Warehouse distribution
 */
export async function getAnalyticsInventory(
  supabase: SupabaseClient<Database>,
  options: AnalyticsQueryOptions
): Promise<InventoryAnalyticsData> {
  const { organizationId, range } = options;

  const { data, error } = await (supabase.rpc as any)('get_analytics_inventory', {
    p_org_id: organizationId,
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    throw new Error(`Failed to fetch inventory analytics: ${error.message}`);
  }

  const parsed = data as Partial<InventoryAnalyticsData>;

  return {
    summary: parsed.summary || {
      totalStock: 0,
      availableStock: 0,
      reservedStock: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    },
    lowStockProducts: parsed.lowStockProducts || [],
    outOfStockProducts: parsed.outOfStockProducts || [],
    movementBreakdown: parsed.movementBreakdown || [],
    warehouseBreakdown: parsed.warehouseBreakdown || [],
  };
}

/**
 * Fetches checkout funnel and payment processing metrics:
 * - Checkout session conversion & abandonment
 * - Payment success vs failure rates
 * - Revenue breakdown by payment gateway
 */
export async function getAnalyticsCheckout(
  supabase: SupabaseClient<Database>,
  options: AnalyticsQueryOptions
): Promise<CheckoutAnalyticsData> {
  const { organizationId, range } = options;

  const { data, error } = await (supabase.rpc as any)('get_analytics_checkout', {
    p_org_id: organizationId,
    p_from: range.from,
    p_to: range.to,
  });

  if (error) {
    throw new Error(`Failed to fetch checkout analytics: ${error.message}`);
  }

  const parsed = data as Partial<CheckoutAnalyticsData>;

  return {
    checkoutSessions: parsed.checkoutSessions || {
      totalSessions: 0,
      completedSessions: 0,
      abandonedSessions: 0,
      activeSessions: 0,
      conversionRate: 0,
    },
    payments: parsed.payments || {
      successfulPayments: 0,
      failedPayments: 0,
      successRate: 0,
      providerBreakdown: [],
    },
  };
}
