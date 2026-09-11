'use client';

import React, { forwardRef, useState, useMemo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const productImageGalleryVariants = cva(
  'flex flex-col gap-3 w-full select-none',
  {
    variants: {
      layout: {
        desktop: 'max-w-[480px]',
        mobile: 'max-w-[340px]',
        auto: 'w-full max-w-[480px]',
      },
    },
    defaultVariants: {
      layout: 'auto',
    },
  }
);

export interface GalleryImage {
  id?: string;
  url: string;
  alt?: string;
}

export interface ProductImageGalleryProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof productImageGalleryVariants> {
  /**
   * Array of image URLs or GalleryImage objects to display in the gallery.
   */
  images?: Array<string | GalleryImage>;

  /**
   * Product name used for accessible fallback alt text.
   */
  productName?: string;

  /**
   * Controlled active image index.
   */
  selectedIndex?: number;

  /**
   * Initial active image index when uncontrolled.
   * @default 0
   */
  defaultIndex?: number;

  /**
   * Callback fired when the active image changes.
   */
  onSelectImage?: (index: number) => void;

  /**
   * Presentation layout mode.
   * - 'desktop': 480px fixed max width with 64px thumbnails.
   * - 'mobile': 340px fixed max width with 56px thumbnails.
   * - 'auto': Fluid responsive sizing between mobile (340px) and desktop (480px).
   * @default 'auto'
   */
  layout?: 'desktop' | 'mobile' | 'auto';

  /**
   * Whether to display the thumbnail navigation strip below the main image.
   * @default true
   */
  thumbnails?: boolean;

  /**
   * Whether to show the bottom-right image count badge overlay (e.g. "1 / 4").
   * @default false
   */
  showImageCount?: boolean;

  /**
   * Custom text override for the image count badge (e.g. "1 / 5").
   */
  imageCountText?: string;

  /**
   * Optional custom badge rendered in the top-left corner of the main image.
   */
  badge?: React.ReactNode;

  /**
   * Whether to display navigation arrow buttons on hover/focus.
   * @default true
   */
  showArrows?: boolean;

  /**
   * Test identifier attribute for testing libraries.
   * @default 'product-image-gallery'
   */
  'data-testid'?: string;
}

/**
 * ProductImageGallery Component
 * Canonical storefront product image gallery adhering directly to Figma Component Set `40:24601`
 * (32 variants) and Documentation Board `41:24602` ("Product Image Galleries" on `Components` page).
 *
 * Features 1:1 dominant image viewport (`Radius/LG` 20px), square thumbnail navigation strip
 * (`64×64px` desktop / `56×56px` mobile, `Radius/MD` 14px) with Rose active border token (`#D99BA3`),
 * optional translucent charcoal image counter badge (`"1 / 4"`), previous/next arrow controls,
 * and full keyboard accessibility.
 */
export const ProductImageGallery = forwardRef<HTMLDivElement, ProductImageGalleryProps>(
  (
    {
      images = [],
      productName = 'Product',
      selectedIndex,
      defaultIndex = 0,
      onSelectImage,
      layout = 'auto',
      thumbnails = true,
      showImageCount = false,
      imageCountText,
      badge,
      showArrows = true,
      className,
      'data-testid': testId = 'product-image-gallery',
      onKeyDown,
      ...props
    },
    ref
  ) => {
    // Normalize image list
    const normalizedImages: GalleryImage[] = useMemo(() => {
      if (!images || images.length === 0) return [];
      return images.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `img-${idx}`,
            url: item,
            alt: `${productName} — View ${idx + 1}`,
          };
        }
        return {
          id: item.id || `img-${idx}`,
          url: item.url,
          alt: item.alt || `${productName} — View ${idx + 1}`,
        };
      });
    }, [images, productName]);

    // Uncontrolled vs Controlled state
    const [internalIndex, setInternalIndex] = useState(defaultIndex);
    const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;

    const safeIndex =
      normalizedImages.length > 0
        ? Math.min(Math.max(0, activeIndex), normalizedImages.length - 1)
        : 0;

    const currentImage = normalizedImages[safeIndex] || null;

    const handleSelect = (index: number) => {
      if (index < 0 || index >= normalizedImages.length) return;
      if (selectedIndex === undefined) {
        setInternalIndex(index);
      }
      onSelectImage?.(index);
    };

    const handlePrev = () => {
      const prev = safeIndex === 0 ? normalizedImages.length - 1 : safeIndex - 1;
      handleSelect(prev);
    };

    const handleNext = () => {
      const next = safeIndex === normalizedImages.length - 1 ? 0 : safeIndex + 1;
      handleSelect(next);
    };

    // Keyboard navigation (ArrowLeft / ArrowRight)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (normalizedImages.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    // Counter badge display string (e.g. "1 / 4")
    const counterDisplay =
      imageCountText ||
      (normalizedImages.length > 0 ? `${safeIndex + 1} / ${normalizedImages.length}` : null);

    return (
      <div
        ref={ref}
        role="region"
        aria-label={`${productName} gallery`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-testid={testId}
        className={cn(productImageGalleryVariants({ layout }), className)}
        {...props}
      >
        {/* 1. Main 1:1 Dominant Image Viewport */}
        <div
          className={cn(
            'aspect-square w-full rounded-lg overflow-hidden',
            'bg-bg-subtle border border-border-default relative group select-none shadow-xs',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand'
          )}
          data-testid={`${testId}-main-viewport`}
        >
          {currentImage ? (
            <img
              src={currentImage.url}
              alt={currentImage.alt || productName}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 animate-in fade-in-50"
              data-testid={`${testId}-main-image`}
            />
          ) : (
            // Artistic Brand Placeholder Fallback
            <div
              className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-bg-brand via-bg-surface to-bg-accent p-8 text-center"
              data-testid={`${testId}-placeholder`}
            >
              <span className="text-5xl sm:text-6xl mb-3" aria-hidden="true">
                🎨
              </span>
              <span className="font-heading font-bold text-base sm:text-lg text-text-primary">
                Unwind <span className="text-brand-rose">&amp;</span> Doodle
              </span>
              <span className="text-xs text-text-tertiary mt-1 font-body">
                Archival Mindful Collection
              </span>
            </div>
          )}

          {/* Top-Left Custom Badge Slot */}
          {badge && (
            <div
              className="absolute top-3 left-3 z-10 select-none pointer-events-none"
              data-testid={`${testId}-badge-slot`}
            >
              {badge}
            </div>
          )}

          {/* Previous / Next Arrow Controls */}
          {showArrows && normalizedImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Previous image"
                data-testid={`${testId}-prev-btn`}
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 z-10',
                  'w-9 h-9 rounded-full bg-bg-surface/90 hover:bg-bg-surface text-text-primary shadow-md',
                  'flex items-center justify-center transition-all cursor-pointer',
                  'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand'
                )}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Next image"
                data-testid={`${testId}-next-btn`}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 z-10',
                  'w-9 h-9 rounded-full bg-bg-surface/90 hover:bg-bg-surface text-text-primary shadow-md',
                  'flex items-center justify-center transition-all cursor-pointer',
                  'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand'
                )}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          {/* Image Count Badge Overlay */}
          {showImageCount && counterDisplay && (
            <div
              className={cn(
                'absolute bottom-3 right-3 z-10 select-none pointer-events-none',
                'bg-neutral-charcoal/75 backdrop-blur-xs text-text-inverse',
                'font-body font-medium text-xs rounded-full px-2.5 py-1 shadow-xs'
              )}
              data-testid={`${testId}-image-count`}
              aria-hidden="true"
            >
              {counterDisplay}
            </div>
          )}
        </div>

        {/* 2. Thumbnail Navigation Strip */}
        {thumbnails && normalizedImages.length > 1 && (
          <div
            role="tablist"
            aria-label="Product thumbnails"
            className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none"
            data-testid={`${testId}-thumbnails`}
          >
            {normalizedImages.map((img, idx) => {
              const isSelected = idx === safeIndex;

              return (
                <button
                  key={img.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`View image ${idx + 1} of ${normalizedImages.length}`}
                  onClick={() => handleSelect(idx)}
                  data-testid={`${testId}-thumb-${idx}`}
                  className={cn(
                    'relative shrink-0 aspect-square rounded-md overflow-hidden transition-all cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2',
                    layout === 'desktop'
                      ? 'w-16 h-16'
                      : layout === 'mobile'
                      ? 'w-14 h-14'
                      : 'w-14 h-14 sm:w-16 sm:h-16',
                    isSelected
                      ? 'border-2 border-brand-rose opacity-100 ring-2 ring-brand-rose/20 shadow-xs'
                      : 'border border-border-default opacity-70 hover:opacity-100 hover:border-border-brand/70'
                  )}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

ProductImageGallery.displayName = 'ProductImageGallery';
export default ProductImageGallery;
