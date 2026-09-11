'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format-utils';
import { Button } from '@/components/Button';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

export const orderSummaryCardVariants = cva(
  'p-6 sm:p-8 space-y-6 bg-bg-surface border border-border-default rounded-[20px] transition-all duration-200 w-full',
  {
    variants: {
      state: {
        default: '',
        loading: 'pointer-events-none',
        empty: '',
      },
      itemCount: {
        multiple: '',
        one: '',
      },
    },
    defaultVariants: {
      state: 'default',
      itemCount: 'multiple',
    },
  }
);

export interface OrderSummaryItemAddon {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface OrderSummaryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
  slug?: string;
  details?: string;
  addons?: OrderSummaryItemAddon[];
}

export interface OrderSummaryCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id'>,
    VariantProps<typeof orderSummaryCardVariants> {
  /**
   * Title displayed at the top of the summary card.
   * @default 'Order Summary'
   */
  title?: string;

  /**
   * Visual and interactive state of the card.
   * @default 'default'
   */
  state?: 'default' | 'loading' | 'empty';

  /**
   * Density variant based on item volume.
   * @default 'multiple'
   */
  itemCount?: 'multiple' | 'one';

  /**
   * Explicit total count of items in the order.
   * Inferred from `items.length` if omitted.
   */
  totalItemCount?: number;

  /**
   * Optional line items to display in the compact order review preview.
   */
  items?: OrderSummaryItem[];

  /**
   * Base subtotal amount before delivery and discounts (in minor or major currency units).
   */
  subtotal: number;

  /**
   * Calculated or estimated delivery fee.
   * Supports numeric amounts, or status strings ('free', 'calculated').
   * @default 'calculated'
   */
  deliveryFee?: number | 'free' | 'calculated' | string;

  /**
   * Contextual label for the delivery line.
   * @default 'Delivery'
   */
  deliveryLabel?: string;

  /**
   * Active promotional discount amount to subtract from total.
   */
  discountAmount?: number;

  /**
   * Active promotional voucher or coupon code.
   */
  discountCode?: string;

  /**
   * Net final order total payable by customer.
   */
  total: number;

  /**
   * Whether to display the promotional discount row.
   * Automatically true if `discountAmount` is provided and > 0.
   */
  showDiscountRow?: boolean;

  /**
   * Whether to display the delivery fee row.
   * @default true
   */
  showDeliveryRow?: boolean;

  /**
   * Whether to display the primary checkout call-to-action button.
   * @default true
   */
  showCheckoutAction?: boolean;

  /**
   * Label for the primary checkout button.
   * @default 'Proceed to Checkout →'
   */
  checkoutButtonLabel?: string;

  /**
   * Next.js navigation link target for the checkout button.
   */
  checkoutHref?: string;

  /**
   * Callback fired when clicking the primary checkout CTA.
   */
  onCheckout?: () => void;

  /**
   * Disables the primary checkout button.
   * @default false
   */
  checkoutDisabled?: boolean;

  /**
   * Shows a loading spinner on the primary checkout button.
   * @default false
   */
  checkoutLoading?: boolean;

  /**
   * Slot for custom promo code / coupon input (e.g. on checkout page).
   */
  promoSlot?: React.ReactNode;

  /**
   * Override slot for the action block (e.g. when items are unavailable).
   */
  actionSlot?: React.ReactNode;

  /**
   * Custom slot rendered below the action for security badges.
   */
  securityNote?: React.ReactNode;

  /**
   * Custom action for the empty state.
   */
  emptyAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };

  /**
   * Custom slot for line items list.
   */
  itemsSlot?: React.ReactNode;

  /**
   * Optional test identifier for QA automated test suites.
   * @default 'order-summary-card'
   */
  'data-testid'?: string;
}

