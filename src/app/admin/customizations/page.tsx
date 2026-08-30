'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AdminCustomizationListItem,
  AdminCustomizationSummaryKPIs,
} from '@/types/admin-review-customization';

export default function AdminCustomizationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [customizations, setCustomizations] = useState<AdminCustomizationListItem[]>([]);
  const [summary, setSummary] = useState<AdminCustomizationSummaryKPIs>({
    totalCustomizations: 0,
    pendingCount: 0,
    processingCount: 0,
    completedCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const fetchCustomizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (page > 1) params.set('page', page.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/admin/customizations?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setCustomizations(json.data.customizations || []);
        setSummary(json.data.summary);
        setPagination(json.data.pagination);
      } else {
        throw new Error(json.error || 'Failed to fetch customizations');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading customizations');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, page]);

  useEffect(() => {
    fetchCustomizations();
  }, [fetchCustomizations]);

  const updateUrl = useCallback(
    (newSearch: string, newStatus: string, newPage: number) => {
      startTransition(() => {
        const params = new URLSearchParams();
        if (newSearch) params.set('search', newSearch);
        if (newStatus !== 'all') params.set('status', newStatus);
        if (newPage > 1) params.set('page', newPage.toString());

        router.replace(`/admin/customizations?${params.toString()}`);
      });
    },
    [router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
    updateUrl(val, statusFilter, 1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
    updateUrl(searchTerm, val, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(searchTerm, statusFilter, newPage);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Custom Coloring-Book Orders Queue
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage customer-uploaded portrait photos, convert them to printable line art, and track artwork completion.
          </p>
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Pending Artwork
          </span>
          <div className="text-2xl font-bold font-heading text-rose-600">
            {summary.pendingCount}
          </div>
          <p className="text-[11px] text-slate-400">Needs line-art conversion</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            In Processing
          </span>
          <div className="text-2xl font-bold font-heading text-amber-600">
            {summary.processingCount}
          </div>
          <p className="text-[11px] text-slate-400">Artwork in progress</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Completed Artwork
          </span>
          <div className="text-2xl font-bold font-heading text-emerald-600">
            {summary.completedCount}
          </div>
          <p className="text-[11px] text-slate-400">Ready for print & dispatch</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Total Custom Orders
          </span>
          <div className="text-2xl font-bold font-heading text-slate-900">
            {summary.totalCustomizations}
          </div>
          <p className="text-[11px] text-slate-400">All custom book orders</p>
        </div>
      </div>

      {/* 3. Search & Filter Tabs */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search order #, customer, product..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto w-full md:w-auto">
          {(['all', 'pending', 'processing', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleStatusChange(st)}
              className={`px-3 py-1 rounded-lg font-semibold capitalize whitespace-nowrap cursor-pointer transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {st === 'pending' ? 'Pending (Urgent)' : st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchCustomizations} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 4. Customization Queue Table & Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : customizations.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              🎨
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              No custom book orders found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or filter tabs.'
                : 'Custom photo coloring book orders will appear here automatically when customer checkout completes.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Order</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Custom Product</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Artwork Assets</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Submitted</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customizations.map((c) => {
                    const isAllDone =
                      c.totalAssetsCount > 0 && c.processedAssetsCount === c.totalAssetsCount;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Order */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/admin/orders/${c.orderId}`}
                            className="font-mono font-bold text-slate-900 hover:text-rose-500 block"
                          >
                            #{c.orderNumber}
                          </Link>
                          <span className="text-[10px] text-slate-400 block">
                            Status: {c.orderStatus}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/admin/customers/${c.customerId}`}
                            className="font-semibold text-slate-800 hover:text-rose-500 block"
                          >
                            {c.customerName}
                          </Link>
                          <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                            {c.customerEmail}
                          </span>
                        </td>

                        {/* Product */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {c.productName}
                        </td>

                        {/* Assets Progress */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="space-y-1 inline-block">
                            <span
                              className={`font-mono text-xs font-bold ${
                                isAllDone ? 'text-emerald-600' : 'text-slate-800'
                              }`}
                            >
                              {c.processedAssetsCount} / {c.totalAssetsCount} processed
                            </span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  isAllDone ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                style={{
                                  width: `${
                                    c.totalAssetsCount > 0
                                      ? (c.processedAssetsCount / c.totalAssetsCount) * 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : c.status === 'processing'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Submitted */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/admin/customizations/${c.id}`}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs shadow-xs"
                          >
                            Artwork Workspace →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-100 p-3 space-y-3">
              {customizations.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">#{c.orderNumber}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.status === 'processing'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="text-slate-800 font-semibold">{c.productName}</div>
                  <div className="text-slate-500">
                    Customer: {c.customerName} • {c.processedAssetsCount}/{c.totalAssetsCount} line-art files ready
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-slate-400 text-[10px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/admin/customizations/${c.id}`}
                      className="text-rose-500 font-bold hover:underline"
                    >
                      Workspace →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} orders
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <span className="font-semibold text-slate-800">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
