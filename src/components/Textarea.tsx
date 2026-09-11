'use client';

import React, { forwardRef, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const textareaContainerVariants = cva(
  [
    'relative flex flex-col w-full transition-all',
    'bg-bg-surface rounded-xl border border-border-input shadow-xs',
    'focus-within:ring-2 focus-within:ring-border-brand focus-within:border-border-brand',
    'hover:border-border-brand/70',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-[80px] text-xs p-2.5',
        md: 'min-h-[104px] text-sm p-3.5',
        lg: 'min-h-[128px] text-base p-4',
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

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaContainerVariants> {
  /**
   * Accessible textarea label rendered above the control.
   */
  label?: React.ReactNode;

  /**
   * Helper description rendered below the textarea.
   */
  helperText?: React.ReactNode;

  /**
   * Error message displayed in red below the textarea with role="alert".
   */
  errorMessage?: React.ReactNode;

  /**
   * CSS resize property behavior.
   * - 'vertical': User can resize vertically (Figma Resize=Vertical, Default)
   * - 'none': Resizing disabled (Figma Resize=None)
   * - 'both': Bidirectional resizing allowed
   * @default 'vertical'
   */
  resize?: 'vertical' | 'none' | 'both';

  /**
   * Sizing scale variant.
   * - 'sm': 80px min-height (Figma Size=SM)
   * - 'md': 104px min-height (Figma Size=MD, Default)
   * - 'lg': 128px min-height (Figma Size=LG)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Optional character counter maximum or current display.
   */
  characterCount?: { current: number; max?: number };

  /**
   * Automatically display live character count (and / maxLength if specified).
   */
  showCount?: boolean;

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
 * Textarea Component
 * Canonical multi-line text input adhering directly to Figma Component Set `16:3977`
 * and Documentation Board `16:4122` ("Form Controls" on `Components` page).
 *
 * Supports sizes (`sm`, `md`, `lg`), resize modes (`vertical`, `none`), states
 * (`default`, `focus`, `error`, `disabled`), label, character counter, and messages.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id: explicitId,
      label,
      helperText,
      errorMessage,
      size = 'md',
      resize = 'vertical',
      disabled = false,
      required,
      characterCount,
      showCount = false,
      className,
      containerClassName,
      'data-testid': testId = 'textarea',
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = explicitId || generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    const [currentLength, setCurrentLength] = React.useState<number>(() => {
      if (typeof props.value === 'string') return props.value.length;
      if (typeof props.defaultValue === 'string') return props.defaultValue.length;
      return 0;
    });

    React.useEffect(() => {
      if (typeof props.value === 'string') {
        setCurrentLength(props.value.length);
      }
    }, [props.value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (showCount) {
        setCurrentLength(e.target.value.length);
      }
      onChange?.(e);
    };

    const hasError = Boolean(errorMessage);

    const resizeClass =
      resize === 'none'
        ? 'resize-none'
        : resize === 'both'
        ? 'resize'
        : 'resize-y';

    const countDisplay = characterCount ? (
      <span className="font-body text-xs text-text-tertiary">
        {`${characterCount.current}${characterCount.max ? ` / ${characterCount.max}` : ''}`}
      </span>
    ) : showCount ? (
      <span className="font-body text-xs text-text-tertiary">
        {`${currentLength}${props.maxLength ? ` / ${props.maxLength}` : ''}`}
      </span>
    ) : null;

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
        {/* Accessible Label & Character Counter Header */}
        {(label || countDisplay) && (
          <div className="flex items-center justify-between select-none">
            {label && (
              <label
                htmlFor={textareaId}
                className="font-heading font-semibold text-xs sm:text-sm text-text-primary block"
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
            {countDisplay}
          </div>
        )}

        {/* Textarea Wrapper Container */}
        <div
          className={cn(
            textareaContainerVariants({
              size,
              hasError,
            }),
            disabled &&
              'bg-bg-subtle text-text-tertiary border-border-default cursor-not-allowed opacity-75 hover:border-border-default focus-within:ring-0'
          )}
        >
          <textarea
            ref={ref}
            id={textareaId}
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
              resizeClass,
              className
            )}
            onChange={handleTextChange}
            {...props}
          />
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

Textarea.displayName = 'Textarea';
export default Textarea;
