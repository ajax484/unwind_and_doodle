'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CatalogProductSummary } from '@/types/marketing-builder';
import { stripHtml } from '@/lib/rich-text';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import Spinner from '@/components/Spinner';
import { formatPrice } from '@/lib/format-utils';

export interface ProductPickerModalProps {
  isOpen: boolean;
  mode: 'single' | 'multiple';
  initialSelectedIds?: string[];
  onSelect: (products: CatalogProductSummary[]) => void;
  onClose: () => void;
}

export function ProductPickerModal({
  isOpen,
  mode,
  initialSelectedIds = [],
  onSelect,
  onClose,
}: ProductPickerModalProps) {
  const [products, setProducts] = useState<CatalogProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set(initialSelectedIds));
    setSearch('');

    async function loadCatalog() {
      try {
        setLoading(true);
        let res = await fetch('/api/products?limit=50');
        let json = await res.json();

        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
          res = await fetch('/api/admin/products?limit=50');
          json = await res.json();
        }

        if (json.success && Array.isArray(json.data)) {
          const mapped: CatalogProductSummary[] = json.data.map((p: any) => {
            const imagesList: any[] = [];
            if (Array.isArray(p.images) && p.images.length > 0) {
              p.images.forEach((img: any, i: number) => {
                if (typeof img === 'string') {
                  imagesList.push({
                    id: `img_${i}`,
                    url: img,
                    isPrimary: i === 0,
                  });
                } else if (img && typeof img === 'object') {
                  const url = img.imageUrl || img.url || '';
                  if (url) {
                    imagesList.push({
                      id: img.id || `img_${i}`,
                      url,
                      altText: img.altText || img.alt || '',
                      isPrimary: Boolean(img.isPrimary ?? i === 0),
                    });
                  }
                }
              });
            } else if (p.primaryImage || p.image_url) {
              const url = p.primaryImage || p.image_url;
              imagesList.push({
                id: 'img_primary',
                url,
                isPrimary: true,
              });
            }

            const primaryImg =
              imagesList.find((img) => img.isPrimary)?.url ||
              imagesList[0]?.url ||
              p.primaryImage ||
              p.image_url ||
              null;

            return {
              id: p.id,
              title: p.title || p.name || 'Untitled Product',
              price: Number(p.base_price || p.price || 0),
              imageUrl: primaryImg,
              images: imagesList,
              slug: p.slug || '',
              description: stripHtml(p.description || ''),
              badge: p.badge || p.tag || '',
            };
          });
          setProducts(mapped);
        }
      } catch (err) {
        console.error('Failed to load store catalog for product picker', err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, [isOpen, initialSelectedIds]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.slug && p.slug.toLowerCase().includes(q))
    );
  }, [products, search]);

  const toggleSelect = (p: CatalogProductSummary) => {
    if (mode === 'single') {
      setSelectedIds(new Set([p.id]));
    } else {
      const next = new Set(selectedIds);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.add(p.id);
      }
      setSelectedIds(next);
    }
  };

  const handleConfirm = () => {
    const selectedList = products.filter((p) => selectedIds.has(p.id));
    onSelect(selectedList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border-default flex items-center justify-between bg-bg-subtle/50">
          <div>
            <h3 className="text-lg font-bold font-heading text-text-primary">
              {mode === 'single' ? 'Select Catalog Product' : 'Select Catalog Products'}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {mode === 'single'
                ? 'Choose a product from your authoritative store inventory.'
                : 'Select one or more products to display in this grid.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-2 rounded-lg hover:bg-bg-subtle"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-border-default/60">
          <TextInput
            placeholder="Search catalog by product name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Product List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="md" />
              <span className="text-xs text-text-tertiary mt-2">Loading catalog...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-sm text-text-tertiary">
              No products found matching &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => toggleSelect(product)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 items-center ${
                      isSelected
                        ? 'border-brand-rose bg-bg-accent ring-2 ring-brand-rose/20'
                        : 'border-border-default hover:border-border-brand/60 bg-bg-surface hover:bg-bg-subtle/40'
                    }`}
                  >
                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg bg-bg-subtle border border-border-default overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg opacity-40">🎨</span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">
                        {product.title}
                      </div>
                      <div className="text-xs font-bold text-text-accent mt-0.5">
                        {formatPrice(product.price)}
                      </div>
                      {product.slug && (
                        <div className="text-[11px] text-text-tertiary truncate">
                          /{product.slug}
                        </div>
                      )}
                    </div>

                    {/* Radio/Checkbox indicator */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-5 h-5 rounded-${
                          mode === 'single' ? 'full' : 'md'
                        } border flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'bg-brand-rose border-brand-rose text-white'
                            : 'border-border-default bg-white'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border-default flex items-center justify-between bg-bg-subtle/30">
          <div className="text-xs text-text-secondary">
            {selectedIds.size} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
            >
              Confirm Selection ({selectedIds.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
