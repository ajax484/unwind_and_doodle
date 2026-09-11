'use client';

import React, { forwardRef, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const selectContainerVariants = cva(
  [
    'relative flex items-center w-full transition-all',
    'bg-bg-surface rounded-xl border border-border-input shadow-xs',
    'focus-within:ring-2 focus-within:ring-border-brand focus-within:border-border-brand',
    'hover:border-border-brand/70',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-xs gap-2',
        md: 'h-10 px-3.5 text-sm gap-2.5',
        lg: 'h-12 px-4 text-base gap-3',
      },
      hasError: {
        true: 'border-status-danger-accent focus-within:ring-status-danger-accent focus-within:border-status-danger-accent',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      hasError: false,
    },
  }
);

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectContainerVariants> {
  /**
   * Accessible select label rendered above the control.
   */
  label?: React.ReactNode;

  /**
   * Helper description rendered below the select.
   */
  helperText?: React.ReactNode;

  /**
   * Error message displayed in red below the select with role="alert".
   */
  errorMessage?: React.ReactNode;

  /**
   * Optional leading icon slot (Figma Leading Icon=True).
   */
  leadingIcon?: React.ReactNode;

  /**
   * Sizing scale variant.
   * - 'sm': 32px height (Figma Size=SM)
   * - 'md': 40px height (Figma Size=MD, Default)
   * - 'lg': 48px height (Figma Size=LG)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Optional array of options to render. Alternatively, pass standard `<option>` children.
   */
  options?: SelectOption[];

  /**
   * Optional unselected placeholder label.
   */
  placeholder?: string;

  /**
   * Wrapper container class name.
   */
  containerClassName?: string;

  /**
   * Test identifier attribute for testing libraries.
   */
  'data-testid'?: string;
}

/**
 * Select Component
 * Canonical dropdown selection control adhering directly to Figma Component Set `16:4104`
 * and Documentation Board `16:4122` ("Form Controls" on `Components` page).
 *
 * Supports sizes (`sm`, `md`, `lg`), states (`default`, `focus`, `error`, `disabled`),
 * leading icon slot, styled chevron down vector indicator, label, and messages.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id: explicitId,
      label,
      helperText,
      errorMessage,
      leadingIcon,
      size = 'md',
      disabled = false,
      required,
      options,
      placeholder,
      children,
      className,
      containerClassName,
      'data-testid': testId = 'select',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = explicitId || generatedId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    const hasError = Boolean(errorMessage);

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {/* Accessible Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="font-heading font-semibold text-xs sm:text-sm text-text-primary flex items-center justify-between select-none"
          >
            <span>
              {label}
              {required && (
                <span className="text-status-danger-accent ml-1" aria-hidden="true">
                  *
                </span>
              )}
            </span>
          </label>
        )}

        {/* Select Wrapper Container */}
        <div
          className={cn(
            selectContainerVariants({
              size,
              hasError,
            }),
            disabled &&
              'bg-bg-subtle text-text-tertiary border-border-default cursor-not-allowed opacity-75 hover:border-border-default focus-within:ring-0'
          )}
        >
          {leadingIcon && (
            <span className="shrink-0 text-text-placeholder flex items-center justify-center" aria-hidden="true">
              {leadingIcon}
            </span>
          )}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            data-testid={testId}
            defaultValue={props.defaultValue ?? (placeholder && props.value === undefined ? '' : undefined)}
            className={cn(
              'w-full h-full bg-transparent font-body text-text-primary appearance-none cursor-pointer',
              'focus:outline-none disabled:cursor-not-allowed pr-6',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Styled Chevron Down Vector Indicator */}
          <span
            className="pointer-events-none absolute right-3 flex items-center justify-center text-text-secondary"
            aria-hidden="true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        {/* Error or Helper Message */}
        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="font-body text-xs font-medium text-status-danger-text flex items-center gap-1.5 mt-0.5 animate-in fade-in-50"
          >
            <span aria-hidden="true">⚠️</span>
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="font-body text-xs text-text-tertiary mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
