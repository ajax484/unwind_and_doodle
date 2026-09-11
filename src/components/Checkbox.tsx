'use client';

import React, { forwardRef, useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Primary label rendered beside the checkbox.
   */
  label?: React.ReactNode;

  /**
   * Sub-description rendered below the label.
   */
  description?: React.ReactNode;

  /**
   * Error message displayed in red below the checkbox with role="alert".
   */
  errorMessage?: React.ReactNode;

  /**
   * Partially checked/indeterminate state (Figma State=Indeterminate).
   * @default false
   */
  indeterminate?: boolean;

  /**
   * Optional wrapper container class name.
   */
  containerClassName?: string;

  /**
   * Test identifier attribute for testing libraries.
   */
  'data-testid'?: string;
}

/**
 * Checkbox Component
 * Canonical selection control adhering directly to Figma Component Set `16:4121`
 * and Documentation Board `16:4122` ("Form Controls" on `Components` page).
 *
 * Supports states (`unchecked`, `checked`, `indeterminate`, `disabled`), 20px visual
 * box (`Radius/SM` = 8px), Rose active fill (`#D99BA3`), label, and optical alignment.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id: explicitId,
      checked,
      defaultChecked,
      indeterminate = false,
      disabled = false,
      label,
      description,
      errorMessage,
      className,
      containerClassName,
      'data-testid': testId = 'checkbox',
      onChange,
      ...props
    },
    forwardedRef
  ) => {
    const generatedId = useId();
    const checkboxId = explicitId || generatedId;
    const errorId = `${checkboxId}-error`;
    const descId = `${checkboxId}-desc`;

    const internalRef = useRef<HTMLInputElement>(null);

    // Sync indeterminate property onto underlying HTMLInputElement
    useEffect(() => {
      const el = (forwardedRef && 'current' in forwardedRef ? forwardedRef.current : internalRef.current);
      if (el) {
        el.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate, forwardedRef]);

    const hasError = Boolean(errorMessage);

    return (
      <div className={cn('flex flex-col gap-1', containerClassName)}>
        <label
          htmlFor={checkboxId}
          className={cn(
            'inline-flex items-start gap-2.5 select-none transition-all',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer group'
          )}
        >
          {/* Hidden Native Input */}
          <input
            ref={(node) => {
              if (typeof forwardedRef === 'function') {
                forwardedRef(node);
              } else if (forwardedRef) {
                forwardedRef.current = node;
              }
              (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : description ? descId : undefined
            }
            data-testid={testId}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />

          {/* Styled 20px Visual Box */}
          <div
            className={cn(
              'w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all mt-0.5',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-border-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-surface',
              hasError
                ? 'border-status-danger-accent'
                : 'border-border-input bg-bg-surface group-hover:border-border-brand/70',
              // Checked or Indeterminate Fill
              'peer-checked:bg-action-primary peer-checked:border-action-primary peer-checked:text-text-inverse',
              indeterminate && 'bg-action-primary border-action-primary text-text-inverse',
              disabled && 'bg-bg-subtle border-border-default cursor-not-allowed'
            )}
            aria-hidden="true"
          >
            {indeterminate ? (
              // Horizontal Minus / Dash Icon
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-inverse"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            ) : (
              // Checkmark Vector Icon
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  'text-text-inverse transition-transform duration-150',
                  checked ? 'scale-100 opacity-100' : 'scale-75 opacity-0 peer-checked:scale-100 peer-checked:opacity-100'
                )}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>

          {/* Label and Optional Description */}
          {(label || description) && (
            <div className="flex flex-col text-left">
              {label && (
                <span
                  className={cn(
                    'font-body text-xs sm:text-sm font-medium leading-tight transition-colors',
                    disabled
                      ? 'text-text-tertiary'
                      : 'text-text-primary group-hover:text-text-primary'
                  )}
                >
                  {label}
                </span>
              )}
              {description && (
                <span id={descId} className="font-body text-xs text-text-tertiary mt-0.5">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {/* Error Message */}
        {errorMessage && (
          <p
            id={errorId}
            role="alert"
            className="font-body text-xs font-medium text-status-danger-text flex items-center gap-1.5 mt-0.5 animate-in fade-in-50 pl-7"
          >
            <span aria-hidden="true">⚠️</span>
            <span>{errorMessage}</span>
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
