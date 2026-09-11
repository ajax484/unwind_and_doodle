'use client';

import React from 'react';
import { OrderStatus, PaymentStatus } from '@/lib/supabase/types';
import Badge, { BadgeStatusType, BadgeSize } from '@/components/Badge';

export interface OrderStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Lifecycle domain context distinguishing order fulfillment from payment transaction.
   * Maps directly to canonical Figma property `Type=Order|Payment`.
   * @default 'order'
   */
  type?: 'order' | 'payment';

  /**
   * Status identifier from Supabase enum or raw status string.
   * - Order: 'created' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'received' | 'cancelled' | 'refunded'
   * - Payment: 'successful' | 'paid' | 'pending' | 'failed' | 'refunded'
   */
  status: OrderStatus | PaymentStatus | string | null | undefined;

  /**
   * Sizing scale variant.
   * - 'md': Standard administrative badge (28px height, 12px padding, 14px icon)
   * - 'sm': Compact badge for dense table rows (24px height, 8px padding, 12px icon)
   * Maps directly to canonical Figma property `Size=MD|SM`.
   * @default 'md'
   */
  size?: 'sm' | 'md';

  /**
   * Icon presentation mode.
   * - 'leading': 14px/12px semantic SVG icon (Figma `Icon=Leading`)
   * - 'none': Text-only badge (Figma `Icon=None`)
   * - 'dot': Optical indicator dot
   * @default 'leading'
   */
  icon?: 'leading' | 'none' | 'dot';

  /**
   * Backward-compatible convenience prop for rendering an optical dot indicator.
   * When true, takes precedence over the SVG leading icon.
   * @default false
   */
  dot?: boolean;

  /**
   * Applies an attention-grabbing subtle breathing pulse animation.
   * Defaults to true for `pending` orders awaiting review.
   */
  pulse?: boolean;

  /**
   * Optional custom label overriding the canonical status text.
   */
  label?: string;

  /**
   * Additional CSS classes.
   */
  className?: string;

  /**
   * Optional testing identifier.
   */
  'data-testid'?: string;
}

/**
 * SVGs for Status Icons
 * Resolution-independent, stroke-based vector icons matching canonical Figma representations.
 */
function StatusIcon({
  name,
  className,
}: {
  name: 'file-text' | 'clock' | 'check' | 'truck' | 'package-check' | 'x' | 'refresh-ccw';
  className?: string;
}) {
  switch (name) {
    case 'file-text':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'clock':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'check':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'truck':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case 'package-check':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="m16 16 2 2 4-4" />
          <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
          <path d="m7.5 4.27 9 5.15" />
          <polyline points="3.29 7 12 12 20.71 7" />
          <line x1="12" y1="22" x2="12" y2="12" />
        </svg>
      );
    case 'x':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'refresh-ccw':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
      );
  }
}

/**
 * OrderStatusBadge Molecule
 * Canonical administrative status badge adhering directly to Figma Component Set `52:102317`
 * and Documentation Board `52:102318` ("Order Status Badges" on `Components` page).
 *
 * Distinguishes Order fulfillment lifecycle from Payment gateway settlement semantics,
 * reusing canonical `<Badge>` atom styling and Unwind & Doodle status design tokens.
 */
export default function OrderStatusBadge({
  type = 'order',
  status,
  size = 'md',
  icon = 'leading',
  dot = false,
  pulse: pulseProp,
  label: customLabel,
  className,
  'data-testid': testId = 'order-status-badge',
  ...props
}: OrderStatusBadgeProps) {
  if (!status) {
    return (
      <Badge
        data-testid={testId}
        variant="status"
        statusType="neutral"
        size={size}
        dot={dot || icon === 'dot'}
        className={className}
        {...props}
      >
        {customLabel || 'Unknown'}
      </Badge>
    );
  }

  const s = String(status).toLowerCase();
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  let statusType: BadgeStatusType = 'neutral';
  let iconName: 'file-text' | 'clock' | 'check' | 'truck' | 'package-check' | 'x' | 'refresh-ccw' = 'file-text';
  let defaultLabel = s.charAt(0).toUpperCase() + s.slice(1);
  let shouldPulse = false;

  if (type === 'payment') {
    switch (s) {
      case 'successful':
      case 'paid':
      case 'success':
        statusType = 'success';
        iconName = 'check';
        defaultLabel = s === 'paid' ? 'Paid' : 'Successful';
        break;
      case 'pending':
        statusType = 'warning';
        iconName = 'clock';
        defaultLabel = 'Pending';
        break;
      case 'failed':
        statusType = 'danger';
        iconName = 'x';
        defaultLabel = 'Failed';
        break;
      case 'refunded':
        statusType = 'purple';
        iconName = 'refresh-ccw';
        defaultLabel = 'Refunded';
        break;
      default:
        statusType = 'neutral';
        iconName = 'file-text';
        defaultLabel = s.charAt(0).toUpperCase() + s.slice(1);
        break;
    }
  } else {
    // Order Statuses
    switch (s) {
      case 'created':
        statusType = 'info';
        iconName = 'file-text';
        defaultLabel = 'Created';
        break;
      case 'pending':
        statusType = 'warning';
        iconName = 'clock';
        defaultLabel = 'Pending';
        shouldPulse = true;
        break;
      case 'confirmed':
        statusType = 'success';
        iconName = 'check';
        defaultLabel = 'Confirmed';
        break;
      case 'shipped':
        statusType = 'info';
        iconName = 'truck';
        defaultLabel = 'Shipped';
        break;
      case 'delivered':
      case 'received':
        statusType = 'success';
        iconName = 'package-check';
        defaultLabel = s === 'received' ? 'Received' : 'Delivered';
        break;
      case 'cancelled':
        statusType = 'danger';
        iconName = 'x';
        defaultLabel = 'Cancelled';
        break;
      case 'refunded':
        statusType = 'purple';
        iconName = 'refresh-ccw';
        defaultLabel = 'Refunded';
        break;
      default:
        statusType = 'neutral';
        iconName = 'file-text';
        defaultLabel = s.charAt(0).toUpperCase() + s.slice(1);
        break;
    }
  }

  const finalLabel = customLabel || defaultLabel;
  const isDot = dot || icon === 'dot';
  const showLeadingIcon = icon === 'leading' && !isDot;
  const finalPulse = pulseProp !== undefined ? pulseProp : shouldPulse;

  const leadingIconElement = showLeadingIcon ? (
    <StatusIcon name={iconName} className={iconSizeClass} />
  ) : undefined;

  return (
    <Badge
      data-testid={testId}
      variant="status"
      statusType={statusType}
      size={size}
      dot={isDot}
      pulse={finalPulse}
      icon={leadingIconElement}
      className={className}
      {...props}
    >
      {finalLabel}
    </Badge>
  );
}

export { OrderStatusBadge };
