'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminOrderListItem, AdminOrderListResponse } from '@/types/admin-order';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';

function OrdersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const statusParam = searchParams.get('status') || '';
  const paymentParam = searchParams.get('paymentStatus') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sortBy') || 'newest';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [data, setData] = useState<AdminOrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParam);

  const updateFilters = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(newParams)) {
        if (v === undefined || v === '' || v === 'all') {
          params.delete(k);
        } else {
          params.set(k, String(v));
        }
      }
      router.push(`/admin/orders?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusParam) params.set('status', statusParam);
      if (paymentParam) params.set('paymentStatus', paymentParam);
      if (searchParam) params.set('search', searchParam);
      if (sortParam) params.set('sortBy', sortParam);
      if (pageParam > 1) params.set('page', String(pageParam));
      params.set('limit', '25');

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch orders');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading orders');
    } finally {
      setLoading(false);
    }
  }, [statusParam, paymentParam, searchParam, sortParam, pageParam]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    router.push('/admin/orders');
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
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const statusTabs = [
    { label: 'All Orders', value: '' },
    { label: 'Pending Review', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Received', value: 'received' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Refunded', value: 'refunded' },
  ];

  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };
  const hasActiveFilters = Boolean(statusParam || paymentParam || searchParam || sortParam !== 'newest');

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Order Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search, filter, track fulfillment, and manage all customer purchases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            Total: <strong className="text-slate-800">{pagination.total}</strong> orders
          </span>
          <Link
            href="/admin/orders/manual/new"
            className="px-4 py-2 rounded-xl text-xs font-heading font-bold bg-[#1E293B] hover:bg-slate-800 text-white transition-colors shadow-xs flex items-center gap-1.5"
          >
            + Create Manual Order
          </Link>
        </div>
      </div>

      {/* 2. Status Quick Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {statusTabs.map((tab) => {
          const isActive = statusParam === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => updateFilters({ status: tab.value, page: 1 })}
              className={`px-3.5 py-2 rounded-xl text-xs font-heading font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Search and Multi-Filter Controls */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order #, customer name, email, phone..."
              className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Payment Status Dropdown */}
          <div>
            <select
              value={paymentParam}
              onChange={(e) => updateFilters({ paymentStatus: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-rose-400 cursor-pointer"
            >
              <option value="">All Payment Statuses</option>
              <option value="successful">Paid (Successful)</option>
              <option value="pending">Pending Payment</option>
              <option value="failed">Failed Payment</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sortParam}
              onChange={(e) => updateFilters({ sortBy: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-rose-400 cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="highest_total">Sort: Highest Total</option>
              <option value="lowest_total">Sort: Lowest Total</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Filtered view active</span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
            >
              Clear All Filters ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchOrders} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 4. Orders Data Presentation (Desktop Table + Mobile Cards) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              📦
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              {hasActiveFilters ? 'No orders match your filters' : 'No orders found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try broadening your search term or adjusting the status/payment filter.'
                : 'Customer orders will automatically appear in this operational management view.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Order</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Payment</th>
                    <th className="py-3.5 px-4 font-semibold">Items</th>
                    <th className="py-3.5 px-4 font-semibold">Total</th>
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order: AdminOrderListItem) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:text-rose-500 transition-colors"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{order.customer.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {order.customer.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge status={order.paymentStatus} type="payment" />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold transition-all shadow-2xs"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {orders.map((order: AdminOrderListItem) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono font-bold text-xs text-rose-500"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="font-heading font-bold text-sm text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <OrderStatusBadge status={order.paymentStatus} type="payment" />
                  </div>

                  <div className="text-xs text-slate-600 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-800">{order.customer.name}</div>
                      <div className="text-[11px] text-slate-400">{order.customer.email}</div>
                    </div>
                    <span className="text-[11px] text-slate-400">{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="w-full text-center py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      View Order Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 5. Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500">
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
              <strong className="text-slate-800">{pagination.totalPages}</strong> (
              {pagination.total} total orders)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => updateFilters({ page: pagination.page - 1 })}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => updateFilters({ page: pagination.page + 1 })}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-semibold">Loading orders...</div>
      }
    >
      <OrdersListContent />
    </Suspense>
  );
}
