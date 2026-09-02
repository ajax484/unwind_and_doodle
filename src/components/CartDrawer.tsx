'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartResponse, CartItemDetail } from '@/services/cart.service';
import { getCartHeaders, setClientCartSessionId, dispatchCartUpdated } from '@/lib/cart-client';

export default function CartDrawer() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cart', { headers: getCartHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.sessionId) setClientCartSessionId(json.data.sessionId);
        setCart(json.data);
      }
    } catch {
      // Ignore network errors on background fetch
    } finally {
      setLoading(false);
    }
  }, []);

  // Global event listeners
  useEffect(() => {
    fetchCart();

    const handleOpenDrawer = (e: Event) => {
      const customEvt = e as CustomEvent<{ cart?: CartResponse }>;
      if (customEvt.detail?.cart) {
        if (customEvt.detail.cart.sessionId) {
          setClientCartSessionId(customEvt.detail.cart.sessionId);
        }
        setCart(customEvt.detail.cart);
      } else {
        fetchCart();
      }
      setIsOpen(true);
    };

    const handleCartUpdated = (e: Event) => {
      const customEvt = e as CustomEvent<{ cart?: CartResponse }>;
      if (customEvt.detail?.cart) {
        if (customEvt.detail.cart.sessionId) {
          setClientCartSessionId(customEvt.detail.cart.sessionId);
        }
        setCart(customEvt.detail.cart);
      } else {
        fetchCart();
      }
    };

    window.addEventListener('open-cart-drawer', handleOpenDrawer);
    window.addEventListener('cart-updated', handleCartUpdated);

    return () => {
      window.removeEventListener('open-cart-drawer', handleOpenDrawer);
      window.removeEventListener('cart-updated', handleCartUpdated);
    };
  }, [fetchCart]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleUpdateQuantity = async (cartItemId: string, newQty: number) => {
    try {
      setUpdatingItemId(cartItemId);
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: getCartHeaders(),
        body: JSON.stringify({ cartItemId, quantity: newQty }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
        dispatchCartUpdated(json.data, false);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating quantity');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      setUpdatingItemId(cartItemId);
      const res = await fetch(`/api/cart?cartItemId=${cartItemId}`, {
        method: 'DELETE',
        headers: getCartHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCart(json.data);
        dispatchCartUpdated(json.data, false);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error removing item');
    } finally {
      setUpdatingItemId(null);
    }
  };

  if (pathname?.startsWith('/admin') || !isOpen) return null;

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  const formattedSubtotal = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(cart?.subtotal || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      {/* Backdrop overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right"
        >
          {/* 1. Header */}
          <div className="p-6 border-b border-[#EDF3F7] flex items-center justify-between bg-[#FDFCFB]">
            <div>
              <h2 id="drawer-title" className="font-heading font-bold text-xl text-[#243342]">
                Your Cart
              </h2>
              <span className="text-xs font-heading font-semibold text-[#8295A8]">
                {cart?.totalItemCount || 0} {cart?.totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 rounded-full bg-[#F4F8FA] hover:bg-[#EBF3F8] text-[#52657A] flex items-center justify-center text-sm font-bold transition-colors"
              aria-label="Close Cart Drawer"
            >
              ✕
            </button>
          </div>

          {/* 2. Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading && !cart ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-[#F4F8FA] rounded-2xl" />
                ))}
              </div>
            ) : isEmpty ? (
              /* Empty state */
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FBF0F2] text-[#D99BA3] flex items-center justify-center text-3xl mx-auto">
                  🛒
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-lg text-[#243342]">Your cart is empty</h3>
                  <p className="text-xs text-[#8295A8]">
                    Nothing here yet. Explore our mindful coloring collection!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-rose text-xs !px-6"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              /* Item list */
              items.map((item: CartItemDetail) => {
                const isUpdating = updatingItemId === item.id;
                const formattedPrice = new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                  maximumFractionDigits: 0,
                }).format(item.totalPrice);

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border border-[#EDF3F7] bg-[#FDFCFB] space-y-3 transition-opacity ${
                      isUpdating ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    <div className="flex gap-3.5">
                      <div className="w-16 h-16 rounded-xl bg-[#F4F8FA] border border-[#EDF3F7] overflow-hidden flex-shrink-0">
                        {item.primaryImage ? (
                          <img
                            src={item.primaryImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            🎨
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="hover:text-[#D99BA3] font-heading font-bold text-sm text-[#243342] truncate block"
                          >
                            {item.productName}
                          </Link>
                          <span className="font-heading font-bold text-sm text-[#D99BA3] whitespace-nowrap">
                            {formattedPrice}
                          </span>
                        </div>

                        {/* Customization Status */}
                        {item.requiresCustomization && (
                          <div className="mt-1">
                            {item.customization && item.customization.assets.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-[#1F7A4D] bg-[#EBF8F2] px-2 py-0.5 rounded-md">
                                ✓ {item.customization.assets.length} photo{item.customization.assets.length === 1 ? '' : 's'} attached
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-[#B33948] bg-[#FDF0F2] px-2 py-0.5 rounded-md">
                                ⚠ Customization required
                              </span>
                            )}
                          </div>
                        )}

                        {/* Coloring Book Theme Customization Summary */}
                        {item.supportsThemeCustomization && (
                          item.themeCustomization && item.themeCustomization.selectedThemeIds.length > 0 ? (
                            <div className="mt-2 text-[11px] space-y-1 text-[#52657A] bg-[#FBF0F2]/70 p-2.5 rounded-xl border border-[#D99BA3]/20">
                              {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                                <div>
                                  <span className="font-heading font-bold text-[#243342]">Themes:</span>{' '}
                                  <span className="font-medium text-[#243342]">
                                    {item.themeCustomization.themes.map((t) => t.name).join(' · ')}
                                  </span>
                                </div>
                              )}
                              {item.themeCustomization.coverName && (
                                <div>
                                  <span className="font-heading font-bold text-[#243342]">Cover:</span>{' '}
                                  <span className="font-medium text-[#243342]">
                                    {item.themeCustomization.coverName}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] text-[#B33948] bg-[#FDF0F2] p-2 rounded-xl border border-[#F0DCE0] flex items-center justify-between">
                              <span>⚠ Themes required</span>
                              <Link
                                href={`/products/${item.slug || item.productId}`}
                                onClick={() => setIsOpen(false)}
                                className="font-heading font-bold text-[#D99BA3] hover:text-[#C67D87] underline"
                              >
                                Select
                              </Link>
                            </div>
                          )
                        )}

                        {/* Bundle Component Summary */}
                        {item.productType === 'bundle' && item.bundleComponents && item.bundleComponents.length > 0 && (
                          <div className="mt-2 text-[11px] space-y-1 text-[#52657A] bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                            <div className="font-heading font-bold text-purple-900 text-[10px] uppercase tracking-wider flex items-center justify-between">
                              <span>📦 Bundle Includes</span>
                              <span className="text-purple-700 font-semibold">{item.bundleComponents.length} items</span>
                            </div>
                            <div className="space-y-0.5 pt-1 border-t border-purple-100/80">
                              {item.bundleComponents.map((comp, idx) => (
                                <div key={idx} className="flex justify-between items-center text-purple-900">
                                  <span className="truncate">• {comp.name}</span>
                                  <span className="font-bold ml-2">× {comp.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add-ons summary */}
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-2 text-[11px] space-y-0.5 text-[#52657A] border-t border-[#EDF3F7] pt-1.5">
                            {item.addons.map((a) => (
                              <div key={a.id} className="flex justify-between">
                                <span className="truncate">+ {a.addonName} (×{a.quantity})</span>
                                <span className="font-semibold text-[#243342] ml-2">
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
                      </div>
                    </div>

                    {/* Stepper + Remove Link */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#EDF3F7]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="stepper-btn !w-6 !h-6 text-xs"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="font-heading font-bold text-xs w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="stepper-btn !w-6 !h-6 text-xs"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[11px] font-heading font-semibold text-[#B33948] hover:text-[#8C2B37] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Footer */}
          {!isEmpty && (
            <div className="p-6 border-t border-[#EDF3F7] space-y-4 bg-[#FDFCFB]">
              <div className="flex items-center justify-between text-base font-heading font-bold text-[#243342]">
                <span>Subtotal</span>
                <span className="text-[#D99BA3] text-lg">{formattedSubtotal}</span>
              </div>

              <div className="space-y-2.5">
                <Link
                  href="/checkout"
                  onClick={() => setIsOpen(false)}
                  className="btn-rose w-full text-center text-sm !py-3.5 shadow-md block font-heading font-bold"
                >
                  Checkout →
                </Link>

                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  className="btn-outline w-full text-center text-xs !py-2.5 block font-heading font-semibold"
                >
                  View Cart
                </Link>
              </div>

              <p className="text-[11px] text-center text-[#8295A8]">
                🔒 Delivery calculated at checkout
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
