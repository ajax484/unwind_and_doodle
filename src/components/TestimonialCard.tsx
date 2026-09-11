import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { RatingStars, type RatingStarsSize } from './RatingStars';
import { Avatar, type AvatarSize } from './Avatar';

export type TestimonialCardSize = 'md' | 'sm';

export interface TestimonialAuthor {
  /**
   * Full name of the customer or reviewer
   */
  name: string;
  /**
   * Optional image URL for customer avatar
   */
  avatarSrc?: string | null;
  /**
   * Explicit 2-letter monogram initials fallback (e.g. 'BY')
   */
  initials?: string;
  /**
   * Verification or customer status badge (e.g. 'Verified customer')
   */
  roleOrStatus?: string;
  /**
   * Product or experience context (e.g. 'Custom Coloring Book')
   */
  productContext?: string;
  /**
   * Optional customer geographic location (e.g. 'Lagos, Nigeria')
   */
  location?: string;
}

export const testimonialCardVariants = cva(
  'w-full flex flex-col justify-between bg-bg-surface border border-border-default rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 select-none',
  {
    variants: {
      size: {
        md: 'p-6 gap-4',
        sm: 'p-4 gap-3',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface TestimonialCardProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof testimonialCardVariants> {
  /**
   * Quote or testimonial review text
   */
  quote: string;
  /**
   * Author details and metadata
   */
  author: TestimonialAuthor;
  /**
   * Numeric star rating score between 0 and 5
   * @default 5
   */
  rating?: number;
  /**
   * Whether to display the top rating stars row
   * @default true
   */
  showRating?: boolean;
  /**
   * Sizing scale variant: 'md' (storefront standard, 24px padding, 18px quote) or 'sm' (compact, 16px padding, 14px quote)
   * @default 'md'
   */
  size?: TestimonialCardSize;
  /**
   * Test identifier attribute for testing libraries
   * @default 'testimonial-card'
   */
  'data-testid'?: string;
}

/**
 * Canonical TestimonialCard Component
 *
 * Grounded in Figma Component Set `TestimonialCard` (Node ID: 19:10006)
 * and Documentation Board `Ratings & Testimonials` (Components Page: 16:2942).
 *
 * Features:
 * - Direct atomic composition of canonical `RatingStars` and `Avatar` primitives
 * - Bound to design tokens: Radius/LG (20px), Shadow/Card, Neutral/Border/Soft, Neutral/Charcoal
 * - W3C semantic <figure>, <blockquote>, and <figcaption> markup
 * - Responsive auto-layout with natural quote wrapping and bottom-anchored author attribution
 */
export const TestimonialCard = forwardRef<HTMLElement, TestimonialCardProps>(
  (
    {
      quote,
      author,
      rating = 5,
      showRating = true,
      size = 'md',
      className,
      'data-testid': testId = 'testimonial-card',
      ...props
    },
    ref
  ) => {
    const avatarSize: AvatarSize = size === 'sm' ? 'sm' : 'md';
    const ratingSize: RatingStarsSize = size === 'sm' ? 'sm' : 'md';

    // Supporting metadata items (e.g., "Verified customer · Custom Coloring Book · Lagos, Nigeria")
    const metadataParts = [
      author.roleOrStatus,
      author.productContext,
      author.location,
    ].filter(Boolean);

    return (
      <figure
        ref={ref}
        data-testid={testId}
        className={cn(testimonialCardVariants({ size }), className)}
        {...props}
      >
        <div className="flex flex-col gap-3">
          {/* Rating Row */}
          {showRating && rating !== undefined && (
            <div
              className="flex items-center"
              data-testid={`${testId}-rating-container`}
            >
              <RatingStars
                rating={rating}
                size={ratingSize}
                showValue={true}
                data-testid={`${testId}-rating-stars`}
              />
            </div>
          )}

          {/* Quote Body */}
          <blockquote
            data-testid={`${testId}-quote`}
            className={cn(
              'italic text-text-primary leading-relaxed font-body m-0',
              size === 'sm' ? 'text-sm' : 'text-lg'
            )}
          >
            &ldquo;{quote}&rdquo;
          </blockquote>
        </div>

        {/* Author Attribution Row */}
        <figcaption
          data-testid={`${testId}-author-row`}
          className="flex items-center gap-3 pt-2 mt-auto"
        >
          <Avatar
            size={avatarSize}
            src={author.avatarSrc}
            name={author.name}
            initials={author.initials}
            data-testid={`${testId}-avatar`}
          />

          <div className="flex flex-col justify-center min-w-0">
            <span
              data-testid={`${testId}-author-name`}
              className="font-heading font-semibold text-sm text-text-primary truncate block leading-snug"
            >
              {author.name}
            </span>

            {metadataParts.length > 0 && (
              <span
                data-testid={`${testId}-author-meta`}
                className="text-xs text-text-tertiary truncate block leading-snug"
              >
                {metadataParts.join(' · ')}
              </span>
            )}
          </div>
        </figcaption>
      </figure>
    );
  }
);

TestimonialCard.displayName = 'TestimonialCard';
export default TestimonialCard;
