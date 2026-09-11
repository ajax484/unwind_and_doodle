'use client';

import React, { forwardRef, useRef, useId, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const tabsContainerVariants = cva('w-full', {
  variants: {
    style: {
      underline:
        'flex items-center gap-4 sm:gap-6 border-b border-border-default',
      segmented:
        'inline-flex items-center p-1 bg-bg-subtle rounded-full border border-border-default',
    },
    fullWidth: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      style: 'segmented',
      fullWidth: true,
      className: 'flex w-full',
    },
  ],
  defaultVariants: {
    style: 'underline',
    fullWidth: false,
  },
});

export const tabItemVariants = cva(
  'font-heading font-semibold transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/40',
  {
    variants: {
      style: {
        underline:
          'relative inline-flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap -mb-[1px]',
        segmented:
          'inline-flex items-center justify-center gap-1.5 rounded-full transition-all whitespace-nowrap',
      },
      size: {
        sm: '',
        md: '',
      },
      isActive: {
        true: '',
        false: '',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-50',
        false: '',
      },
      fullWidth: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      // Underline + SM
      {
        style: 'underline',
        size: 'sm',
        className: 'text-xs pb-2',
      },
      // Underline + MD
      {
        style: 'underline',
        size: 'md',
        className: 'text-xs sm:text-sm pb-3',
      },
      // Underline + Active
      {
        style: 'underline',
        isActive: true,
        disabled: false,
        className: 'text-text-primary border-action-primary font-bold',
      },
      // Underline + Inactive
      {
        style: 'underline',
        isActive: false,
        disabled: false,
        className: 'text-text-secondary hover:text-text-primary border-transparent',
      },
      // Underline + Disabled
      {
        style: 'underline',
        disabled: true,
        className: 'text-text-tertiary border-transparent',
      },
      // Segmented + SM
      {
        style: 'segmented',
        size: 'sm',
        className: 'min-h-[32px] px-3 py-1 text-xs',
      },
      // Segmented + MD
      {
        style: 'segmented',
        size: 'md',
        className: 'min-h-[40px] px-4 py-1.5 text-xs sm:text-sm',
      },
      // Segmented + Active
      {
        style: 'segmented',
        isActive: true,
        disabled: false,
        className: 'bg-bg-surface text-text-primary shadow-xs font-bold',
      },
      // Segmented + Inactive
      {
        style: 'segmented',
        isActive: false,
        disabled: false,
        className: 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50',
      },
      // Segmented + Disabled
      {
        style: 'segmented',
        disabled: true,
        className: 'text-text-tertiary',
      },
      // Segmented + Full Width
      {
        style: 'segmented',
        fullWidth: true,
        className: 'flex-1 text-center justify-center',
      },
    ],
    defaultVariants: {
      style: 'underline',
      size: 'md',
      isActive: false,
      disabled: false,
      fullWidth: false,
    },
  }
);

export type TabsStyle = NonNullable<VariantProps<typeof tabsContainerVariants>['style']>;
export type TabsSize = NonNullable<VariantProps<typeof tabItemVariants>['size']>;

/**
 * Configuration for an individual tab within a Tabs molecule.
 */
export interface TabItem<T extends string = string> {
  /** Unique identifier for the tab. */
  id: T;
  /** Visible label or custom content displayed inside the tab. */
  label: React.ReactNode;
  /** Optional badge count or status text rendered alongside the label. */
  count?: number | string;
  /** Optional leading icon element. */
  icon?: React.ReactNode;
  /** Whether the tab is disabled and non-interactive. */
  disabled?: boolean;
  /** Optional panel content rendered when this tab is active. */
  panel?: React.ReactNode;
  /** Optional custom CSS classes for this specific tab button. */
  className?: string;
  /** Optional custom test identifier. */
  'data-testid'?: string;
}

/**
 * Public props for the canonical Tabs molecule.
 */
