'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AnalyticsDateRangeSelector from '@/components/admin/analytics/AnalyticsDateRangeSelector';
import AnalyticsKpiCard from '@/components/admin/analytics/AnalyticsKpiCard';
import {
  TimeSeriesChart,
  HorizontalBarChart,
  StatusDistributionBar,
} from '@/components/admin/analytics/AnalyticsCharts';
import {
  AnalyticsDateRangePreset,
  AnalyticsOverviewData,
  ProductAnalyticsData,
  CustomerAnalyticsData,
  InventoryAnalyticsData,
  CheckoutAnalyticsData,
} from '@/types/analytics';

type ActiveTab = 'overview' | 'products' | 'customers' | 'inventory' | 'checkout';

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [preset, setPreset] = useState<AnalyticsDateRangePreset>('last_30_days');
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states per tab
  const [overviewData, setOverviewData] = useState<AnalyticsOverviewData | null>(null);
  const [productData, setProductData] = useState<ProductAnalyticsData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalyticsData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryAnalyticsData | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutAnalyticsData | null>(null);

  const fetchTabAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('type', activeTab);
      params.set('preset', preset);
      if (customFrom) params.set('from', customFrom);
      if (customTo) params.set('to', customTo);

      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch analytics');
      }

      if (activeTab === 'overview') setOverviewData(json.data);
      if (activeTab === 'products') setProductData(json.data);
      if (activeTab === 'customers') setCustomerData(json.data);
      if (activeTab === 'inventory') setInventoryData(json.data);
      if (activeTab === 'checkout') setCheckoutData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching analytics');
    } finally {
      setLoading(false);
    }
  }, [activeTab, preset, customFrom, customTo]);

  useEffect(() => {
    fetchTabAnalytics();
  }, [fetchTabAnalytics]);

  const handleRangeChange = (newPreset: AnalyticsDateRangePreset, from?: string, to?: string) => {
    setPreset(newPreset);
    setCustomFrom(from);
    setCustomTo(to);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'products', label: 'Products', icon: '🎨' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'inventory', label: 'Inventory', icon: '📋' },
    { id: 'checkout', label: 'Checkout & Payments', icon: '💳' },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Page Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Store Analytics &amp; Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Authoritative, organization-scoped insights into collected revenue, customers, and operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AnalyticsDateRangeSelector
            currentPreset={preset}
            customFrom={customFrom}
            customTo={customTo}
            onSelect={handleRangeChange}
            disabled={loading}
          />

          <button
            type="button"
            onClick={fetchTabAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto select-none">
        <nav className="flex space-x-6 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-heading font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
          <button
            type="button"
            onClick={fetchTabAnalytics}
            className="underline font-bold hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <AnalyticsKpiCard
              title="Collected Revenue"
              value={overviewData?.kpis.revenue.current || 0}
              format="currency"
              comparison={overviewData?.kpis.revenue}
              icon="💰"
              tooltip="Authoritative collected revenue from successful payments (excludes pending/failed/refunded)."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Total Orders"
              value={overviewData?.kpis.orders.current || 0}
              format="number"
              comparison={overviewData?.kpis.orders}
              icon="📦"
              tooltip="Total placed orders in the selected period."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Paid Orders"
              value={overviewData?.kpis.paidOrders.current || 0}
              format="number"
              comparison={overviewData?.kpis.paidOrders}
              icon="✅"
              tooltip="Distinct orders that completed successful payment in the selected period."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Average Order Value"
              value={overviewData?.kpis.aov.current || 0}
              format="currency"
              comparison={overviewData?.kpis.aov}
              icon="🏷️"
              tooltip="Collected revenue divided by distinct paid orders (unpaid/cancelled orders excluded)."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="New Customers"
              value={overviewData?.kpis.newCustomers.current || 0}
              format="number"
              comparison={overviewData?.kpis.newCustomers}
              icon="👤"
              tooltip="Customers whose first valid paid order occurred within this period."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Gross Order Value"
              value={overviewData?.kpis.grossOrderValue.current || 0}
              format="currency"
              comparison={overviewData?.kpis.grossOrderValue}
              icon="📈"
              tooltip="Gross total of placed non-cancelled orders (distinct from collected revenue)."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Discounts Given"
              value={overviewData?.kpis.totalDiscountGiven.current || 0}
              format="currency"
              comparison={overviewData?.kpis.totalDiscountGiven}
              icon="🎟️"
              tooltip="Total coupon/discount savings granted to valid orders in this period."
              loading={loading}
            />
          </div>

          {/* Time Series Chart */}
          <TimeSeriesChart
            data={overviewData?.recentSeries || []}
            loading={loading}
          />

          {/* Breakdown Grid: Sources & Statuses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarChart
              title="Sales by Order Source"
              items={(overviewData?.salesBySource || []).map((s) => ({
                label: s.source.toUpperCase(),
                value: s.orders,
                secondary: formatCurrency(s.revenue),
                percentage: s.percentageOfRevenue,
              }))}
              emptyMessage="No sales recorded in this period"
            />

            <StatusDistributionBar
              statuses={overviewData?.orderStatusBreakdown || []}
            />
          </div>

          {/* Breakdown Grid: Locations & Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarChart
              title="Top Delivery Locations"
              items={(overviewData?.topLocations || []).map((loc) => ({
                label: `${loc.locationName} (${loc.state})`,
                value: loc.orders,
                secondary: formatCurrency(loc.revenue),
              }))}
              emptyMessage="No location data recorded in this period"
            />

            <HorizontalBarChart
              title="Manual Orders Channels"
              items={(overviewData?.salesByChannel || []).map((ch) => ({
                label: ch.channel.toUpperCase(),
                value: ch.orders,
                secondary: formatCurrency(ch.revenue),
              }))}
              emptyMessage="No manual orders recorded in this period"
            />
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Top Selling Products Table */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900">
                  Top Selling Products (Historical Snapshots)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated from immutable order snapshots for valid paid orders
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">Product Name</th>
                    <th className="pb-3">SKU</th>
                    <th className="pb-3 text-right">Units Sold</th>
                    <th className="pb-3 text-right">Paid Revenue</th>
                    <th className="pb-3 text-right pr-2">Distinct Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {productData?.topProducts && productData.topProducts.length > 0 ? (
                    productData.topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-slate-900">{p.productName}</td>
                        <td className="py-3.5 text-slate-500 font-mono">{p.sku || '—'}</td>
                        <td className="py-3.5 text-right font-semibold">{p.quantitySold}</td>
                        <td className="py-3.5 text-right font-bold text-rose-600">
                          {formatCurrency(p.revenue)}
                        </td>
                        <td className="py-3.5 text-right pr-2 text-slate-500">{p.ordersCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No product sales recorded in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bundle Sales & Component Demand */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                Product Bundles Sold
              </h3>
              <p className="text-xs text-slate-400">
                Bundles treated as sold parent products (not double-counted)
              </p>
              <div className="space-y-3">
                {productData?.bundleSales && productData.bundleSales.length > 0 ? (
                  productData.bundleSales.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{b.productName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{b.sku}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-rose-600">{formatCurrency(b.revenue)}</div>
                        <span className="text-[10px] text-slate-500">{b.quantitySold} bundles sold</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No bundle sales in this period
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                Bundle Component Demand
              </h3>
              <p className="text-xs text-slate-400">
                Physical inventory demand for fulfillment planning
              </p>
              <div className="space-y-3">
                {productData?.componentDemand && productData.componentDemand.length > 0 ? (
                  productData.componentDemand.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{c.productName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{c.sku}</span>
                      </div>
                      <div className="font-bold text-slate-800">
                        {c.totalQuantityDemanded} units demanded
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No bundle component demand in this period
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Theme Popularity & Add-ons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarChart
              title="Coloring-Book Theme Popularity"
              items={(productData?.themePopularity || []).map((t) => ({
                label: t.themeName,
                value: t.selectionsCount,
              }))}
              emptyMessage="No theme customizations recorded in this period"
            />

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                Add-on Performance &amp; Attach Rate
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                      <th className="pb-2">Add-on Product</th>
                      <th className="pb-2 text-right">Units</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Attach Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productData?.addonPerformance && productData.addonPerformance.length > 0 ? (
                      productData.addonPerformance.map((a, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 font-semibold text-slate-800">{a.productName}</td>
                          <td className="py-2.5 text-right font-medium">{a.quantitySold}</td>
                          <td className="py-2.5 text-right font-bold text-rose-600">
                            {formatCurrency(a.revenue)}
                          </td>
                          <td className="py-2.5 text-right text-slate-500">
                            {a.attachRate !== null ? `${a.attachRate}%` : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No add-ons purchased in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Customer Cohort KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <AnalyticsKpiCard
              title="New Customers"
              value={customerData?.kpis.newCustomers.current || 0}
              comparison={customerData?.kpis.newCustomers}
              icon="✨"
              tooltip="Customers whose first valid paid order occurred within this period."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Purchasing Customers"
              value={customerData?.kpis.purchasingCustomers.current || 0}
              comparison={customerData?.kpis.purchasingCustomers}
              icon="💳"
              tooltip="Distinct customers with paid orders during the selected period."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Returning Customers"
              value={customerData?.kpis.returningCustomers.current || 0}
              comparison={customerData?.kpis.returningCustomers}
              icon="🔁"
              tooltip="Customers with a paid order in this range who previously ordered before this range."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Repeat Purchase Rate"
              value={customerData?.kpis.repeatPurchaseRate.current || 0}
              format="percentage"
              comparison={customerData?.kpis.repeatPurchaseRate}
              icon="📊"
              tooltip="Lifetime customers with >= 2 paid orders divided by customers with >= 1 paid order."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Guest Orders"
              value={customerData?.kpis.guestOrders.current || 0}
              comparison={customerData?.kpis.guestOrders}
              icon="👤"
              tooltip="Orders completed without creating an account (guest checkout)."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Registered Orders"
              value={customerData?.kpis.registeredOrders.current || 0}
              comparison={customerData?.kpis.registeredOrders}
              icon="🛡️"
              tooltip="Orders completed by logged-in customers."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="New Customer Accounts"
              value={customerData?.kpis.newAccounts.current || 0}
              comparison={customerData?.kpis.newAccounts}
              icon="📝"
              tooltip="New customer accounts registered in this period."
              loading={loading}
            />
          </div>

          {/* Top Customers Table */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold font-heading text-slate-900">
              Top Customers by Spending (Selected Period)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-3 pl-2">Customer</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3 text-right">Orders</th>
                    <th className="pb-3 text-right">Total Spent</th>
                    <th className="pb-3 text-right pr-2">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {customerData?.topCustomers && customerData.topCustomers.length > 0 ? (
                    customerData.topCustomers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-slate-900">
                          {c.name || 'Anonymous Customer'}
                        </td>
                        <td className="py-3.5 text-slate-500">{c.email}</td>
                        <td className="py-3.5 text-slate-500">{c.phone || '—'}</td>
                        <td className="py-3.5 text-right font-semibold">{c.totalOrders}</td>
                        <td className="py-3.5 text-right font-bold text-rose-600">
                          {formatCurrency(c.totalSpent)}
                        </td>
                        <td className="py-3.5 text-right pr-2 text-slate-400">
                          {formatDate(c.lastOrderAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No customer purchase history in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Inventory Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <AnalyticsKpiCard
              title="Total Stock"
              value={inventoryData?.summary.totalStock || 0}
              icon="📦"
              subtitle="Physical units on hand"
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Available Stock"
              value={inventoryData?.summary.availableStock || 0}
              icon="✅"
              subtitle="Unreserved units"
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Reserved Stock"
              value={inventoryData?.summary.reservedStock || 0}
              icon="⏳"
              subtitle="Active checkout reservations"
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Low Stock Items"
              value={inventoryData?.summary.lowStockCount || 0}
              icon="⚠️"
              subtitle="<= 5 units available"
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Out of Stock Items"
              value={inventoryData?.summary.outOfStockCount || 0}
              icon="❌"
              subtitle="0 units available"
              loading={loading}
            />
          </div>

          {/* Low Stock & Out of Stock Product Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
                <span>⚠️</span> Low Stock Products
              </h3>
              <div className="space-y-2.5">
                {inventoryData?.lowStockProducts && inventoryData.lowStockProducts.length > 0 ? (
                  inventoryData.lowStockProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.productName}</div>
                        <span className="text-[10px] text-slate-500 font-mono">{p.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-700">
                          {p.availableQuantity} available
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {p.reservedQuantity} reserved
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No products currently at low stock
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
                <span>❌</span> Out of Stock Products
              </h3>
              <div className="space-y-2.5">
                {inventoryData?.outOfStockProducts && inventoryData.outOfStockProducts.length > 0 ? (
                  inventoryData.outOfStockProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.productName}</div>
                        <span className="text-[10px] text-slate-500 font-mono">{p.sku}</span>
                      </div>
                      <span className="font-bold text-rose-600 px-2 py-0.5 rounded-full bg-rose-100">
                        Out of Stock
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No products out of stock
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Movement Breakdown & Warehouse Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarChart
              title="Inventory Movements (Selected Period)"
              items={(inventoryData?.movementBreakdown || []).map((m) => ({
                label: m.movementType.toUpperCase(),
                value: m.totalMovements,
                secondary: `${m.totalQuantity} units`,
              }))}
              emptyMessage="No stock movements recorded in this period"
            />

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                Stock by Warehouse
              </h3>
              <div className="space-y-3">
                {inventoryData?.warehouseBreakdown && inventoryData.warehouseBreakdown.length > 0 ? (
                  inventoryData.warehouseBreakdown.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{w.warehouseName}</div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {w.warehouseCode} • {w.productCount} SKUs
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          {w.availableStock} / {w.totalStock} units
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {w.reservedStock} reserved
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No warehouses configured
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CHECKOUT & PAYMENTS */}
      {activeTab === 'checkout' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <AnalyticsKpiCard
              title="Checkout Conversion Rate"
              value={checkoutData?.checkoutSessions.conversionRate || 0}
              format="percentage"
              icon="🎯"
              subtitle="Completed / Eligible Sessions"
              tooltip="Completed checkouts divided by (completed + abandoned + expired sessions)."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Completed Checkouts"
              value={checkoutData?.checkoutSessions.completedSessions || 0}
              icon="🛒"
              subtitle="Converted sessions"
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Payment Success Rate"
              value={checkoutData?.payments.successRate || 0}
              format="percentage"
              icon="⚡"
              subtitle="Successful / Attempted"
              tooltip="Successful payment transactions divided by (successful + failed)."
              loading={loading}
            />

            <AnalyticsKpiCard
              title="Successful Payments"
              value={checkoutData?.payments.successfulPayments || 0}
              icon="💳"
              subtitle="Settled transactions"
              loading={loading}
            />
          </div>

          {/* Payment Gateways Breakdown */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold font-heading text-slate-900">
              Payment Gateway Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="pb-3 pl-2">Provider</th>
                    <th className="pb-3 text-right">Transactions</th>
                    <th className="pb-3 text-right pr-2">Collected Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {checkoutData?.payments.providerBreakdown &&
                  checkoutData.payments.providerBreakdown.length > 0 ? (
                    checkoutData.payments.providerBreakdown.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-slate-900 uppercase">
                          {p.provider}
                        </td>
                        <td className="py-3.5 text-right font-semibold">{p.paymentsCount}</td>
                        <td className="py-3.5 text-right pr-2 font-bold text-rose-600">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        No payment provider data recorded in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
