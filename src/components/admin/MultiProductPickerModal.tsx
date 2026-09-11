'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';
import AlertBanner from '@/components/AlertBanner';

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
      <div className="bg-bg-surface rounded-2xl shadow-2xl border border-border-default w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-subtle/50">
          <div>
            <h3 className="text-lg font-heading font-bold text-text-primary">Add Products &amp; Bundles</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Select multiple products or bundles to add to this manual order.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 p-0 rounded-full text-text-secondary hover:text-text-primary min-h-0"
          >
            ✕
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border-default bg-bg-surface">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog by name or SKU..."
            size="sm"
            leadingIcon={<span className="text-text-tertiary select-none" aria-hidden="true">🔍</span>}
            aria-label="Search catalog products"
          />
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center">
              <Spinner size="md" color="rose" className="mx-auto mb-2" />
              <p className="text-xs text-text-secondary font-medium">Loading catalog products...</p>
            </div>
          ) : error ? (
            <div className="p-4">
              <AlertBanner variant="danger" size="sm" description={error} />
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm font-semibold text-text-primary">No matching products found</p>
              <p className="text-xs text-text-secondary mt-1">Try refining your search query.</p>
            </div>
          ) : (
            products.map((p) => {
              const isSelected = selectedMap.has(p.id);
              const selection = selectedMap.get(p.id);
              const isAlreadyInOrder = alreadySelectedProductIds.includes(p.id);
              const stock = p.availableStock !== undefined ? p.availableStock : 99;
              const isOutOfStock = stock <= 0;
              const isBundle = p.product_type === 'bundle';
              const isCustom = p.product_type === 'custom';

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    isOutOfStock
                      ? 'bg-bg-subtle/50 border-border-default opacity-60'
                      : isSelected
                      ? 'bg-action-primary/5 border-action-primary/40 shadow-xs'
                      : isAlreadyInOrder
                      ? 'bg-status-warning-bg/40 border-status-warning-accent/30'
                      : 'bg-bg-surface border-border-default hover:border-border-brand/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      disabled={isOutOfStock}
                      onChange={() => handleToggleProduct(p)}
                      aria-label={`Select ${p.name}`}
                    />

                    <div className="w-12 h-12 rounded-lg bg-bg-subtle border border-border-default overflow-hidden shrink-0 flex items-center justify-center">
                      {p.primaryImage ? (
                        <img src={p.primaryImage} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{isBundle ? '🎁' : '🎨'}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-semibold text-sm text-text-primary truncate">{p.name}</h4>
                        <Badge
                          variant={isBundle ? 'bundle' : 'status'}
                          statusType={isCustom ? 'info' : 'neutral'}
                          size="sm"
                        >
                          {p.product_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                        {p.sku && <span>SKU: {p.sku}</span>}
                        <span className="font-semibold text-text-primary">
                          ₦{Number(p.selling_price || 0).toLocaleString()}
                        </span>
                        <Badge
                          variant="status"
                          statusType={isOutOfStock ? 'danger' : 'success'}
                          size="sm"
                        >
                          {isBundle
                            ? isOutOfStock
                              ? 'Out of component stock'
                              : `Max buildable: ${stock}`
                            : isOutOfStock
                            ? 'Out of stock'
                            : `${stock} available`}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isSelected ? (
                      <div className="flex items-center gap-1.5 bg-bg-surface border border-border-default rounded-xl p-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(p.id, (selection?.quantity || 1) - 1, stock)}
                          className="w-7 h-7 rounded-lg bg-bg-subtle hover:bg-bg-subtle/80 text-text-primary font-bold flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
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
                          aria-label="Quantity"
                          className="w-10 text-center text-xs font-bold text-text-primary bg-transparent border-none focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(p.id, (selection?.quantity || 1) + 1, stock)}
                          disabled={(selection?.quantity || 1) >= stock}
                          className="w-7 h-7 rounded-lg bg-bg-subtle hover:bg-bg-subtle/80 text-text-primary font-bold flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => handleToggleProduct(p)}
                        variant={isAlreadyInOrder ? 'secondary' : 'outline'}
                        size="sm"
                        className="rounded-lg text-xs font-bold"
                      >
                        {isAlreadyInOrder ? '+ Add More' : 'Select'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border-default bg-bg-subtle flex items-center justify-between">
          <span className="text-xs text-text-secondary font-medium">
            {selectedCount === 0
              ? 'Select products to add to order'
              : `${selectedCount} product${selectedCount > 1 ? 's' : ''} selected`}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              size="sm"
              className="rounded-xl font-semibold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleAddAllSelected}
              variant="primary"
              size="sm"
              className="rounded-xl font-heading font-bold text-xs shadow-xs"
            >
              Add {selectedCount > 0 ? `${selectedCount} Selected` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
