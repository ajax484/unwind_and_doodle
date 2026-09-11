'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import Spinner from './Spinner';

export const toastVariants = cva(
  [
    'flex items-center justify-between border rounded-2xl shadow-card transition-all duration-200 select-none w-full pointer-events-auto',
  ],
  {
    variants: {
      variant: {
        success: 'bg-status-success-bg border-status-success-accent text-status-success-text',
        warning: 'bg-status-warning-bg border-status-warning-accent text-status-warning-text',
        error: 'bg-status-danger-bg border-status-danger-accent text-status-danger-text',
        info: 'bg-status-info-bg border-status-info-accent text-status-info-text',
      },
      size: {
        md: 'px-4 py-3 gap-3 text-sm max-w-md min-h-[50px]',
        sm: 'px-3 py-2 gap-2.5 text-xs max-w-sm min-h-[42px]',
      },
      state: {
        default: '',
        loading: '',
      },
    },
    defaultVariants: {
      variant: 'success',
      size: 'md',
      state: 'default',
    },
  }
);

export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>;
export type ToastSize = NonNullable<VariantProps<typeof toastVariants>['size']>;
export type ToastState = NonNullable<VariantProps<typeof toastVariants>['state']>;

export interface ToastActionItem {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'id'>,
    VariantProps<typeof toastVariants> {
  /**
   * Primary title or headline of the notification.
   */
  title?: React.ReactNode;

  /**
   * Explanatory message or description text.
   */
  message?: React.ReactNode;

  /**
   * Alias for `message` for consistency with alert conventions.
   */
  description?: React.ReactNode;

  /**
   * Explicit control over action button visibility.
   * Inferred from `action` if omitted.
   * @default false
   */
  showAction?: boolean;

  /**
   * Action button configuration or custom ReactNode.
   */
  action?: ToastActionItem | React.ReactNode;

  /**
   * Explicit control over dismiss button visibility.
   * @default true
   */
  showDismiss?: boolean;

  /**
   * Callback invoked when the user clicks the dismiss button.
   */
  onDismiss?: () => void;

  /**
   * Custom leading icon override. Defaults to canonical semantic SVGs.
   */
  icon?: React.ReactNode;

  /**
   * Test identifier for automated testing.
   * @default 'toast-notification'
   */
  'data-testid'?: string;
}

/**
 * Canonical SVG Icons for Toast Semantic Variants
 */
const ToastIcons: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg
      className="w-full h-full stroke-current"
      viewBox="0 0 20 20"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" opacity="0.2" fill="currentColor" stroke="none" />
      <path d="M6 10l3 3 5-6" />
    </svg>
  ),
  warning: (
    <svg
      className="w-full h-full stroke-current"
      viewBox="0 0 20 20"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3L2 17h16L10 3z" opacity="0.2" fill="currentColor" stroke="none" />
      <path d="M10 3L2 17h16L10 3z" />
      <path d="M10 8v4M10 14.5v.5" />
    </svg>
  ),
  error: (
    <svg
      className="w-full h-full stroke-current"
      viewBox="0 0 20 20"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" opacity="0.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="8" />
      <path d="M12.5 7.5l-5 5M7.5 7.5l5 5" />
    </svg>
  ),
  info: (
    <svg
      className="w-full h-full stroke-current"
      viewBox="0 0 20 20"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" opacity="0.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6.5v.5" />
    </svg>
  ),
};

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      variant = 'success',
      size = 'md',
      state = 'default',
      title,
      message,
      description,
      showAction,
      action,
      showDismiss = true,
      onDismiss,
      icon,
      className,
      'data-testid': testId = 'toast-notification',
      children,
      ...rest
    },
    ref
  ) => {
    const isError = variant === 'error';
    const effectiveMessage = message || description || children;
    const hasAction = showAction !== undefined ? showAction : Boolean(action);

    // Icon sizing
    const iconWrapperClass = size === 'sm' ? 'w-4 h-4 shrink-0' : 'w-5 h-5 shrink-0';

    return (
      <div
        ref={ref}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        data-testid={testId}
        className={cn(toastVariants({ variant, size, state }), className)}
        {...rest}
      >
        {/* Leading Graphic: Spinner (Loading) or Icon (Default) */}
        <div className={cn('flex items-center justify-center', iconWrapperClass)}>
          {state === 'loading' ? (
            <Spinner size="sm" color="current" />
          ) : icon ? (
            icon
          ) : (
            ToastIcons[variant || 'success']
          )}
        </div>

        {/* Text Content Column */}
        <div className="flex-1 min-w-0 pr-1">
          {title && (
            <h3
              className={cn(
                'truncate',
                size === 'sm'
                  ? 'font-body font-bold text-[13px] leading-tight'
                  : 'font-heading font-semibold text-[15px] leading-tight'
              )}
            >
              {title}
            </h3>
          )}
          {effectiveMessage && (
            <p
              className={cn(
                'text-current opacity-90 leading-snug',
                title ? 'mt-0.5' : '',
                size === 'sm' ? 'text-[12px]' : 'text-[13px]'
              )}
            >
              {effectiveMessage}
            </p>
          )}
        </div>

        {/* Action Button */}
        {hasAction && action && (
          <div className="shrink-0 ml-1">
            {React.isValidElement(action) ? (
              action
            ) : typeof action === 'object' && 'label' in action ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(action as ToastActionItem).onClick}
                href={(action as ToastActionItem).href}
                className="font-heading font-semibold text-xs px-2.5 py-1 h-auto text-current hover:bg-black/5 active:bg-black/10 transition-colors"
              >
                {(action as ToastActionItem).label}
              </Button>
            ) : null}
          </div>
        )}

        {/* Dismiss Button */}
        {showDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className={cn(
              'shrink-0 flex items-center justify-center rounded-full text-current opacity-70 hover:opacity-100 hover:bg-black/5 active:bg-black/10 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-current/40',
              size === 'sm' ? 'w-6 h-6 ml-0.5' : 'w-8 h-8 ml-1'
            )}
          >
            <svg
              className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export default Toast;
