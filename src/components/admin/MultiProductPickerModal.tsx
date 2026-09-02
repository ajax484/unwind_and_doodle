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

export interface MultiProductSelection {
  product: SelectableProduct;
  quantity: number;
}

interface MultiProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (selections: MultiProductSelection[]) => void;
  alreadySelectedProductIds?: string[];
}

export function MultiProductPickerModal({
  isOpen,
  onClose,
  onAddProducts,
  alreadySelectedProductIds = [],
}: MultiProductPickerModalProps) {
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft selection state within the modal: Map productId -> { product, quantity }
  const [selectedMap, setSelectedMap] = useState<Map<string, MultiProductSelection>>(new Map());

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
    } else {
      // Reset draft selections when modal closes
      setSelectedMap(new Map());
    }
  }, [isOpen, fetchProducts, search]);

  if (!isOpen) return null;

  const handleToggleProduct = (product: SelectableProduct) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        const maxStock = product.availableStock !== undefined ? Math.max(1, product.availableStock) : 9999;
        next.set(product.id, {
          product,
          quantity: 1,
        });
      }
      return next;
    });
  };

  const handleUpdateQuantity = (productId: string, qty: number, maxStock?: number) => {
    const safeMax = maxStock !== undefined ? Math.max(1, maxStock) : 9999;
    const clampedQty = Math.max(1, Math.min(qty, safeMax));

    setSelectedMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (existing) {
        next.set(productId, { ...existing, quantity: clampedQty });
      }
      return next;
    });
  };

  const handleAddAllSelected = () => {
    const selections = Array.from(selectedMap.values());
    if (selections.length > 0) {
      onAddProducts(selections);
    }
    onClose();
  };

  const selectedCount = selectedMap.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-heading font-bold text-slate-800">Add Products &amp; Bundles</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select multiple products or bundles to add to this manual order.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
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
              placeholder="Search catalog by name or SKU..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Loading catalog products...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm font-semibold text-slate-700">No matching products found</p>
              <p className="text-xs text-slate-400 mt-1">Try refining your search query.</p>
            </div>
          ) : (
            products.map((p) => {
              const isSelected = selectedMap.has(p.id);
              const selection = selectedMap.get(p.id);
              const isAlreadyInOrder = alreadySelectedProductIds.includes(p.id);
              const stock = p.availableStock !== undefined ? p.availableStock : 99;
              const isOutOfStock = stock <= 0;
              const isBundle = p.product_type === 'bundle';

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    isOutOfStock
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : isSelected
                      ? 'bg-rose-50/60 border-rose-300 shadow-2xs'
                      : isAlreadyInOrder
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isOutOfStock}
                      onChange={() => handleToggleProduct(p)}
                      className="w-4 h-4 rounded-md text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                    />

                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.primaryImage ? (
                        <img src={p.primaryImage} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{isBundle ? '🎁' : '🎨'}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-semibold text-sm text-slate-800 truncate">{p.name}</h4>
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
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isBundle
                            ? isOutOfStock
                              ? 'Out of component stock'
                              : `Max buildable: ${stock}`
                            : isOutOfStock
                            ? 'Out of stock'
                            : `${stock} available`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isSelected ? (
                      <div className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-xl p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(p.id, (selection?.quantity || 1) - 1, stock)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={stock}
                          value={selection?.quantity || 1}
                          onChange={(e) =>
                            handleUpdateQuantity(p.id, parseInt(e.target.value, 10) || 1, stock)
                          }
                          className="w-10 text-center text-xs font-bold text-slate-800 border-none focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(p.id, (selection?.quantity || 1) + 1, stock)}
                          disabled={(selection?.quantity || 1) >= stock}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => handleToggleProduct(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isAlreadyInOrder ? '+ Add More' : 'Select'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {selectedCount === 0
              ? 'Select products to add to order'
              : `${selectedCount} product${selectedCount > 1 ? 's' : ''} selected`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleAddAllSelected}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-heading font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              Add {selectedCount > 0 ? `${selectedCount} Selected` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
