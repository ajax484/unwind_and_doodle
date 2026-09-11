'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const paginationNavVariants = cva(
  'inline-flex items-center justify-center select-none',
  {
    variants: {
      size: {
        sm: 'gap-1',
        md: 'gap-2',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const paginationItemVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/40',
  {
    variants: {
      size: {
        sm: 'min-w-[32px] h-8 text-xs px-2',
        md: 'min-w-[40px] h-10 text-sm px-2.5',
      },
      isActive: {
        true: 'bg-bg-subtle text-text-primary font-bold shadow-xs',
        false: 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle/70 font-semibold cursor-pointer',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-40 text-text-tertiary hover:bg-transparent hover:text-text-tertiary',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      isActive: false,
      disabled: false,
    },
  }
);

export const paginationGhostVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-heading font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/40',
  {
    variants: {
      size: {
        sm: 'h-8 px-2 text-xs gap-1',
        md: 'h-10 px-2.5 text-sm gap-1.5',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-40 text-text-tertiary',
        false: 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle cursor-pointer',
      },
    },
    defaultVariants: {
      size: 'md',
      disabled: false,
    },
  }
);

export type PaginationSize = NonNullable<VariantProps<typeof paginationNavVariants>['size']>;

/**
 * Public props for the canonical Pagination molecule.
 */
export interface PaginationProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  /**
   * Current active 1-based page number.
   */
  currentPage: number;
  /**
   * Total number of pages.
   */
  totalPages: number;
  /**
   * Callback fired when a page number or previous/next control is clicked.
   */
  onPageChange: (page: number) => void;
  /**
   * Sizing scale of pagination buttons and navigators.
   * - `sm`: 32px touch target, 4px gap, compact for admin drawers and dense tables.
   * - `md`: 40px touch target, 8px gap, standard for storefront catalogs.
   * @default 'md'
   */
  size?: PaginationSize;
  /**
   * Whether to show textual "Previous" / "Next" labels alongside chevron icons.
   * @default false
   */
  showLabels?: boolean;
  /**
   * Custom label or icon for the previous page button.
   */
  prevLabel?: React.ReactNode;
  /**
   * Custom label or icon for the next page button.
   */
  nextLabel?: React.ReactNode;
  /**
   * Number of sibling page buttons visible on each side of the active page.
   * @default 1
   */
  siblingCount?: number;
  /**
   * Accessible label for the navigation element (WCAG 2.1 AA requirement).
   * @default 'Pagination Navigation'
   */
  'aria-label'?: string;
  /**
   * Custom test identifier for automated testing.
   */
  'data-testid'?: string;
}

/**
 * Generates an array of page numbers and ellipsis identifiers.
 */
function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= 0) return [];

  // If total pages is 5 or fewer, show all pages continuously
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  // Case 1: No left ellipsis, only right ellipsis
  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis-end', totalPages];
  }

  // Case 2: Only left ellipsis, no right ellipsis
  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const startPage = totalPages - rightItemCount + 1;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => startPage + i
    );
    return [1, 'ellipsis-start', ...rightRange];
  }

  // Case 3: Both left and right ellipsis
  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [1, 'ellipsis-start', ...middleRange, 'ellipsis-end', totalPages];
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Canonical Pagination molecule adhering to Figma Step 3H specifications and WAI-ARIA standards.
 *
 * Provides responsive SM (32px) and MD (40px) controls, continuous short range
 * and smart ellipsis truncated long range pagination, and accessible previous/next navigators.
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    currentPage,
    totalPages,
    onPageChange,
    size = 'md',
    showLabels = false,
    prevLabel,
    nextLabel,
    siblingCount = 1,
    'aria-label': ariaLabel = 'Pagination Navigation',
    className,
    'data-testid': testId,
    ...rest
  },
  ref
) {
  if (totalPages <= 0) return null;

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const paginationRange = getPaginationRange(currentPage, totalPages, siblingCount);

  const handlePageClick = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  const handlePrev = () => {
    if (!isFirstPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      onPageChange(currentPage + 1);
    }
  };

  const chevronSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <nav
      ref={ref}
      role="navigation"
      aria-label={ariaLabel}
      className={cn(paginationNavVariants({ size }), className)}
      data-testid={testId}
      {...rest}
    >
      {/* Previous Button */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={isFirstPage}
        aria-label="Go to previous page"
        aria-disabled={isFirstPage}
        data-testid="pagination-prev"
        className={cn(
          paginationGhostVariants({ size, disabled: isFirstPage }),
          !showLabels && (size === 'sm' ? 'w-8 px-0' : 'w-10 px-0')
        )}
      >
        <svg
          className={cn(chevronSize, 'shrink-0')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={size === 'sm' ? 1.5 : 1.75}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {showLabels && <span>{prevLabel ?? 'Previous'}</span>}
      </button>

      {/* Page Items */}
      <div
        className={cn(
          'flex items-center',
          size === 'sm' ? 'gap-1' : 'gap-2'
        )}
      >
        {paginationRange.map((item, index) => {
          if (item === 'ellipsis-start' || item === 'ellipsis-end') {
            return (
              <span
                key={`${item}-${index}`}
                aria-hidden="true"
                data-testid={`pagination-${item}`}
                className={cn(
                  'inline-flex items-center justify-center font-heading text-text-tertiary select-none',
                  size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
                )}
              >
                …
              </span>
            );
          }

          const isActive = item === currentPage;

          return (
            <button
              key={item}
              type="button"
              onClick={() => handlePageClick(item)}
              aria-label={isActive ? `Page ${item}, current page` : `Go to page ${item}`}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`pagination-page-${item}`}
              className={cn(
                paginationItemVariants({ size, isActive }),
                size === 'sm' ? 'w-8 px-0' : 'w-10 px-0'
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={isLastPage}
        aria-label="Go to next page"
        aria-disabled={isLastPage}
        data-testid="pagination-next"
        className={cn(
          paginationGhostVariants({ size, disabled: isLastPage }),
          !showLabels && (size === 'sm' ? 'w-8 px-0' : 'w-10 px-0')
        )}
      >
        {showLabels && <span>{nextLabel ?? 'Next'}</span>}
        <svg
          className={cn(chevronSize, 'shrink-0')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={size === 'sm' ? 1.5 : 1.75}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </nav>
  );
});
