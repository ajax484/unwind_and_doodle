'use client';

import React, { useState, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const ratingStarsVariants = cva(
  'inline-flex items-center select-none',
  {
    variants: {
      size: {
        sm: 'gap-1 text-xs',
        md: 'gap-1.5 text-sm',
        lg: 'gap-2 text-base',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  }
);

const starSizeMap = {
  sm: 'w-4 h-4', // 16px
  md: 'w-5 h-5', // 20px
  lg: 'w-6 h-6', // 24px
};

const starGapMap = {
  sm: 'gap-0.5', // 2px
  md: 'gap-1',   // 4px
  lg: 'gap-1.5', // 6px
};

export type RatingStarsSize = NonNullable<VariantProps<typeof ratingStarsVariants>['size']>;

export interface RatingStarsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof ratingStarsVariants> {
  /** Numeric rating score between 0 and 5 (supports fractional values like 4.5). */
  rating?: number;
  /** Scale and dimension of the stars (sm: 16px, md: 20px, lg: 24px). */
  size?: RatingStarsSize;
  /** Maximum number of stars rendered (defaults to 5). */
  maxRating?: number;
  /** When true, renders numeric score (e.g. "4.8" or "5.0") beside the stars. */
  showValue?: boolean;
  /** Optional review count display (e.g., 128 renders as "(128)"). */
  reviewCount?: number | string;
  /** When true, turns the star group into an interactive selection control. */
  interactive?: boolean;
  /** Callback triggered when user selects a star in interactive mode. */
  onRatingChange?: (newRating: number) => void;
  /** Optional testing identifier. */
  'data-testid'?: string;
}

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

/**
 * RatingStars component implementing canonical Unwind & Doodle design system specifications.
 * 
 * Features:
 * - 3 Scales: SM (16px stars, 2px gap), MD (20px stars, 4px gap), LG (24px stars, 6px gap)
 * - 5-point vector star geometry with precision fractional fill support
 * - Action/Primary rose fill (#D99BA3) and Border/Default empty fill (#EDF3F7)
 * - Read-only display with accessible role="img" and screen-reader announcements
 * - Interactive rating picker with hover previews, keyboard focus, and accessible touch targets
 * - Optional numeric value and review count formatting
 */
export function RatingStars({
  rating = 5,
  size = 'sm',
  maxRating = 5,
  showValue = false,
  reviewCount,
  interactive = false,
  onRatingChange,
  className,
  'data-testid': testId,
  ...rest
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);
  const baseId = useId();

  const effectiveRating = interactive && hoverRating > 0 ? hoverRating : rating;
  const clampedRating = Math.max(0, Math.min(maxRating, effectiveRating));

  const starsArray = Array.from({ length: maxRating }, (_, i) => i + 1);

  return (
    <div
      className={cn(ratingStarsVariants({ size, className }))}
      data-testid={testId}
      {...rest}
    >
      <div
        className={cn('inline-flex items-center', starGapMap[size])}
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={
          interactive
            ? 'Rating selector'
            : `${clampedRating.toFixed(1)} out of ${maxRating} stars`
        }
      >
        {starsArray.map((starIndex) => {
          const fillRatio = Math.max(0, Math.min(1, clampedRating - (starIndex - 1)));
          const isFull = fillRatio >= 1;
          const isEmpty = fillRatio <= 0;
          const isPartial = !isFull && !isEmpty;
          const gradientId = `star-grad-${baseId}-${starIndex}`;

          const starSvg = (
            <svg
              viewBox="0 0 24 24"
              className={cn(
                starSizeMap[size],
                'shrink-0 transition-colors duration-150',
                isFull && 'fill-action-primary text-action-primary',
                isEmpty && 'fill-border-default text-border-default'
              )}
              aria-hidden="true"
            >
              {isPartial && (
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset={`${fillRatio * 100}%`} className="text-action-primary" stopColor="currentColor" />
                    <stop offset={`${fillRatio * 100}%`} className="text-border-default" stopColor="currentColor" />
                  </linearGradient>
                </defs>
              )}
              <path
                d={STAR_PATH}
                fill={isPartial ? `url(#${gradientId})` : undefined}
              />
            </svg>
          );

          if (interactive) {
            return (
              <button
                key={starIndex}
                type="button"
                role="radio"
                aria-checked={effectiveRating >= starIndex}
                aria-label={`${starIndex} star${starIndex > 1 ? 's' : ''}`}
                onClick={() => onRatingChange?.(starIndex)}
                onMouseEnter={() => setHoverRating(starIndex)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5 rounded-sm hover:scale-115 active:scale-95 transition-transform cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-action-primary"
              >
                {starSvg}
              </button>
            );
          }

          return (
            <span key={starIndex} className="inline-flex">
              {starSvg}
            </span>
          );
        })}
      </div>

      {showValue && (
        <span className="font-semibold text-text-secondary ml-1 tabular-nums">
          {clampedRating.toFixed(1)}
        </span>
      )}

      {reviewCount !== undefined && reviewCount !== null && (
        <span className="text-text-tertiary ml-0.5">
          ({typeof reviewCount === 'number' ? reviewCount.toLocaleString() : reviewCount})
        </span>
      )}
    </div>
  );
}

export default RatingStars;
