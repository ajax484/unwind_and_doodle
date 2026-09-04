'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CartItemDetail } from '@/services/cart.service';
import { getCartHeaders, dispatchCartUpdated } from '@/lib/cart-client';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    loading,
    updatingItemId,
    updateQuantity,
    removeItem,
    setCartDirectly,
  } = useCart();
  const [error] = useState<string | null>(null);

  // Modal / inline editor state for managing customization photos
  const [editingCustomizationItem, setEditingCustomizationItem] = useState<CartItemDetail | null>(null);
  const [modalAssetUrls, setModalAssetUrls] = useState<string[]>([]);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingCustomization, setSavingCustomization] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    updateQuantity(cartItemId, newQty);
  };

  const handleRemoveItem = (cartItemId: string) => {
    removeItem(cartItemId);
  };

  // Open customization modal
  const openCustomizationModal = (item: CartItemDetail) => {
    setEditingCustomizationItem(item);
    setModalAssetUrls(item.customization?.assets || []);
    setModalNotes(item.customization?.notes || '');
    setModalError(null);
  };

  // Upload photo inside modal
  const handleModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setModalError(null);
    if (file.size > 5 * 1024 * 1024) {
      setModalError('File must be under 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setModalError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/customizations/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload photo');
      }

      setModalAssetUrls((prev) => [...prev, json.data.assetUrl]);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error uploading photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Save customization changes
  const handleSaveCustomization = async () => {
    if (!editingCustomizationItem) return;

    try {
      setSavingCustomization(true);
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: getCartHeaders(),
        body: JSON.stringify({
          cartItemId: editingCustomizationItem.id,
          customization: {
            notes: modalNotes,
            assetUrls: modalAssetUrls,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save customization');
      }

      setCartDirectly(json.data);
      dispatchCartUpdated(json.data, false);
      setEditingCustomizationItem(null);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error saving customization');
    } finally {
      setSavingCustomization(false);
    }
  };

  if (loading && !cart) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-8 bg-[#F4F8FA] rounded-md w-1/4" />
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-[#F4F8FA] rounded-3xl" />
            ))}
          </div>
          <div className="lg:col-span-4 h-72 bg-[#F4F8FA] rounded-3xl" />
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  const hasUnavailableItems = items.some((item) => item.isAvailable === false);

  // Check if any customizable product is missing required photos or themes
  const hasIncompleteCustomization = items.some(
    (item) =>
      (item.requiresCustomization && (!item.customization || item.customization.assets.length === 0)) ||
      (item.supportsThemeCustomization &&
        (!item.themeCustomization ||
          !item.themeCustomization.selectedThemeIds ||
          item.themeCustomization.selectedThemeIds.length === 0))
  );

  const formattedSubtotal = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(cart?.subtotal || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* 1. Header */}
      <div className="space-y-2">
        <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block">
          Order Review
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#243342]">
          Your Shopping Cart
        </h1>
        <p className="text-xs sm:text-sm text-[#52657A]">
          Review your items and proceed to secure checkout.
        </p>
      </div>

      {loading && !cart ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start animate-pulse">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-28 bg-[#F4F8FA] rounded-2xl" />
            <div className="h-28 bg-[#F4F8FA] rounded-2xl" />
            <div className="h-28 bg-[#F4F8FA] rounded-2xl" />
          </div>
          <div className="lg:col-span-4 h-64 bg-[#F4F8FA] rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-[#B33948] bg-[#FDF0F2] rounded-2xl max-w-md mx-auto">
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : isEmpty ? (
        /* 2. Empty State */
        <div className="card-soft max-w-lg mx-auto p-12 text-center space-y-6 bg-white border border-[#EDF3F7]">
          <div className="w-20 h-20 bg-[#FBF0F2] text-[#D99BA3] rounded-full flex items-center justify-center text-4xl mx-auto shadow-xs">
            🛒
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-heading text-[#243342]">Your Cart is Empty</h2>
            <p className="text-sm text-[#52657A]">
              Nothing here yet. Let's change that.
            </p>
          </div>
          <Link href="/products" className="btn-rose text-xs sm:text-sm !px-8 inline-block font-heading font-bold">
            Browse Products →
          </Link>
        </div>
      ) : (
        /* 3. Items & Order Summary Layout (70% / 30%) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
          {/* Left Column: Cart Items (7 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Warning Banner if unavailable items */}
            {hasUnavailableItems && (
              <div className="p-4 bg-[#FDF0F2] border border-[#F0DCE0] rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-[#B33948] animate-in fade-in">
                <span className="text-base">⚠️</span>
                <div>
                  <span className="font-heading font-bold block">Unavailable Items in Cart</span>
                  <span>One or more items in your cart are currently out of stock or discontinued. Please remove them to proceed.</span>
                </div>
              </div>
            )}

            {/* Warning Banner if customization missing */}
            {hasIncompleteCustomization && (
              <div className="p-4 bg-[#FDF0F2] border border-[#F0DCE0] rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-[#B33948] animate-in fade-in">
                <span className="text-base">⚠️</span>
                <div>
                  <span className="font-heading font-bold block">Customization Required</span>
                  <span>Please upload photos for your custom coloring book before proceeding to checkout.</span>
                </div>
              </div>
            )}

            {items.map((item: CartItemDetail) => {
              const isUpdating = updatingItemId === item.id;
              const formattedLineTotal = new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                maximumFractionDigits: 0,
              }).format(item.totalPrice);

              const formattedUnitPrice = new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                maximumFractionDigits: 0,
              }).format(item.unitPrice);

              const isCustomMissing =
                item.requiresCustomization && (!item.customization || item.customization.assets.length === 0);

              return (
                <div
                  key={item.id}
                  className={`card-soft p-5 sm:p-6 space-y-5 bg-white border border-[#EDF3F7] transition-opacity ${
                    isUpdating ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    {/* Item Image */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#F4F8FA] border border-[#EDF3F7] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.primaryImage ? (
                        <img
                          src={item.primaryImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">🎨</span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-grow space-y-3 w-full">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link href={`/products/${item.slug}`} className="hover:text-[#D99BA3] transition-colors">
                            <h3 className="font-heading font-bold text-base sm:text-lg text-[#243342] leading-snug">
                              {item.productName}
                            </h3>
                          </Link>
                          <span className="text-xs text-[#8295A8] font-medium">
                            Unit Price: {formattedUnitPrice}
                          </span>
                        </div>

                        <span className="font-heading font-bold text-base sm:text-lg text-[#D99BA3]">
                          {formattedLineTotal}
                        </span>
                      </div>

                      {/* Availability Tag */}
                      {item.isAvailable === false && (
                        <div className="p-3 rounded-2xl bg-[#FDF0F2] border border-[#F0DCE0] flex items-center justify-between text-xs text-[#B33948]">
                          <span className="font-heading font-semibold">⚠️ Product currently unavailable (out of stock or discontinued)</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="font-heading font-bold underline hover:text-[#8C2B37] ml-2 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* Customization Details & Photos Preview */}
                      {item.requiresCustomization && (
                        <div
                          className={`p-3.5 rounded-2xl text-xs space-y-2 border ${
                            isCustomMissing
                              ? 'bg-[#FDF0F2] border-[#F0DCE0] text-[#B33948]'
                              : 'bg-[#FBF0F2] border-[#F0DCE0] text-[#243342]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-bold flex items-center gap-1.5">
                              <span>✨</span>
                              <span>Personalized Customization</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openCustomizationModal(item)}
                              className="text-[11px] font-heading font-bold text-[#D99BA3] hover:text-[#C67D87] underline"
                            >
                              {item.customization && item.customization.assets.length > 0
                                ? 'Manage Photos & Note'
                                : '+ Add Photos Now'}
                            </button>
                          </div>

                          {item.customization?.notes && (
                            <p className="italic text-[#52657A]">"{item.customization.notes}"</p>
                          )}

                          {item.customization && item.customization.assets.length > 0 ? (
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              {item.customization.assets.map((assetUrl, idx) => (
                                <div
                                  key={idx}
                                  className="w-12 h-12 rounded-xl overflow-hidden border border-[#DCE7EE] shadow-2xs"
                                >
                                  <img src={assetUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                              <span className="text-[11px] text-[#52657A] font-semibold ml-1">
                                ({item.customization.assets.length} photo{item.customization.assets.length === 1 ? '' : 's'})
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] font-medium text-[#B33948]">
                              No photos added yet. Upload custom photos to proceed.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Coloring Book Theme Customization Details */}
                      {item.supportsThemeCustomization && (
                        item.themeCustomization && item.themeCustomization.selectedThemeIds.length > 0 ? (
                          <div className="p-3.5 rounded-2xl text-xs space-y-1 bg-[#FBF0F2] border border-[#D99BA3]/20 text-[#243342]">
                            <div className="font-heading font-bold flex items-center gap-1.5 text-[#D99BA3]">
                              <span>🎨</span>
                              <span>Coloring Book Customization</span>
                            </div>
                            {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                              <div>
                                <span className="font-heading font-bold text-[#243342]">Themes:</span>{' '}
                                <span className="font-medium text-[#52657A]">
                                  {item.themeCustomization.themes.map((t) => t.name).join(' · ')}
                                </span>
                              </div>
                            )}
                            {item.themeCustomization.coverName && (
                              <div>
                                <span className="font-heading font-bold text-[#243342]">Cover:</span>{' '}
                                <span className="font-medium text-[#52657A]">
                                  {item.themeCustomization.coverName}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl text-xs space-y-2 bg-[#FDF0F2] border border-[#F0DCE0] text-[#B33948]">
                            <div className="flex items-center justify-between">
                              <span className="font-heading font-bold flex items-center gap-1.5">
                                <span>🎨</span>
                                <span>Themes Required (1–3 Themes)</span>
                              </span>
                              <Link
                                href={`/products/${item.slug || item.productId}`}
                                className="text-[11px] font-heading font-bold text-[#D99BA3] hover:text-[#C67D87] underline"
                              >
                                Select Themes →
                              </Link>
                            </div>
                            <p className="text-[11px] font-medium">
                              This coloring book requires theme customization. Please choose your themes on the product page before checking out.
                            </p>
                          </div>
                        )
                      )}

                      {/* Bundle Component Summary */}
                      {item.productType === 'bundle' && item.bundleComponents && item.bundleComponents.length > 0 && (
                        <div className="p-3.5 rounded-2xl text-xs space-y-2 border border-purple-100 bg-purple-50/50">
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-bold text-purple-900 flex items-center gap-1.5">
                              <span>📦</span>
                              <span>Included Products ({item.bundleComponents.length} Items per Bundle)</span>
                            </span>
                            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                              Bundle
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {item.bundleComponents.map((comp, idx) => (
                              <div key={idx} className="flex items-center justify-between text-purple-900 bg-white/70 px-3 py-1.5 rounded-xl border border-purple-100/80">
                                <span className="font-heading font-semibold truncate">• {comp.name}</span>
                                <span className="font-heading font-bold text-purple-800 ml-2">× {comp.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add-ons List */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[#EDF3F7]">
                          <span className="text-[11px] font-heading font-bold text-[#8295A8] uppercase tracking-wider block">
                            Added extras:
                          </span>
                          {item.addons.map((a) => (
                            <div
                              key={a.id}
                              className="text-xs flex items-center justify-between text-[#52657A] bg-[#F4F8FA] px-3 py-2 rounded-xl"
                            >
                              <span className="font-heading font-semibold">
                                + {a.addonName} (×{a.quantity})
                              </span>
                              <span className="font-heading font-bold text-[#243342]">
                                {new Intl.NumberFormat('en-NG', {
                                  style: 'currency',
                                  currency: 'NGN',
                                  maximumFractionDigits: 0,
                                }).format(a.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stepper and Delete */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#EDF3F7]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="stepper-btn !w-8 !h-8 text-xs"
                            aria-label="Decrease Quantity"
                          >
                            -
                          </button>
                          <span className="font-heading font-bold text-sm w-6 text-center text-[#243342]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={isUpdating || item.isAvailable === false}
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="stepper-btn !w-8 !h-8 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Increase Quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-xs font-heading font-semibold text-[#B33948] hover:text-[#8C2B37] transition-colors"
                        >
                          Remove Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="lg:col-span-4 card-soft p-6 sm:p-8 space-y-6 bg-white border border-[#EDF3F7] sticky top-28 shadow-sm">
            <h2 className="font-heading font-bold text-xl text-[#243342] pb-4 border-b border-[#EDF3F7]">
              Order Summary
            </h2>

            <div className="space-y-3.5 text-xs sm:text-sm pb-6 border-b border-[#EDF3F7]">
              <div className="flex items-center justify-between text-[#52657A]">
                <span>Items ({cart?.totalItemCount})</span>
                <span className="font-heading font-bold text-[#243342]">{formattedSubtotal}</span>
              </div>
              <div className="flex items-center justify-between text-[#52657A]">
                <span>Delivery</span>
                <span className="text-xs text-[#8295A8] font-medium">Calculated at checkout</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-lg font-heading font-bold text-[#243342]">
              <span>Estimated Subtotal</span>
              <span className="text-[#D99BA3] text-xl">{formattedSubtotal}</span>
            </div>

            {hasUnavailableItems ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="btn-rose w-full text-center text-sm !py-4 opacity-50 cursor-not-allowed font-heading font-bold block"
                >
                  Unavailable Items in Cart
                </button>
                <p className="text-[11px] text-center text-[#B33948]">
                  Please remove unavailable items before proceeding to checkout.
                </p>
              </div>
            ) : hasIncompleteCustomization ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="btn-rose w-full text-center text-sm !py-4 opacity-50 cursor-not-allowed font-heading font-bold block"
                >
                  Customization Required
                </button>
                <p className="text-[11px] text-center text-[#B33948]">
                  Please attach required photos or choose coloring book themes before continuing.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="btn-rose w-full text-center text-sm !py-4 shadow-md font-heading font-bold block transition-all cursor-pointer"
              >
                Proceed to Checkout →
              </button>
            )}

            <p className="text-[11px] text-center text-[#8295A8]">
              🔒 Safe &amp; Secure 256-Bit Encrypted Payment
            </p>
          </div>
        </div>
      )}

      {/* 4. MODAL: Manage Photos & Customization */}
      {editingCustomizationItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div
            onClick={() => setEditingCustomizationItem(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 space-y-6 shadow-2xl border border-[#EDF3F7]">
              <div className="flex items-center justify-between pb-4 border-b border-[#EDF3F7]">
                <h3 className="font-heading font-bold text-lg text-[#243342]">
                  Manage Custom Photos &amp; Notes
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCustomizationItem(null)}
                  className="w-8 h-8 rounded-full bg-[#F4F8FA] hover:bg-[#EBF3F8] text-[#52657A] flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-[#FDF0F2] text-[#B33948] text-xs rounded-xl border border-[#F0DCE0]">
                  {modalError}
                </div>
              )}

              {/* Upload Drop area */}
              <div className="space-y-2">
                <label className="block text-xs font-heading font-bold text-[#243342]">
                  Add Photos
                </label>
                <div className="border-2 border-dashed border-[#E2ECF2] hover:border-[#A7C2D4] bg-[#FDFCFB] rounded-2xl p-5 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleModalPhotoUpload}
                    className="hidden"
                    id="modal-customization-upload"
                    disabled={uploadingPhoto}
                  />
                  <label
                    htmlFor="modal-customization-upload"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <span className="text-2xl">{uploadingPhoto ? '⏳' : '📷'}</span>
                    <span className="text-xs font-heading font-semibold text-[#D99BA3] hover:text-[#C67D87]">
                      {uploadingPhoto ? 'Uploading...' : 'Click to select photo (JPEG, PNG, WebP ≤ 5MB)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Uploaded photos strip */}
              {modalAssetUrls.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-heading font-bold text-[#52657A]">
                    Attached Photos ({modalAssetUrls.length})
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {modalAssetUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[#EDF3F7] shadow-2xs"
                      >
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setModalAssetUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-heading font-bold"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dedication Note */}
              <div>
                <label className="block text-xs font-heading font-bold text-[#243342] mb-1">
                  Dedication / Notes
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Dedicated to Amanda on her birthday!"
                  className="form-input text-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EDF3F7]">
                <button
                  type="button"
                  onClick={() => setEditingCustomizationItem(null)}
                  className="btn-outline text-xs !py-2.5 !px-5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingCustomization}
                  onClick={handleSaveCustomization}
                  className="btn-rose text-xs !py-2.5 !px-6"
                >
                  {savingCustomization ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
