'use client';

import React, { useEffect, useRef, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CartResponse, CartItemDetail } from '@/types/cart';
import { CartContext } from '@/context/CartContext';
import { formatPrice } from '@/lib/format-utils';
import Button from './Button';
import EmptyState from './EmptyState';
import CartItemRow from './CartItemRow';

export interface CartDrawerProps {
  /**
   * Explicit control for drawer visibility. Defaults to `useCart().isDrawerOpen`.
   */
  isOpen?: boolean;
  /**
   * Callback fired when closing the drawer. Defaults to `useCart().closeDrawer`.
   */
  onClose?: () => void;
  /**
   * Override cart state for stories or testing. Defaults to `useCart().cart`.
   */
  cart?: CartResponse | null;
  /**
   * Operational loading state. Defaults to `useCart().loading`.
   */
  loading?: boolean;
  /**
   * ID of item currently undergoing quantity updates. Defaults to `useCart().updatingItemId`.
   */
  updatingItemId?: string | null;
  /**
   * Quantity change handler. Defaults to `useCart().updateQuantity`.
   */
  onUpdateQuantity?: (itemId: string, newQty: number) => Promise<boolean | void> | void;
  /**
   * Item removal handler. Defaults to `useCart().removeItem`.
   */
  onRemoveItem?: (itemId: string) => Promise<boolean | void> | void;
  /**
   * Controls whether the secondary action button ("View Cart") is visible in footer.
   * Directly matches Figma variant property `SecondaryAction` (Visible / Hidden). Defaults to true.
   */
  showSecondaryAction?: boolean;
  /**
   * Optional custom test identifier.
   */
  'data-testid'?: string;
}

