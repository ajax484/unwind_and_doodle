'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface DiscountItem {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minimum_order_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  status: 'Active' | 'Inactive' | 'Scheduled' | 'Expired' | 'Exhausted';
  scope: 'store_wide' | 'products' | 'categories';
  product_count?: number;
  category_count?: number;
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'All') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/discounts?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load discounts');
      }

      setDiscounts(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching discounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDiscounts();
  };

  const handleToggleActive = async (discount: DiscountItem) => {
    try {
      setActionLoadingId(discount.id);
      const res = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !discount.active }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update status');
      }
      fetchDiscounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (discount: DiscountItem) => {
    const isHard = discount.usage_count === 0;
    const msg = isHard
      ? `Are you sure you want to delete discount code ${discount.code}?`
      : `Discount ${discount.code} has ${discount.usage_count} redemptions. It will be soft-disabled to preserve order history. Continue?`;

    if (!confirm(msg)) return;

    try {
      setActionLoadingId(discount.id);
      const res = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete discount');
      }
      fetchDiscounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete discount');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalCount = discounts.length;
  const activeCount = discounts.filter((d) => d.status === 'Active').length;
  const scheduledCount = discounts.filter((d) => d.status === 'Scheduled').length;
  const expiredExhaustedCount = discounts.filter((d) => d.status === 'Expired' || d.status === 'Exhausted').length;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: DiscountItem['status']) => {
    switch (status) {
      case 'Active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>;
      case 'Inactive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Inactive</span>;
      case 'Scheduled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Scheduled</span>;
      case 'Expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Expired</span>;
      case 'Exhausted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Exhausted</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getScopeLabel = (d: DiscountItem) => {
    if (d.product_count && d.product_count > 0 && d.category_count && d.category_count > 0) {
      return `${d.product_count} Prod / ${d.category_count} Cat`;
    }
    if (d.product_count && d.product_count > 0) {
      return `${d.product_count} ${d.product_count === 1 ? 'Product' : 'Products'}`;
    }
    if (d.category_count && d.category_count > 0) {
      return `${d.category_count} ${d.category_count === 1 ? 'Category' : 'Categories'}`;
    }
    return 'Entire store';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Discounts &amp; Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage promotional coupon codes, percentage/fixed discounts, and merchandise targeting rules.
          </p>
        </div>

        <Link
          href="/admin/discounts/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span className="text-lg leading-none">+</span>
          <span>Create Coupon</span>
        </Link>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Total Coupons</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Active Coupons</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Scheduled</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{scheduledCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Expired / Exhausted</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{expiredExhaustedCount}</div>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {['All', 'Active', 'Inactive', 'Scheduled', 'Expired', 'Exhausted'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
            <input
              type="text"
              placeholder="Search coupon code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading discounts...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-600 text-sm">{error}</div>
        ) : discounts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No discounts found. Click <strong>Create Coupon</strong> to add your first promotional code.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Value</th>
                  <th className="px-5 py-3.5">Scope</th>
                  <th className="px-5 py-3.5">Usage</th>
                  <th className="px-5 py-3.5">Start</th>
                  <th className="px-5 py-3.5">Expiry</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 tracking-wide font-mono text-sm">
                      <Link href={`/admin/discounts/${d.id}`} className="hover:text-rose-600">
                        {d.code}
                      </Link>
                    </td>
                    <td className="px-5 py-4 capitalize font-medium text-slate-700">
                      {d.type === 'percentage' ? 'Percentage' : d.type === 'fixed' ? 'Fixed Amount' : d.type}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {d.type === 'percentage' ? `${d.value}%` : `₦${Number(d.value).toLocaleString()}`}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-600">{getScopeLabel(d)}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {d.usage_count} / {d.usage_limit !== null ? d.usage_limit : '∞'}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(d.starts_at)}</td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(d.expires_at)}</td>
                    <td className="px-5 py-4">{getStatusBadge(d.status)}</td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <Link
                        href={`/admin/discounts/${d.id}`}
                        className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={actionLoadingId === d.id}
                        onClick={() => handleToggleActive(d)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          d.active
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {d.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoadingId === d.id}
                        onClick={() => handleDelete(d)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-medium transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
