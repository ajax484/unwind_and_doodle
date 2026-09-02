'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CustomizationUploader from '@/components/CustomizationUploader';
import ProductCard from '@/components/ProductCard';
import { ProductDetail, CatalogProductItem } from '@/services/catalog.service';
import { PublicTheme } from '@/types/admin-theme';
import { getCartHeaders, dispatchCartUpdated } from '@/lib/cart-client';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [customization, setCustomization] = useState<{ assetUrls: string[]; notes: string }>({
    assetUrls: [],
    notes: '',
  });

  const [availableThemes, setAvailableThemes] = useState<PublicTheme[]>([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [coverName, setCoverName] = useState<string>('');

  const [relatedProducts, setRelatedProducts] = useState<CatalogProductItem[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'shipping' | 'customization'>('details');

  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
        setAddedSuccess(false);

        const res = await fetch(`/api/products/${slug}`);
        if (!res.ok) throw new Error('Product not found or currently unavailable');
        const json = await res.json();

        if (json.success && json.data) {
          const supportsThemes = Boolean(
            json.data.supportsThemeCustomization ??
            json.data.supports_theme_customization
          );

          setProduct({
            ...json.data,
            supportsThemeCustomization: supportsThemes,
          });
          setSelectedImageIndex(0);

          if (supportsThemes) {
            const themesRes = await fetch(`/api/products/${json.data.slug || json.data.id}/themes`);
            if (themesRes.ok) {
              const themesJson = await themesRes.json();
              if (themesJson.success && Array.isArray(themesJson.themes)) {
                setAvailableThemes(themesJson.themes);
              }
            }
          }

          // Fetch related products from same category if available
          const primaryCat = json.data.categories?.[0]?.slug;
          const relatedRes = await fetch(
            primaryCat ? `/api/products?category=${primaryCat}&limit=4` : '/api/products?limit=4'
          );
          if (relatedRes.ok) {
            const relatedJson = await relatedRes.json();
            if (relatedJson.success && Array.isArray(relatedJson.data)) {
              setRelatedProducts(
                relatedJson.data.filter((p: CatalogProductItem) => p.id !== json.data.id).slice(0, 4)
              );
            }
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading product');
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  const handleToggleTheme = (themeId: string) => {
    setSelectedThemeIds((prev) => {
      if (prev.includes(themeId)) {
        return prev.filter((id) => id !== themeId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, themeId];
    });
  };

  const handleAddonQuantityChange = (addonProductId: string, qty: number) => {
    setSelectedAddons((prev) => {
      const updated = { ...prev };
      if (qty <= 0) {
        delete updated[addonProductId];
      } else {
        updated[addonProductId] = qty;
      }
      return updated;
    });
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (product.requiresCustomization && customization.assetUrls.length === 0) {
      alert('Please upload your customization photo before adding this item to your cart.');
      return;
    }

    if (product.supportsThemeCustomization) {
      if (selectedThemeIds.length === 0) {
        alert('Please choose between 1 and 3 themes for your coloring book.');
        return;
      }
      if (selectedThemeIds.length > 3) {
        alert('You can select a maximum of 3 themes.');
        return;
      }
    }

    try {
      setAddingToCart(true);

      const addonPayload = Object.entries(selectedAddons)
        .filter(([, qty]) => qty > 0)
        .map(([addonProductId, qty]) => ({
          addonProductId,
          quantity: qty,
        }));

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: getCartHeaders(),
        body: JSON.stringify({
          productId: product.id,
          quantity,
          addons: addonPayload,
          customization: product.requiresCustomization ? customization : undefined,
          themeCustomization: product.supportsThemeCustomization
            ? { selectedThemeIds, coverName: coverName.trim() || undefined }
            : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to add item to cart');
      }

      setAddedSuccess(true);
      dispatchCartUpdated(json.data, true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
          <div className="lg:col-span-6 aspect-square bg-[#F4F8FA] rounded-3xl" />
          <div className="lg:col-span-6 space-y-6">
            <div className="h-6 bg-[#F4F8FA] rounded-md w-1/4" />
            <div className="h-10 bg-[#F4F8FA] rounded-lg w-3/4" />
            <div className="h-6 bg-[#F4F8FA] rounded-md w-1/3" />
            <div className="h-24 bg-[#F4F8FA] rounded-xl" />
            <div className="h-12 bg-[#F4F8FA] rounded-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#FBF0F2] text-[#D99BA3] flex items-center justify-center text-4xl mx-auto shadow-xs">
          🎨
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#243342]">
            Product Unavailable
          </h2>
          <p className="text-sm text-[#52657A]">
            {error || 'The requested product could not be found in our published collection.'}
          </p>
        </div>
        <Link href="/products" className="btn-rose text-xs sm:text-sm !px-6 inline-block">
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  const galleryImages =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.imageUrl)
      : product.primaryImage
      ? [product.primaryImage]
      : [];

  const currentImage = galleryImages[selectedImageIndex] || null;

  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(product.price);

  const primaryCategory = product.categories?.[0];

  // Stock status text
  const stockText = !product.isAvailable
    ? 'Out of Stock'
    : product.availableStock <= 5
    ? `Low Stock (${product.availableStock} left)`
    : 'In Stock';

  // Calculate bundle savings if applicable
  let bundleSavingsAmount = 0;
  if (product.productType === 'bundle' && product.bundleItems && product.bundleItems.length > 0) {
    const componentTotalCost = product.bundleItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    if (componentTotalCost > product.price) {
      bundleSavingsAmount = componentTotalCost - product.price;
    }
  }

  const formattedBundleSavings = bundleSavingsAmount > 0
    ? new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(bundleSavingsAmount)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16 sm:space-y-24">
      {/* 1. BREADCRUMBS */}
      <nav className="text-xs font-heading font-semibold text-[#8295A8] flex items-center gap-2">
        <Link href="/" className="hover:text-[#243342] transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#243342] transition-colors">
          Products
        </Link>
        {primaryCategory && (
          <>
            <span>/</span>
            <Link
              href={`/products?category=${primaryCategory.slug}`}
              className="hover:text-[#243342] transition-colors"
            >
              {primaryCategory.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#243342] truncate max-w-xs">{product.name}</span>
      </nav>

      {/* 2. MAIN PRODUCT OVERVIEW (Gallery + Information) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-[#F4F8FA] border-2 border-[#EDF3F7] relative group shadow-sm">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#EBF3F8] via-[#FFFFFF] to-[#FBF0F2] p-8 text-center">
                <span className="text-6xl mb-3">🎨</span>
                <span className="font-heading font-bold text-lg text-[#243342]">
                  Unwind <span className="text-[#D99BA3]">&amp;</span> Doodle
                </span>
                <span className="text-xs text-[#8295A8] mt-1">Archival Mindful Collection</span>
              </div>
            )}

            {/* Customization Badge */}
            {product.requiresCustomization && (
              <div className="absolute top-4 left-4">
                <span className="bg-[#D99BA3] text-white text-xs font-heading font-bold px-3 py-1.5 rounded-full shadow-sm">
                  ✨ Custom Photo Book
                </span>
              </div>
            )}

            {/* Navigation Arrows for multi-image */}
            {galleryImages.length > 1 && (
              <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((idx) => (idx === 0 ? galleryImages.length - 1 : idx - 1))
                  }
                  className="pointer-events-auto w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#243342] shadow-md flex items-center justify-center font-bold text-sm"
                  aria-label="Previous Image"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((idx) => (idx === galleryImages.length - 1 ? 0 : idx + 1))
                  }
                  className="pointer-events-auto w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#243342] shadow-md flex items-center justify-center font-bold text-sm"
                  aria-label="Next Image"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryImages.map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === i
                      ? 'border-[#D99BA3] ring-2 ring-[#D99BA3]/20'
                      : 'border-[#EDF3F7] opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Select image ${i + 1}`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details, Add-ons & Customization (7 cols) */}
        <div className="lg:col-span-6 space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-[#EDF3F7] shadow-sm">
          {/* Header & Price */}
          <div className="space-y-3 pb-6 border-b border-[#EDF3F7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#D99BA3] text-sm tracking-wider">★★★★★</span>
                <span className="text-xs font-heading font-semibold text-[#52657A]">
                  24 verified reviews
                </span>
              </div>

              <span
                className={`badge-stock ${
                  product.isAvailable ? 'badge-in-stock' : 'badge-out-of-stock'
                }`}
              >
                {stockText}
              </span>
            </div>

            <h1 className="font-heading text-2xl sm:text-4xl font-bold text-[#243342] leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl font-heading font-bold text-[#D99BA3]">
                {formattedPrice}
              </div>
              {formattedBundleSavings && (
                <span className="text-xs font-heading font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Save {formattedBundleSavings}
                </span>
              )}
            </div>
          </div>

          {/* Description Snippet */}
          {product.description && (
            <p className="text-sm sm:text-base text-[#52657A] leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Bundle What's Included Section */}
          {product.productType === 'bundle' && product.bundleItems && product.bundleItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#EDF3F7]">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm sm:text-base text-[#243342] flex items-center gap-2">
                  <span>📦</span> What's Included ({product.bundleItems.length} {product.bundleItems.length === 1 ? 'Item' : 'Items'})
                </h3>
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  Bundle Set
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.bundleItems.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-2xl border border-purple-100 bg-purple-50/40 flex items-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-xl bg-white border border-purple-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {comp.primaryImage ? (
                        <img src={comp.primaryImage} alt={comp.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🎨</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-[#243342] truncate">
                        {comp.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-heading font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                          Quantity: {comp.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customization Upload Section (Only for photo customizable products) */}
          {product.requiresCustomization && (
            <CustomizationUploader onCustomizationChange={setCustomization} />
          )}

          {/* Theme Selector & Cover Personalization (Only for theme customizable coloring books) */}
          {product.supportsThemeCustomization && (
            <div className="space-y-5 pt-5 border-t border-[#EDF3F7]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-base text-[#243342] flex items-center gap-2">
                    <span>🎨</span> Choose your themes
                  </h3>
                  {availableThemes.length > 0 && (
                    <span className="text-xs font-heading font-bold text-[#D99BA3] bg-[#FBF0F2] px-3 py-1 rounded-full border border-[#D99BA3]/20">
                      {selectedThemeIds.length} / 3 themes selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#52657A] mt-1">
                  Pick up to 3 themes. We recommend choosing all 3 for the best variety.
                </p>
              </div>

              {availableThemes.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>🎨</span> Themes Customization Active
                  </div>
                  <p>Themes are being configured for this coloring book. Please assign themes in the admin product editor to enable customer selection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableThemes.map((theme) => {
                    const isSelected = selectedThemeIds.includes(theme.id);
                    const isDisabled = !isSelected && selectedThemeIds.length >= 3;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleToggleTheme(theme.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? 'border-[#D99BA3] bg-[#FBF0F2] ring-2 ring-[#D99BA3]/30 shadow-xs'
                            : isDisabled
                            ? 'border-[#EDF3F7] bg-[#F8FAFC] opacity-50 cursor-not-allowed'
                            : 'border-[#EDF3F7] bg-[#F4F8FA]/60 hover:bg-white hover:border-[#D99BA3]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-bold text-xs sm:text-sm text-[#243342]">
                            {theme.name}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-[#D99BA3] text-white shadow-xs'
                                : 'border border-[#CBD5E1] text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                        {theme.description && (
                          <p className="text-xs text-[#52657A] mt-1 line-clamp-2">{theme.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Cover Personalization */}
              <div className="pt-3 space-y-2 border-t border-dashed border-[#EDF3F7]">
                <label className="block font-heading font-bold text-sm text-[#243342]">
                  Personalize your cover
                </label>
                <p className="text-xs text-[#8295A8]">
                  Enter a name to be printed/generated on the coloring book cover.
                </p>
                <input
                  type="text"
                  maxLength={100}
                  value={coverName}
                  onChange={(e) => setCoverName(e.target.value)}
                  placeholder="Enter a name (e.g. Amara)"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] focus:border-[#D99BA3] focus:ring-2 focus:ring-[#D99BA3]/20 text-sm text-[#243342] transition-all bg-white"
                />
                <div className="text-right text-[11px] font-heading text-[#8295A8]">
                  {coverName.length} / 100 characters
                </div>
              </div>
            </div>
          )}

          {/* Add-ons Section */}
          {product.addons && product.addons.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#EDF3F7]">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm sm:text-base text-[#243342] flex items-center gap-2">
                  <span>🎁</span> Recommended Companion Tools
                </h3>
                <span className="text-[11px] font-heading font-semibold text-[#8295A8] uppercase tracking-wider">
                  Optional
                </span>
              </div>

              <div className="space-y-3">
                {product.addons.map((addon) => {
                  const isSelected = Boolean(selectedAddons[addon.addonProductId]);
                  const currentQty = selectedAddons[addon.addonProductId] || 0;
                  const addonPrice = new Intl.NumberFormat('en-NG', {
                    style: 'currency',
                    currency: 'NGN',
                    maximumFractionDigits: 0,
                  }).format(addon.price);

                  return (
                    <div
                      key={addon.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-[#D99BA3] bg-[#FBF0F2]/50 shadow-xs'
                          : 'border-[#EDF3F7] bg-[#F4F8FA]/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-[#E2ECF2] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {addon.primaryImage ? (
                            <img
                              src={addon.primaryImage}
                              alt={addon.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">✏️</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-heading font-bold text-xs sm:text-sm text-[#243342]">
                            {addon.name}
                          </h4>
                          <span className="text-xs font-heading font-semibold text-[#D99BA3]">
                            +{addonPrice}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Selector for Add-on */}
                      <div>
                        {currentQty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleAddonQuantityChange(addon.addonProductId, currentQty - 1)
                              }
                              className="stepper-btn !w-7 !h-7 text-xs"
                            >
                              -
                            </button>
                            <span className="font-heading font-bold text-xs w-4 text-center">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleAddonQuantityChange(addon.addonProductId, currentQty + 1)
                              }
                              className="stepper-btn !w-7 !h-7 text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddonQuantityChange(addon.addonProductId, 1)}
                            className="px-3.5 py-1.5 rounded-full bg-white border border-[#DCE7EE] hover:border-[#D99BA3] text-xs font-heading font-semibold text-[#243342] hover:text-[#D99BA3] transition-colors shadow-2xs"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector & Primary Add to Cart Action */}
          <div className="pt-6 border-t border-[#EDF3F7] space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-heading font-bold text-[#243342] uppercase tracking-wide">
                Quantity:
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="stepper-btn"
                  aria-label="Decrease Quantity"
                >
                  -
                </button>
                <span className="font-heading font-bold text-base w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={!product.isAvailable || quantity >= product.availableStock}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="stepper-btn"
                  aria-label="Increase Quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Main Action Button */}
            <div className="space-y-3">
              <button
                type="button"
                disabled={!product.isAvailable || addingToCart}
                onClick={handleAddToCart}
                className="btn-rose w-full text-base !py-4 shadow-md flex items-center justify-center gap-2 font-heading font-bold"
              >
                {addingToCart ? (
                  <span>Adding to Cart...</span>
                ) : !product.isAvailable ? (
                  <span>Currently Out of Stock</span>
                ) : (
                  <>
                    <span>🛒</span>
                    <span>Add to Cart • {formattedPrice}</span>
                  </>
                )}
              </button>

              {/* Toast / Cart Addition Confirmation */}
              {addedSuccess && (
                <div className="p-4 bg-[#EBF8F2] border border-[#C6EAD8] rounded-2xl text-center space-y-2.5 animate-in fade-in-50">
                  <p className="text-xs sm:text-sm font-heading font-bold text-[#1F7A4D]">
                    ✓ Added to your cart!
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/cart" className="btn-blue text-xs !py-2 !px-5">
                      View Cart &amp; Checkout →
                    </Link>
                    <button
                      type="button"
                      onClick={() => setAddedSuccess(false)}
                      className="btn-outline text-xs !py-2 !px-4"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRODUCT SPECIFICATIONS & SHIPPING INFORMATION */}
      <div className="card-soft p-6 sm:p-10 space-y-8 bg-white border border-[#EDF3F7]">
        {/* Tab Header */}
        <div className="flex gap-4 sm:gap-8 border-b border-[#EDF3F7] pb-3 text-xs sm:text-sm font-heading font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-[#D99BA3] text-[#D99BA3]'
                : 'border-transparent text-[#52657A] hover:text-[#243342]'
            }`}
          >
            Materials &amp; Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'shipping'
                ? 'border-[#D99BA3] text-[#D99BA3]'
                : 'border-transparent text-[#52657A] hover:text-[#243342]'
            }`}
          >
            Delivery &amp; Shipping (Nigeria)
          </button>
          {product.requiresCustomization && (
            <button
              type="button"
              onClick={() => setActiveTab('customization')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'customization'
                  ? 'border-[#D99BA3] text-[#D99BA3]'
                  : 'border-transparent text-[#52657A] hover:text-[#243342]'
              }`}
            >
              Customization Guide
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm text-[#52657A] leading-relaxed">
            <div className="space-y-2">
              <span className="font-heading font-bold text-[#243342] block text-sm">
                📖 160gsm Archival Paper
              </span>
              <p>
                Printed on heavy bleed-resistant archival paper. Designed to withstand colored pencils, gel pens, and light ink markers without ghosting.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-heading font-bold text-[#243342] block text-sm">
                📐 Lay-Flat Binding
              </span>
              <p>
                Specialized thread and spine binding allowing your book to lie completely flat on your desk for effortless, mindful coloring.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-heading font-bold text-[#243342] block text-sm">
                🎨 Single-Sided Artwork
              </span>
              <p>
                Every meditative illustration is printed on a single side to keep your finished artwork clean and frame-ready.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm text-[#52657A] leading-relaxed">
            <div className="space-y-2">
              <span className="font-heading font-bold text-[#243342] block text-sm">
                📍 Lagos &amp; Abuja
              </span>
              <p>1–2 business days via priority dispatch. Real-time doorstep tracking provided.</p>
            </div>
            <div className="space-y-2">
              <span className="font-heading font-bold text-[#243342] block text-sm">
                🚚 Nationwide Delivery
              </span>
              <p>
                3–5 business days across all 36 states via certified logistics partners.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-heading font-bold text-[#243342] block text-sm">
                🔒 Safe Packaging
              </span>
              <p>All books are moisture-sealed and packaged in rigid protective envelopes.</p>
            </div>
          </div>
        )}

        {activeTab === 'customization' && (
          <div className="space-y-4 text-xs sm:text-sm text-[#52657A] leading-relaxed max-w-2xl">
            <h4 className="font-heading font-bold text-sm text-[#243342]">
              How Photo Customization Works:
            </h4>
            <ol className="list-decimal list-inside space-y-2">
              <li>Upload a clear photo (portrait, pet, landscape, or celebration).</li>
              <li>Our illustration team hand-crafts high-resolution line art from your picture.</li>
              <li>Your custom book is printed, bound on archival paper, and shipped to your door.</li>
            </ol>
          </div>
        )}
      </div>

      {/* 4. REVIEWS SECTION */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#EDF3F7]">
          <div>
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block mb-1">
              Verified Social Proof
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#243342]">
              Customer Reviews
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-heading font-semibold text-[#52657A]">
            <span className="text-[#D99BA3]">★★★★★</span>
            <span>5.0 out of 5.0 (24 reviews)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              author: 'Dr. Halima Y.',
              location: 'Abuja',
              date: '2 weeks ago',
              text: 'The paper thickness is incredible! I use heavy shading with Prismacolors and there is zero bleed. Truly a mindful escape.',
            },
            {
              author: 'Emeka N.',
              location: 'Lagos',
              date: '1 month ago',
              text: 'I ordered the custom photo coloring book for my partner. Seeing our engagement picture rendered into line art brought tears of joy.',
            },
            {
              author: 'Zainab M.',
              location: 'Kano',
              date: '3 weeks ago',
              text: 'Prompt delivery and beautiful packaging. The pencils are velvety soft and blend like a dream.',
            },
          ].map((rev, i) => (
            <div key={i} className="card-soft p-6 space-y-4 bg-white border border-[#EDF3F7]">
              <div className="flex text-[#D99BA3] text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm text-[#52657A] italic leading-relaxed">
                "{rev.text}"
              </p>
              <div className="pt-3 border-t border-[#EDF3F7] flex items-center justify-between text-xs">
                <span className="font-heading font-bold text-[#243342]">{rev.author}</span>
                <span className="text-[11px] text-[#8295A8]">
                  {rev.location} • {rev.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-[#EDF3F7]">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#243342]">
              You might also love
            </h2>
            <Link
              href="/products"
              className="text-xs sm:text-sm font-heading font-semibold text-[#D99BA3] hover:text-[#C67D87]"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {relatedProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                id={prod.id}
                name={prod.name}
                slug={prod.slug}
                price={prod.price}
                primaryImage={prod.primaryImage}
                isAvailable={prod.isAvailable}
                requiresCustomization={prod.requiresCustomization}
                categories={prod.categories}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
