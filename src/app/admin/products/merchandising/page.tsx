'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AdminProductListItem, AdminProductCategoryItem } from '@/types/admin-product';

type ActiveTab = 'featured' | 'catalog';

export default function AdminMerchandisingPage() {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [categories, setCategories] = useState<AdminProductCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('featured');
  const [categoryPreviewSlug, setCategoryPreviewSlug] = useState<string>('');
  const [pickerSearch, setPickerSearch] = useState('');

  // Ordered lists in working state
  const [catalogOrderIds, setCatalogOrderIds] = useState<string[]>([]);
  const [featuredOrderIds, setFeaturedOrderIds] = useState<string[]>([]);

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodsRes, catsRes] = await Promise.all([
        fetch('/api/admin/products?status=published&sortBy=display_order&limit=200'),
        fetch('/api/admin/categories'),
      ]);

      const prodsJson = await prodsRes.json();
      const catsJson = await catsRes.json();

      if (!prodsRes.ok || !prodsJson.success) {
        throw new Error(prodsJson.error || 'Failed to load published products');
      }

      const loadedProducts: AdminProductListItem[] = prodsJson.data?.products || [];
      setProducts(loadedProducts);

      const sortedGlobal = [...loadedProducts].sort((a, b) => {
        const diff = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setCatalogOrderIds(sortedGlobal.map((p) => p.id));

      const sortedFeatured = [...loadedProducts]
        .filter((p) => Boolean(p.is_featured))
        .sort((a, b) => {
          const featDiff = (a.featured_order ?? 0) - (b.featured_order ?? 0);
          if (featDiff !== 0) return featDiff;
          return (a.display_order ?? 0) - (b.display_order ?? 0);
        });
      setFeaturedOrderIds(sortedFeatured.map((p) => p.id));

      if (catsRes.ok && catsJson.success) {
        setCategories(catsJson.data || []);
      }

      setHasUnsavedChanges(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading merchandising data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const featuredSet = useMemo(() => new Set(featuredOrderIds), [featuredOrderIds]);

  const orderedCatalogProducts = useMemo(() => {
    const list = catalogOrderIds
      .map((id) => productMap.get(id))
      .filter((p): p is AdminProductListItem => Boolean(p));

    if (!categoryPreviewSlug) return list;
    return list.filter((p) => p.categories.some((c) => c.slug === categoryPreviewSlug));
  }, [catalogOrderIds, productMap, categoryPreviewSlug]);

  const orderedFeaturedProducts = useMemo(
    () =>
      featuredOrderIds
        .map((id) => productMap.get(id))
        .filter((p): p is AdminProductListItem => Boolean(p)),
    [featuredOrderIds, productMap]
  );

  const availableToFeature = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return catalogOrderIds
      .filter((id) => !featuredSet.has(id))
      .map((id) => productMap.get(id))
      .filter((p): p is AdminProductListItem => Boolean(p))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          p.categories.some((c) => c.name.toLowerCase().includes(q))
        );
      });
  }, [catalogOrderIds, featuredSet, productMap, pickerSearch]);

  const reorderList = (list: string[], fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= list.length) {
      return list;
    }
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const moveCatalogItem = (id: string, targetIndex: number) => {
    setCatalogOrderIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      return reorderList(prev, idx, targetIndex);
    });
    setHasUnsavedChanges(true);
  };

  const moveFeaturedItem = (id: string, targetIndex: number) => {
    setFeaturedOrderIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      return reorderList(prev, idx, targetIndex);
    });
    setHasUnsavedChanges(true);
  };

  const toggleFeatured = (id: string) => {
    setFeaturedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
    setHasUnsavedChanges(true);
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDropOnList = (targetId: string, listType: ActiveTab) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    if (listType === 'catalog') {
      if (categoryPreviewSlug) {
        setDraggedId(null);
        return;
      }
      setCatalogOrderIds((prev) => {
        const fromIdx = prev.indexOf(draggedId);
        const toIdx = prev.indexOf(targetId);
        return reorderList(prev, fromIdx, toIdx);
      });
    } else {
      setFeaturedOrderIds((prev) => {
        const fromIdx = prev.indexOf(draggedId);
        const toIdx = prev.indexOf(targetId);
        return reorderList(prev, fromIdx, toIdx);
      });
    }

    setHasUnsavedChanges(true);
    setDraggedId(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const featuredRankMap = new Map<string, number>();
      featuredOrderIds.forEach((id, idx) => featuredRankMap.set(id, idx + 1));

      const items = catalogOrderIds.map((id, idx) => ({
        id,
        display_order: idx + 1,
        is_featured: featuredRankMap.has(id),
        featured_order: featuredRankMap.get(id) ?? 0,
      }));

      const res = await fetch('/api/admin/products/merchandising', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save merchandising order');
      }

      toast.success('Storefront order saved');
      setHasUnsavedChanges(false);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving storefront order';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Storefront Merchandising
          </h1>
          {hasUnsavedChanges && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-heading font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/products"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-heading font-semibold transition-colors"
          >
            ← Products
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-heading font-bold shadow-xs transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('featured')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'featured'
              ? 'bg-neutral-charcoal text-text-inverse shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Homepage Featured</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'featured' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {featuredOrderIds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-neutral-charcoal text-text-inverse shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>All Products Order</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'catalog' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {catalogOrderIds.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchData} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : activeTab === 'featured' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Currently Featured Products */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-heading font-bold text-sm text-slate-900">
                Featured on Homepage ({orderedFeaturedProducts.length})
              </h2>
              <span className="text-[11px] text-slate-500">Out-of-stock items auto-sink</span>
            </div>

            {orderedFeaturedProducts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No products featured yet. Add products from the right panel.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orderedFeaturedProducts.map((product, index) => (
                  <div
                    key={product.id}
                    draggable
                    onDragStart={() => handleDragStart(product.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnList(product.id, 'featured')}
                    className={`px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition-colors cursor-grab active:cursor-grabbing ${
                      draggedId === product.id ? 'opacity-50 bg-rose-50/40' : ''
                    }`}
                  >
                    <span className="w-6 text-center font-mono text-xs font-bold text-slate-400 select-none">
                      {index + 1}
                    </span>

                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {product.primaryImage ? (
                        <img
                          src={product.primaryImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm">🎨</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {product.name}
                        </span>
                        {product.availableStock <= 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 shrink-0">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{formatCurrency(product.selling_price)}</span>
                        {product.categories.length > 0 && (
                          <span className="truncate">
                            · {product.categories.map((c) => c.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveFeaturedItem(product.id, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move ${product.name} up`}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-xs cursor-pointer"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFeaturedItem(product.id, index + 1)}
                        disabled={index === orderedFeaturedProducts.length - 1}
                        aria-label={`Move ${product.name} down`}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-xs cursor-pointer"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFeatured(product.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 text-[11px] font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Add Products to Featured */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 space-y-3">
              <h2 className="font-heading font-bold text-sm text-slate-900">
                Add to Homepage
              </h2>
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Filter products..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-rose-400"
              />
            </div>

            <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
              {availableToFeature.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching products available.
                </div>
              ) : (
                availableToFeature.map((product) => (
                  <div
                    key={product.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {product.primaryImage ? (
                        <img
                          src={product.primaryImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs">🎨</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">
                        {product.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatCurrency(product.selling_price)}
                        {product.availableStock <= 0 ? ' · Out of stock' : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFeatured(product.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      + Feature
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* All Products Global Order Tab */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-heading font-bold text-sm text-slate-900">
                Global Catalog Order
              </h2>
              <span className="text-[11px] text-slate-500">Out-of-stock items auto-sink</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryPreviewSlug}
                onChange={(e) => setCategoryPreviewSlug(e.target.value)}
                aria-label="Filter by category"
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-rose-400 cursor-pointer"
              >
                <option value="">All Categories (Edit Order)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    Preview: {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {orderedCatalogProducts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No published products found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orderedCatalogProducts.map((product, index) => {
                const isFeatured = featuredSet.has(product.id);
                const canReorder = !categoryPreviewSlug;

                return (
                  <div
                    key={product.id}
                    draggable={canReorder}
                    onDragStart={() => canReorder && handleDragStart(product.id)}
                    onDragOver={(e) => canReorder && e.preventDefault()}
                    onDrop={() => canReorder && handleDropOnList(product.id, 'catalog')}
                    className={`px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition-colors ${
                      canReorder ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${draggedId === product.id ? 'opacity-50 bg-rose-50/40' : ''}`}
                  >
                    <span className="w-7 text-center font-mono text-xs font-bold text-slate-400 select-none">
                      {index + 1}
                    </span>

                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {product.primaryImage ? (
                        <img
                          src={product.primaryImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm">🎨</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {product.name}
                        </span>
                        {isFeatured && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            Featured
                          </span>
                        )}
                        {product.availableStock <= 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 shrink-0">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{formatCurrency(product.selling_price)}</span>
                        <span>· Stock: {product.availableStock}</span>
                        {product.categories.length > 0 && (
                          <span className="truncate">
                            · {product.categories.map((c) => c.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(product.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                          isFeatured
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isFeatured ? '★ Featured' : '☆ Feature'}
                      </button>

                      {canReorder && (
                        <>
                          <button
                            type="button"
                            onClick={() => moveCatalogItem(product.id, 0)}
                            disabled={index === 0}
                            aria-label={`Move ${product.name} to top`}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-[11px] font-semibold cursor-pointer"
                          >
                            Top
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCatalogItem(product.id, index - 1)}
                            disabled={index === 0}
                            aria-label={`Move ${product.name} up`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-xs cursor-pointer"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCatalogItem(product.id, index + 1)}
                            disabled={index === orderedCatalogProducts.length - 1}
                            aria-label={`Move ${product.name} down`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-xs cursor-pointer"
                          >
                            ↓
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
