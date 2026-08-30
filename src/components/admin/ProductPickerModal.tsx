'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface SelectableProduct {
  id: string;
  name: string;
  sku: string | null;
  product_type: 'physical' | 'custom' | 'bundle';
  selling_price: number;
  cost_price?: number;
  availableStock?: number;
  primaryImage: string | null;
  status: string;
}

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: SelectableProduct) => void;
  selectedProductIds: string[];
}

export function ProductPickerModal({
  isOpen,
  onClose,
  onSelectProduct,
  selectedProductIds,
}: ProductPickerModalProps) {
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        limit: '50',
      });
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setProducts(json.data.products || []);
      } else {
        throw new Error(json.error || 'Failed to fetch products');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to search products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProducts(search);
    }
  }, [isOpen, fetchProducts, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-heading font-bold text-slate-800">Select Component Product</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose a physical or custom product to include in this bundle.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Searching catalog...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm font-semibold text-slate-700">No matching products found</p>
              <p className="text-xs text-slate-400 mt-1">Try refining your search term.</p>
            </div>
          ) : (
            products.map((p) => {
              const isBundle = p.product_type === 'bundle';
              const isAlreadyAdded = selectedProductIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isBundle
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : isAlreadyAdded
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.primaryImage ? (
                        <img
                          src={p.primaryImage}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">🎨</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-semibold text-sm text-slate-800 truncate">
                          {p.name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isBundle
                              ? 'bg-purple-100 text-purple-700'
                              : p.product_type === 'custom'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.product_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        {p.sku && <span>SKU: {p.sku}</span>}
                        <span className="font-semibold text-slate-700">
                          ₦{Number(p.selling_price || 0).toLocaleString()}
                        </span>
                        {p.availableStock !== undefined && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              p.availableStock > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {p.availableStock > 0 ? `${p.availableStock} in stock` : 'Out of stock'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isBundle ? (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        Bundle (Cannot add)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProduct(p);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isAlreadyAdded
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {isAlreadyAdded ? '+ Add Again' : 'Select'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Only physical &amp; custom products can be bundled.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
