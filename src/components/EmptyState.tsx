'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Button, { type ButtonVariant } from './Button';

export const emptyStateVariants = cva(
  'flex flex-col items-center justify-center text-center mx-auto w-full select-none bg-transparent',
  {
    variants: {
      size: {
        sm: 'max-w-[340px] py-6 px-4 gap-3',
        md: 'max-w-[440px] py-10 px-4 gap-4',
        lg: 'max-w-[560px] py-16 px-6 gap-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const iconContainerMap = {
  sm: 'w-11 h-11 rounded-xl',
  md: 'w-14 h-14 rounded-2xl',
  lg: 'w-16 h-16 rounded-2xl',
};

const iconSizeMap = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const titleStyleMap = {
  sm: 'text-base sm:text-lg font-heading font-bold text-text-primary leading-snug',
  md: 'text-xl sm:text-2xl font-heading font-bold text-text-primary leading-tight',
  lg: 'text-2xl sm:text-3xl font-heading font-bold text-text-primary leading-tight',
};

const descriptionStyleMap = {
  sm: 'text-xs sm:text-sm text-text-secondary leading-relaxed',
  md: 'text-sm text-text-secondary leading-relaxed',
  lg: 'text-base text-text-secondary leading-relaxed',
};

const buttonSizeMap = {
  sm: 'sm' as const,
  md: 'md' as const,
  lg: 'lg' as const,
};

export type EmptyStateSize = NonNullable<VariantProps<typeof emptyStateVariants>['size']>;

export interface EmptyStateAction {
  /** The text label displayed inside the action button. */
  label: string;
  /** Optional click handler for the button. */
  onClick?: () => void | Promise<void>;
  /** Optional navigation URL rendering the button as a Next.js Link. */
  href?: string;
  /** When true, displays an operational loading Spinner and disables interactions. */
  loading?: boolean;
  /** When true, disables button interactions. */
  disabled?: boolean;
  /** Button visual style variant (defaults to 'primary' for primaryAction, 'outline' for secondaryAction). */
  variant?: ButtonVariant;
}

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof emptyStateVariants> {
  /** Empty state scale and target max-width (sm: 340px, md: 440px, lg: 560px). */
  size?: EmptyStateSize;
  /** Primary headline text or element (Fredoka Bold). */
  title: React.ReactNode;
  /** Optional supporting description text or element (Plus Jakarta Sans). */
  description?: React.ReactNode;
  /**
   * Visual icon slot.
   * - `true` or `undefined` (default): renders canonical package vector icon.
   * - `ReactNode`: renders custom icon, illustration, or emoji inside the styled icon container.
   * - `null` or `false`: hides the icon container completely without leftover margin/gap.
   */
  icon?: React.ReactNode | boolean | null;
  /** Custom classes applied to the icon wrapper container. */
  iconContainerClassName?: string;
  /** Primary call-to-action button configuration. */
  primaryAction?: EmptyStateAction;
  /** Secondary call-to-action button configuration. */
  secondaryAction?: EmptyStateAction;
  /** Custom actions element slot. Overrides primaryAction and secondaryAction when provided. */
  actions?: React.ReactNode;
  /** Optional testing identifier. */
  'data-testid'?: string;
}

const DEFAULT_PACKAGE_ICON = (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
    aria-hidden="true"
    className="w-full h-full"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

/**
 * EmptyState component implementing canonical Unwind & Doodle design system specifications.
 * 
 * Features:
 * - 3 Scales: SM (340px target, compact panels/drawers), MD (440px target, standard cart/catalog), LG (560px target, full page/admin)
 * - Transparent surface inheritance (`bg-transparent`) that adapts to parent containers without forcing card borders
 * - Calibrated typography scale with Fredoka bold headings and Plus Jakarta Sans body copy
 * - Canonical 24x24 vector package icon with support for custom illustrations, emojis, or complete suppression
 * - Reusable recovery action buttons composing canonical Button primitives with Link/href and callback support
 * - Accessible status role with polite screen-reader announcements
 */
export function EmptyState({
  size = 'md',
  title,
  description,
  icon = true,
  iconContainerClassName,
  primaryAction,
  secondaryAction,
  actions,
  className,
  'data-testid': testId,
  ...rest
}: EmptyStateProps) {
  const showIcon = icon !== false && icon !== null;
  const renderedIcon = icon === true || icon === undefined ? DEFAULT_PACKAGE_ICON : icon;
  const hasActions = Boolean(actions || primaryAction || secondaryAction);
  const btnSize = buttonSizeMap[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(emptyStateVariants({ size, className }))}
      data-testid={testId}
      {...rest}
    >
      {/* Visual Slot */}
      {showIcon && (
        <div
          className={cn(
            'flex items-center justify-center bg-bg-subtle text-text-tertiary shrink-0 shadow-xs',
            iconContainerMap[size],
            iconContainerClassName
          )}
          aria-hidden="true"
        >
          <div className={iconSizeMap[size]}>
            {renderedIcon}
          </div>
        </div>
      )}

      {/* Content Hierarchy */}
      <div className="space-y-1.5 max-w-full">
        <h3 className={titleStyleMap[size]}>
          {title}
        </h3>
        {description && (
          <p className={descriptionStyleMap[size]}>
            {description}
          </p>
        )}
      </div>

      {/* Recovery Actions Group */}
      {hasActions && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1">
          {actions ? (
            actions
          ) : (
            <>
              {secondaryAction && (
                <Button
                  variant={secondaryAction.variant || 'outline'}
                  size={btnSize}
                  href={secondaryAction.href}
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                >
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant || 'primary'}
                  size={btnSize}
                  href={primaryAction.href}
                  onClick={primaryAction.onClick}
                  loading={primaryAction.loading}
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.label}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
