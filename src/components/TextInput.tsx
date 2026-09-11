'use client';

import React, { forwardRef, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const textInputContainerVariants = cva(
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

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof textInputContainerVariants> {
  /**
   * Accessible input label rendered above the control.
   */
  label?: React.ReactNode;

  /**
   * Helper description rendered below the input.
   */
  helperText?: React.ReactNode;

  /**
   * Error message displayed in red below the input with role="alert".
   */
  errorMessage?: React.ReactNode;

  /**
   * Optional leading icon slot (e.g. search, mail, user).
   */
  leadingIcon?: React.ReactNode;

  /**
   * Optional trailing icon slot (e.g. clear button, password visibility toggle).
   */
  trailingIcon?: React.ReactNode;

  /**
   * Sizing scale variant.
   * - 'sm': 32px height (Figma Size=SM)
   * - 'md': 40px height (Figma Size=MD, Default)
   * - 'lg': 48px height (Figma Size=LG)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

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
 * TextInput Component
 * Canonical single-line text input adhering directly to Figma Component Set `16:3840`
 * and Documentation Board `16:4122` ("Form Controls" on `Components` page).
 *
 * Supports sizes (`sm`, `md`, `lg`), states (`default`, `focus`, `error`, `disabled`),
 * leading/trailing icon slots, label, and WCAG AA accessibility wiring.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      id: explicitId,
      label,
      helperText,
      errorMessage,
      leadingIcon,
      trailingIcon,
      size = 'md',
      disabled = false,
      required,
      className,
      containerClassName,
      'data-testid': testId = 'text-input',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = explicitId || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const hasError = Boolean(errorMessage);

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {/* Accessible Label */}
        {label && (
          <label
            htmlFor={inputId}
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

        {/* Input Wrapper Container */}
        <div
          className={cn(
            textInputContainerVariants({
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

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            data-testid={testId}
            className={cn(
              'w-full h-full bg-transparent font-body text-text-primary placeholder:text-text-placeholder',
              'focus:outline-none disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />

          {trailingIcon && (
            <span className="shrink-0 text-text-placeholder flex items-center justify-center" aria-hidden="true">
              {trailingIcon}
            </span>
          )}
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

TextInput.displayName = 'TextInput';
export default TextInput;
