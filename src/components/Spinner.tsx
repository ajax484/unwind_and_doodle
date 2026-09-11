'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const spinnerVariants = cva(
  'inline-block animate-spin shrink-0 select-none',
  {
    variants: {
      size: {
        sm: 'w-4 h-4',   // 16px
        md: 'w-6 h-6',   // 24px (default)
        lg: 'w-10 h-10', // 40px
      },
      color: {
        rose: 'text-action-primary',
        blue: 'text-action-secondary',
        charcoal: 'text-text-primary',
        white: 'text-neutral-white',
        current: 'text-current',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'rose',
    },
  }
);

export type SpinnerSize = NonNullable<VariantProps<typeof spinnerVariants>['size']>;
export type SpinnerColor = NonNullable<VariantProps<typeof spinnerVariants>['color']>;

export interface SpinnerProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, 'color'>,
    VariantProps<typeof spinnerVariants> {
  /** Optional custom class name applied to the 360-degree background track circle. */
  trackClassName?: string;
  /** Accessible screen reader label (defaults to 'Loading...'). */
  label?: string;
  /** Test identifier attribute for testing libraries. */
  'data-testid'?: string;
}

export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  (
    {
      size = 'md',
      color = 'rose',
      trackClassName = 'opacity-25',
      label = 'Loading...',
      className,
      ...rest
    },
    ref
  ) => {
    const strokeWidth = size === 'lg' ? 3 : 2;

    return (
      <svg
        ref={ref}
        className={cn(spinnerVariants({ size, color }), className)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="status"
        aria-label={label}
        {...rest}
      >
        <title>{label}</title>
        <circle
          className={trackClassName}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }
);

Spinner.displayName = 'Spinner';
export default Spinner;
