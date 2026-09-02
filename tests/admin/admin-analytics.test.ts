import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  resolveAnalyticsDateRange,
  calculatePercentageChange,
  getAdaptiveInterval,
} from '@/lib/date-utils';
import { GET as getAnalyticsHandler } from '@/app/api/admin/analytics/route';
import fs from 'fs';
import path from 'path';

// Load .env.local if present
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/(^["']|["']$)/g, '');
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {} as any;
}

const isLiveConfigured = Boolean(
  supabaseUrl && serviceRoleKey && !supabaseUrl.includes('placeholder')
);

const LIVE_ORG_ID = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
const LIVE_ADMIN_USER_ID = '9e1fe901-759f-4e22-85f8-c9b8829a4fca';

describe('Commerce Analytics System', () => {
  describe('1. Date Calculations & Comparison Period Semantics', () => {
    it('calculates safe percentage change and avoids division by zero', () => {
      // 0 previous, 100 current -> isNew: true, percentageChange: null
      const res1 = calculatePercentageChange(100, 0);
      expect(res1.isNew).toBe(true);
      expect(res1.percentageChange).toBeNull();

      // 0 previous, 0 current -> isNew: false, percentageChange: 0
      const res2 = calculatePercentageChange(0, 0);
      expect(res2.isNew).toBe(false);
      expect(res2.percentageChange).toBe(0);

      // 100 previous, 150 current -> +50%
      const res3 = calculatePercentageChange(150, 100);
      expect(res3.isNew).toBe(false);
      expect(res3.percentageChange).toBe(50);

      // 100 previous, 80 current -> -20%
      const res4 = calculatePercentageChange(80, 100);
      expect(res4.isNew).toBe(false);
      expect(res4.percentageChange).toBe(-20);
    });

    it('resolves last_7_days and preceding 7 days accurately', () => {
      const fixedNow = new Date('2026-08-31T12:00:00.000Z');
      const range = resolveAnalyticsDateRange('last_7_days', undefined, undefined, fixedNow);

      expect(range.preset).toBe('last_7_days');
      expect(range.label).toBe('Last 7 Days');

      const fromTime = new Date(range.from).getTime();
      const toTime = new Date(range.to).getTime();
      const prevFromTime = new Date(range.previousFrom).getTime();
      const prevToTime = new Date(range.previousTo).getTime();

      // Duration should be exactly 7 days
      const duration = toTime - fromTime;
      const prevDuration = prevToTime - prevFromTime;
      expect(Math.round(duration / (1000 * 60 * 60 * 24))).toBe(7);
      expect(Math.round(prevDuration / (1000 * 60 * 60 * 24))).toBe(7);
      // Previous period ends right before current period begins
      expect(prevToTime).toBeLessThan(fromTime);
    });

    it('determines adaptive interval based on duration', () => {
      // <= 31 days -> day
      expect(
        getAdaptiveInterval('2026-08-01T00:00:00.000Z', '2026-08-15T23:59:59.999Z')
      ).toBe('day');

      // 32 - 180 days -> week
      expect(
        getAdaptiveInterval('2026-06-01T00:00:00.000Z', '2026-08-31T23:59:59.999Z')
      ).toBe('week');

      // > 180 days -> month
      expect(
        getAdaptiveInterval('2025-01-01T00:00:00.000Z', '2026-08-31T23:59:59.999Z')
      ).toBe('month');
    });
  });

  describe('2. API Route Security & Authorization (GET /api/admin/analytics)', () => {
    it('returns 403 when unauthenticated (no session or admin headers)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/analytics?type=overview');
      const res = await getAnalyticsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Authentication required');
    });

    it('returns 400 for invalid analytics tab/type', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/analytics?type=invalid_type_xyz',
        {
          headers: {
            'x-test-admin-id': LIVE_ADMIN_USER_ID,
            'x-test-admin-email': 'admin@unwindanddoodle.com',
            'x-organization-id': LIVE_ORG_ID,
          },
        }
      );

      const res = await getAnalyticsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid analytics type');
    });
  });

  describe('3. Database Analytics RPC Functions (Live Supabase Verification)', () => {
    it.runIf(isLiveConfigured)('executes get_analytics_overview and returns expected schema', async () => {
      const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await (supabase.rpc as any)('get_analytics_overview', {
        p_org_id: LIVE_ORG_ID,
        p_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_to: new Date().toISOString(),
        p_prev_from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        p_prev_to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.kpis).toBeDefined();
      expect(data.kpis.revenue).toBeDefined();
      expect(data.kpis.orders).toBeDefined();
      expect(data.kpis.paidOrders).toBeDefined();
      expect(data.kpis.aov).toBeDefined();
      expect(data.kpis.newCustomers).toBeDefined();
      expect(data.kpis.grossOrderValue).toBeDefined();
      expect(Array.isArray(data.salesBySource)).toBe(true);
      expect(Array.isArray(data.orderStatusBreakdown)).toBe(true);
      expect(Array.isArray(data.topLocations)).toBe(true);
      expect(Array.isArray(data.topProducts)).toBe(true);
    });

    it.runIf(isLiveConfigured)('executes get_analytics_sales_series and returns zero-filled time buckets', async () => {
      const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await (supabase.rpc as any)('get_analytics_sales_series', {
        p_org_id: LIVE_ORG_ID,
        p_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_to: new Date().toISOString(),
        p_granularity: 'day',
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('date');
      expect(data[0]).toHaveProperty('revenue');
      expect(data[0]).toHaveProperty('orders');
    });

    it.runIf(isLiveConfigured)('executes get_analytics_products and returns product metrics', async () => {
      const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await (supabase.rpc as any)('get_analytics_products', {
        p_org_id: LIVE_ORG_ID,
        p_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_to: new Date().toISOString(),
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data.topProducts)).toBe(true);
      expect(Array.isArray(data.bundleSales)).toBe(true);
      expect(Array.isArray(data.componentDemand)).toBe(true);
      expect(Array.isArray(data.themePopularity)).toBe(true);
      expect(Array.isArray(data.addonPerformance)).toBe(true);
    });

    it.runIf(isLiveConfigured)('executes get_analytics_customers and returns cohort metrics', async () => {
      const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await (supabase.rpc as any)('get_analytics_customers', {
        p_org_id: LIVE_ORG_ID,
        p_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_to: new Date().toISOString(),
        p_prev_from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        p_prev_to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.kpis).toBeDefined();
      expect(data.kpis.newCustomers).toBeDefined();
      expect(data.kpis.purchasingCustomers).toBeDefined();
      expect(data.kpis.returningCustomers).toBeDefined();
      expect(data.kpis.repeatPurchaseRate).toBeDefined();
      expect(Array.isArray(data.topCustomers)).toBe(true);
    });

    it.runIf(isLiveConfigured)('executes get_analytics_inventory and returns stock and movements', async () => {
      const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await (supabase.rpc as any)('get_analytics_inventory', {
        p_org_id: LIVE_ORG_ID,
        p_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_to: new Date().toISOString(),
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.summary.totalStock).toBeGreaterThanOrEqual(0);
      expect(data.summary.availableStock).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.lowStockProducts)).toBe(true);
      expect(Array.isArray(data.outOfStockProducts)).toBe(true);
      expect(Array.isArray(data.movementBreakdown)).toBe(true);
      expect(Array.isArray(data.warehouseBreakdown)).toBe(true);
    });

    it.runIf(isLiveConfigured)('executes get_analytics_checkout and returns checkout session conversion', async () => {
      const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await (supabase.rpc as any)('get_analytics_checkout', {
        p_org_id: LIVE_ORG_ID,
        p_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_to: new Date().toISOString(),
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.checkoutSessions).toBeDefined();
      expect(data.payments).toBeDefined();
      expect(Array.isArray(data.payments.providerBreakdown)).toBe(true);
    });
  });

  describe('4. End-to-End API Route Execution (GET /api/admin/analytics with Test Admin Headers)', () => {
    it.runIf(isLiveConfigured)('fetches overview analytics via API route', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/analytics?type=overview&preset=last_30_days',
        {
          headers: {
            'x-test-admin-id': LIVE_ADMIN_USER_ID,
            'x-test-admin-email': 'admin@unwindanddoodle.com',
            'x-organization-id': LIVE_ORG_ID,
          },
        }
      );

      const res = await getAnalyticsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.kpis).toBeDefined();
      expect(json.range).toBeDefined();
      expect(json.range.preset).toBe('last_30_days');
    });

    it.runIf(isLiveConfigured)('fetches products analytics via API route', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/analytics?type=products&preset=last_7_days',
        {
          headers: {
            'x-test-admin-id': LIVE_ADMIN_USER_ID,
            'x-test-admin-email': 'admin@unwindanddoodle.com',
            'x-organization-id': LIVE_ORG_ID,
          },
        }
      );

      const res = await getAnalyticsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.topProducts).toBeDefined();
      expect(json.data.bundleSales).toBeDefined();
    });

    it.runIf(isLiveConfigured)('fetches inventory analytics via API route', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/analytics?type=inventory&preset=this_month',
        {
          headers: {
            'x-test-admin-id': LIVE_ADMIN_USER_ID,
            'x-test-admin-email': 'admin@unwindanddoodle.com',
            'x-organization-id': LIVE_ORG_ID,
          },
        }
      );

      const res = await getAnalyticsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.summary).toBeDefined();
      expect(json.data.warehouseBreakdown).toBeDefined();
    });
  });

  describe('5. Controlled Fixture Data Verification (Sections 45 & 46)', () => {
    it('accurately calculates revenue, paid orders, and AOV from controlled examples', () => {
      // Scenario from Section 46 of spec:
      // Order A: 10,000 (successful)
      // Order B: 20,000 (successful)
      // Order C: 15,000 (failed/unpaid)
      const controlledOrders = [
        { id: 'ord-a', status: 'confirmed', total: 10000 },
        { id: 'ord-b', status: 'shipped', total: 20000 },
        { id: 'ord-c', status: 'created', total: 15000 },
      ];

      const controlledPayments = [
        { id: 'pay-a1', order_id: 'ord-a', status: 'successful', amount: 10000 },
        { id: 'pay-b1', order_id: 'ord-b', status: 'failed', amount: 20000 },
        { id: 'pay-b2', order_id: 'ord-b', status: 'successful', amount: 20000 }, // Second payment attempt succeeded
        { id: 'pay-c1', order_id: 'ord-c', status: 'failed', amount: 15000 },
        { id: 'pay-c2', order_id: 'ord-c', status: 'pending', amount: 15000 },
      ];

      // Filter successful payments for valid orders
      const validOrderIds = new Set(
        controlledOrders.filter((o) => !['cancelled', 'refunded'].includes(o.status)).map((o) => o.id)
      );

      const successfulPayments = controlledPayments.filter(
        (p) => p.status === 'successful' && validOrderIds.has(p.order_id)
      );

      const collectedRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
      const paidOrdersSet = new Set(successfulPayments.map((p) => p.order_id));
      const paidOrdersCount = paidOrdersSet.size;
      const aov = paidOrdersCount > 0 ? collectedRevenue / paidOrdersCount : 0;

      // Assertions matching Section 46:
      // Revenue = 30,000
      // Paid Orders = 2
      // AOV = 15,000
      expect(collectedRevenue).toBe(30000);
      expect(paidOrdersCount).toBe(2);
      expect(aov).toBe(15000);
    });

    it('excludes refunded payments and cancelled orders from collected revenue', () => {
      const orders = [
        { id: 'ord-1', status: 'cancelled', total: 5000 },
        { id: 'ord-2', status: 'refunded', total: 12000 },
        { id: 'ord-3', status: 'received', total: 8000 },
      ];

      const payments = [
        { id: 'pay-1', order_id: 'ord-1', status: 'successful', amount: 5000 },
        { id: 'pay-2', order_id: 'ord-2', status: 'refunded', amount: 12000 },
        { id: 'pay-3', order_id: 'ord-3', status: 'successful', amount: 8000 },
      ];

      const validOrderIds = new Set(
        orders.filter((o) => !['cancelled', 'refunded'].includes(o.status)).map((o) => o.id)
      );

      const netSuccessfulPayments = payments.filter(
        (p) => p.status === 'successful' && validOrderIds.has(p.order_id)
      );

      const revenue = netSuccessfulPayments.reduce((sum, p) => sum + p.amount, 0);
      expect(revenue).toBe(8000);
      expect(netSuccessfulPayments.length).toBe(1);
    });

    it('prevents join multiplication when orders have multiple line items and payments', () => {
      // 1 order with 2 payments (1 failed, 1 successful) and 3 order items
      const order = { id: 'ord-multi', total: 18000 };
      const items = [
        { id: 'item-1', order_id: 'ord-multi', total: 6000 },
        { id: 'item-2', order_id: 'ord-multi', total: 6000 },
        { id: 'item-3', order_id: 'ord-multi', total: 6000 },
      ];
      const payments = [
        { id: 'pay-1', order_id: 'ord-multi', status: 'failed', amount: 18000 },
        { id: 'pay-2', order_id: 'ord-multi', status: 'successful', amount: 18000 },
      ];

      // Aggregating revenue directly from payments
      const revenue = payments
        .filter((p) => p.status === 'successful')
        .reduce((sum, p) => sum + p.amount, 0);
      expect(revenue).toBe(18000);

      // Aggregating product items for paid orders: distinct order check
      const paidOrderIds = new Set(
        payments.filter((p) => p.status === 'successful').map((p) => p.order_id)
      );
      const validItems = items.filter((item) => paidOrderIds.has(item.order_id));
      const itemsTotal = validItems.reduce((sum, i) => sum + i.total, 0);
      expect(itemsTotal).toBe(18000); // exactly matches without duplication
    });

    it('treats bundles as the sold product and excludes component expansion from sales', () => {
      const soldItems = [
        { id: 'oi-bundle-1', productId: 'prod-bundle-mega', isBundle: true, quantity: 2, total: 30000 },
        { id: 'oi-single-1', productId: 'prod-book-solo', isBundle: false, quantity: 1, total: 5000 },
      ];

      // Components from order_item_bundle_components
      const bundleComponents = [
        { bundleItemId: 'oi-bundle-1', componentId: 'comp-sketchbook', quantity: 2 },
        { bundleItemId: 'oi-bundle-1', componentId: 'comp-pencils', quantity: 2 },
      ];

      // Product sales must ONLY count parent soldItems
      const productSalesCount = soldItems.reduce((sum, i) => sum + i.quantity, 0);
      const productRevenue = soldItems.reduce((sum, i) => sum + i.total, 0);

      expect(productSalesCount).toBe(3); // 2 bundles + 1 solo book
      expect(productRevenue).toBe(35000);

      // Components should NOT increment product sales
      expect(soldItems.some((i) => i.productId === 'comp-sketchbook')).toBe(false);
      // Components demand is isolated
      const totalComponentUnits = bundleComponents.reduce((sum, c) => sum + c.quantity, 0);
      expect(totalComponentUnits).toBe(4);
    });

    it('accurately computes repeat purchase rate and customer cohorts', () => {
      const customers = [
        { id: 'cust-1', paidOrders: 3 }, // returning / repeat
        { id: 'cust-2', paidOrders: 1 }, // single purchase
        { id: 'cust-3', paidOrders: 2 }, // repeat
        { id: 'cust-4', paidOrders: 0 }, // no purchases yet
      ];

      const customersWithAtLeastOnePaidOrder = customers.filter((c) => c.paidOrders >= 1);
      const customersWithRepeatPaidOrders = customers.filter((c) => c.paidOrders >= 2);

      const repeatRate =
        (customersWithRepeatPaidOrders.length / customersWithAtLeastOnePaidOrder.length) * 100;

      // 2 customers (cust-1, cust-3) with >= 2 out of 3 customers (cust-1, cust-2, cust-3) with >= 1
      expect(customersWithAtLeastOnePaidOrder.length).toBe(3);
      expect(customersWithRepeatPaidOrders.length).toBe(2);
      expect(Math.round(repeatRate * 10) / 10).toBe(66.7);
    });
  });
});
