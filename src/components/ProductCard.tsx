'use client';

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format-utils';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { RatingStars } from '@/components/RatingStars';
import { ProductMedia } from '@/types/product-media';

export const productCardVariants = cva(
  [
    'card-soft group relative flex flex-col h-full overflow-hidden',
    'bg-bg-surface border border-border-default rounded-2xl',
    'shadow-card hover:shadow-card-hover',
    'transition-all duration-300 ease-out',
  ],
  {
    variants: {
      variant: {
        standard: '',
        custom: '',
        bundle: '',
        out_of_stock: '',
      },
      size: {
        sm: 'p-3 sm:p-3.5',
        md: 'p-4 sm:p-5',
      },
    },
    defaultVariants: {
      variant: 'standard',
      size: 'md',
    },
  }
);

export type ProductCardVariant = NonNullable<VariantProps<typeof productCardVariants>['variant']>;
export type ProductCardSize = NonNullable<VariantProps<typeof productCardVariants>['size']>;

export interface ProductCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id'>,
    VariantProps<typeof productCardVariants> {
  /** Unique product identifier. */
  id: string;
  /** Display title of the product. */
  name: string;
  /** URL slug for product routing and link navigation. */
  slug: string;
  /** Price in minor units (e.g. pence/cents) or formatted currency amount. */
  price: number;
  /** Primary hero image URL, or null for branded placeholder graphic. */
  primaryImage: string | null;
  /** Optional unified product media collection. */
  media?: ProductMedia[];
  /** Optional direct override URL for hover preview video. */
  hoverVideoUrl?: string | null;
  /** In-stock status; when false, marks product as out of stock. */
  isAvailable: boolean;
  /** Indicates whether the product requires personalized customer input (photo/name). */
  requiresCustomization?: boolean;
  /** Product classification category. */
  productType?: 'physical' | 'custom' | 'bundle';
  /** Number of bundled components if productType is 'bundle'. */
  bundleComponentsCount?: number;
  /** Optional category list associated with this product. */
  categories?: { id: string; name: string }[];
  /** Explicit variant override. If omitted, inferred from availability and product type. */
  variant?: ProductCardVariant;
  /** Star rating score (0 to 5 scale, supports fractional values like 4.9). */
  rating?: number;
  /** Total review count displayed beside rating score. */
  reviewCount?: number | string;
  /** Controls visibility of the star rating row. Defaults to true when rating is provided. */
  showRating?: boolean;
  /** Optional short description text below product title. */
  description?: string;
  /** Custom text override for the media badge (e.g., "Bestseller", "New"). */
  badgeText?: string;
  /** Controls visibility of the media overlay badge. Defaults to true. */
  showBadge?: boolean;
  /** Controls visibility of subordinate capability metadata line. Defaults to true. */
  showCapabilities?: boolean;
  /** Subordinate capability metadata copy override. */
  capabilityText?: string;
  /** Controls visibility of bottom action button. Defaults to true. */
  showAction?: boolean;
  /** Action button textual label override. */
  actionText?: string;
  /**
   * Action button layout:
   * - 'full': Stretches full-width below price (canonical Figma Step 2D).
   * - 'inline': Inline beside price in bottom flex row.
   * Defaults to 'full'.
   */
  actionLayout?: 'full' | 'inline';
  /** Click callback for the action button. */
  onActionClick?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Priority loading flag for the hero image. */
  priority?: boolean;
  /** Test identifier attribute. */
  'data-testid'?: string;
}

