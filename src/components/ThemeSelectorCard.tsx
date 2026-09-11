import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { PublicTheme } from '@/types/admin-theme';

export interface ThemeSelectorCardTheme {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  storagePath?: string | null;
  sortOrder?: number;
}

export const themeSelectorCardVariants = cva(
  'group relative flex flex-col text-left transition-all duration-200 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand focus-visible:ring-offset-2',
  {
    variants: {
      size: {
        md: 'w-full max-w-[260px] p-4 gap-2',
        sm: 'w-full max-w-[200px] p-3 gap-1.5',
      },
      selected: {
        true: 'border-2 border-border-brand bg-bg-surface ring-2 ring-brand-rose/20 shadow-xs',
        false: 'border border-border-default bg-bg-surface hover:bg-bg-subtle/60 hover:border-border-brand/70 hover:shadow-xs',
      },
      disabled: {
        true: 'bg-bg-subtle border border-border-default opacity-60 cursor-not-allowed pointer-events-none hover:shadow-none hover:border-border-default',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      selected: false,
      disabled: false,
    },
  }
);

export interface ThemeSelectorCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>,
    VariantProps<typeof themeSelectorCardVariants> {
  /**
   * Structured theme object (compatible with PublicTheme or custom shape)
   */
  theme?: ThemeSelectorCardTheme | PublicTheme;
  /**
   * Flat convenience title prop (overrides theme.name)
   */
  title?: string;
  /**
   * Flat convenience description prop (overrides theme.description)
   */
  description?: string | null;
  /**
   * Image URL for the 1:1 preview viewport
   */
  imageUrl?: string | null;
  /**
   * Whether to display the description text
   * @default true
   */
  showDescription?: boolean;
  /**
   * Simulated hover state (for Storybook documentation)
   */
  isHovered?: boolean;
  /**
   * ARIA role for selection (checkbox for multi-select, radio for single-choice)
   * @default 'checkbox'
   */
  role?: 'checkbox' | 'radio';
  /**
   * Callback fired when card is toggled/clicked
   */
  onSelect?: (themeId?: string) => void;
  /**
   * Custom test id for automated testing
   * @default 'theme-selector-card'
   */
  'data-testid'?: string;
}

/**
 * Fallback artistic motif illustration when no theme preview image is available
 */
function ThemeArtPlaceholder({ name, className }: { name?: string; className?: string }) {
  return (
    <svg
      className={cn('w-16 h-16 text-border-brand/60 group-hover:text-border-brand transition-colors', className)}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="28" fill="#EDF3F7" fillOpacity="0.7" />
      <path
        d="M32 18C26 24 22 30 22 36C22 41.5228 26.4772 46 32 46C37.5228 46 42 41.5228 42 36C42 30 38 24 32 18Z"
        fill="#D99BA3"
        fillOpacity="0.45"
      />
      <path
        d="M32 24V42M26 34C28 32 32 30 36 32M27 39C29 37 32 36 37 37"
        stroke="#243342"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {name && (
        <title>{name}</title>
      )}
    </svg>
  );
}

/**
 * Canonical ThemeSelectorCard Component
 *
 * Storefront molecule for selecting personalized coloring book themes,
 * adhering directly to Figma Component Set 41:24918 and Board 41:24919.
 */
export const ThemeSelectorCard = forwardRef<HTMLDivElement, ThemeSelectorCardProps>(
  (
    {
      theme,
      title,
      description,
      imageUrl,
      size = 'md',
      selected = false,
      disabled = false,
      showDescription = true,
      isHovered = false,
      role = 'checkbox',
      onSelect,
      onClick,
      onKeyDown,
      className,
      'data-testid': testId = 'theme-selector-card',
      ...props
    },
    ref
  ) => {
    // Normalize data between structured theme and flat props
    const themeName = title || theme?.name || 'Untitled Theme';
    const themeDescription = description !== undefined ? description : theme?.description;
    const themeImage = imageUrl || (theme && ('imageUrl' in theme ? theme.imageUrl : theme.storagePath)) || null;
    const themeId = theme?.id;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(e);
      onSelect?.(themeId);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onSelect?.(themeId);
      }
      onKeyDown?.(e);
    };

    return (
      <div
        ref={ref}
        role={role}
        aria-checked={Boolean(selected)}
        aria-disabled={Boolean(disabled)}
        aria-label={`${themeName}${selected ? ', selected' : ''}${disabled ? ', disabled' : ''}`}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-testid={testId}
        className={cn(
          themeSelectorCardVariants({ size, selected, disabled }),
          isHovered && !selected && !disabled && 'bg-bg-subtle/80 border-border-brand shadow-xs',
          className
        )}
        {...props}
      >
        {/* 1:1 Aspect Ratio Preview Viewport */}
        <div
          data-testid={`${testId}-preview`}
          className={cn(
            'relative w-full aspect-square rounded-md overflow-hidden bg-bg-subtle flex items-center justify-center transition-all',
            disabled && 'opacity-50'
          )}
        >
          {themeImage ? (
            <img
              src={themeImage}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <ThemeArtPlaceholder name={themeName} />
          )}

          {/* Absolute Pinned Circular Selection Indicator */}
          <div
            data-testid={`${testId}-indicator`}
            aria-hidden="true"
            className={cn(
              'absolute rounded-full flex items-center justify-center transition-all shadow-xs',
              size === 'sm' ? 'w-5 h-5 top-2 right-2' : 'w-6 h-6 top-2.5 right-2.5',
              selected
                ? 'bg-action-primary border-2 border-brand-rose text-text-inverse'
                : disabled
                ? 'bg-bg-subtle border border-border-default text-transparent'
                : 'bg-bg-surface border border-border-default text-transparent group-hover:border-border-brand'
            )}
          >
            {selected && (
              <svg
                className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.3334 4L6.00008 11.3333L2.66675 8"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Content Frame */}
        <div className="flex flex-col gap-1 w-full min-w-0">
          <h3
            data-testid={`${testId}-title`}
            className={cn(
              'font-heading font-semibold truncate transition-colors',
              size === 'sm' ? 'text-sm' : 'text-base',
              disabled ? 'text-text-tertiary' : 'text-text-primary group-hover:text-text-primary'
            )}
          >
            {themeName}
          </h3>

          {showDescription && themeDescription && (
            <p
              data-testid={`${testId}-description`}
              className={cn(
                'text-text-secondary line-clamp-2 transition-colors',
                size === 'sm' ? 'text-xs' : 'text-sm',
                disabled && 'text-text-tertiary/70'
              )}
            >
              {themeDescription}
            </p>
          )}
        </div>
      </div>
    );
  }
);

ThemeSelectorCard.displayName = 'ThemeSelectorCard';
