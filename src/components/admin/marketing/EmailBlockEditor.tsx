'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CampaignBlock,
  CampaignBlockType,
  HeaderBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  ProductCardBlock,
  ProductGridBlock,
  HighlightBoxBlock,
  DynamicRecommendationBlock,
  DividerBlock,
  ProductGridItem,
} from '@/types/marketing';
import Button from '@/components/Button';
import { formatPrice } from '@/lib/format-utils';

export interface EmailBlockEditorProps {
  blocks: CampaignBlock[];
  onChange: (blocks: CampaignBlock[]) => void;
  disabled?: boolean;
}

export interface CatalogProduct {
  id: string;
  title: string;
  price: number;
  imageUrl?: string | null;
  slug?: string;
  description?: string;
}

export function EmailBlockEditor({
  blocks,
  onChange,
  disabled = false,
}: EmailBlockEditorProps) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Product Picker Modal State
  const [activePicker, setActivePicker] = useState<{
    blockId: string;
    mode: 'single' | 'multiple';
  } | null>(null);

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Load products from store catalog
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        // Fetch from published catalog with fallback to admin products
        let res = await fetch('/api/products?limit=50');
        let json = await res.json();

        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
          res = await fetch('/api/admin/products?limit=50');
          json = await res.json();
        }

        if (json.success && Array.isArray(json.data)) {
          const mapped: CatalogProduct[] = json.data.map((p: any) => {
            const rawImg = Array.isArray(p.images) && p.images.length > 0
              ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url)
              : p.image_url || null;

            return {
              id: p.id,
              title: p.title || p.name || 'Untitled Product',
              price: Number(p.base_price || p.price || 0),
              imageUrl: rawImg,
              slug: p.slug || '',
              description: p.description || '',
            };
          });
          setCatalog(mapped);
        }
      } catch (err) {
        console.warn('Failed to load store products for email builder', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return catalog;
    const q = productSearch.toLowerCase();
    return catalog.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.slug && p.slug.toLowerCase().includes(q))
    );
  }, [catalog, productSearch]);

  // Update a block by ID
  const updateBlock = useCallback(
    (id: string, updates: Partial<CampaignBlock>) => {
      if (disabled) return;
      const next = blocks.map((b) => (b.id === id ? ({ ...b, ...updates } as CampaignBlock) : b));
      onChange(next);
    },
    [blocks, onChange, disabled]
  );

  // Add a new block
  const addBlock = useCallback(
    (type: CampaignBlockType) => {
      if (disabled) return;
      const newId = `block_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      let newBlock: CampaignBlock;

      switch (type) {
        case 'header':
          newBlock = {
            id: newId,
            type: 'header',
            title: 'I made something for the girls 🎀',
            subtitle: 'Limited Edition A6 Custom Colouring Book',
            showLogo: true,
          };
          break;

        case 'text':
          newBlock = {
            id: newId,
            type: 'text',
            html: '<p>Hi {{first_name}},</p><p>Write your message here...</p>',
          };
          break;

        case 'image':
          newBlock = {
            id: newId,
            type: 'image',
            url: '',
            alt: 'Promo Banner',
            caption: '',
            linkUrl: '',
          };
          break;

        case 'button':
          newBlock = {
            id: newId,
            type: 'button',
            text: 'Preorder Now 🎀',
            url: '/products',
            style: 'rose',
            align: 'center',
          };
          break;

        case 'product_card': {
          const firstProd = catalog[0];
          newBlock = {
            id: newId,
            type: 'product_card',
            productId: firstProd?.id,
            title: firstProd?.title || 'For the Girls — A6 Custom Colouring Book',
            price: firstProd?.price || 5500,
            badge: 'Limited Preorder',
            imageUrl: firstProd?.imageUrl || '',
            description: firstProd?.description || '30 aesthetic hand-drawn pages + your name on the cover.',
            ctaText: 'Preorder for ₦5,500',
            ctaUrl: firstProd?.slug ? `/products/${firstProd.slug}` : '/products',
          };
          break;
        }

        case 'product_grid': {
          const sampleProducts: ProductGridItem[] = catalog.slice(0, 2).map((p) => ({
            productId: p.id,
            title: p.title,
            price: p.price,
            imageUrl: p.imageUrl || undefined,
            url: p.slug ? `/products/${p.slug}` : '/products',
          }));

          newBlock = {
            id: newId,
            type: 'product_grid',
            heading: 'Recommended For You',
            columns: 2,
            products: sampleProducts.length > 0 ? sampleProducts : [
              { title: 'General Colouring Book', price: 6500, url: '/products' },
              { title: 'Vent to Me Journal', price: 8500, url: '/products' },
            ],
          };
          break;
        }

        case 'highlight_box':
          newBlock = {
            id: newId,
            type: 'highlight_box',
            title: 'Personalized Cover Edition ♡',
            text: "Your name goes right on the cover: {{first_name}}'s Coloring Book ♡",
            variant: 'rose',
          };
          break;

        case 'dynamic_recommendation':
          newBlock = {
            id: newId,
            type: 'dynamic_recommendation',
            heading: 'Curated Next Step for You:',
            recommendationType: 'personalized',
          };
          break;

        case 'divider':
          newBlock = {
            id: newId,
            type: 'divider',
            spacing: 'md',
          };
          break;

        default:
          return;
      }

      onChange([...blocks, newBlock]);
    },
    [blocks, onChange, disabled, catalog]
  );

  // Remove block
  const removeBlock = useCallback(
    (id: string) => {
      if (disabled) return;
      onChange(blocks.filter((b) => b.id !== id));
    },
    [blocks, onChange, disabled]
  );

  // Move block up/down
  const moveBlock = useCallback(
    (index: number, direction: 'up' | 'down') => {
      if (disabled) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= blocks.length) return;

      const next = [...blocks];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      onChange(next);
    },
    [blocks, onChange, disabled]
  );

  // Duplicate block
  const duplicateBlock = useCallback(
    (index: number) => {
      if (disabled) return;
      const source = blocks[index];
      const cloned: CampaignBlock = {
        ...source,
        id: `block_${source.type}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
      const next = [...blocks];
      next.splice(index + 1, 0, cloned);
      onChange(next);
    },
    [blocks, onChange, disabled]
  );

  // Open Product Picker for a block
  const openProductPicker = (blockId: string, mode: 'single' | 'multiple', currentProductIds: string[] = []) => {
    setSelectedProductIds(new Set(currentProductIds));
    setProductSearch('');
    setActivePicker({ blockId, mode });
  };

  // Confirm Product Picker selection
  const handleConfirmProductPicker = () => {
    if (!activePicker) return;
    const { blockId, mode } = activePicker;

    if (mode === 'single') {
      const selectedId = Array.from(selectedProductIds)[0];
      const prod = catalog.find((p) => p.id === selectedId);
      if (prod) {
        updateBlock(blockId, {
          productId: prod.id,
          title: prod.title,
          price: prod.price,
          imageUrl: prod.imageUrl || undefined,
          description: prod.description || undefined,
          ctaUrl: prod.slug ? `/products/${prod.slug}` : '/products',
          ctaText: `Preorder for ${formatPrice(prod.price)}`,
        });
      }
    } else {
      // Multi-product grid
      const chosen = catalog.filter((p) => selectedProductIds.has(p.id));
      const items: ProductGridItem[] = chosen.map((p) => ({
        productId: p.id,
        title: p.title,
        price: p.price,
        imageUrl: p.imageUrl || undefined,
        url: p.slug ? `/products/${p.slug}` : '/products',
      }));

      updateBlock(blockId, {
        products: items,
      });
    }

    setActivePicker(null);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Blocks List */}
      <div className="flex flex-col gap-3">
        {blocks.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-border-default rounded-2xl text-center bg-bg-surface flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="text-sm font-bold text-text-primary font-heading">
              Your email canvas is empty
            </span>
            <p className="text-xs text-text-secondary max-w-sm">
              Add modular blocks below to build an email design matching the Figma design system.
            </p>
          </div>
        ) : (
          blocks.map((block, index) => (
            <div
              key={block.id}
              className="p-4 rounded-2xl border border-border-default bg-bg-surface shadow-xs transition-all flex flex-col gap-3 group hover:border-border-brand/50"
            >
              {/* Block Header Toolbar */}
              <div className="flex items-center justify-between border-b border-border-default/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-bg-subtle text-text-secondary uppercase">
                    {block.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Move up"
                    disabled={disabled || index === 0}
                    onClick={() => moveBlock(index, 'up')}
                    className="p-1 text-xs rounded hover:bg-bg-subtle text-text-secondary disabled:opacity-30 cursor-pointer"
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={disabled || index === blocks.length - 1}
                    onClick={() => moveBlock(index, 'down')}
                    className="p-1 text-xs rounded hover:bg-bg-subtle text-text-secondary disabled:opacity-30 cursor-pointer"
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    title="Duplicate block"
                    disabled={disabled}
                    onClick={() => duplicateBlock(index)}
                    className="p-1 text-xs rounded hover:bg-bg-subtle text-text-secondary cursor-pointer"
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    title="Remove block"
                    disabled={disabled}
                    onClick={() => removeBlock(block.id)}
                    className="p-1 text-xs rounded hover:bg-status-red-bg text-status-red-text cursor-pointer ml-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Block Form Fields by Type */}
              {block.type === 'header' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={block.title}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border-default bg-bg-surface focus:outline-none focus:ring-2 focus:ring-border-brand font-heading font-bold"
                      placeholder="e.g. I made something for the girls 🎀"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Subtitle (Optional)
                    </label>
                    <input
                      type="text"
                      value={block.subtitle || ''}
                      onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border-default bg-bg-surface focus:outline-none focus:ring-2 focus:ring-border-brand"
                      placeholder="e.g. Tiny Custom Colouring Book"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 text-xs font-medium text-text-primary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={block.showLogo !== false}
                        onChange={(e) => updateBlock(block.id, { showLogo: e.target.checked })}
                        disabled={disabled}
                        className="rounded border-border-default text-brand-rose focus:ring-border-brand"
                      />
                      Show 'Unwind &amp; Doodle' Badge
                    </label>
                  </div>
                </div>
              )}

              {block.type === 'text' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-text-secondary">
                      Body HTML / Paragraphs
                    </label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-text-tertiary">Insert:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextHtml = (block.html || '') + ' {{first_name}}';
                          updateBlock(block.id, { html: nextHtml });
                        }}
                        className="px-1.5 py-0.5 rounded bg-bg-subtle text-action-secondary-text font-mono font-bold hover:bg-brand-blue-light cursor-pointer"
                      >
                        &#123;&#123;first_name&#125;&#125;
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    value={block.html}
                    onChange={(e) => updateBlock(block.id, { html: e.target.value })}
                    disabled={disabled}
                    className="w-full p-3 text-sm rounded-xl border border-border-default bg-bg-surface font-mono text-xs focus:outline-none focus:ring-2 focus:ring-border-brand leading-relaxed"
                    placeholder="<p>Hi {{first_name}},</p><p>Your message here...</p>"
                  />
                </div>
              )}

              {/* SINGLE PRODUCT CARD WITH DIRECT STORE SELECTION */}
              {block.type === 'product_card' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-bg-subtle border border-border-default">
                    <div className="flex items-center gap-3">
                      {block.imageUrl ? (
                        <img
                          src={block.imageUrl}
                          alt={block.title}
                          className="w-12 h-12 object-cover rounded-lg border border-border-default bg-white"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-bg-surface border border-border-default flex items-center justify-center text-xs text-text-tertiary">
                          🛍️
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold font-heading text-text-primary">
                          {block.title}
                        </div>
                        <div className="text-xs font-bold text-brand-rose">
                          {block.price !== undefined ? formatPrice(Number(block.price)) : '₦0'}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openProductPicker(block.id, 'single', block.productId ? [block.productId] : [])}
                    >
                      🔍 Select Store Product
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Product Title
                      </label>
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Price (₦)
                      </label>
                      <input
                        type="number"
                        value={block.price ?? ''}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            price: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                        placeholder="5500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Badge (e.g. 'Limited Preorder')
                      </label>
                      <input
                        type="text"
                        value={block.badge || ''}
                        onChange={(e) => updateBlock(block.id, { badge: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                        placeholder="Limited Preorder"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Image URL
                      </label>
                      <input
                        type="text"
                        value={block.imageUrl || ''}
                        onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={block.description || ''}
                        onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                        placeholder="30 aesthetic hand-drawn pages + your name on the cover."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        CTA Text
                      </label>
                      <input
                        type="text"
                        value={block.ctaText || ''}
                        onChange={(e) => updateBlock(block.id, { ctaText: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface font-semibold"
                        placeholder="Preorder for ₦5,500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        CTA Link URL
                      </label>
                      <input
                        type="text"
                        value={block.ctaUrl || ''}
                        onChange={(e) => updateBlock(block.id, { ctaUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                        placeholder="/products/for-the-girls"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MULTI-PRODUCT GRID BLOCK */}
              {block.type === 'product_grid' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Grid Section Heading
                      </label>
                      <input
                        type="text"
                        value={block.heading || ''}
                        onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                        className="px-3 py-1.5 text-xs rounded-xl border border-border-default bg-bg-surface font-semibold"
                        placeholder="e.g. Community Favorites"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        openProductPicker(
                          block.id,
                          'multiple',
                          block.products.map((p) => p.productId).filter(Boolean) as string[]
                        )
                      }
                    >
                      🛍️ Select Multiple Store Products ({block.products?.length || 0})
                    </Button>
                  </div>

                  {/* Selected Products in Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {block.products?.map((item, pIndex) => (
                      <div
                        key={pIndex}
                        className="p-2.5 rounded-xl bg-bg-subtle border border-border-default flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-9 h-9 object-cover rounded-md border border-border-default bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-white border border-border-default flex items-center justify-center text-xs shrink-0">
                              📦
                            </div>
                          )}
                          <div className="truncate">
                            <div className="text-xs font-bold text-text-primary truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] font-bold text-brand-rose">
                              {item.price !== undefined ? formatPrice(Number(item.price)) : '₦0'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          title="Remove from grid"
                          onClick={() => {
                            const nextProducts = block.products.filter((_, i) => i !== pIndex);
                            updateBlock(block.id, { products: nextProducts });
                          }}
                          className="text-xs text-status-danger-text hover:bg-status-danger-bg p-1 rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BUTTON BLOCK WITH REAL-TIME STYLED PREVIEW */}
              {block.type === 'button' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={block.text}
                        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface font-semibold"
                        placeholder="Preorder Now 🎀"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Destination URL
                      </label>
                      <input
                        type="text"
                        value={block.url}
                        onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                        placeholder="/products/for-the-girls"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Button Color
                      </label>
                      <select
                        value={block.style || 'rose'}
                        onChange={(e) => updateBlock(block.id, { style: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                      >
                        <option value="rose">Brand Rose (Pink #D99BA3)</option>
                        <option value="blue">Brand Blue (#A7C2D4)</option>
                      </select>
                    </div>
                  </div>

                  {/* Visual Button Display in Editor */}
                  <div className="p-4 rounded-xl bg-bg-subtle/50 border border-border-default flex flex-col items-center justify-center gap-1.5">
                    <span className="text-[11px] text-text-tertiary uppercase font-semibold tracking-wider">
                      Button Preview:
                    </span>
                    <a
                      href={block.url || '#'}
                      onClick={(e) => e.preventDefault()}
                      style={{
                        backgroundColor: block.style === 'blue' ? '#A7C2D4' : '#D99BA3',
                        color: block.style === 'blue' ? '#243342' : '#FFFFFF',
                      }}
                      className="inline-block px-7 py-3 rounded-full font-bold text-sm shadow-sm transition-transform active:scale-95"
                    >
                      {block.text || 'Shop Now'}
                    </a>
                  </div>
                </div>
              )}

              {block.type === 'highlight_box' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={block.title || ''}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface font-bold"
                      placeholder="Personalized Cover Edition ♡"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Style Variant
                    </label>
                    <select
                      value={block.variant || 'rose'}
                      onChange={(e) => updateBlock(block.id, { variant: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                    >
                      <option value="rose">Rose Tinted (Pink)</option>
                      <option value="blue">Blue Tinted (Soft Blue)</option>
                      <option value="cream">Cream Surface (Neutral)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Highlighted Text
                    </label>
                    <textarea
                      rows={2}
                      value={block.text}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                      placeholder="Your name goes on the cover: {{first_name}}'s Coloring Book ♡"
                    />
                  </div>
                </div>
              )}

              {block.type === 'dynamic_recommendation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Section Heading
                    </label>
                    <input
                      type="text"
                      value={block.heading || ''}
                      onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                      placeholder="Curated Next Step for You:"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Recommendation Engine
                    </label>
                    <select
                      value={block.recommendationType || 'personalized'}
                      onChange={(e) => updateBlock(block.id, { recommendationType: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                    >
                      <option value="personalized">Personalized (Based on customer history)</option>
                      <option value="product">Product Cross-Sell Matrix</option>
                    </select>
                  </div>
                </div>
              )}

              {block.type === 'image' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={block.url}
                      onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={block.alt || ''}
                      onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                      placeholder="For the Girls Cover Photo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Link URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={block.linkUrl || ''}
                      onChange={(e) => updateBlock(block.id, { linkUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                      placeholder="/products/for-the-girls"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Caption (Optional)
                    </label>
                    <input
                      type="text"
                      value={block.caption || ''}
                      onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface"
                      placeholder="30 pages of aesthetic tiny drawings"
                    />
                  </div>
                </div>
              )}

              {block.type === 'divider' && (
                <div className="text-xs text-text-tertiary italic">
                  Divider line (1px subtle border)
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Block Toolbar */}
      <div className="p-4 rounded-2xl border border-border-default bg-bg-subtle/60 flex flex-col gap-2">
        <span className="text-xs font-bold text-text-secondary font-heading uppercase tracking-wider">
          + Add Email Design Block
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('header')}
          >
            🏷️ Header
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('text')}
          >
            📝 Text
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('product_card')}
          >
            🛍️ Product Card
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('product_grid')}
          >
            📦 Product Grid
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('button')}
          >
            🔘 Button
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('highlight_box')}
          >
            ✨ Callout Box
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('dynamic_recommendation')}
          >
            🎯 Dynamic Rec
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('image')}
          >
            🖼️ Image
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => addBlock('divider')}
          >
            ➖ Divider
          </Button>
        </div>
      </div>

      {/* PRODUCT PICKER MODAL */}
      {activePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-bg-surface w-full max-w-2xl rounded-3xl border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-default flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-heading text-text-primary">
                  {activePicker.mode === 'single'
                    ? 'Select Catalog Product'
                    : 'Select Products for Grid'}
                </h3>
                <p className="text-xs text-text-secondary">
                  Choose from your active store books, journals, and kits.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="text-text-tertiary hover:text-text-primary text-sm p-1.5 rounded-lg hover:bg-bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-border-default bg-bg-subtle/50">
              <input
                type="text"
                placeholder="Search products by title or slug..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-border-default bg-bg-surface focus:outline-none focus:ring-2 focus:ring-border-brand"
              />
            </div>

            {/* Product List Grid */}
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loadingCatalog ? (
                <div className="col-span-2 py-12 text-center text-xs text-text-tertiary">
                  Loading catalog products...
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-xs text-text-tertiary">
                  No products found matching "{productSearch}".
                </div>
              ) : (
                filteredCatalog.map((prod) => {
                  const isSelected = selectedProductIds.has(prod.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        if (activePicker.mode === 'single') {
                          setSelectedProductIds(new Set([prod.id]));
                        } else {
                          const next = new Set(selectedProductIds);
                          if (next.has(prod.id)) next.delete(prod.id);
                          else next.add(prod.id);
                          setSelectedProductIds(next);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'border-brand-rose bg-brand-rose-light/50 ring-2 ring-brand-rose/20'
                          : 'border-border-default bg-bg-surface hover:border-border-brand hover:bg-bg-subtle/50'
                      }`}
                    >
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-14 h-14 object-cover rounded-xl border border-border-default bg-white shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-bg-subtle border border-border-default flex items-center justify-center text-lg shrink-0">
                          🎨
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-heading text-text-primary truncate">
                          {prod.title}
                        </div>
                        <div className="text-xs font-bold text-brand-rose mt-0.5">
                          {formatPrice(prod.price)}
                        </div>
                        {prod.slug && (
                          <div className="text-[11px] text-text-tertiary truncate">
                            /{prod.slug}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            isSelected
                              ? 'bg-brand-rose text-white border-brand-rose'
                              : 'border-border-default bg-white text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-default bg-bg-subtle/50 flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                {selectedProductIds.size} product{selectedProductIds.size === 1 ? '' : 's'} selected
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActivePicker(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={selectedProductIds.size === 0}
                  onClick={handleConfirmProductPicker}
                >
                  Confirm Selection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
