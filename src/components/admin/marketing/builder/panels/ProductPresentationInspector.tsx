"use client";

import React from "react";
import {
  ProductPresentationConfig,
  CatalogProductSummary,
  CatalogProductSummaryImage,
  normalizeProductPresentation,
} from "@/types/marketing-builder";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import { formatPrice } from "@/lib/format-utils";

export interface ProductPresentationInspectorProps {
  presentation: Partial<ProductPresentationConfig>;
  onChange: (updated: ProductPresentationConfig) => void;
  // Optional catalog data if available for image gallery / authoritative info
  catalogProduct?: CatalogProductSummary | null;
  onChangeProductClick?: () => void;
  isGridItem?: boolean;
}

export function ProductPresentationInspector({
  presentation: rawPresentation,
  onChange,
  catalogProduct,
  onChangeProductClick,
  isGridItem = false,
}: ProductPresentationInspectorProps) {
  const presentation = normalizeProductPresentation(rawPresentation);

  // Derive catalog details from catalogProduct prop or cached snapshot
  const snapshot = presentation._catalogSnapshot || {};
  const effectiveTitle = catalogProduct?.title || snapshot.title || "Product";
  const effectivePrice =
    catalogProduct?.price !== undefined
      ? catalogProduct.price
      : snapshot.price !== undefined
      ? snapshot.price
      : 0;
  const effectiveSlug = catalogProduct?.slug || snapshot.slug || "";

  // Collect all available catalog images
  const availableImages: CatalogProductSummaryImage[] = React.useMemo(() => {
    if (catalogProduct?.images && catalogProduct.images.length > 0) {
      return catalogProduct.images;
    }
    if (snapshot.images && snapshot.images.length > 0) {
      return snapshot.images;
    }
    if (catalogProduct?.imageUrl) {
      return [{ id: "primary", url: catalogProduct.imageUrl, isPrimary: true }];
    }
    if (snapshot.imageUrl) {
      return [{ id: "primary", url: snapshot.imageUrl, isPrimary: true }];
    }
    return [];
  }, [catalogProduct, snapshot]);

  // Selected image resolution
  const selectedImageId = presentation.image?.imageId;
  const selectedImageUrl = presentation.image?.url;

  // Resilience check: Is the selected image missing / removed?
  const isSelectedImageMissing = React.useMemo(() => {
    if (!selectedImageUrl && !selectedImageId) return false;
    if (availableImages.length === 0) return true;
    if (selectedImageId) {
      return !availableImages.some((img) => img.id === selectedImageId);
    }
    if (selectedImageUrl) {
      return !availableImages.some((img) => img.url === selectedImageUrl);
    }
    return false;
  }, [availableImages, selectedImageId, selectedImageUrl]);

  const handleSelectImage = (img: CatalogProductSummaryImage) => {
    onChange({
      ...presentation,
      image: {
        imageId: img.id,
        url: img.url,
      },
    });
  };

  const handleBadgeChange = (updates: Partial<ProductPresentationConfig["badge"]>) => {
    onChange({
      ...presentation,
      badge: {
        visible: presentation.badge?.visible ?? false,
        text: presentation.badge?.text ?? "",
        ...updates,
      },
    });
  };

  const handleTitleChange = (updates: Partial<ProductPresentationConfig["title"]>) => {
    onChange({
      ...presentation,
      title: {
        visible: presentation.title?.visible ?? true,
        text: presentation.title?.text ?? effectiveTitle,
        ...updates,
      },
    });
  };

  const handleDescriptionChange = (updates: Partial<ProductPresentationConfig["description"]>) => {
    onChange({
      ...presentation,
      description: {
        visible: presentation.description?.visible ?? true,
        text: presentation.description?.text ?? "",
        ...updates,
      },
    });
  };

  const handlePriceVisibility = (visible: boolean) => {
    onChange({
      ...presentation,
      price: {
        visible,
      },
    });
  };

  const handleCtaChange = (updates: Partial<ProductPresentationConfig["cta"]>) => {
    onChange({
      ...presentation,
      cta: {
        visible: presentation.cta?.visible ?? true,
        text: presentation.cta?.text ?? "Shop now",
        destination: presentation.cta?.destination ?? { type: "product" },
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. CATALOG IDENTITY BANNER */}
      <div className="p-3 rounded-xl bg-bg-subtle border border-border-default space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary">
            {isGridItem ? "Product Catalog Link" : "Selected Product"}
          </span>
          <span className="text-[10px] text-brand-rose font-bold px-1.5 py-0.5 rounded bg-brand-rose/10 uppercase tracking-wider">
            Authoritative
          </span>
        </div>

        <div className="text-xs font-medium text-text-primary truncate">
          {effectiveTitle}
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-secondary">
          <span>Catalog Price: <strong className="text-brand-rose">{formatPrice(effectivePrice)}</strong></span>
          {effectiveSlug && <span className="text-text-tertiary">/{effectiveSlug}</span>}
        </div>

        {onChangeProductClick && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-1"
            onClick={onChangeProductClick}
          >
            🎨 Change Product from Catalog
          </Button>
        )}
      </div>

      {/* 2. PRODUCT IMAGE SELECTOR & RESILIENCE */}
      <div className="space-y-2 pt-2 border-t border-border-default/70">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text-primary">
            Product Image
          </label>
          <span className="text-[10px] text-text-tertiary">
            {availableImages.length} available
          </span>
        </div>

        {/* Missing image resilience warning */}
        {isSelectedImageMissing && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              ⚠️ This product image is no longer available in the catalog.
            </div>
            {availableImages.length > 0 && (
              <p className="text-[11px] text-amber-800">
                Please pick another available image below:
              </p>
            )}
          </div>
        )}

        {/* Image thumbnails */}
        {availableImages.length === 0 ? (
          <div className="p-3 border border-dashed border-border-default rounded-xl text-center bg-bg-subtle/30 text-xs text-text-tertiary">
            ⚠️ This product currently has no catalog images.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableImages.map((img, idx) => {
              const isSelected =
                (selectedImageId && img.id === selectedImageId) ||
                (selectedImageUrl && img.url === selectedImageUrl) ||
                (!selectedImageId && !selectedImageUrl && idx === 0);

              return (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => handleSelectImage(img)}
                  className={`relative aspect-square rounded-xl border-2 overflow-hidden bg-white group transition-all ${
                    isSelected
                      ? "border-brand-rose ring-2 ring-brand-rose/20 shadow-sm"
                      : "border-border-default hover:border-brand-rose/60 opacity-70 hover:opacity-100"
                  }`}
                  title={img.altText || `Catalog Image ${idx + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.altText || "Catalog Image"}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-rose text-white text-[10px] flex items-center justify-center font-bold shadow">
                      ✓
                    </div>
                  )}
                  {img.isPrimary && (
                    <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/60 text-white text-[9px] font-semibold">
                      Primary
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. BADGE SETTINGS */}
      <div className="space-y-2 pt-2 border-t border-border-default/70">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={presentation.badge?.visible ?? false}
            onChange={(e) => handleBadgeChange({ visible: e.target.checked })}
            className="rounded text-brand-rose focus:ring-brand-rose"
          />
          Show badge
        </label>

        {presentation.badge?.visible && (
          <div className="space-y-1 pl-5">
            <TextInput
              placeholder="e.g. Limited Edition, Bestseller..."
              value={presentation.badge?.text ?? ""}
              onChange={(e) => handleBadgeChange({ text: e.target.value })}
            />
            <p className="text-[11px] text-text-tertiary">
              Campaign badge override. Does not modify catalog.
            </p>
          </div>
        )}
      </div>

      {/* 4. TITLE SETTINGS */}
      <div className="space-y-2 pt-2 border-t border-border-default/70">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={presentation.title?.visible ?? true}
            onChange={(e) => handleTitleChange({ visible: e.target.checked })}
            className="rounded text-brand-rose focus:ring-brand-rose"
          />
          Show title
        </label>

        {presentation.title?.visible && (
          <div className="space-y-1 pl-5">
            <TextInput
              placeholder={effectiveTitle}
              value={presentation.title?.text ?? ""}
              onChange={(e) => handleTitleChange({ text: e.target.value })}
            />
            <p className="text-[11px] text-text-tertiary">
              Custom headline for this email. Default: &ldquo;{effectiveTitle}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* 5. DESCRIPTION SETTINGS */}
      <div className="space-y-2 pt-2 border-t border-border-default/70">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={presentation.description?.visible ?? true}
            onChange={(e) =>
              handleDescriptionChange({ visible: e.target.checked })
            }
            className="rounded text-brand-rose focus:ring-brand-rose"
          />
          Show description
        </label>

        {presentation.description?.visible && (
          <div className="space-y-1 pl-5">
            <textarea
              rows={3}
              placeholder="A little space to slow down, breathe and create..."
              value={presentation.description?.text ?? ""}
              onChange={(e) =>
                handleDescriptionChange({ text: e.target.value })
              }
              className="w-full text-xs p-2.5 rounded-xl border border-border-default focus:border-brand-rose outline-none resize-none leading-relaxed"
            />
            <p className="text-[11px] text-text-tertiary">
              Customized presentation copy for this campaign.
            </p>
          </div>
        )}
      </div>

      {/* 6. PRICE SETTINGS (IMMUTABLE CATALOG VALUE) */}
      <div className="space-y-2 pt-2 border-t border-border-default/70">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={presentation.price?.visible ?? true}
            onChange={(e) => handlePriceVisibility(e.target.checked)}
            className="rounded text-brand-rose focus:ring-brand-rose"
          />
          Show price ({formatPrice(effectivePrice)})
        </label>
        <p className="text-[11px] text-text-tertiary pl-5">
          Price is authoritative from the store catalog and cannot be edited arbitrarily.
        </p>
      </div>

      {/* 7. CTA SETTINGS */}
      <div className="space-y-2 pt-2 border-t border-border-default/70">
        <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={presentation.cta?.visible ?? true}
            onChange={(e) => handleCtaChange({ visible: e.target.checked })}
            className="rounded text-brand-rose focus:ring-brand-rose"
          />
          Show CTA Button
        </label>

        {presentation.cta?.visible && (
          <div className="space-y-3 pl-5">
            {/* CTA Button Text */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-text-secondary">
                Button Text
              </span>
              <TextInput
                placeholder="Shop now"
                value={presentation.cta?.text ?? "Shop now"}
                onChange={(e) => handleCtaChange({ text: e.target.value })}
              />
            </div>

            {/* Destination Selection */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">
                Destination
              </span>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                  <input
                    type="radio"
                    name={`cta_dest_${presentation.productId || "single"}`}
                    checked={
                      presentation.cta?.destination?.type === "product" ||
                      !presentation.cta?.destination
                    }
                    onChange={() =>
                      handleCtaChange({ destination: { type: "product" } })
                    }
                    className="text-brand-rose focus:ring-brand-rose"
                  />
                  <span>Product page {effectiveSlug ? `(/products/${effectiveSlug})` : ""}</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                  <input
                    type="radio"
                    name={`cta_dest_${presentation.productId || "single"}`}
                    checked={presentation.cta?.destination?.type === "custom"}
                    onChange={() =>
                      handleCtaChange({
                        destination: {
                          type: "custom",
                          url: (presentation.cta?.destination as any)?.url || "https://",
                        },
                      })
                    }
                    className="text-brand-rose focus:ring-brand-rose"
                  />
                  <span>Custom URL</span>
                </label>
              </div>

              {presentation.cta?.destination?.type === "custom" && (
                <div className="pt-1">
                  <TextInput
                    placeholder="https://unwindanddoodle.com/collections/..."
                    value={presentation.cta.destination.url || ""}
                    onChange={(e) =>
                      handleCtaChange({
                        destination: {
                          type: "custom",
                          url: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-[10px] text-text-tertiary mt-1">
                    Link to a custom collection, editorial article, or preorder landing page.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
