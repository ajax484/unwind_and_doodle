'use client';

import React, { forwardRef, useState, useMemo, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ProductMedia } from '@/types/product-media';

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

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  alt: string;
}

export interface ProductImageGalleryProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof productImageGalleryVariants> {
  /**
   * Unified product media collection. If provided, display order will promote
   * the first video to index 0, followed by remaining images and media in relative sort order.
   */
  media?: ProductMedia[];

  /**
   * Array of image URLs or GalleryImage objects to display in the gallery (fallback/legacy).
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
 * Derives the display order of media items for the storefront presentation layer:
 * - If the collection contains a video, the first video in database sort order is promoted to index 0.
 * - All remaining items (images and any subsequent videos) follow in their original relative sort order.
 * - If no video exists, the media collection order is preserved as-is.
 * - If media is not provided, falls back to the legacy images array.
 */
export function deriveGalleryMedia(
  media?: ProductMedia[],
  fallbackImages?: Array<string | GalleryImage>,
  productName: string = 'Product'
): GalleryItem[] {
  if (media && media.length > 0) {
    const firstVideoIndex = media.findIndex((m) => m.type === 'video');

    let orderedMedia: ProductMedia[];
    if (firstVideoIndex > 0) {
      const firstVideo = media[firstVideoIndex];
      const remaining = media.filter((_, idx) => idx !== firstVideoIndex);
      orderedMedia = [firstVideo, ...remaining];
    } else {
      orderedMedia = [...media];
    }

    return orderedMedia.map((m, idx) => ({
      id: m.id || `media-${idx}`,
      type: m.type,
      url: m.storagePath,
      posterUrl: m.thumbnailPath || null,
      thumbnailUrl: m.thumbnailPath || m.storagePath,
      alt:
        m.altText ||
        `${productName} — ${m.type === 'video' ? 'Product Video' : `View ${idx + 1}`}`,
    }));
  }

  if (fallbackImages && fallbackImages.length > 0) {
    return fallbackImages.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `img-${idx}`,
          type: 'image' as const,
          url: item,
          posterUrl: null,
          thumbnailUrl: item,
          alt: `${productName} — View ${idx + 1}`,
        };
      }
      return {
        id: item.id || `img-${idx}`,
        type: 'image' as const,
        url: item.url,
        posterUrl: null,
        thumbnailUrl: item.url,
        alt: item.alt || `${productName} — View ${idx + 1}`,
      };
    });
  }

  return [];
}

/**
 * ProductImageGallery Component
 * Canonical storefront product media carousel & gallery adhering to Figma Component Set `40:24601`
 * and Documentation Board `41:24602`.
 *
 * Features:
 * - 1:1 dominant media viewport with video support (muted, inline, controls)
 * - Automatic video promotion to position 0 when product has a video
 * - Automatic video pause on slide navigation
 * - Touch swipe gesture support for mobile
 * - Square thumbnail navigation strip with active rose border token (`#D99BA3`)
 * - Video thumbnail play badge overlay (`▶`) and accessible labels
 * - Keyboard navigation (ArrowLeft / ArrowRight)
 * - Graceful fallback to static image on video load/format error
 */
