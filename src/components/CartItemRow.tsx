'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format-utils';
import { Button } from '@/components/Button';

export const cartItemRowVariants = cva(
  [
    'group relative flex flex-row items-start gap-3 sm:gap-4 p-4 rounded-md border border-border-default',
    'transition-all duration-200 ease-out',
  ],
  {
    variants: {
      state: {
        default: 'bg-bg-surface text-text-primary',
        disabled: 'bg-bg-subtle text-text-secondary cursor-not-allowed',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface CartItemAddon {
  /** Unique add-on identifier. */
  id: string;
  /** Display label of the add-on. */
  name: string;
  /** Unit price of the add-on in minor currency units (e.g. kobo/pence). */
  price: number;
  /** Quantity of this add-on item. Defaults to 1. */
  quantity?: number;
}

export interface CartItemRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id'>,
    VariantProps<typeof cartItemRowVariants> {
  /** Unique item identifier in the cart. */
  id: string;
  /** Display title of the product. */
  name: string;
  /** URL slug for product routing and thumbnail navigation. */
  slug?: string;
  /** Primary product thumbnail image URL, or null for branded fallback graphic. */
  image?: string | null;
  /** Total or line price in minor currency units (e.g. 25000 for ₦25,000). */
  price: number;
  /** Optional individual unit price for subtitle reference. */
  unitPrice?: number;
  /** Current quantity count in the cart. */
  quantity: number;
  /** State variant: 'default' for active shopping, 'disabled' for non-interactive or depleted state. */
  state?: 'default' | 'disabled';
  /** Quantity presentation mode: 'editable' with steppers, or 'static' for read-only reviews. */
  quantityMode?: 'editable' | 'static';
  /** Controls visibility of the remove item action button. Defaults to true. */
  showRemove?: boolean;
  /** Controls visibility of companion add-ons. Defaults to true. */
  showAddons?: boolean;
  /** Optional list of selected add-on companion products. */
  addons?: CartItemAddon[];
  /** In-stock status; when false, renders warning badge and disables increment. Defaults to true. */
  isAvailable?: boolean;
  /** Loading flag during asynchronous price recalculation or mutation. */
  isUpdating?: boolean;
  /** Subordinate content slot for custom photo upload previews or dedications. */
  customizationDetails?: React.ReactNode;
  /** Subordinate content slot for coloring book theme selectors. */
  themeDetails?: React.ReactNode;
  /** Subordinate content slot for bundle kit items breakdown. */
  bundleDetails?: React.ReactNode;
  /** Callback triggered when user changes quantity via steppers. */
  onQuantityChange?: (newQuantity: number) => void;
  /** Callback triggered when user clicks the remove action. */
  onRemove?: () => void;
  /** Test identifier attribute. */
  'data-testid'?: string;
}

export const CartItemRow = forwardRef<HTMLDivElement, CartItemRowProps>(
  (
    {
      id,
      name,
      slug,
      image,
      price,
      unitPrice,
      quantity,
      state = 'default',
      quantityMode = 'editable',
      showRemove = true,
      showAddons = true,
      addons = [],
      isAvailable = true,
      isUpdating = false,
      customizationDetails,
      themeDetails,
      bundleDetails,
      onQuantityChange,
      onRemove,
      className,
      children,
      'data-testid': testId = 'cart-item-row',
      ...rest
    },
    ref
  ) => {
    const formattedPrice = formatPrice(price);
    const formattedUnitPrice = unitPrice !== undefined ? formatPrice(unitPrice) : null;
    const isDisabled = state === 'disabled';

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(
          cartItemRowVariants({ state }),
          isUpdating && 'opacity-60 pointer-events-none',
          className
        )}
        {...rest}
      >
        {/* Column 1: 80-86px Replaceable Product Thumbnail (Radius/MD) */}
        <div className="w-20 h-20 sm:w-[86px] sm:h-[86px] shrink-0 aspect-square rounded-md overflow-hidden bg-bg-subtle border border-border-default flex items-center justify-center select-none">
          {image ? (
            slug ? (
              <Link
                href={`/products/${slug}`}
                tabIndex={-1}
                aria-hidden="true"
                className="w-full h-full block"
              >
                <img
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </Link>
            ) : (
              <img src={image} alt={name} className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 bg-gradient-to-tr from-bg-brand via-bg-surface to-bg-accent">
              <span className="text-2xl" aria-hidden="true">
                🎨
              </span>
            </div>
          )}
        </div>

        {/* Column 2: Product Details (Middle) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          {/* Header Block: Title & Subtitle */}
          <div className="space-y-1">
            {slug ? (
              <Link
                href={`/products/${slug}`}
                className="block hover:text-action-primary transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue/50 rounded-sm"
              >
                <h3
                  className={cn(
                    'font-heading font-semibold text-sm sm:text-base leading-snug line-clamp-2',
                    isDisabled ? 'text-text-tertiary' : 'text-text-primary'
                  )}
                >
                  {name}
                </h3>
              </Link>
            ) : (
              <h3
                className={cn(
                  'font-heading font-semibold text-sm sm:text-base leading-snug line-clamp-2',
                  isDisabled ? 'text-text-tertiary' : 'text-text-primary'
                )}
              >
                {name}
              </h3>
            )}

            {/* Optional Unit Price / Subtitle */}
            {formattedUnitPrice && (
              <p className="text-xs sm:text-sm text-text-secondary">
                Unit price: {formattedUnitPrice}
              </p>
            )}

            {/* Availability Warning */}
            {!isAvailable && (
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-heading font-semibold text-status-danger-text bg-status-danger-bg px-2.5 py-0.5 rounded-md border border-status-danger-accent/30">
                  <span aria-hidden="true">⚠️</span>
                  <span>Currently unavailable</span>
                </span>
              </div>
            )}
          </div>

          {/* Subordinate Content Slots: Themes, Customizations, Bundles */}
          {bundleDetails && <div className="space-y-1">{bundleDetails}</div>}
          {themeDetails && <div className="space-y-1">{themeDetails}</div>}
          {customizationDetails && <div className="space-y-1">{customizationDetails}</div>}
          {children}

          {/* Add-ons List */}
          {showAddons && addons.length > 0 && (
            <div className="space-y-1 text-xs sm:text-sm text-text-secondary">
              {addons.map((addon) => {
                const totalAddonPrice = addon.price * (addon.quantity || 1);
                return (
                  <div key={addon.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      • {addon.name}
                      {addon.quantity && addon.quantity > 1 ? ` (×${addon.quantity})` : ''}
                    </span>
                    <span className="font-medium text-text-primary tabular-nums whitespace-nowrap">
                      +{formatPrice(totalAddonPrice)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quantity Container (Figma: Steppers in Middle Column) */}
          <div className="pt-1">
            {quantityMode === 'editable' ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="stepper"
                  size="sm"
                  disabled={isDisabled || isUpdating || quantity <= 1}
                  onClick={() => onQuantityChange?.(quantity - 1)}
                  aria-label="Decrease quantity"
                  type="button"
                >
                  -
                </Button>
                <span
                  className={cn(
                    'font-heading font-bold text-xs sm:text-sm w-6 text-center tabular-nums',
                    isDisabled ? 'text-text-tertiary' : 'text-text-primary'
                  )}
                  aria-label={`Quantity: ${quantity}`}
                >
                  {quantity}
                </span>
                <Button
                  variant="stepper"
                  size="sm"
                  disabled={isDisabled || isUpdating || !isAvailable}
                  onClick={() => onQuantityChange?.(quantity + 1)}
                  aria-label="Increase quantity"
                  type="button"
                >
                  +
                </Button>
              </div>
            ) : (
              <span
                className={cn(
                  'text-xs sm:text-sm font-heading font-medium',
                  isDisabled ? 'text-text-tertiary' : 'text-text-secondary'
                )}
              >
                Qty {quantity}
              </span>
            )}
          </div>
        </div>

        {/* Column 3: Price & Action Column (Figma: Remove at top, Price at bottom) */}
        <div className="flex flex-col justify-between items-end shrink-0 self-stretch pl-2">
          {/* Top: Remove Action */}
          <div className="min-h-[28px] flex items-start justify-end">
            {showRemove && (
              <button
                type="button"
                disabled={isDisabled || isUpdating}
                onClick={onRemove}
                className="text-text-tertiary hover:text-status-danger-accent p-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-status-danger-accent/50 rounded-sm"
                aria-label={`Remove ${name} from cart`}
                title="Remove item"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom: Price */}
          <div className="text-right">
            <span
              className={cn(
                'font-heading font-semibold text-sm sm:text-base tabular-nums whitespace-nowrap',
                isDisabled ? 'text-text-tertiary' : 'text-text-primary'
              )}
            >
              {formattedPrice}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

CartItemRow.displayName = 'CartItemRow';
export default CartItemRow;
