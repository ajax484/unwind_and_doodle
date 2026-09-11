'use client';

import React, { useEffect, useRef, useId, useCallback } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Button, { type ButtonVariant } from './Button';

export const modalVariants = cva(
  [
    'relative w-full bg-bg-surface text-text-primary',
    'border border-border-default rounded-2xl shadow-2xl',
    'p-6 flex flex-col gap-6',
    'animate-in fade-in zoom-in-95 duration-200 ease-out',
    'focus:outline-hidden',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-xl sm:max-w-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type ModalSize = NonNullable<VariantProps<typeof modalVariants>['size']>;

export interface ModalAction {
  /** The text label displayed inside the action button. */
  label: string;
  /** Callback handler executed on button click. */
  onClick?: () => void | Promise<void>;
  /** When true, displays an operational loading Spinner and disables interactions. */
  loading?: boolean;
  /** When true, disables button interactions. */
  disabled?: boolean;
  /** Visual styling variant for the Button primitive. Defaults to 'primary' for primaryAction, 'outline' for secondaryAction. */
  variant?: ButtonVariant;
  /** Optional button type attribute ('button', 'submit', 'reset'). */
  type?: 'button' | 'submit' | 'reset';
}

export interface ModalProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof modalVariants> {
  /** Controls whether the modal dialog is rendered and visible. */
  isOpen: boolean;
  /** Callback triggered when closing the modal (backdrop click, escape key, or close button). */
  onClose?: () => void;
  /** Target size and max-width for the modal dialog (sm: 360px, md: 480px, lg: 640px). */
  size?: ModalSize;
  /** Optional modal heading title (Typography/Heading/2 - Fredoka SemiBold 20px). */
  title?: React.ReactNode;
  /** Optional descriptive subtitle below the title (Typography/Body/Small - Plus Jakarta Sans 14px). */
  description?: React.ReactNode;
  /** When true (default), renders a close button (X) in the header. */
  showCloseButton?: boolean;
  /** Accessible aria label for the close button. */
  closeButtonLabel?: string;
  /** Primary action button configuration rendered in the footer. */
  primaryAction?: ModalAction;
  /** Secondary action button configuration rendered in the footer. */
  secondaryAction?: ModalAction;
  /** Custom footer content. Overrides primaryAction and secondaryAction when provided. Pass null or false to suppress footer. */
  footer?: React.ReactNode | null | boolean;
  /** When true (default), clicking the outside backdrop overlay calls onClose. */
  closeOnBackdropClick?: boolean;
  /** When true (default), pressing the Escape key calls onClose. */
  closeOnEscape?: boolean;
  /** Optional additional class names for the dialog card container. */
  className?: string;
  /** Optional additional class names for the backdrop container. */
  backdropClassName?: string;
  /** Optional testing identifier. */
  'data-testid'?: string;
  /** The body content rendered inside the modal container. */
  children?: React.ReactNode;
}

/**
 * Modal dialog overlay component implementing canonical Unwind & Doodle design system specifications.
 * 
 * Features:
 * - 3 Target sizes: SM (360px confirmation), MD (480px forms/reviews), LG (640px pickers/checklists)
 * - Backdrop overlay with 40% charcoal tint and subtle blur
 * - Surface container with Radius/LG (rounded-2xl), Elevation/Card (shadow-2xl), and Border/Default
 * - Accessible WCAG 2.1 AA dialog role, focus trapping, Escape dismissal, and body scroll lock
 * - Standardized header with Fredoka title and Plus Jakarta Sans description
 * - Standardized footer action buttons reusing canonical Button atoms
 */
export function Modal({
  isOpen,
  onClose = () => {},
  size = 'md',
  title,
  description,
  showCloseButton = true,
  closeButtonLabel = 'Close dialog',
  primaryAction,
  secondaryAction,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  backdropClassName,
  children,
  ...rest
}: ModalProps) {
  const generatedId = useId();
  const titleId = `modal-title-${generatedId}`;
  const descriptionId = `modal-desc-${generatedId}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Focus trap & Escape listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Set initial focus to modal or first focusable element
    const timeoutId = setTimeout(() => {
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current && closeOnBackdropClick) {
      onClose();
    }
  };

  const hasHeader = Boolean(title || description || showCloseButton);
  const showCustomFooter = footer !== undefined && footer !== null && footer !== false;
  const showActionFooter = footer === undefined && Boolean(primaryAction || secondaryAction);
  const hasFooter = showCustomFooter || showActionFooter;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-neutral-charcoal/40 backdrop-blur-xs',
        'animate-in fade-in duration-200 ease-out',
        backdropClassName
      )}
      aria-hidden={!isOpen}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(modalVariants({ size, className }))}
        onClick={(e) => e.stopPropagation()}
        {...rest}
      >
        {/* Header */}
        {hasHeader && (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              {title && (
                <h2
                  id={titleId}
                  className="font-heading font-bold text-lg sm:text-xl text-text-primary leading-tight"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descriptionId}
                  className="text-xs sm:text-sm text-text-secondary leading-relaxed"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={onClose}
                aria-label={closeButtonLabel}
                className="text-text-placeholder hover:text-text-primary rounded-full shrink-0 -mt-1 -mr-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        )}

        {/* Body Content */}
        {children && (
          <div className="overflow-y-auto max-h-[calc(100vh-14rem)] space-y-4">
            {children}
          </div>
        )}

        {/* Footer */}
        {hasFooter && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {showCustomFooter ? (
              footer
            ) : (
              <>
                {secondaryAction && (
                  <Button
                    variant={secondaryAction.variant || 'outline'}
                    size="md"
                    type={secondaryAction.type || 'button'}
                    disabled={secondaryAction.disabled}
                    onClick={secondaryAction.onClick}
                  >
                    {secondaryAction.label}
                  </Button>
                )}
                {primaryAction && (
                  <Button
                    variant={primaryAction.variant || 'primary'}
                    size="md"
                    type={primaryAction.type || 'button'}
                    loading={primaryAction.loading}
                    disabled={primaryAction.disabled}
                    onClick={primaryAction.onClick}
                  >
                    {primaryAction.label}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
