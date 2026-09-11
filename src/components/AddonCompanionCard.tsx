import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type AddonMotifType = 'gift' | 'card' | 'stickers' | 'prints' | 'default';

export interface AddonCompanionCardData {
  id?: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  motif?: AddonMotifType;
}

export const addonCompanionCardVariants = cva(
  'group relative flex items-center text-left transition-all duration-200 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2',
  {
    variants: {
      size: {
        md: 'w-full max-w-[380px] p-4 gap-3',
        sm: 'w-full max-w-[320px] p-3 gap-2.5',
      },
      selected: {
        true: 'border-2 border-border-brand bg-bg-surface ring-2 ring-brand-rose/20 shadow-xs',
        false: 'border border-border-default bg-bg-surface hover:bg-bg-subtle/60 hover:border-border-brand/70 hover:shadow-xs',
      },
      disabled: {
        true: 'bg-bg-subtle border border-border-default opacity-60 cursor-not-allowed pointer-events-none hover:shadow-none hover:border-border-default',
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

export interface AddonCompanionCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>,
    VariantProps<typeof addonCompanionCardVariants> {
  /**
   * Structured add-on data object
   */
  addon?: AddonCompanionCardData;
  /**
   * Flat convenience title / name prop
   */
  name?: string;
  /**
   * Flat convenience description prop
   */
  description?: string | null;
  /**
   * Price in NGN (number e.g. 2000 or formatted string "+₦2,000")
   */
  price?: number | string;
  /**
   * Image URL for add-on thumbnail
   */
  imageUrl?: string | null;
  /**
   * Optional vector motif type when no image is supplied
   * @default 'gift'
   */
  motif?: AddonMotifType;
  /**
   * Whether to display the image/motif container
   * @default true
   */
  showImage?: boolean;
  /**
   * Whether to display the description text
   * @default true
   */
  showDescription?: boolean;
  /**
   * Simulated hover state (for Storybook documentation)
   */
  isHovered?: boolean;
  /**
   * Callback fired when card selection is toggled
   */
  onSelect?: (addonId?: string) => void;
  /**
   * Custom test id for automated testing
   * @default 'addon-companion-card'
   */
  'data-testid'?: string;
}

/**
 * Built-in vector motifs matching Figma Section 4 & 5
 */
function AddonMotif({ type, className }: { type?: AddonMotifType; className?: string }) {
  switch (type) {
    case 'card':
      return (
        <svg className={cn('w-8 h-8', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="5" width="20" height="22" rx="3" fill="#FDF7F2" stroke="#DCE7EE" strokeWidth="1.5" />
          <path d="M10 11H22M10 15H18M10 19H15" stroke="#8295A8" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M20 18.5C18.6193 18.5 17.5 19.6193 17.5 21C17.5 22.8 19.5 24.5 20 24.8C20.5 24.5 22.5 22.8 22.5 21C22.5 19.6193 21.3807 18.5 20 18.5Z"
            fill="#D99BA3"
          />
        </svg>
      );
    case 'stickers':
      return (
        <svg className={cn('w-8 h-8', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="13" fill="#FFF8E7" stroke="#F6D59A" strokeWidth="1.5" />
          <path
            d="M16 8L18.246 12.5516L23.266 13.2801L19.633 16.8234L20.492 21.8249L16 19.4625L11.508 21.8249L12.367 16.8234L8.734 13.2801L13.754 12.5516L16 8Z"
            fill="#F4B740"
          />
          <circle cx="23" cy="9" r="2.5" fill="#D99BA3" />
        </svg>
      );
    case 'prints':
      return (
        <svg className={cn('w-8 h-8', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="8" width="18" height="18" rx="2" fill="#FFFFFF" stroke="#DCE7EE" strokeWidth="1.5" />
          <rect x="9" y="5" width="18" height="18" rx="2" fill="#F4F8FA" stroke="#A7C2D4" strokeWidth="1.5" />
          <circle cx="15" cy="11" r="2" fill="#D99BA3" />
          <path d="M11 20L15 15L19 19L22 16L25 20H11Z" fill="#A7C2D4" fillOpacity="0.7" />
        </svg>
      );
    case 'gift':
    default:
      return (
        <svg className={cn('w-8 h-8', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="12" width="20" height="15" rx="3" fill="#EBF4F9" stroke="#A7C2D4" strokeWidth="1.5" />
          <path d="M4 8H28V12H4V8Z" fill="#D99BA3" fillOpacity="0.25" stroke="#D99BA3" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M16 8V27" stroke="#D99BA3" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M16 8C14.5 5 11 5 11 6.5C11 8 16 8 16 8ZM16 8C17.5 5 21 5 21 6.5C21 8 16 8 16 8Z"
            stroke="#D99BA3"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

/**
 * Canonical AddonCompanionCard Component
 *
 * Storefront companion card for selecting complementary accessories, gift wraps,
 * and coloring tools, adhering directly to Figma Component Set 41:25498 and Board 41:26969.
 */
export const AddonCompanionCard = forwardRef<HTMLDivElement, AddonCompanionCardProps>(
  (
    {
      addon,
      name,
      description,
      price,
      imageUrl,
      motif,
      size = 'md',
      selected = false,
      disabled = false,
      showImage = true,
      showDescription = true,
      isHovered = false,
      onSelect,
      onClick,
      onKeyDown,
      className,
      'data-testid': testId = 'addon-companion-card',
      ...props
    },
    ref
  ) => {
    const addonName = name || addon?.name || 'Untitled Add-on';
    const addonDescription = description !== undefined ? description : addon?.description;
    const rawPrice = price !== undefined ? price : addon?.price;
    const addonImage = imageUrl || addon?.imageUrl || null;
    const addonMotif = motif || addon?.motif || 'gift';
    const addonId = addon?.id;

    // Format price with standard "+₦" syntax
    const formattedPrice =
      typeof rawPrice === 'number'
        ? `+₦${rawPrice.toLocaleString('en-NG')}`
        : typeof rawPrice === 'string'
        ? rawPrice.startsWith('+')
          ? rawPrice
          : `+${rawPrice}`
        : null;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(e);
      onSelect?.(addonId);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onSelect?.(addonId);
      }
      onKeyDown?.(e);
    };

    return (
      <div
        ref={ref}
        role="checkbox"
        aria-checked={Boolean(selected)}
        aria-disabled={Boolean(disabled)}
        aria-label={`${addonName}${formattedPrice ? `, ${formattedPrice}` : ''}${selected ? ', selected' : ''}${
          disabled ? ', disabled' : ''
        }`}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-testid={testId}
        className={cn(
          addonCompanionCardVariants({ size, selected, disabled }),
          isHovered && !selected && !disabled && 'bg-bg-subtle/80 border-border-brand shadow-xs',
          className
        )}
        {...props}
      >
        {/* Optional Image / Motif Viewport */}
        {showImage && (
          <div
            data-testid={`${testId}-image`}
            className={cn(
              'shrink-0 rounded-md overflow-hidden bg-bg-subtle flex items-center justify-center transition-all',
              size === 'sm' ? 'w-14 h-14' : 'w-[72px] h-[72px]',
              disabled && 'opacity-45'
            )}
          >
            {addonImage ? (
              <img
                src={addonImage}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <AddonMotif type={addonMotif} />
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex flex-col flex-1 min-w-0 justify-center">
          <h4
            data-testid={`${testId}-name`}
            className={cn(
              'font-heading font-semibold truncate transition-colors leading-snug',
              size === 'sm' ? 'text-sm' : 'text-base',
              disabled ? 'text-text-tertiary' : 'text-text-primary group-hover:text-text-primary'
            )}
          >
            {addonName}
          </h4>

          {showDescription && addonDescription && (
            <p
              data-testid={`${testId}-description`}
              className={cn(
                'text-text-secondary line-clamp-2 transition-colors mt-0.5',
                size === 'sm' ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed',
                disabled && 'text-text-tertiary/70'
              )}
            >
              {addonDescription}
            </p>
          )}

          {formattedPrice && (
            <span
              data-testid={`${testId}-price`}
              className={cn(
                'font-semibold transition-colors mt-1',
                size === 'sm' ? 'text-xs' : 'text-sm',
                disabled ? 'text-text-tertiary' : 'text-text-primary'
              )}
            >
              {formattedPrice}
            </span>
          )}
        </div>

        {/* Square Selection Indicator (Checkbox) */}
        <div
          data-testid={`${testId}-indicator`}
          aria-hidden="true"
          className={cn(
            'shrink-0 rounded-md flex items-center justify-center transition-all shadow-xs ml-auto',
            size === 'sm' ? 'w-5 h-5 rounded-sm' : 'w-6 h-6 rounded-md',
            selected
              ? 'bg-action-primary border-2 border-brand-rose text-text-inverse'
              : disabled
              ? 'bg-bg-subtle border border-border-default text-transparent'
              : 'bg-bg-surface border border-border-default text-transparent group-hover:border-border-brand'
          )}
        >
          {selected && (
            <svg
              className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.3334 4L6.00008 11.3333L2.66675 8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    );
  }
);

AddonCompanionCard.displayName = 'AddonCompanionCard';
