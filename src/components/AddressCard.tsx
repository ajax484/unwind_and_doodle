'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Badge from './Badge';
import Button from './Button';

export const addressCardVariants = cva(
  [
    'relative flex items-start w-full text-left transition-all duration-150',
    'rounded-2xl bg-bg-surface',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2',
  ],
  {
    variants: {
      size: {
        sm: 'p-3 gap-2.5',
        md: 'p-4 gap-3.5',
      },
      selected: {
        true: 'border-2 border-border-brand shadow-xs',
        false: 'border border-border-default hover:bg-bg-subtle hover:border-border-brand/60 hover:shadow-sm',
      },
      disabled: {
        true: 'bg-bg-subtle border-border-default opacity-60 cursor-not-allowed pointer-events-none',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      selected: false,
      disabled: false,
    },
  }
);

export interface AddressData {
  id?: string;
  label?: string;
  recipientName: string;
  streetAddress: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  isDefault?: boolean;
}

export interface AddressCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>,
    VariantProps<typeof addressCardVariants> {
  /**
   * Structured address record. Props passed individually will override fields in address.
   */
  address?: AddressData;

  /**
   * Address category label (e.g. 'Home', 'Office', 'Art Studio').
   */
  label?: string;

  /**
   * Name of delivery recipient.
   */
  recipientName?: string;

  /**
   * Street address line 1.
   */
  streetAddress?: string;

  /**
   * Optional secondary address line (Apartment, suite, unit, floor).
   */
  addressLine2?: string | null;

  /**
   * City / Locality.
   */
  city?: string;

  /**
   * State / Province / Region.
   */
  state?: string;

  /**
   * Postal / ZIP code.
   */
  postalCode?: string | null;

  /**
   * Country name or ISO code.
   */
  country?: string | null;

  /**
   * Contact phone number.
   */
  phone?: string | null;

  /**
   * Whether this address is the customer's default address.
   */
  isDefault?: boolean;

  /**
   * Sizing scale variant.
   * - 'sm': Compact 12px padding with 14px heading.
   * - 'md': Standard 16px padding with 16px heading (Default).
   * @default 'md'
   */
  size?: 'sm' | 'md';

  /**
   * Whether the card is selected.
   * @default false
   */
  selected?: boolean;

  /**
   * Whether the card is disabled.
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether to display the circular radio selection indicator on the left.
   * Set to false for static read-only cards where selection is not applicable.
   * @default true
   */
  selectable?: boolean;

  /**
   * Callback fired when card selection is triggered via click or keyboard (Enter/Space).
   */
  onSelect?: () => void;

  /**
   * Callback fired when the Edit action button is clicked.
   */
  onEdit?: () => void;

  /**
   * Callback fired when the Remove action button is clicked.
   */
  onRemove?: () => void;

  /**
   * Label for the Edit button.
   * @default 'Edit'
   */
  editLabel?: string;

  /**
   * Label for the Remove button.
   * @default 'Remove'
   */
  removeLabel?: string;

  /**
   * Whether to render action buttons. If undefined, actions are displayed if either onEdit or onRemove is provided.
   */
  showActions?: boolean;

  /**
   * Test identifier for automated testing.
   * @default 'address-card'
   */
  'data-testid'?: string;
}

/**
 * AddressCard Component
 * Canonical delivery address card adhering directly to Figma Component Set `43:48157`
 * and Documentation Board `43:49054` ("Address Cards" on `Components` page).
 *
 * Composes `<Badge>` for the Default tag and `<Button variant="ghost">` for actions.
 * Features 20px radio selection indicator, category labeling, multi-line address formatting,
 * phone number display, and isolated action button handling.
 */
export const AddressCard = forwardRef<HTMLDivElement, AddressCardProps>(
  (
    {
      address,
      label: explicitLabel,
      recipientName: explicitRecipientName,
      streetAddress: explicitStreetAddress,
      addressLine2: explicitAddressLine2,
      city: explicitCity,
      state: explicitState,
      postalCode: explicitPostalCode,
      country: explicitCountry,
      phone: explicitPhone,
      isDefault: explicitIsDefault,
      size = 'md',
      selected = false,
      disabled = false,
      selectable = true,
      onSelect,
      onEdit,
      onRemove,
      editLabel = 'Edit',
      removeLabel = 'Remove',
      showActions,
      className,
      'data-testid': testId = 'address-card',
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    // Resolve values: explicit props override structured address object
    const label = explicitLabel ?? address?.label;
    const recipientName = explicitRecipientName ?? address?.recipientName ?? '';
    const streetAddress = explicitStreetAddress ?? address?.streetAddress ?? '';
    const addressLine2 = explicitAddressLine2 ?? address?.addressLine2;
    const city = explicitCity ?? address?.city ?? '';
    const state = explicitState ?? address?.state ?? '';
    const postalCode = explicitPostalCode ?? address?.postalCode;
    const country = explicitCountry ?? address?.country;
    const phone = explicitPhone ?? address?.phone;
    const isDefault = explicitIsDefault ?? address?.isDefault ?? false;

    const hasActions =
      showActions !== undefined
        ? showActions
        : Boolean(onEdit || onRemove);

    // Click handler for card selection
    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(e);
      if (selectable && onSelect) {
        onSelect();
      }
    };

    // Keyboard handler for accessible radio selection
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      onKeyDown?.(e);
      if (selectable && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        onSelect?.();
      }
    };

    // Construct locality line
    const localityParts = [city, state].filter(Boolean).join(', ');
    const localityLine = [localityParts, postalCode, country].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        role={selectable ? 'radio' : undefined}
        aria-checked={selectable ? selected : undefined}
        aria-disabled={disabled ? true : undefined}
        tabIndex={disabled ? -1 : selectable ? 0 : undefined}
        data-testid={testId}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        className={cn(
          addressCardVariants({
            size,
            selected,
            disabled,
          }),
          selectable && !disabled && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {/* 1. Selection Indicator */}
        {selectable && (
          <div
            className={cn(
              'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors select-none',
              selected
                ? 'border-2 border-border-brand bg-bg-surface'
                : 'border border-border-input bg-bg-surface group-hover:border-border-brand/70',
              disabled && 'border-border-default bg-bg-subtle'
            )}
            aria-hidden="true"
          >
            {selected && (
              <span className="w-2.5 h-2.5 rounded-full bg-action-primary animate-in zoom-in-75" />
            )}
          </div>
        )}

        {/* 2. Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Header */}
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className="font-body text-xs font-medium text-text-tertiary select-none">
                {label}
              </span>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'font-heading font-semibold text-text-primary truncate',
                  size === 'sm' ? 'text-sm' : 'text-base'
                )}
              >
                {recipientName}
              </span>

              {isDefault && (
                <Badge variant="tag" size="sm" data-testid={`${testId}-default-badge`}>
                  Default
                </Badge>
              )}
            </div>
          </div>

          {/* Address Lines */}
          <div
            className={cn(
              'font-body text-text-secondary leading-relaxed',
              size === 'sm' ? 'text-xs' : 'text-sm'
            )}
          >
            <p className="truncate">{streetAddress}</p>
            {addressLine2 && <p className="truncate">{addressLine2}</p>}
            {localityLine && <p className="truncate">{localityLine}</p>}
          </div>

          {/* Contact Phone */}
          {phone && (
            <p className="font-body text-xs text-text-tertiary font-medium pt-0.5">
              {phone}
            </p>
          )}
        </div>

        {/* 3. Action Buttons */}
        {hasActions && (
          <div
            className="flex items-center gap-1 shrink-0 -mt-1 -mr-1"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                aria-label={`${editLabel} address for ${recipientName}`}
                data-testid={`${testId}-edit-btn`}
              >
                {editLabel}
              </Button>
            )}

            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label={`${removeLabel} address for ${recipientName}`}
                data-testid={`${testId}-remove-btn`}
              >
                {removeLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

AddressCard.displayName = 'AddressCard';
export default AddressCard;
