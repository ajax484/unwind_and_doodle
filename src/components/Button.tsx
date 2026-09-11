'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Spinner from './Spinner';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'font-heading font-semibold',
    'transition-all duration-150 ease-out select-none',
    'cursor-pointer',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue/50 focus-visible:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-action-primary text-text-inverse',
          'shadow-action-rose',
          'hover:bg-action-primary-hover hover:shadow-md',
          'active:scale-[0.98] active:shadow-none',
          'disabled:bg-bg-subtle disabled:text-text-tertiary disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100',
        ],
        secondary: [
          'bg-action-secondary-bg text-action-secondary-text',
          'shadow-action-blue',
          'hover:bg-action-secondary hover:text-text-inverse hover:shadow-md',
          'active:scale-[0.98] active:shadow-none',
          'disabled:bg-bg-subtle disabled:text-text-tertiary disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100',
        ],
        outline: [
          'bg-transparent text-text-primary border border-border-default',
          'hover:bg-bg-subtle hover:border-border-brand hover:text-action-secondary-text',
          'active:scale-[0.98] active:bg-bg-subtle',
          'disabled:bg-transparent disabled:text-text-tertiary disabled:border-border-default disabled:cursor-not-allowed disabled:active:scale-100',
        ],
        ghost: [
          'bg-transparent text-text-primary border-transparent',
          'hover:bg-bg-subtle hover:text-text-primary',
          'active:scale-[0.98] active:bg-brand-blue-light',
          'disabled:bg-transparent disabled:text-text-tertiary disabled:cursor-not-allowed disabled:active:scale-100',
        ],
        stepper: [
          'bg-bg-surface text-text-primary border border-border-default rounded-full p-0 flex items-center justify-center shrink-0',
          'hover:bg-bg-subtle hover:border-border-brand',
          'active:scale-[0.95]',
          'disabled:bg-bg-subtle disabled:text-text-placeholder disabled:border-border-default disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        ],
      },
      size: {
        sm: 'min-h-[32px] px-3 text-xs gap-1.5',
        md: 'min-h-[40px] px-4 text-sm gap-2',
        lg: 'min-h-[48px] px-5 text-base gap-2.5',
      },
      iconOnly: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: ['primary', 'secondary', 'outline', 'ghost'],
        className: 'rounded-full',
      },
      {
        variant: 'stepper',
        size: 'sm',
        className: 'w-8 h-8 text-sm min-h-0 px-0',
      },
      {
        variant: 'stepper',
        size: 'md',
        className: 'w-10 h-10 text-base min-h-0 px-0',
      },
      {
        variant: 'stepper',
        size: 'lg',
        className: 'w-12 h-12 text-lg min-h-0 px-0',
      },
      {
        iconOnly: true,
        size: 'sm',
        className: 'w-8 h-8 p-1.5 text-xs min-h-0',
      },
      {
        iconOnly: true,
        size: 'md',
        className: 'w-10 h-10 p-2 text-sm min-h-0',
      },
      {
        iconOnly: true,
        size: 'lg',
        className: 'w-12 h-12 p-2.5 text-base min-h-0',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      iconOnly: false,
    },
  }
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** When true, displays an operational loading Spinner and disables interactions. */
  loading?: boolean;
  /** Optional leading icon element rendered before the button text. */
  leadingIcon?: React.ReactNode;
  /** Optional trailing icon element rendered after the button text. */
  trailingIcon?: React.ReactNode;
  /** When true, renders an icon-only square/circular button container. */
  iconOnly?: boolean;
  /** When provided, renders as an accessible Next.js Link component. */
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leadingIcon,
      trailingIcon,
      iconOnly = false,
      href,
      children,
      className,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isIconOnly = Boolean(iconOnly || (!children && (leadingIcon || trailingIcon)));

    const baseClasses = cn(
      buttonVariants({
        variant,
        size,
        iconOnly: isIconOnly,
        className,
      })
    );

    const content = (
      <>
        {loading && (
          <Spinner size="sm" color="current" className="-ml-0.5 mr-1.5" />
        )}
        {!loading && leadingIcon && (
          <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        {children && <span>{children}</span>}
        {!loading && trailingIcon && (
          <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </>
    );

    if (href && !disabled && !loading) {
      return (
        <Link href={href} className={baseClasses} role="button">
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        className={baseClasses}
        {...rest}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