export const OrderSummaryCard = forwardRef<HTMLDivElement, OrderSummaryCardProps>(
  (
    {
      title = 'Order Summary',
      state = 'default',
      itemCount = 'multiple',
      totalItemCount,
      items = [],
      subtotal,
      deliveryFee = 'calculated',
      deliveryLabel = 'Delivery',
      discountAmount,
      discountCode,
      total,
      showDiscountRow,
      showDeliveryRow = true,
      showCheckoutAction = true,
      checkoutButtonLabel = 'Proceed to Checkout →',
      checkoutHref,
      onCheckout,
      checkoutDisabled = false,
      checkoutLoading = false,
      promoSlot,
      actionSlot,
      securityNote,
      emptyAction,
      itemsSlot,
      'data-testid': testId = 'order-summary-card',
      className,
      children,
      ...rest
    },
    ref
  ) => {
    // Determine effective item count
    const count = totalItemCount !== undefined ? totalItemCount : items.length;
    const countLabel = count === 1 ? '1 item' : `${count} items`;

    // Determine discount row visibility
    const isDiscountActive =
      showDiscountRow !== undefined
        ? showDiscountRow
        : Boolean(discountAmount && discountAmount > 0);

    // Format delivery fee
    let formattedDelivery: React.ReactNode;
    if (deliveryFee === 'free' || deliveryFee === 0) {
      formattedDelivery = (
        <span className="font-heading font-semibold text-status-success-accent">Free</span>
      );
    } else if (deliveryFee === 'calculated') {
      formattedDelivery = (
        <span className="text-xs text-text-tertiary font-medium">Calculated at checkout</span>
      );
    } else if (typeof deliveryFee === 'number') {
      formattedDelivery = (
        <span className="font-heading font-semibold text-text-primary">
          {formatPrice(deliveryFee)}
        </span>
      );
    } else {
      formattedDelivery = (
        <span className="font-heading font-semibold text-text-primary">{deliveryFee}</span>
      );
    }

    // 1. Loading State (Figma Variant 41:28258)
    if (state === 'loading') {
      return (
        <div
          ref={ref}
          data-testid={testId}
          className={cn(orderSummaryCardVariants({ state: 'loading', itemCount }), className)}
          aria-busy="true"
          aria-label="Loading order summary"
          {...rest}
        >
          {/* Header Skeleton */}
          <div className="flex items-center justify-between pb-4 border-b border-border-default">
            <Skeleton type="text" size="md" className="w-36 h-6" />
            <Skeleton type="text" size="sm" className="w-16 h-4" />
          </div>

          {/* Items Skeleton */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton type="image" size="sm" className="w-12 h-12 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton type="text" size="sm" className="w-3/4 h-4" />
                <Skeleton type="text" size="sm" className="w-1/3 h-3" />
              </div>
              <Skeleton type="text" size="sm" className="w-16 h-4 shrink-0" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton type="image" size="sm" className="w-12 h-12 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton type="text" size="sm" className="w-2/3 h-4" />
                <Skeleton type="text" size="sm" className="w-1/4 h-3" />
              </div>
              <Skeleton type="text" size="sm" className="w-16 h-4 shrink-0" />
            </div>
          </div>

          <div className="h-px bg-border-default" />

          {/* Pricing Skeleton */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton type="text" size="sm" className="w-20 h-4" />
              <Skeleton type="text" size="sm" className="w-16 h-4" />
            </div>
            <div className="flex justify-between">
              <Skeleton type="text" size="sm" className="w-24 h-4" />
              <Skeleton type="text" size="sm" className="w-28 h-4" />
            </div>
            <div className="h-px bg-border-default pt-2" />
            <div className="flex justify-between pt-1">
              <Skeleton type="text" size="md" className="w-16 h-6" />
              <Skeleton type="text" size="md" className="w-24 h-6" />
            </div>
          </div>

          {/* Action Skeleton */}
          <Skeleton type="card" size="md" className="w-full h-12 rounded-full" />
        </div>
      );
    }

    // 2. Empty State (Figma Variant 41:28626)
    if (state === 'empty' || (items.length === 0 && count === 0 && !itemsSlot)) {
      return (
        <div
          ref={ref}
          data-testid={testId}
          className={cn(orderSummaryCardVariants({ state: 'empty', itemCount }), className)}
          {...rest}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-default">
            <h2 className="font-heading font-semibold text-xl text-text-primary">{title}</h2>
            <span className="text-xs font-heading font-medium text-text-secondary">0 items</span>
          </div>

          {/* Empty State Body */}
          <EmptyState
            size="sm"
            icon="🛒"
            title="Your order is empty"
            description="Add items to your cart to review pricing and delivery."
            primaryAction={
              emptyAction
                ? {
                    label: emptyAction.label,
                    onClick: emptyAction.onClick,
                    href: emptyAction.href,
                  }
                : undefined
            }
          />
        </div>
      );
    }

    // 3. Default State (Figma Variant 41:27722)
    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(orderSummaryCardVariants({ state, itemCount }), className)}
        {...rest}
      >
        {/* 1. Header & Item Count */}
        <div className="flex items-center justify-between pb-4 border-b border-border-default">
          <h2 className="font-heading font-semibold text-xl text-text-primary">{title}</h2>
          <span className="text-xs font-heading font-medium text-text-secondary">{countLabel}</span>
        </div>

        {/* 2. Compact Items Summary Preview (if items are provided) */}
        {itemsSlot ? (
          <div className="space-y-3">{itemsSlot}</div>
        ) : items.length > 0 ? (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-2 border-b border-border-default/60 last:border-0"
              >
                {/* 48px Square Thumbnail (Radius/MD = 14px) */}
                <div className="w-12 h-12 rounded-md bg-bg-subtle border border-border-default overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg" aria-hidden="true">
                      🎨
                    </span>
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  {item.slug ? (
                    <Link
                      href={`/products/${item.slug}`}
                      className="font-heading font-semibold text-xs sm:text-sm text-text-primary hover:text-action-primary truncate block"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <p className="font-heading font-semibold text-xs sm:text-sm text-text-primary truncate">
                      {item.name}
                    </p>
                  )}

                  {item.details && (
                    <p className="text-[11px] text-text-secondary truncate">{item.details}</p>
                  )}

                  <p className="text-xs text-text-tertiary">Qty {item.quantity}</p>

                  {/* Add-ons list if present */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="pt-0.5 space-y-0.5">
                      {item.addons.map((a) => (
                        <p key={a.id} className="text-[10px] text-text-secondary flex justify-between">
                          <span>+ {a.name}</span>
                          <span className="font-medium">+{formatPrice(a.price * (a.quantity || 1))}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item Line Total */}
                <div className="text-right shrink-0">
                  <span className="font-heading font-semibold text-xs sm:text-sm text-text-primary tabular-nums">
                    {formatPrice(item.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Promo Slot (e.g. checkout coupon form) */}
        {promoSlot && <div className="pt-1">{promoSlot}</div>}

        {/* Custom middle slots */}
        {children}

        {/* 3. Pricing Breakdown */}
        <div className="space-y-3 text-xs sm:text-sm pt-2">
          {/* Subtotal Row */}
          <div className="flex items-center justify-between text-text-secondary">
            <span>Subtotal</span>
            <span className="font-heading font-semibold text-text-primary tabular-nums">
              {formatPrice(subtotal)}
            </span>
          </div>

          {/* Promotional Discount Row (Figma: Semantic/Status/Success/Text) */}
          {isDiscountActive && discountAmount !== undefined && (
            <div className="flex items-center justify-between text-status-success-accent">
              <span>Discount {discountCode ? `(${discountCode})` : ''}</span>
              <span className="font-heading font-semibold tabular-nums">
                −{formatPrice(discountAmount)}
              </span>
            </div>
          )}

          {/* Delivery Fee Row */}
          {showDeliveryRow && (
            <div className="flex items-center justify-between text-text-secondary">
              <span>{deliveryLabel}</span>
              <span>{formattedDelivery}</span>
            </div>
          )}

          {/* Divider before Total */}
          <div className="h-px bg-border-default pt-1" />

          {/* Total Row (Figma: Fredoka Heading/2 Total Amount) */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-heading font-semibold text-base sm:text-lg text-text-primary">
              Total
            </span>
            <span className="font-heading font-bold text-xl sm:text-2xl text-action-primary tabular-nums">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* 4. Action CTA */}
        {actionSlot ? (
          actionSlot
        ) : showCheckoutAction ? (
          <div className="pt-2">
            {checkoutHref ? (
              <Link href={checkoutHref} className="block w-full">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center shadow-md font-heading font-bold rounded-full text-center"
                  disabled={checkoutDisabled}
                  loading={checkoutLoading}
                >
                  {checkoutButtonLabel}
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-md font-heading font-bold rounded-full"
                onClick={onCheckout}
                disabled={checkoutDisabled}
                loading={checkoutLoading}
                type="button"
              >
                {checkoutButtonLabel}
              </Button>
            )}
          </div>
        ) : null}

        {/* 5. Trust / Security Note */}
        {securityNote !== undefined ? (
          securityNote
        ) : (
          <p className="text-[11px] text-center text-text-tertiary select-none">
            🔒 Safe &amp; Secure 256-Bit Encrypted Payment
          </p>
        )}
      </div>
    );
  }
);

OrderSummaryCard.displayName = 'OrderSummaryCard';
export default OrderSummaryCard;
