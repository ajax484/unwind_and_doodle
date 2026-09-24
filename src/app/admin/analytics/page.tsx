'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Button from '@/components/Button';
import { Tabs } from '@/components/Tabs';
import AlertBanner from '@/components/AlertBanner';
import Badge from '@/components/Badge';
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
          <h2 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
            Store Analytics &amp; Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
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

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTabAnalytics}
            disabled={loading}
            loading={loading}
            leadingIcon="🔄"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <Tabs
        tabs={TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as ActiveTab)}
        style="underline"
        size="md"
        aria-label="Analytics Sections"
      />

      {/* 3. Error Banner */}
      {error && (
        <AlertBanner
          variant="danger"
          size="sm"
          description={error}
          actionLabel="Retry"
          onAction={fetchTabAnalytics}
        />
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
              items={(overviewData?.topLocations || []).map((loc) => {
                const isSameOrNA =
                  !loc.state ||
                  loc.state === 'N/A' ||
                  loc.locationName.trim().toLowerCase() === loc.state.trim().toLowerCase();
                const label = isSameOrNA
                  ? loc.locationName
                  : `${loc.locationName} (${loc.state})`;
                return {
                  label,
                  value: loc.orders,
                  secondary: formatCurrency(loc.revenue),
                };
              })}
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
          <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-heading text-text-primary">
                  Top Selling Products (Historical Snapshots)
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Calculated from immutable order snapshots for valid paid orders
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-text-tertiary font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">Product Name</th>
                    <th className="pb-3">SKU</th>
                    <th className="pb-3 text-right">Units Sold</th>
                    <th className="pb-3 text-right">Paid Revenue</th>
                    <th className="pb-3 text-right pr-2">Distinct Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default font-medium text-text-secondary">
                  {productData?.topProducts && productData.topProducts.length > 0 ? (
                    productData.topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-bg-subtle/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-text-primary">{p.productName}</td>
                        <td className="py-3.5 text-text-secondary font-mono">{p.sku || '—'}</td>
                        <td className="py-3.5 text-right font-semibold text-text-primary">{p.quantitySold}</td>
                        <td className="py-3.5 text-right font-bold text-action-primary">
                          {formatCurrency(p.revenue)}
                        </td>
                        <td className="py-3.5 text-right pr-2 text-text-secondary">{p.ordersCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-tertiary">
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
            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-primary">
                Product Bundles Sold
              </h3>
              <p className="text-xs text-text-tertiary">
                Bundles treated as sold parent products (not double-counted)
              </p>
              <div className="space-y-3">
                {productData?.bundleSales && productData.bundleSales.length > 0 ? (
                  productData.bundleSales.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-bg-subtle border border-border-default flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-text-primary">{b.productName}</div>
                        <span className="text-[10px] text-text-tertiary font-mono">{b.sku}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-action-primary">{formatCurrency(b.revenue)}</div>
                        <span className="text-[10px] text-text-secondary">{b.quantitySold} bundles sold</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-tertiary">
                    No bundle sales in this period
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-primary">
                Bundle Component Demand
              </h3>
              <p className="text-xs text-text-tertiary">
                Physical inventory demand for fulfillment planning
              </p>
              <div className="space-y-3">
                {productData?.componentDemand && productData.componentDemand.length > 0 ? (
                  productData.componentDemand.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-bg-subtle border border-border-default flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-text-primary">{c.productName}</div>
                        <span className="text-[10px] text-text-tertiary font-mono">{c.sku}</span>
                      </div>
                      <div className="font-bold text-text-primary">
                        {c.totalQuantityDemanded} units demanded
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-tertiary">
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

            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-primary">
                Add-on Performance &amp; Attach Rate
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-default text-text-tertiary uppercase text-[10px]">
                      <th className="pb-2">Add-on Product</th>
                      <th className="pb-2 text-right">Units</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Attach Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {productData?.addonPerformance && productData.addonPerformance.length > 0 ? (
                      productData.addonPerformance.map((a, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 font-semibold text-text-primary">{a.productName}</td>
                          <td className="py-2.5 text-right font-medium text-text-secondary">{a.quantitySold}</td>
                          <td className="py-2.5 text-right font-bold text-action-primary">
                            {formatCurrency(a.revenue)}
                          </td>
                          <td className="py-2.5 text-right text-text-secondary">
                            {a.attachRate !== null ? `${a.attachRate}%` : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-text-tertiary">
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
          <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
            <h3 className="text-sm font-bold font-heading text-text-primary">
              Top Customers by Spending (Selected Period)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-text-tertiary font-semibold uppercase text-[10px]">
                    <th className="pb-3 pl-2">Customer</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3 text-right">Orders</th>
                    <th className="pb-3 text-right">Total Spent</th>
                    <th className="pb-3 text-right pr-2">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default font-medium text-text-secondary">
                  {customerData?.topCustomers && customerData.topCustomers.length > 0 ? (
                    customerData.topCustomers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-bg-subtle/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-text-primary">
                          {c.name || 'Anonymous Customer'}
                        </td>
                        <td className="py-3.5 text-text-secondary">{c.email}</td>
                        <td className="py-3.5 text-text-secondary">{c.phone || '—'}</td>
                        <td className="py-3.5 text-right font-semibold text-text-primary">{c.totalOrders}</td>
                        <td className="py-3.5 text-right font-bold text-action-primary">
                          {formatCurrency(c.totalSpent)}
                        </td>
                        <td className="py-3.5 text-right pr-2 text-text-tertiary">
                          {formatDate(c.lastOrderAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-tertiary">
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
            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-primary flex items-center gap-2">
                <span>⚠️</span> Low Stock Products
              </h3>
              <div className="space-y-2.5">
                {inventoryData?.lowStockProducts && inventoryData.lowStockProducts.length > 0 ? (
                  inventoryData.lowStockProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-status-warning-bg/50 border border-status-warning-accent/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-text-primary">{p.productName}</div>
                        <span className="text-[10px] text-text-secondary font-mono">{p.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-status-warning-text">
                          {p.availableQuantity} available
                        </span>
                        <div className="text-[10px] text-text-tertiary">
                          {p.reservedQuantity} reserved
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-tertiary">
                    No products currently at low stock
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-primary flex items-center gap-2">
                <span>❌</span> Out of Stock Products
              </h3>
              <div className="space-y-2.5">
                {inventoryData?.outOfStockProducts && inventoryData.outOfStockProducts.length > 0 ? (
                  inventoryData.outOfStockProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-status-danger-bg/50 border border-status-danger-accent/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-text-primary">{p.productName}</div>
                        <span className="text-[10px] text-text-secondary font-mono">{p.sku}</span>
                      </div>
                      <Badge variant="status" statusType="danger" size="sm">
                        Out of Stock
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-tertiary">
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

            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-primary">
                Stock by Warehouse
              </h3>
              <div className="space-y-3">
                {inventoryData?.warehouseBreakdown && inventoryData.warehouseBreakdown.length > 0 ? (
                  inventoryData.warehouseBreakdown.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-bg-subtle border border-border-default flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-text-primary">{w.warehouseName}</div>
                        <span className="text-[10px] text-text-tertiary uppercase font-mono">
                          {w.warehouseCode} • {w.productCount} SKUs
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-text-primary">
                          {w.availableStock} / {w.totalStock} units
                        </div>
                        <span className="text-[10px] text-text-secondary">
                          {w.reservedStock} reserved
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-tertiary">
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
          <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
            <h3 className="text-sm font-bold font-heading text-text-primary">
              Payment Gateway Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-text-tertiary uppercase text-[10px]">
                    <th className="pb-3 pl-2">Provider</th>
                    <th className="pb-3 text-right">Transactions</th>
                    <th className="pb-3 text-right pr-2">Collected Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default font-medium text-text-secondary">
                  {checkoutData?.payments.providerBreakdown &&
                  checkoutData.payments.providerBreakdown.length > 0 ? (
                    checkoutData.payments.providerBreakdown.map((p, idx) => (
                      <tr key={idx} className="hover:bg-bg-subtle/80 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-text-primary uppercase">
                          {p.provider}
                        </td>
                        <td className="py-3.5 text-right font-semibold text-text-primary">{p.paymentsCount}</td>
                        <td className="py-3.5 text-right pr-2 font-bold text-action-primary">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-text-tertiary">
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
