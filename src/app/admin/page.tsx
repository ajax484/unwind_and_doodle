'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminDashboardMetricsResponse, AdminOrderListItem } from '@/types/admin-order';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (res.ok && json.success) {
        setMetrics(json.data);
      } else {
        throw new Error(json.error || 'Failed to load dashboard metrics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

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
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Store Operations Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time overview of orders requiring fulfillment and financial performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
          </button>

          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all"
          >
            Manage All Orders →
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
          <button
            type="button"
            onClick={fetchMetrics}
            className="underline font-bold hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Orders Today */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Orders Today
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              🛒
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
              {loading ? '...' : metrics?.ordersToday || 0}
            </div>
            <span className="text-[11px] text-slate-500">Placed in the last 24 hours</span>
          </div>
        </div>

        {/* Card 2: Pending Attention Orders */}
        <div className={`p-5 rounded-3xl bg-white border shadow-xs space-y-3 flex flex-col justify-between ${
          (metrics?.pendingOrdersCount || 0) > 0
            ? 'border-amber-300 ring-2 ring-amber-100'
            : 'border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Pending Attention
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
              ⏳
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-amber-600 flex items-center gap-2">
              {loading ? '...' : metrics?.pendingOrdersCount || 0}
              {(metrics?.pendingOrdersCount || 0) > 0 && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Action Needed
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500">Paid orders awaiting review &amp; confirmation</span>
          </div>
        </div>

        {/* Card 3: Revenue Today */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Revenue Today
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              💰
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 truncate">
              {loading ? '...' : formatCurrency(metrics?.revenueToday || 0)}
            </div>
            <span className="text-[11px] text-slate-500">Paid, non-cancelled orders today</span>
          </div>
        </div>

        {/* Card 4: Revenue This Month */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Month to Date
            </span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
              📈
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 truncate">
              {loading ? '...' : formatCurrency(metrics?.revenueThisMonth || 0)}
            </div>
            <span className="text-[11px] text-slate-500">Completed monthly gross volume</span>
          </div>
        </div>
      </div>

      {/* 3. Operational Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Pending Attention Feed */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <h3 className="font-heading font-bold text-base text-slate-900">
                Pending Orders
              </h3>
            </div>
            <Link
              href="/admin/orders?status=pending"
              className="text-xs font-semibold text-rose-500 hover:text-rose-600"
            >
              View all ({metrics?.pendingOrdersCount || 0}) →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
              ))}
            </div>
          ) : !metrics?.pendingOrders || metrics.pendingOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
                ✓
              </div>
              <h4 className="font-heading font-bold text-sm text-slate-800">
                No orders require your attention
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                All paid customer orders have been reviewed, confirmed, or fulfilled.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.pendingOrders.map((order: AdminOrderListItem) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-medium text-slate-800">{order.customer.name}</span>
                      <span>•</span>
                      <span className="text-slate-400">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <span className="font-heading font-bold text-sm text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-all shadow-xs"
                    >
                      Review Order →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Orders Stream */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-heading font-bold text-base text-slate-900">
              Recent Store Activity
            </h3>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Order List →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
              ))}
            </div>
          ) : !metrics?.recentOrders || metrics.recentOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                📦
              </div>
              <h4 className="font-heading font-bold text-sm text-slate-800">
                No orders recorded yet
              </h4>
              <p className="text-xs text-slate-500">
                New customer orders will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.recentOrders.map((order: AdminOrderListItem) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <OrderStatusBadge status={order.paymentStatus} type="payment" />
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="text-slate-800">{order.customer.name}</span>
                      <span>•</span>
                      <span className="text-slate-400">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <span className="font-heading font-bold text-sm text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