export function resolveProductCardMedia(
  primaryImage: string | null,
  media?: ProductMedia[],
  hoverVideoUrl?: string | null
) {
  const firstVideoMedia = media?.find((m) => m.type === 'video');
  const videoUrl = hoverVideoUrl || (firstVideoMedia ? firstVideoMedia.storagePath : null);
  const videoPoster = firstVideoMedia?.thumbnailPath || null;
  const defaultImage = primaryImage || media?.find((m) => m.type === 'image')?.storagePath || null;

  return {
    firstVideoMedia,
    videoUrl,
    videoPoster,
    defaultImage,
  };
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(
  (
    {
      id,
      name,
      slug,
      price,
      primaryImage,
      media,
      hoverVideoUrl,
      isAvailable,
      requiresCustomization = false,
      productType = 'physical',
      bundleComponentsCount,
      categories,
      variant,
      size = 'md',
      rating,
      reviewCount,
      showRating,
      description,
      badgeText,
      showBadge = true,
      showCapabilities = true,
      capabilityText,
      showAction = true,
      actionText,
      actionLayout = 'full',
      onActionClick,
      priority = false,
      className,
      'data-testid': testId = 'product-card',
      ...rest
    },
    ref
  ) => {
    // 1. Resolve first video from media (or hoverVideoUrl override)
    const { firstVideoMedia, videoUrl, videoPoster } = resolveProductCardMedia(
      primaryImage,
      media,
      hoverVideoUrl
    );

    // 2. Hover and playback state
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [hasVideoError, setHasVideoError] = useState(false);
    const [supportsHover, setSupportsHover] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
        setSupportsHover(hoverQuery.matches);
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(motionQuery.matches);

        const handleHoverChange = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
        const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

        hoverQuery.addEventListener?.('change', handleHoverChange);
        motionQuery.addEventListener?.('change', handleMotionChange);

        return () => {
          hoverQuery.removeEventListener?.('change', handleHoverChange);
          motionQuery.removeEventListener?.('change', handleMotionChange);
          if (videoRef.current) {
            videoRef.current.pause();
          }
        };
      }
    }, []);

    const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
      rest.onPointerEnter?.(e);
      if (e.pointerType !== 'mouse' || !videoUrl || hasVideoError || !supportsHover) return;
      setIsHovered(true);
      if (videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Handled silently: fallback stays on static image
          });
        }
      }
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
      rest.onPointerLeave?.(e);
      if (e.pointerType !== 'mouse') return;
      setIsHovered(false);
      setIsVideoPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };

    // 3. Resolve canonical variant
    const effectiveVariant: ProductCardVariant =
      variant ||
      (!isAvailable
        ? 'out_of_stock'
        : productType === 'bundle'
        ? 'bundle'
        : requiresCustomization || productType === 'custom'
        ? 'custom'
        : 'standard');

    // 4. Format price
    const formattedPrice = formatPrice(price);

    // 5. Resolve category eyebrow
    const categoryName = categories && categories.length > 0 ? categories[0].name : null;

    // 6. Resolve capability metadata
    const resolvedCapabilityText =
      capabilityText !== undefined
        ? capabilityText
        : effectiveVariant === 'custom'
        ? 'Choose a theme · Add a name · Add images'
        : effectiveVariant === 'bundle'
        ? bundleComponentsCount
          ? `Includes ${bundleComponentsCount} products · Add-ons available`
          : 'Bundle package · Add-ons available'
        : effectiveVariant === 'standard'
        ? 'Add-ons available'
        : null;

    // 7. Resolve action label
    const resolvedActionText =
      actionText ||
      (effectiveVariant === 'out_of_stock'
        ? 'Out of stock'
        : effectiveVariant === 'custom'
        ? 'Customize'
        : effectiveVariant === 'bundle'
        ? 'View bundle'
        : 'View product');

    // 8. Resolve rating visibility
    const isRatingVisible = showRating !== undefined ? showRating : rating !== undefined;

    return (
      <div
        ref={ref}
        data-testid={testId}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className={cn(productCardVariants({ variant: effectiveVariant, size, className }))}
        {...rest}
      >
        {/* Media Container with 1:1 Aspect Ratio */}
        <Link
          href={`/products/${slug}`}
          className="relative aspect-square bg-bg-subtle overflow-hidden rounded-md block shrink-0 select-none"
          tabIndex={-1}
          aria-hidden="true"
        >
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-bg-brand via-bg-surface to-bg-accent p-6 text-center">
              <span className="text-3xl mb-1.5" aria-hidden="true">
                🎨
              </span>
              <span className="font-heading font-semibold text-xs text-text-secondary">
                unwind <span className="text-brand-rose">&amp;</span> doodle
              </span>
            </div>
          )}

          {/* Hover Video Preview Layer */}
          {videoUrl && supportsHover && !hasVideoError && (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={videoPoster || undefined}
              muted
              playsInline
              loop
              preload="none"
              tabIndex={-1}
              aria-hidden="true"
              onPlaying={() => setIsVideoPlaying(true)}
              onError={() => setHasVideoError(true)}
              className={cn(
                'absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity',
                prefersReducedMotion ? '' : 'duration-300 ease-out',
                isHovered && isVideoPlaying ? 'opacity-100' : 'opacity-0'
              )}
            />
          )}

          {/* Media Badges Slot */}
          {showBadge && (
            <>
              {/* Custom Tag Badge */}
              {badgeText && (
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <Badge variant="tag" size="sm">
                    {badgeText}
                  </Badge>
                </div>
              )}

              {/* Bundle Badge */}
              {!badgeText && effectiveVariant === 'bundle' && (
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <Badge
                    variant="bundle"
                    size="sm"
                    icon={<span aria-hidden="true">📦</span>}
                  >
                    {bundleComponentsCount
                      ? `Bundle • ${bundleComponentsCount} Items`
                      : 'Bundle'}
                  </Badge>
                </div>
              )}

              {/* Customization Badge */}
              {!badgeText && effectiveVariant === 'custom' && (
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <Badge
                    variant="accent"
                    size="sm"
                    icon={<span aria-hidden="true">✨</span>}
                  >
                    Custom Photo
                  </Badge>
                </div>
              )}

              {/* Out of Stock Badge */}
              {!isAvailable && (
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <Badge variant="status" statusType="danger" size="sm">
                    Out of Stock
                  </Badge>
                </div>
              )}
            </>
          )}
        </Link>

        {/* Card Body */}
        <div className="pt-3.5 sm:pt-4 flex flex-col flex-grow justify-between gap-3">
          <div className="space-y-1.5">
            {/* Category / Eyebrow */}
            {categoryName && (
              <span className="text-[11px] font-heading font-semibold tracking-wider uppercase text-text-brand block truncate">
                {categoryName}
              </span>
            )}

            {/* Product Title */}
            <Link
              href={`/products/${slug}`}
              className="block group-hover:text-action-primary transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue/50 focus-visible:ring-offset-2 rounded-sm"
            >
              <h3 className="font-heading font-semibold text-base sm:text-lg text-text-primary leading-snug line-clamp-2">
                {name}
              </h3>
            </Link>

            {/* Optional Description */}
            {description && (
              <p className="text-xs sm:text-sm text-text-secondary line-clamp-2">
                {description}
              </p>
            )}

            {/* Subordinate Capability Metadata */}
            {showCapabilities && resolvedCapabilityText && (
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-text-secondary pt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-text-brand/60 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{resolvedCapabilityText}</span>
              </div>
            )}

            {/* Compact Star Rating Row */}
            {isRatingVisible && rating !== undefined && (
              <div className="pt-0.5">
                <RatingStars
                  rating={rating}
                  size="sm"
                  showValue
                  reviewCount={reviewCount}
                />
              </div>
            )}
          </div>

          {/* Footer: Price & Action */}
          <div className="mt-auto pt-3 border-t border-border-default">
            {actionLayout === 'full' ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-base sm:text-lg text-text-primary">
                    {formattedPrice}
                  </span>
                </div>
                {showAction && (
                  <Button
                    href={onActionClick ? undefined : (isAvailable ? `/products/${slug}` : undefined)}
                    variant={isAvailable ? 'primary' : 'outline'}
                    size="sm"
                    disabled={!isAvailable}
                    className="w-full justify-center"
                    onClick={onActionClick}
                  >
                    <span>{resolvedActionText}</span>
                    {isAvailable && (
                      <span
                        aria-hidden="true"
                        className="text-xs transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="font-heading font-bold text-base sm:text-lg text-text-primary">
                  {formattedPrice}
                </span>
                {showAction && (
                  <Button
                    href={onActionClick ? undefined : (isAvailable ? `/products/${slug}` : undefined)}
                    variant={isAvailable ? 'primary' : 'outline'}
                    size="sm"
                    disabled={!isAvailable}
                    className="shrink-0"
                    onClick={onActionClick}
                  >
                    <span>{resolvedActionText}</span>
                    {isAvailable && (
                      <span
                        aria-hidden="true"
                        className="text-xs transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ProductCard.displayName = 'ProductCard';
export default ProductCard;
