import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type AlertBannerVariant = 'info' | 'success' | 'warning' | 'danger';
export type AlertBannerSize = 'md' | 'sm';

export const alertBannerVariants = cva(
  'relative flex items-start border transition-all w-full text-left',
  {
    variants: {
      variant: {
        info: 'bg-status-info-bg border-status-info-accent/35 text-status-info-text',
        success: 'bg-status-success-bg border-status-success-accent/35 text-status-success-text',
        warning: 'bg-status-warning-bg border-status-warning-accent/35 text-status-warning-text',
        danger: 'bg-status-danger-bg border-status-danger-accent/35 text-status-danger-text',
      },
      size: {
        md: 'py-3.5 px-4 gap-3.5 rounded-md',
        sm: 'py-2.5 px-3 gap-2.5 rounded-sm',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'md',
    },
  }
);

export interface AlertBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertBannerVariants> {
  /**
   * Title heading of the alert
   */
  title?: React.ReactNode;
  /**
   * Description message or children content
   */
  description?: React.ReactNode;
  /**
   * Custom leading icon (overrides default variant icon)
   */
  icon?: React.ReactNode;
  /**
   * Label for optional contextual action button/link
   */
  actionLabel?: string;
  /**
   * Callback fired when action is clicked
   */
  onAction?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /**
   * Optional URL for action link
   */
  actionHref?: string;
  /**
   * Whether to display an accessible dismiss close button
   * @default false
   */
  dismissible?: boolean;
  /**
   * Callback fired when dismiss button is clicked
   */
  onDismiss?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Custom test ID for automated testing
   * @default 'alert-banner'
   */
  'data-testid'?: string;
}

/**
 * Semantic status icons matching Figma Section 02
 */
function StatusIcon({ variant, size }: { variant: AlertBannerVariant; size: AlertBannerSize }) {
  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  switch (variant) {
    case 'success':
      return (
        <svg className={cn(iconClass, 'shrink-0')} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.75" />
          <path d="M6 10L8.5 12.5L14 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={cn(iconClass, 'shrink-0')} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M10 2L18.66 17H1.34L10 2Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M10 7.5V11.5M10 14V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'danger':
      return (
        <svg className={cn(iconClass, 'shrink-0')} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.75" />
          <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg className={cn(iconClass, 'shrink-0')} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.75" />
          <path d="M10 9V14M10 6V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

/**
 * Canonical AlertBanner Component
 *
 * Inline persistent feedback molecule for notifications, form alerts,
 * order tracking updates, and warnings, adhering directly to Figma Set 53:13000 and Board 53:13001.
 */
export const AlertBanner = forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    {
      variant = 'info',
      size = 'md',
      title,
      description,
      children,
      icon,
      actionLabel,
      onAction,
      actionHref,
      dismissible = false,
      onDismiss,
      role = 'alert',
      className,
      'data-testid': testId = 'alert-banner',
      ...props
    },
    ref
  ) => {
    const hasTrailing = Boolean(actionLabel || dismissible);

    return (
      <div
        ref={ref}
        role={role}
        aria-live="polite"
        data-testid={testId}
        className={cn(alertBannerVariants({ variant, size }), className)}
        {...props}
      >
        {/* Leading Status Icon */}
        <div data-testid={`${testId}-icon`} className="shrink-0 mt-0.5">
          {icon || <StatusIcon variant={variant || 'info'} size={size || 'md'} />}
        </div>

        {/* Content Area */}
        <div className="flex flex-col flex-1 min-w-0 justify-center">
          {title && (
            <h4
              data-testid={`${testId}-title`}
              className={cn(
                'font-heading font-semibold leading-snug',
                size === 'sm' ? 'text-sm' : 'text-base'
              )}
            >
              {title}
            </h4>
          )}

          {(description || children) && (
            <div
              data-testid={`${testId}-description`}
              className={cn(
                'font-normal opacity-90 leading-relaxed',
                size === 'sm' ? 'text-xs' : 'text-sm',
                title && (size === 'sm' ? 'mt-0.5' : 'mt-1')
              )}
            >
              {description || children}
            </div>
          )}
        </div>

        {/* Trailing Container (Action & Dismiss Controls) */}
        {hasTrailing && (
          <div data-testid={`${testId}-trailing`} className="flex items-center gap-3 shrink-0 ml-auto self-start mt-0.5">
            {actionLabel && (
              actionHref ? (
                <a
                  href={actionHref}
                  onClick={onAction}
                  data-testid={`${testId}-action`}
                  className={cn(
                    'font-heading font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer',
                    size === 'sm' ? 'text-xs' : 'text-sm'
                  )}
                >
                  {actionLabel}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onAction}
                  data-testid={`${testId}-action`}
                  className={cn(
                    'font-heading font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current rounded-xs',
                    size === 'sm' ? 'text-xs' : 'text-sm'
                  )}
                >
                  {actionLabel}
                </button>
              )
            )}

            {dismissible && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss alert"
                data-testid={`${testId}-dismiss`}
                className={cn(
                  'p-1 -m-1 rounded-sm opacity-70 hover:opacity-100 hover:bg-black/5 transition-all cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current'
                )}
              >
                <svg
                  className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';
export default AlertBanner;
