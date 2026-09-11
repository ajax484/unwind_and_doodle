'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminDashboardMetricsResponse, AdminOrderListItem } from '@/types/admin-order';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AlertBanner from '@/components/AlertBanner';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

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
          <h2 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
            Store Operations Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Real-time overview of orders requiring fulfillment and financial performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            loading={loading}
            leadingIcon="🔄"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            href="/admin/orders"
          >
            Manage All Orders →
          </Button>
        </div>
      </div>

      {error && (
        <AlertBanner
          variant="danger"
          size="sm"
          description={error}
          actionLabel="Retry"
          onAction={fetchMetrics}
        />
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Orders Today */}
        <div className="p-5 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Orders Today
            </span>
            <div className="w-9 h-9 rounded-2xl bg-action-secondary-bg text-action-secondary-text flex items-center justify-center text-lg">
              🛒
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-text-primary">
              {loading ? '...' : metrics?.ordersToday || 0}
            </div>
            <span className="text-[11px] text-text-secondary">Placed in the last 24 hours</span>
          </div>
        </div>

        {/* Card 2: Pending Attention Orders */}
        <div className={`p-5 rounded-3xl bg-bg-surface border shadow-xs space-y-3 flex flex-col justify-between ${
          (metrics?.pendingOrdersCount || 0) > 0
            ? 'border-status-warning-accent/40 ring-2 ring-status-warning-accent/20'
            : 'border-border-default'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-status-warning-text">
              Pending Attention
            </span>
            <div className="w-9 h-9 rounded-2xl bg-status-warning-bg text-status-warning-text flex items-center justify-center text-lg">
              ⏳
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-status-warning-text flex items-center gap-2">
              {loading ? '...' : metrics?.pendingOrdersCount || 0}
              {(metrics?.pendingOrdersCount || 0) > 0 && (
                <Badge variant="status" statusType="warning" size="sm">
                  Action Needed
                </Badge>
              )}
            </div>
            <span className="text-[11px] text-text-secondary">Paid orders awaiting review &amp; confirmation</span>
          </div>
        </div>

        {/* Card 3: Revenue Today */}
        <div className="p-5 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Revenue Today
            </span>
            <div className="w-9 h-9 rounded-2xl bg-status-success-bg text-status-success-text flex items-center justify-center text-lg">
              💰
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-text-primary truncate">
              {loading ? '...' : formatCurrency(metrics?.revenueToday || 0)}
            </div>
            <span className="text-[11px] text-text-secondary">Paid, non-cancelled orders today</span>
          </div>
        </div>

        {/* Card 4: Revenue This Month */}
        <div className="p-5 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Month to Date
            </span>
            <div className="w-9 h-9 rounded-2xl bg-status-purple-base/10 text-status-purple-base flex items-center justify-center text-lg">
              📈
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-text-primary truncate">
              {loading ? '...' : formatCurrency(metrics?.revenueThisMonth || 0)}
            </div>
            <span className="text-[11px] text-text-secondary">Completed monthly gross volume</span>
          </div>
        </div>
      </div>

      {/* 3. Operational Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Pending Attention Feed */}
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-status-warning-accent animate-ping" />
              <h3 className="font-heading font-bold text-base text-text-primary">
                Pending Orders
              </h3>
            </div>
            <Link
              href="/admin/orders?status=pending"
              className="text-xs font-semibold text-action-primary hover:text-action-primary-hover transition-colors"
            >
              View all ({metrics?.pendingOrdersCount || 0}) →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} type="custom" className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : !metrics?.pendingOrders || metrics.pendingOrders.length === 0 ? (
            <EmptyState
              size="sm"
              icon="✓"
              iconContainerClassName="bg-status-success-bg text-status-success-text rounded-2xl"
              title="No orders require your attention"
              description="All paid customer orders have been reviewed, confirmed, or fulfilled."
            />
          ) : (
            <div className="space-y-3">
              {metrics.pendingOrders.map((order: AdminOrderListItem) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-bg-subtle/80 hover:bg-bg-subtle border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-text-primary">
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="text-xs text-text-secondary flex items-center gap-2">
                      <span className="font-medium text-text-primary">{order.customer.name}</span>
                      <span>•</span>
                      <span className="text-text-tertiary">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-default">
                    <span className="font-heading font-bold text-sm text-text-primary">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      href={`/admin/orders/${order.id}`}
                    >
                      Review Order →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Orders Stream */}
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-4">
            <h3 className="font-heading font-bold text-base text-text-primary">
              Recent Store Activity
            </h3>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Order List →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} type="custom" className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : !metrics?.recentOrders || metrics.recentOrders.length === 0 ? (
            <EmptyState
              size="sm"
              icon="📦"
              iconContainerClassName="bg-bg-subtle text-text-tertiary rounded-2xl"
              title="No orders recorded yet"
              description="New customer orders will appear here automatically."
            />
          ) : (
            <div className="space-y-3">
              {metrics.recentOrders.map((order: AdminOrderListItem) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-bg-surface hover:bg-bg-subtle/80 border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-text-primary">
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <OrderStatusBadge status={order.paymentStatus} type="payment" />
                    </div>
                    <div className="text-xs text-text-secondary flex items-center gap-2">
                      <span className="text-text-primary">{order.customer.name}</span>
                      <span>•</span>
                      <span className="text-text-tertiary">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-default">
                    <span className="font-heading font-bold text-sm text-text-primary">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs font-semibold text-action-primary hover:text-action-primary-hover transition-colors"
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
