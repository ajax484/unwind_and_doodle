'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'font-heading font-semibold',
    'rounded-full select-none transition-colors whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        status: '',
        bundle: 'bg-status-purple-base text-text-inverse shadow-xs border-transparent',
        tag: 'bg-bg-subtle text-text-secondary border border-border-default',
        accent: 'bg-action-primary text-text-inverse shadow-xs border-transparent',
        brand: 'bg-action-secondary-bg text-action-secondary-text border border-border-brand/40',
      },
      statusType: {
        success: 'bg-status-success-bg text-status-success-text border border-status-success-accent/30',
        warning: 'bg-status-warning-bg text-status-warning-text border border-status-warning-accent/30',
        danger: 'bg-status-danger-bg text-status-danger-text border border-status-danger-accent/30',
        info: 'bg-status-info-bg text-status-info-text border border-status-info-accent/30',
        purple: 'bg-status-purple-base/10 text-status-purple-base border border-status-purple-base/30',
        neutral: 'bg-bg-subtle text-text-secondary border border-border-default',
      },
      size: {
        sm: 'min-h-[24px] px-2.5 py-0.5 text-[11px] gap-1',
        md: 'min-h-[28px] px-3 py-1 text-xs gap-1.5',
      },
      disabled: {
        true: 'bg-bg-subtle text-text-tertiary border-border-default opacity-60 cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'status',
      statusType: 'neutral',
      size: 'md',
      disabled: false,
    },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export type BadgeStatusType = NonNullable<VariantProps<typeof badgeVariants>['statusType']>;
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;

const dotColors: Record<BadgeStatusType, string> = {
  success: 'bg-status-success-accent',
  warning: 'bg-status-warning-accent',
  danger: 'bg-status-danger-accent',
  info: 'bg-status-info-accent',
  purple: 'bg-status-purple-base',
  neutral: 'bg-text-tertiary',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Renders an optical indicator dot inside the badge. */
  dot?: boolean;
  /** Applies an attention-grabbing subtle breathing pulse animation to the dot. */
  pulse?: boolean;
  /** Optional custom leading icon. */
  icon?: React.ReactNode;
  /** Test identifier attribute for testing libraries. */
  'data-testid'?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'status',
      statusType = 'neutral',
      size = 'md',
      disabled = false,
      dot = false,
      pulse = false,
      icon,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const isStatus = variant === 'status';

    const baseClasses = cn(
      badgeVariants({
        variant,
        statusType: isStatus ? statusType : undefined,
        size,
        disabled,
        className,
      }),
      pulse && 'animate-pulse'
    );

    const activeDotColor =
      variant === 'brand'
        ? 'bg-brand-blue'
        : variant === 'accent'
        ? 'bg-brand-rose-deep'
        : variant === 'bundle'
        ? 'bg-neutral-white'
        : dotColors[statusType || 'neutral'];

    return (
      <span ref={ref} className={baseClasses} {...rest}>
        {dot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full shrink-0', activeDotColor)}
            aria-hidden="true"
          />
        )}
        {icon && (
          <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
            {icon}
          </span>
        )}
        {children && <span>{children}</span>}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
export default Badge;
