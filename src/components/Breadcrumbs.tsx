import React, { forwardRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type BreadcrumbsSize = 'md' | 'sm';

export interface BreadcrumbItem {
  id?: string;
  label: React.ReactNode;
  href?: string;
  isCurrent?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export const breadcrumbsVariants = cva('w-full select-none', {
  variants: {
    size: {
      md: 'text-sm',
      sm: 'text-xs',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface BreadcrumbsProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof breadcrumbsVariants> {
  /**
   * List of breadcrumb items to render in sequence
   */
  items?: BreadcrumbItem[];
  /**
   * Sizing variant (MD 14px storefront default, SM 12px admin/dense)
   * @default 'md'
   */
  size?: BreadcrumbsSize;
  /**
   * Whether to lead with an accessible Home icon
   * @default true
   */
  showHome?: boolean;
  /**
   * Target URL for the Home item
   * @default '/'
   */
  homeHref?: string;
  /**
   * Accessible label for the Home item
   * @default 'Home'
   */
  homeLabel?: string;
  /**
   * Maximum visible items before intermediate ancestors are middle-truncated
   */
  maxItems?: number;
  /**
   * Custom separator element (defaults to chevron right SVG)
   */
  separator?: React.ReactNode;
  /**
   * Callback fired when middle-truncated ellipsis is expanded
   */
  onExpandMiddle?: () => void;
  /**
   * Custom test id for automated testing
   * @default 'breadcrumbs'
   */
  'data-testid'?: string;
}

/**
 * Scalable vector Home icon matching Figma Token Size/Icon/SM (16px) & Size/Icon/XS (14px)
 */
function HomeIcon({ size }: { size: BreadcrumbsSize }) {
  return (
    <svg
      className={cn('shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 6.5L8 2L13.5 6.5V13.5C13.5 13.7652 13.3946 14.0196 13.2071 14.2071C13.0196 14.3946 12.7652 14.5 12.5 14.5H3.5C3.23478 14.5 2.98043 14.3946 2.79289 14.2071C2.60536 14.0196 2.5 13.7652 2.5 13.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 14.5V8.5H10V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Decorative separator chevron matching Figma Section 01
 */
function DefaultSeparator({ size }: { size: BreadcrumbsSize }) {
  return (
    <svg
      className={cn('shrink-0 text-text-tertiary select-none', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Canonical Breadcrumbs Component
 *
 * Lightweight, accessible hierarchy indicator for storefront navigation
 * and administrative workflows, adhering directly to Figma Set 52:56481 and Board 52:56482.
 */
export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(
  (
    {
      items = [],
      size = 'md',
      showHome = true,
      homeHref = '/',
      homeLabel = 'Home',
      maxItems,
      separator,
      onExpandMiddle,
      className,
      'data-testid': testId = 'breadcrumbs',
      ...props
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Build the full normalized items list including optional Home
    const fullItems: BreadcrumbItem[] = [];

    if (showHome) {
      fullItems.push({
        id: 'breadcrumb-home',
        label: (
          <span className="flex items-center gap-1.5">
            <HomeIcon size={size} />
            <span>{homeLabel}</span>
          </span>
        ),
        href: homeHref,
        isCurrent: items.length === 0,
      });
    }

    items.forEach((item, idx) => {
      fullItems.push({
        ...item,
        id: item.id || `breadcrumb-item-${idx}`,
        // If not explicitly set, mark the final item as current
        isCurrent: item.isCurrent !== undefined ? item.isCurrent : idx === items.length - 1,
      });
    });

    // Check if middle truncation applies
    const shouldTruncate = Boolean(maxItems && maxItems > 1 && fullItems.length > maxItems && !isExpanded);

    let renderedItems: (BreadcrumbItem | 'ellipsis')[] = fullItems;

    if (shouldTruncate) {
      // Keep first item, add ellipsis, and keep the trailing items
      const first = fullItems[0];
      const trailingCount = Math.max(1, (maxItems ?? 3) - 2);
      const trailing = fullItems.slice(-trailingCount);
      renderedItems = [first, 'ellipsis', ...trailing];
    }

    const handleEllipsisClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsExpanded(true);
      onExpandMiddle?.();
    };

    const separatorElement = (
      <li aria-hidden="true" className="flex items-center">
        {separator || <DefaultSeparator size={size} />}
      </li>
    );

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        data-testid={testId}
        className={cn(breadcrumbsVariants({ size }), className)}
        {...props}
      >
        <ol
          className={cn(
            'flex items-center flex-wrap list-none p-0 m-0',
            size === 'sm' ? 'gap-1.5' : 'gap-2'
          )}
        >
          {renderedItems.map((item, idx) => {
            const isLast = idx === renderedItems.length - 1;

            if (item === 'ellipsis') {
              return (
                <React.Fragment key="breadcrumb-middle-ellipsis">
                  <li>
                    <button
                      type="button"
                      onClick={handleEllipsisClick}
                      aria-label="Show all breadcrumbs"
                      data-testid={`${testId}-ellipsis-btn`}
                      className={cn(
                        'px-1.5 py-0.5 rounded-sm text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-1',
                        size === 'sm' ? 'text-xs' : 'text-sm'
                      )}
                    >
                      …
                    </button>
                  </li>
                  {!isLast && separatorElement}
                </React.Fragment>
              );
            }

            const isCurrentPage = item.isCurrent || (isLast && !item.href);

            return (
              <React.Fragment key={item.id || idx}>
                <li
                  className={cn(
                    'flex items-center font-normal',
                    isCurrentPage ? 'text-text-primary font-semibold' : 'text-text-secondary'
                  )}
                  data-testid={`${testId}-item-${idx}`}
                >
                  {isCurrentPage ? (
                    <span
                      aria-current="page"
                      data-testid={`${testId}-current-item`}
                      className="flex items-center gap-1.5 truncate"
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span>{item.label}</span>
                    </span>
                  ) : item.disabled ? (
                    <span
                      aria-disabled="true"
                      data-testid={`${testId}-disabled-item`}
                      className="text-text-tertiary/60 cursor-not-allowed flex items-center gap-1.5"
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span>{item.label}</span>
                    </span>
                  ) : item.href ? (
                    <a
                      href={item.href}
                      onClick={item.onClick}
                      data-testid={`${testId}-link-${idx}`}
                      className={cn(
                        'hover:text-action-primary hover:underline transition-colors flex items-center gap-1.5',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-1 rounded-xs'
                      )}
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span>{item.label}</span>
                    </span>
                  )}
                </li>

                {!isLast && separatorElement}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumbs.displayName = 'Breadcrumbs';
export default Breadcrumbs;
