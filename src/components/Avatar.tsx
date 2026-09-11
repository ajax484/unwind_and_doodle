'use client';

import React, { forwardRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const avatarVariants = cva(
  'relative inline-flex items-center justify-center shrink-0 aspect-square select-none rounded-full overflow-hidden bg-bg-subtle',
  {
    variants: {
      size: {
        sm: 'w-8 h-8 text-xs',     // 32px, Caption: 12px
        md: 'w-10 h-10 text-sm',   // 40px, Body: 14px (default)
        lg: 'w-12 h-12 text-base', // 48px, Subheading: 16px
        xl: 'w-16 h-16 text-xl',   // 64px, Heading/3: 20px
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const avatarStatusVariants = cva(
  'absolute bottom-0 right-0 rounded-full ring-white',
  {
    variants: {
      status: {
        none: 'hidden',
        online: 'bg-status-success',
        away: 'bg-status-warning',
        offline: 'bg-text-tertiary',
      },
      size: {
        sm: 'w-2 h-2 ring-[1.5px]',
        md: 'w-2.5 h-2.5 ring-2',
        lg: 'w-3 h-3 ring-2',
        xl: 'w-4 h-4 ring-[2.5px]',
      },
    },
    defaultVariants: {
      status: 'none',
      size: 'md',
    },
  }
);

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
export type AvatarStatus = NonNullable<VariantProps<typeof avatarStatusVariants>['status']>;

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  /** Source URL of the avatar image. If missing or fails to load, falls back to initials. */
  src?: string | null;
  /** Accessible alternate text for the avatar image. */
  alt?: string;
  /** Full name of the user, used for accessible labelling and automatic 2-letter monogram extraction. */
  name?: string;
  /** Explicit 2-letter monogram initials (e.g. 'BV'). Overrides automated extraction from name. */
  initials?: string;
  /** Presence indicator status badge anchored to bottom-right. */
  status?: AvatarStatus;
  /** Optional custom accessible announcement for the status badge (e.g. 'Active in session'). */
  statusLabel?: string;
  /** Test identifier attribute for testing libraries. */
  'data-testid'?: string;
}

function extractInitials(name?: string, fallbackInitials?: string): string | null {
  if (fallbackInitials) return fallbackInitials.slice(0, 2).toUpperCase();
  if (!name || !name.trim()) return null;

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      size = 'md',
      status = 'none',
      statusLabel,
      src,
      alt,
      name,
      initials,
      className,
      ...rest
    },
    ref
  ) => {
    const [hasImageError, setHasImageError] = useState(false);

    const resolvedInitials = extractInitials(name, initials);
    const hasImage = Boolean(src) && !hasImageError;
    const computedAlt = alt || name || (resolvedInitials ? `Avatar for ${resolvedInitials}` : 'Avatar');

    const defaultStatusLabel =
      status === 'online'
        ? 'Online'
        : status === 'away'
        ? 'Away'
        : status === 'offline'
        ? 'Offline'
        : undefined;
    const accessibleStatusText = statusLabel || defaultStatusLabel;

    return (
      <div className="relative inline-block shrink-0 select-none">
        <div
          ref={ref}
          className={cn(
            avatarVariants({ size }),
            !hasImage && 'text-text-primary font-heading font-bold border border-border-default',
            className
          )}
          {...(!hasImage ? { role: 'img', 'aria-label': computedAlt } : {})}
          {...rest}
        >
          {hasImage ? (
            <img
              src={src!}
              alt={computedAlt}
              className="w-full h-full object-cover rounded-full"
              onError={() => setHasImageError(true)}
            />
          ) : resolvedInitials ? (
            <span className="tracking-tight uppercase select-none">{resolvedInitials}</span>
          ) : (
            <svg
              className="w-1/2 h-1/2 text-text-tertiary"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>

        {/* Status Indicator */}
        {status !== 'none' && (
          <span
            className={cn(avatarStatusVariants({ status, size }))}
            role="status"
            aria-label={accessibleStatusText}
            title={accessibleStatusText}
          >
            <span className="sr-only">{accessibleStatusText}</span>
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