export const ProductImageGallery = forwardRef<HTMLDivElement, ProductImageGalleryProps>(
  (
    {
      media,
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
    // Derive ordered gallery items
    const galleryItems: GalleryItem[] = useMemo(() => {
      return deriveGalleryMedia(media, images, productName);
    }, [media, images, productName]);

    // Fallback static image URL if video encounters error
    const fallbackImageUrl = useMemo(() => {
      return galleryItems.find((item) => item.type === 'image')?.url || null;
    }, [galleryItems]);

    // Uncontrolled vs Controlled state
    const [internalIndex, setInternalIndex] = useState(defaultIndex);
    const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;

    const safeIndex =
      galleryItems.length > 0
        ? Math.min(Math.max(0, activeIndex), galleryItems.length - 1)
        : 0;

    const currentItem = galleryItems[safeIndex] || null;

    // Active video ref & error tracking
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [videoHasError, setVideoHasError] = useState(false);

    // Pause video whenever slide changes and reset error state
    useEffect(() => {
      setVideoHasError(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, [safeIndex]);

    // Pause video on unmount
    useEffect(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      };
    }, []);

    const handleSelect = (index: number) => {
      if (index < 0 || index >= galleryItems.length) return;
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (selectedIndex === undefined) {
        setInternalIndex(index);
      }
      onSelectImage?.(index);
    };

    const handlePrev = () => {
      const prev = safeIndex === 0 ? galleryItems.length - 1 : safeIndex - 1;
      handleSelect(prev);
    };

    const handleNext = () => {
      const next = safeIndex === galleryItems.length - 1 ? 0 : safeIndex + 1;
      handleSelect(next);
    };

    // Keyboard navigation (ArrowLeft / ArrowRight)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (galleryItems.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    // Touch swipe gestures for mobile
    const touchStartXRef = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      if (touchStartXRef.current === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartXRef.current - touchEndX;
      const threshold = 40; // minimum 40px delta for swipe
      if (diff > threshold) {
        handleNext(); // Swiped left -> next
      } else if (diff < -threshold) {
        handlePrev(); // Swiped right -> prev
      }
      touchStartXRef.current = null;
    };

    // Counter badge display string (e.g. "1 / 4")
    const counterDisplay =
      imageCountText ||
      (galleryItems.length > 0 ? `${safeIndex + 1} / ${galleryItems.length}` : null);

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
        {/* 1. Main 1:1 Dominant Media Viewport */}
        <div
          className={cn(
            'aspect-square w-full rounded-lg overflow-hidden',
            'bg-bg-subtle border border-border-default relative group select-none shadow-xs',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand'
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          data-testid={`${testId}-main-viewport`}
        >
          {currentItem ? (
            currentItem.type === 'video' && !videoHasError ? (
              <video
                ref={videoRef}
                src={currentItem.url}
                poster={currentItem.posterUrl || undefined}
                muted
                playsInline
                controls
                preload="metadata"
                onError={() => setVideoHasError(true)}
                className="w-full h-full object-cover animate-in fade-in-50"
                aria-label={`${productName} — Product Video`}
                data-testid={`${testId}-main-video`}
              />
            ) : (
              <img
                src={
                  currentItem.type === 'video' && videoHasError
                    ? currentItem.posterUrl || fallbackImageUrl || currentItem.url
                    : currentItem.url
                }
                alt={currentItem.alt || productName}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 animate-in fade-in-50"
                data-testid={`${testId}-main-image`}
              />
            )
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
          {showArrows && galleryItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Previous slide"
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
                aria-label="Next slide"
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

          {/* Counter Badge Overlay */}
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
        {thumbnails && galleryItems.length > 1 && (
          <div
            role="tablist"
            aria-label="Product media thumbnails"
            className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none"
            data-testid={`${testId}-thumbnails`}
          >
            {galleryItems.map((item, idx) => {
              const isSelected = idx === safeIndex;
              const isVideo = item.type === 'video';

              return (
                <button
                  key={item.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={
                    isVideo
                      ? `View product video (${idx + 1} of ${galleryItems.length})`
                      : `View image ${idx + 1} of ${galleryItems.length}`
                  }
                  onClick={() => handleSelect(idx)}
                  data-testid={`${testId}-thumb-${idx}`}
                  className={cn(
                    'relative shrink-0 aspect-square rounded-md overflow-hidden transition-all cursor-pointer bg-bg-subtle',
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
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-surface text-text-tertiary">
                      <span className="text-xs">🎬</span>
                    </div>
                  )}

                  {/* Video Play Indicator Overlay */}
                  {isVideo && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none"
                      aria-hidden="true"
                      data-testid={`${testId}-thumb-video-indicator-${idx}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-bg-surface/90 text-text-primary flex items-center justify-center shadow-xs">
                        <svg
                          className="w-2.5 h-2.5 translate-x-0.5 text-text-primary"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    </div>
                  )}
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