export interface TabsProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'style'> {
  /**
   * Array of tab items to render.
   */
  tabs: TabItem<T>[];
  /**
   * Currently active tab identifier (controlled mode).
   */
  activeTab?: T;
  /**
   * Initial active tab identifier when operating in uncontrolled mode.
   * Defaults to the id of the first non-disabled tab.
   */
  defaultActiveTab?: T;
  /**
   * Callback fired when a tab is selected or activated via click/keyboard.
   */
  onChange?: (tabId: T) => void;
  /**
   * Visual presentation style of the tabs.
   * - `underline`: Content-driven storefront navigation with 2px Brand Rose bottom indicator.
   * - `segmented`: Compact pill container with surface-elevated active indicator.
   * @default 'underline'
   */
  style?: TabsStyle;
  /**
   * Size scale of tab items.
   * - `sm`: 32px height, 12px text.
   * - `md`: 40px height, 14px text.
   * @default 'md'
   */
  size?: TabsSize;
  /**
   * Whether segmented tabs should stretch across the full container width.
   * @default false
   */
  fullWidth?: boolean;
  /**
   * Accessible label describing the purpose of the tablist (WCAG 2.1 AA requirement).
   */
  'aria-label'?: string;
  /**
   * Optional custom classes applied to the inner tab items.
   */
  tabClassName?: string;
  /**
   * Optional custom classes applied to the active tab item.
   */
  activeTabClassName?: string;
  /**
   * Optional custom classes applied to the active tab panel container.
   */
  panelClassName?: string;
  /**
   * Custom test identifier for testing harnesses.
   */
  'data-testid'?: string;
}

/**
 * Canonical Tabs molecule adhering to Figma Step 3E specifications and WAI-ARIA tab pattern.
 *
 * Supports `underline` (content-driven navigation with 2px Rose active indicator)
 * and `segmented` (pill filtering tabs with elevated active background) styles,
 * interactive keyboard arrow navigation, and optional count badges.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps<any>>(function Tabs(
  {
    tabs,
    activeTab: controlledActiveTab,
    defaultActiveTab,
    onChange,
    style = 'underline',
    size = 'md',
    fullWidth = false,
    'aria-label': ariaLabel,
    className,
    tabClassName,
    activeTabClassName,
    panelClassName,
    'data-testid': testId,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const firstEnabledId = tabs.find((tab) => !tab.disabled)?.id ?? tabs[0]?.id;

  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<string>(
    defaultActiveTab ?? firstEnabledId ?? ''
  );

  const isControlled = controlledActiveTab !== undefined;
  const currentActiveTab = isControlled ? controlledActiveTab : uncontrolledActiveTab;

  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleSelectTab = (tab: TabItem) => {
    if (tab.disabled) return;
    if (!isControlled) {
      setUncontrolledActiveTab(tab.id);
    }
    onChange?.(tab.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    if (enabledTabs.length === 0) return;

    const currentIndex = enabledTabs.findIndex((t) => t.id === currentActiveTab);

    let nextIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = currentIndex >= enabledTabs.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = currentIndex <= 0 ? enabledTabs.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = enabledTabs.length - 1;
        break;
      default:
        break;
    }

    if (nextIndex >= 0) {
      const targetTab = enabledTabs[nextIndex];
      if (targetTab) {
        handleSelectTab(targetTab);
        const buttonEl = tabRefs.current.get(targetTab.id);
        buttonEl?.focus();
      }
    }
  };

  const activePanel = tabs.find((t) => t.id === currentActiveTab)?.panel;

  return (
    <div className="w-full space-y-4" data-testid={testId} {...rest}>
      {/* Tablist Container */}
      <div
        ref={ref}
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className={cn(tabsContainerVariants({ style, fullWidth }), className)}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === currentActiveTab;
          const tabId = `tab-${generatedId}-${tab.id}`;
          const panelId = `panel-${generatedId}-${tab.id}`;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              aria-disabled={tab.disabled}
              disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelectTab(tab)}
              data-testid={tab['data-testid'] || `tab-${tab.id}`}
              className={cn(
                tabItemVariants({
                  style,
                  size,
                  isActive,
                  disabled: tab.disabled,
                  fullWidth,
                }),
                tabClassName,
                isActive && activeTabClassName,
                tab.className
              )}
            >
              {tab.icon && <span className="inline-flex shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center font-heading font-bold rounded-full select-none transition-colors',
                    size === 'sm' ? 'text-[10px] px-1.5 py-0.2' : 'text-xs px-2 py-0.5',
                    style === 'underline'
                      ? isActive
                        ? 'bg-action-secondary-bg text-action-secondary-text'
                        : 'bg-bg-subtle text-text-secondary'
                      : isActive
                      ? 'bg-action-secondary-bg text-action-secondary-text'
                      : 'bg-border-default/70 text-text-secondary'
                  )}
                  data-testid={`tab-count-${tab.id}`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Render Active Tab Panel if defined on any tab */}
      {activePanel && (
        <div
          role="tabpanel"
          id={`panel-${generatedId}-${currentActiveTab}`}
          aria-labelledby={`tab-${generatedId}-${currentActiveTab}`}
          tabIndex={0}
          className={cn('focus-visible:outline-none', panelClassName)}
        >
          {activePanel}
        </div>
      )}
    </div>
  );
});
