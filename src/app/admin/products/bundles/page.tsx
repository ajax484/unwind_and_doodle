'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminBundleListItem, AdminBundleListResponse } from '@/types/admin-bundle';
import { DuplicateBundleModal } from '@/components/admin/DuplicateBundleModal';

function BundleListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchParam = searchParams.get('search') || '';
  const statusParam = searchParams.get('status') || '';
  const sortParam = searchParams.get('sortBy') || 'newest';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [data, setData] = useState<AdminBundleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Duplicate Modal state
  const [duplicateTarget, setDuplicateTarget] = useState<AdminBundleListItem | null>(null);

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
      router.push(`/admin/products/bundles?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchBundles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchParam) params.set('search', searchParam);
      if (statusParam) params.set('status', statusParam);
      if (sortParam) params.set('sortBy', sortParam);
      if (pageParam > 1) params.set('page', String(pageParam));
      params.set('limit', '25');

      const res = await fetch(`/api/admin/products/bundles?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch bundles');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading bundles');
    } finally {
      setLoading(false);
    }
  }, [searchParam, statusParam, sortParam, pageParam]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleConfirmDuplicate = async (formData: { name: string; slug: string; sku: string }) => {
    if (!duplicateTarget) return;

    setActionLoadingId(duplicateTarget.id);
    const res = await fetch(`/api/admin/products/bundles/${duplicateTarget.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    setActionLoadingId(null);

    if (res.ok && json.success && json.data) {
      router.push(`/admin/products/bundles/${json.data.id}`);
    } else {
      throw new Error(json.error || 'Failed to duplicate bundle');
    }
  };

  const handleDeactivate = async (id: string, currentStatus: string) => {
    const targetStatus = currentStatus === 'archived' ? 'draft' : 'archived';
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/admin/products/bundles/${id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchBundles();
      } else {
        alert(json.error || 'Failed to change bundle status');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Bundles
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage product bundles.
          </p>
        </div>

        <Link
          href="/admin/products/bundles/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-all active:scale-[0.98] shrink-0"
        >
          <span>＋</span>
          <span>Create Bundle</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by bundle name or SKU..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusParam || 'all'}
            onChange={(e) => updateFilters({ status: e.target.value, page: 1 })}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortParam}
            onChange={(e) => updateFilters({ sortBy: e.target.value, page: 1 })}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
          </select>
        </div>
      </div>

      {/* Main Table / State Views */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-10 h-10 rounded-full border-2 border-rose-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading bundles catalog...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 text-center text-sm">
          <p className="font-bold">Unable to load bundles</p>
          <p className="mt-1 text-xs">{error}</p>
          <button
            onClick={fetchBundles}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white font-semibold text-xs rounded-lg hover:bg-rose-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : !data || data.bundles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-3xl mx-auto mb-4">
            🎁
          </div>
          <h3 className="text-lg font-heading font-bold text-slate-800">No bundles yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Create your first bundle to group products together.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/products/bundles/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              ＋ Create Bundle
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">Components</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Updated</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {data.bundles.map((bundle: AdminBundleListItem) => (
                  <tr key={bundle.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Product Image & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {bundle.primaryImage ? (
                            <img
                              src={bundle.primaryImage}
                              alt={bundle.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">🎁</span>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/products/bundles/${bundle.id}`}
                            className="font-heading font-bold text-slate-900 hover:text-rose-600 transition-colors text-sm"
                          >
                            {bundle.name}
                          </Link>
                          {bundle.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {bundle.categories.map((c) => (
                                <span
                                  key={c.id}
                                  className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded"
                                >
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {bundle.sku || '—'}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₦{bundle.selling_price.toLocaleString()}
                    </td>

                    {/* Number of Components */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                        📦 {bundle.componentCount}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          bundle.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bundle.status === 'draft'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {bundle.status}
                      </span>
                    </td>

                    {/* Updated Date */}
                    <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                      {new Date(bundle.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/admin/products/bundles/${bundle.id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          View
                        </Link>

                        <Link
                          href={`/admin/products/bundles/${bundle.id}/edit`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDuplicateTarget(bundle)}
                          disabled={actionLoadingId === bundle.id}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Duplicate
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeactivate(bundle.id, bundle.status)}
                          disabled={actionLoadingId === bundle.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            bundle.status === 'archived'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {bundle.status === 'archived' ? 'Activate' : 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {data.pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} bundles)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateFilters({ page: pageParam - 1 })}
                  disabled={pageParam <= 1}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => updateFilters({ page: pageParam + 1 })}
                  disabled={pageParam >= data.pagination.totalPages}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duplicate Modal */}
      <DuplicateBundleModal
        isOpen={Boolean(duplicateTarget)}
        onClose={() => setDuplicateTarget(null)}
        onConfirm={handleConfirmDuplicate}
        initialName={duplicateTarget?.name}
        initialSku={duplicateTarget?.sku || ''}
      />
    </div>
  );
}

export default function AdminBundleListPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">Loading bundle catalog...</div>
      }
    >
      <BundleListContent />
    </Suspense>
  );
}