export default function CartDrawer({
  isOpen: propIsOpen,
  onClose: propOnClose,
  cart: propCart,
  loading: propLoading,
  updatingItemId: propUpdatingItemId,
  onUpdateQuantity: propOnUpdateQuantity,
  onRemoveItem: propOnRemoveItem,
  showSecondaryAction = true,
  'data-testid': testId = 'cart-drawer',
}: CartDrawerProps = {}) {
  const pathname = usePathname();
  const cartContext = useContext(CartContext);

  const isOpen = propIsOpen ?? cartContext?.isDrawerOpen ?? false;
  const closeDrawer = propOnClose ?? cartContext?.closeDrawer ?? (() => {});
  const cart = propCart !== undefined ? propCart : (cartContext?.cart ?? null);
  const loading = propLoading !== undefined ? propLoading : (cartContext?.loading ?? false);
  const updatingItemId =
    propUpdatingItemId !== undefined ? propUpdatingItemId : (cartContext?.updatingItemId ?? null);
  const updateQuantity =
    propOnUpdateQuantity ?? cartContext?.updateQuantity ?? (async () => true);
  const removeItem = propOnRemoveItem ?? cartContext?.removeItem ?? (async () => true);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer]);

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

  if (pathname?.startsWith('/admin') || !isOpen) return null;

  const items = cart?.items || [];
  const isEmpty = items.length === 0;
  const hasUnavailableItems = items.some((item) => item.isAvailable === false);

  const formattedSubtotal = formatPrice(cart?.subtotal);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      data-testid={testId}
    >
      {/* Backdrop overlay */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        data-testid="cart-drawer-backdrop"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md bg-bg-surface shadow-2xl flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right"
        >
          {/* 1. Header */}
          <div className="p-6 border-b border-border-default flex items-center justify-between bg-bg-default">
            <div>
              <h2 id="drawer-title" className="font-heading font-bold text-xl text-text-primary">
                Your Cart
              </h2>
              <span
                className="text-xs font-heading font-semibold text-text-tertiary"
                data-testid="cart-drawer-item-count"
              >
                {cart?.totalItemCount || 0} {cart?.totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="md"
              iconOnly
              onClick={closeDrawer}
              aria-label="Close Cart Drawer"
              className="text-text-placeholder hover:text-text-primary rounded-full shrink-0 -mr-1"
              data-testid="cart-drawer-close-button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* 2. Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="cart-drawer-content">
            {loading && !cart ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-bg-subtle rounded-2xl" />
                ))}
              </div>
            ) : isEmpty ? (
              /* Empty state */
              <EmptyState
                size="sm"
                icon="🛒"
                title="Your cart is empty"
                description="Nothing here yet. Explore our mindful coloring collection!"
                primaryAction={{
                  label: 'Continue Shopping',
                  onClick: closeDrawer,
                }}
                data-testid="cart-drawer-empty-state"
              />
            ) : (
              /* Item list */
              items.map((item: CartItemDetail) => {
                const isUpdating = updatingItemId === item.id;

                return (
                  <CartItemRow
                    key={item.id}
                    id={item.id}
                    name={item.productName}
                    slug={item.slug}
                    image={item.primaryImage}
                    price={item.totalPrice}
                    unitPrice={item.unitPrice}
                    quantity={item.quantity}
                    isAvailable={item.isAvailable !== false}
                    isUpdating={isUpdating}
                    onQuantityChange={(newQty) => updateQuantity(item.id, newQty)}
                    onRemove={() => removeItem(item.id)}
                    addons={item.addons?.map((a) => ({
                      id: a.id,
                      name: a.addonName,
                      price: a.totalPrice,
                      quantity: a.quantity,
                    }))}
                    customizationDetails={
                      item.requiresCustomization ? (
                        item.customization && item.customization.assets.length > 0 ? (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-status-success-text bg-status-success-bg px-2 py-0.5 rounded-md">
                              ✓ {item.customization.assets.length} photo{item.customization.assets.length === 1 ? '' : 's'} attached
                            </span>
                          </div>
                        ) : (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-status-danger-text bg-status-danger-bg px-2 py-0.5 rounded-md">
                              ⚠ Customization required
                            </span>
                          </div>
                        )
                      ) : null
                    }
                    themeDetails={
                      item.supportsThemeCustomization ? (
                        item.themeCustomization && item.themeCustomization.selectedThemeIds.length > 0 ? (
                          <div className="text-[11px] space-y-1 text-text-secondary bg-bg-accent/70 p-2.5 rounded-xl border border-brand-rose/20">
                            {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                              <div>
                                <span className="font-heading font-bold text-text-primary">Themes:</span>{' '}
                                <span className="font-medium text-text-primary">
                                  {item.themeCustomization.themes.map((t) => t.name).join(' · ')}
                                </span>
                              </div>
                            )}
                            {item.themeCustomization.coverName && (
                              <div>
                                <span className="font-heading font-bold text-text-primary">Cover:</span>{' '}
                                <span className="font-medium text-text-primary">
                                  {item.themeCustomization.coverName}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-status-danger-text bg-status-danger-bg p-2 rounded-xl border border-brand-rose/25 flex items-center justify-between">
                            <span>⚠ Themes required</span>
                            <Link
                              href={`/products/${item.slug || item.productId}`}
                              onClick={closeDrawer}
                              className="font-heading font-bold text-action-primary hover:text-action-primary-hover underline"
                            >
                              Select
                            </Link>
                          </div>
                        )
                      ) : null
                    }
                    bundleDetails={
                      item.productType === 'bundle' && item.bundleComponents && item.bundleComponents.length > 0 ? (
                        <div className="text-[11px] space-y-1 text-text-secondary bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
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
                      ) : null
                    }
                  />
                );
              })
            )}
          </div>

          {/* 3. Footer (Hidden when empty per Figma State=Empty) */}
          {!isEmpty && (
            <div
              className="p-6 border-t border-border-default space-y-4 bg-bg-default"
              data-testid="cart-drawer-footer"
            >
              <div className="flex items-center justify-between text-base font-heading font-bold text-text-primary">
                <span>Subtotal</span>
                <span
                  className="text-action-primary text-lg font-bold"
                  data-testid="cart-drawer-subtotal"
                >
                  {formattedSubtotal}
                </span>
              </div>

              <div className="space-y-2.5">
                {hasUnavailableItems ? (
                  <div className="space-y-1.5">
                    <Button
                      variant="primary"
                      size="lg"
                      type="button"
                      disabled
                      className="w-full"
                      data-testid="cart-drawer-checkout-button"
                    >
                      Unavailable Items in Cart
                    </Button>
                    <p className="text-[11px] text-center text-status-danger-text font-medium">
                      Please remove unavailable items before proceeding.
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    href="/checkout"
                    onClick={closeDrawer}
                    className="w-full"
                    data-testid="cart-drawer-checkout-button"
                  >
                    Checkout →
                  </Button>
                )}

                {showSecondaryAction && (
                  <Button
                    variant="outline"
                    size="lg"
                    href="/cart"
                    onClick={closeDrawer}
                    className="w-full"
                    data-testid="cart-drawer-view-cart-button"
                  >
                    View Cart
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-center text-text-tertiary">
                🔒 Delivery calculated at checkout
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
