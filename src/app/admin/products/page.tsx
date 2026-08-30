'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminProductListItem, AdminProductListResponse, AdminProductCategoryItem } from '@/types/admin-product';

function ProductsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query state
  const searchParam = searchParams.get('search') || '';
  const statusParam = searchParams.get('status') || '';
  const typeParam = searchParams.get('product_type') || '';
  const categoryParam = searchParams.get('categoryId') || '';
  const sortParam = searchParams.get('sortBy') || 'newest';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [data, setData] = useState<AdminProductListResponse | null>(null);
  const [categories, setCategories] = useState<AdminProductCategoryItem[]>([]);
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
      router.push(`/admin/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const json = await res.json();
      if (res.ok && json.success) {
        setCategories(json.data || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchParam) params.set('search', searchParam);
      if (statusParam) params.set('status', statusParam);
      if (typeParam) params.set('product_type', typeParam);
      if (categoryParam) params.set('categoryId', categoryParam);
      if (sortParam) params.set('sortBy', sortParam);
      if (pageParam > 1) params.set('page', String(pageParam));
      params.set('limit', '25');

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch products');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading catalog');
    } finally {
      setLoading(false);
    }
  }, [searchParam, statusParam, typeParam, categoryParam, sortParam, pageParam]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    router.push('/admin/products');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusTabs = [
    { label: 'All Products', value: '' },
    { label: 'Published', value: 'published' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' },
  ];

  const products = data?.products || [];
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };
  const hasActiveFilters = Boolean(
    searchParam || statusParam || typeParam || categoryParam || sortParam !== 'newest'
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Product Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage coloring books, custom keepsakes, pricing, images, categories, and add-ons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer"
          >
            <span>+</span> Create Product
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

      {/* 3. Search & Multi-Filter Controls */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by product name or SKU..."
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

          {/* Product Type Filter */}
          <div>
            <select
              value={typeParam}
              onChange={(e) => updateFilters({ product_type: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-rose-400 cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="physical">Physical Book / Item</option>
              <option value="custom">Custom Keepsake</option>
              <option value="bundle">Product Bundle</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryParam}
              onChange={(e) => updateFilters({ categoryId: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-rose-400 cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
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
              <option value="price_desc">Sort: Price (High to Low)</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="name_asc">Sort: Name (A–Z)</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Filtered catalog view</span>
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
          <button type="button" onClick={fetchProducts} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 4. Products Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              🎨
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              {hasActiveFilters ? 'No products match your filters' : 'No products found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try clearing or modifying your filter parameters.'
                : 'Get started by creating your first coloring book or add-on product.'}
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
                href="/admin/products/new"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold"
              >
                + Add Product
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
                    <th className="py-3.5 px-4 font-semibold">Categories</th>
                    <th className="py-3.5 px-4 font-semibold">Type</th>
                    <th className="py-3.5 px-4 font-semibold">Selling Price</th>
                    <th className="py-3.5 px-4 font-semibold">Cost Price</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Available Stock</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product: AdminProductListItem) => (
                    <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                            {product.primaryImage ? (
                              <img
                                src={product.primaryImage}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-base">🎨</span>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="font-bold text-slate-900 hover:text-rose-500 transition-colors"
                            >
                              {product.name}
                            </Link>
                            <div className="font-mono text-[10px] text-slate-400">/{product.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {product.sku || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {product.categories.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {product.categories.map((cat) => (
                              <span
                                key={cat.id}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                              >
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            product.product_type === 'custom'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : product.product_type === 'bundle'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {product.product_type === 'custom'
                            ? 'Custom'
                            : product.product_type === 'bundle'
                            ? 'Bundle'
                            : 'Physical'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                        {formatCurrency(product.selling_price)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formatCurrency(product.cost_price)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            product.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : product.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.status === 'published'
                                ? 'bg-emerald-500'
                                : product.status === 'draft'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="capitalize">{product.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {product.availableStock}{' '}
                          <span className="text-[10px] font-normal text-slate-400">
                            ({product.totalStock} {product.product_type === 'bundle' ? 'virtual total' : 'total'})
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${product.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Preview in Storefront"
                          >
                            👁️
                          </Link>
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all shadow-2xs"
                          >
                            Edit
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
              {products.map((product: AdminProductListItem) => (
                <div
                  key={product.id}
                  className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                      {product.primaryImage ? (
                        <img
                          src={product.primaryImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">🎨</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-bold text-xs text-slate-900 block truncate"
                      >
                        {product.name}
                      </Link>
                      <div className="font-mono text-[10px] text-slate-400 truncate">
                        SKU: {product.sku || 'N/A'} • /{product.slug}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        product.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-heading font-bold text-slate-900">
                      {formatCurrency(product.selling_price)}
                    </span>
                    <span className="text-slate-500">
                      Stock: <strong className="text-slate-700">{product.availableStock}</strong>
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                    <Link
                      href={`/products/${product.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Preview ↗
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex-1 text-center py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                    >
                      Edit Product
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
              {pagination.total} total products)
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

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-semibold">Loading catalog...</div>
      }
    >
      <ProductsListContent />
    </Suspense>
  );
}
