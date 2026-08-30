'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AdminInventoryItem,
  AdminInventoryListResponse,
  AdminWarehouseListItem,
} from '@/types/admin-inventory';

function InventoryOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchParam = searchParams.get('search') || '';
  const warehouseParam = searchParams.get('warehouseId') || '';
  const statusParam = searchParams.get('stockStatus') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [data, setData] = useState<AdminInventoryListResponse | null>(null);
  const [warehouses, setWarehouses] = useState<AdminWarehouseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParam);

  // Stock Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<AdminInventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('Stock audit count');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

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
      router.push(`/admin/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/admin/inventory/warehouses');
      const json = await res.json();
      if (res.ok && json.success) {
        setWarehouses(json.data || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchParam) params.set('search', searchParam);
      if (warehouseParam) params.set('warehouseId', warehouseParam);
      if (statusParam) params.set('stockStatus', statusParam);
      if (pageParam > 1) params.set('page', String(pageParam));
      params.set('limit', '25');

      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch inventory');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading inventory');
    } finally {
      setLoading(false);
    }
  }, [searchParam, warehouseParam, statusParam, pageParam]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    router.push('/admin/inventory');
  };

  const handleOpenAdjustModal = (item: AdminInventoryItem) => {
    setAdjustingItem(item);
    setAdjustQty('');
    setAdjustReason('Stock audit count');
    setAdjustNote('');
    setAdjustError(null);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || adjustQty === '' || Number(adjustQty) === 0) {
      setAdjustError('Please enter a valid non-zero adjustment quantity');
      return;
    }

    const numQty = Number(adjustQty);
    const resultingStock = adjustingItem.quantityOnHand + numQty;
    if (resultingStock < 0) {
      setAdjustError(`Cannot reduce stock below 0. Maximum reduction is -${adjustingItem.quantityOnHand}.`);
      return;
    }

    if (numQty < 0) {
      const confirmed = window.confirm(
        `Are you sure you want to deduct ${Math.abs(numQty)} units from "${adjustingItem.productName}"?`
      );
      if (!confirmed) return;
    }

    try {
      setAdjustSaving(true);
      setAdjustError(null);

      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: adjustingItem.warehouseId,
          product_id: adjustingItem.productId,
          adjustment_quantity: numQty,
          reason: adjustReason,
          note: adjustNote.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAdjustingItem(null);
        await fetchInventory();
      } else {
        throw new Error(json.error || 'Failed to adjust stock');
      }
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : 'Error executing adjustment');
    } finally {
      setAdjustSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusTabs = [
    { label: 'All Items', value: '' },
    { label: 'In Stock', value: 'in_stock' },
    { label: 'Out of Stock', value: 'out_of_stock' },
  ];

  const inventory = data?.inventory || [];
  const summary = data?.summary || {
    totalProductsTracked: 0,
    outOfStockCount: 0,
    totalReservedUnits: 0,
    estimatedInventoryValue: 0,
  };
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };
  const hasActiveFilters = Boolean(searchParam || warehouseParam || statusParam);

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Inventory &amp; Warehouses
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor real-time stock levels, reservations, receipts, movements, and fulfillment hubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/inventory/receipts"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            Goods Receipts
          </Link>
          <Link
            href="/admin/inventory/warehouses"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            Warehouses
          </Link>
          <Link
            href="/admin/inventory/receipts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer"
          >
            <span>+</span> Receive Stock
          </Link>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Products Tracked</span>
            <span>📦</span>
          </div>
          <div className="text-2xl font-bold font-heading text-slate-900">
            {summary.totalProductsTracked}
          </div>
          <p className="text-[11px] text-slate-500">Active catalog items</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Out of Stock</span>
            <span>⚠️</span>
          </div>
          <div className={`text-2xl font-bold font-heading ${summary.outOfStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {summary.outOfStockCount}
          </div>
          <p className="text-[11px] text-slate-500">Items needing restock</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Reserved Units</span>
            <span>🔒</span>
          </div>
          <div className="text-2xl font-bold font-heading text-slate-900">
            {summary.totalReservedUnits}
          </div>
          <p className="text-[11px] text-slate-500">Held for pending checkouts</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Est. Valuation</span>
            <span>💰</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-heading text-emerald-700 truncate">
            {formatCurrency(summary.estimatedInventoryValue)}
          </div>
          <p className="text-[10px] text-slate-400 truncate">Based on current product cost price</p>
        </div>
      </div>

      {/* 3. Search & Filter Controls */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by product title or SKU..."
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

          {/* Warehouse Dropdown */}
          <div>
            <select
              value={warehouseParam}
              onChange={(e) => updateFilters({ warehouseId: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-rose-400 cursor-pointer"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.state ? `(${w.state})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown */}
          <div>
            <select
              value={statusParam}
              onChange={(e) => updateFilters({ stockStatus: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-rose-400 cursor-pointer"
            >
              <option value="">All Stock Levels</option>
              <option value="in_stock">In Stock (Available &gt; 0)</option>
              <option value="out_of_stock">Out of Stock (Available = 0)</option>
            </select>
          </div>
        </div>

        {/* Quick Tabs & Clear */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            {statusTabs.map((tab) => {
              const isActive = statusParam === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => updateFilters({ stockStatus: tab.value, page: 1 })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
            >
              Clear Filters ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchInventory} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 4. Inventory Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              📋
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              {hasActiveFilters ? 'No stock records match filters' : 'No inventory records found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search query or warehouse selection.'
                : 'Receive stock through a Goods Receipt note to track warehouse inventory.'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                href="/admin/inventory/receipts/new"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold"
              >
                + Receive First Stock
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Product</th>
                    <th className="py-3.5 px-4 font-semibold">SKU</th>
                    <th className="py-3.5 px-4 font-semibold">Warehouse</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Stock on Hand</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Reserved</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Available to Sell</th>
                    <th className="py-3.5 px-4 font-semibold">Cost / Unit</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item: AdminInventoryItem) => (
                    <tr key={`${item.warehouseId}-${item.productId}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                            {item.primaryImage ? (
                              <img
                                src={item.primaryImage}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-base">🎨</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/inventory/${item.productId}`}
                                className="font-bold text-slate-900 hover:text-rose-500 transition-colors"
                              >
                                {item.productName}
                              </Link>
                              {item.productType === 'bundle' && (
                                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                                  Bundle (Virtual)
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">/{item.productSlug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {item.sku || '—'}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.warehouseName}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {item.quantityOnHand}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            item.quantityReserved > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.quantityReserved}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.availableToSell > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.availableToSell}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formatCurrency(item.costPrice)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.productType === 'bundle' ? (
                            <span
                              className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold"
                              title="Stock is dynamically calculated from physical component products"
                            >
                              Virtual Stock
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(item)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all cursor-pointer shadow-2xs"
                            >
                              Adjust
                            </button>
                          )}
                          <Link
                            href={`/admin/inventory/${item.productId}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="View Stock Movements"
                          >
                            📜
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {inventory.map((item: AdminInventoryItem) => (
                <div
                  key={`${item.warehouseId}-${item.productId}`}
                  className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.primaryImage ? (
                        <img
                          src={item.primaryImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">🎨</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/inventory/${item.productId}`}
                        className="font-bold text-xs text-slate-900 block truncate"
                      >
                        {item.productName}
                      </Link>
                      <div className="font-mono text-[10px] text-slate-400 truncate">
                        SKU: {item.sku || 'N/A'} • {item.warehouseName}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.availableToSell > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {item.availableToSell > 0 ? `${item.availableToSell} Avail` : 'Out of Stock'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center text-[11px]">
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <div className="text-slate-400 text-[10px]">On Hand</div>
                      <div className="font-bold text-slate-800">{item.quantityOnHand}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <div className="text-slate-400 text-[10px]">Reserved</div>
                      <div className="font-bold text-amber-600">{item.quantityReserved}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <div className="text-slate-400 text-[10px]">Available</div>
                      <div className="font-bold text-emerald-600">{item.availableToSell}</div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAdjustModal(item)}
                      className="flex-1 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      Adjust Stock
                    </button>
                    <Link
                      href={`/admin/inventory/${item.productId}`}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      History ↗
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
              <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total}{' '}
              total rows)
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

      {/* 6. Manual Stock Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleExecuteAdjustment}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">
                Adjust Inventory Stock
              </h4>
              <p className="text-xs text-slate-500">
                {adjustingItem.productName} • {adjustingItem.warehouseName}
              </p>
            </div>

            {/* Current Metrics */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-center text-xs">
              <div>
                <div className="text-[10px] text-slate-400">On Hand</div>
                <div className="font-bold text-slate-800">{adjustingItem.quantityOnHand}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Reserved</div>
                <div className="font-bold text-amber-600">{adjustingItem.quantityReserved}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Available</div>
                <div className="font-bold text-emerald-600">{adjustingItem.availableToSell}</div>
              </div>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {adjustError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Adjustment Quantity (+ to add, - to remove) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. +10 or -2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-rose-400"
                  autoFocus
                  required
                />
                {adjustQty !== '' && (
                  <span className="text-[11px] text-slate-500 block">
                    New On Hand:{' '}
                    <strong
                      className={
                        adjustingItem.quantityOnHand + Number(adjustQty) < 0
                          ? 'text-red-500'
                          : 'text-slate-800'
                      }
                    >
                      {adjustingItem.quantityOnHand + Number(adjustQty)}
                    </strong>{' '}
                    • New Available:{' '}
                    <strong>
                      {Math.max(
                        0,
                        adjustingItem.quantityOnHand +
                          Number(adjustQty) -
                          adjustingItem.quantityReserved
                      )}
                    </strong>
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Stock audit count">Stock audit count / Cycle count</option>
                  <option value="Damaged goods">Damaged / Defective goods</option>
                  <option value="Promotional sample">Promotional / Marketing sample</option>
                  <option value="Internal correction">Internal correction</option>
                  <option value="Loss or theft">Loss / Theft</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Notes / Reference (Optional)</label>
                <textarea
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Add specific details or audit reference..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                disabled={adjustSaving}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustSaving || adjustQty === '' || Number(adjustQty) === 0}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {adjustSaving ? 'Applying...' : 'Confirm Adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-semibold">Loading inventory...</div>
      }
    >
      <InventoryOverviewContent />
    </Suspense>
  );
}
