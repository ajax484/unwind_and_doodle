'use client';

import React, { forwardRef, useState, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const accordionTriggerVariants = cva(
  [
    'w-full flex items-center justify-between text-left transition-colors select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue/50 focus-visible:ring-offset-2',
  ],
  {
    variants: {
      size: {
        md: 'p-4 gap-3 min-h-[52px]',
        sm: 'p-3 gap-2.5 min-h-[44px]',
      },
      disabled: {
        true: 'opacity-60 cursor-not-allowed text-text-tertiary',
        false: 'cursor-pointer hover:bg-bg-subtle/40 active:bg-bg-subtle/60 text-text-primary',
      },
    },
    defaultVariants: {
      size: 'md',
      disabled: false,
    },
  }
);

export type AccordionSize = NonNullable<VariantProps<typeof accordionTriggerVariants>['size']>;

export interface AccordionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'id' | 'onToggle'> {
  /**
   * Title / question text displayed in the interactive trigger row.
   */
  title: React.ReactNode;

  /**
   * Target scale and padding density.
   * @default 'md'
   */
  size?: AccordionSize;

  /**
   * Optional leading icon rendered before the title.
   */
  icon?: React.ReactNode;

  /**
   * Whether to display the 1px bottom hairline divider line.
   * @default true
   */
  divider?: boolean;

  /**
   * Controlled expanded state.
   */
  expanded?: boolean;

  /**
   * Initial expanded state for uncontrolled usage.
   * @default false
   */
  defaultExpanded?: boolean;

  /**
   * Callback invoked when the user toggles disclosure state.
   */
  onToggle?: (expanded: boolean) => void;

  /**
   * Disables interactive expansion.
   * @default false
   */
  disabled?: boolean;

  /**
   * Expandable content revealed when active.
   */
  children?: React.ReactNode;

  /**
   * Optional test identifier for QA automated test suites.
   * @default 'accordion-item'
   */
  'data-testid'?: string;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      title,
      size = 'md',
      icon,
      divider = true,
      expanded: controlledExpanded,
      defaultExpanded = false,
      onToggle,
      disabled = false,
      children,
      className,
      'data-testid': testId = 'accordion-item',
      ...rest
    },
    ref
  ) => {
    const isControlled = controlledExpanded !== undefined;
    const [internalExpanded, setInternalExpanded] = useState<boolean>(defaultExpanded);
    const isExpanded = isControlled ? controlledExpanded : internalExpanded;

    const uniqueId = useId();
    const triggerId = `accordion-trigger-${uniqueId}`;
    const contentId = `accordion-content-${uniqueId}`;

    const handleToggle = () => {
      if (disabled) return;
      const nextState = !isExpanded;
      if (!isControlled) {
        setInternalExpanded(nextState);
      }
      onToggle?.(nextState);
    };

    // Calculate text indentation for content alignment with title
    const hasIcon = Boolean(icon);
    const contentPaddingLeft =
      size === 'sm' ? (hasIcon ? 'pl-9.5' : 'pl-3') : hasIcon ? 'pl-12' : 'pl-4';

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(
          'w-full flex flex-col transition-all duration-200',
          divider && 'border-b border-border-default',
          className
        )}
        {...rest}
      >
        {/* Interactive Trigger Row */}
        <button
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={handleToggle}
          className={cn(accordionTriggerVariants({ size, disabled }))}
        >
          {/* Leading Icon & Title Group */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <span
                className={cn(
                  'shrink-0 flex items-center justify-center transition-colors',
                  size === 'sm' ? 'w-4 h-4 text-sm' : 'w-5 h-5 text-base',
                  disabled ? 'text-text-tertiary' : 'text-action-primary'
                )}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
            <span
              className={cn(
                'font-heading font-medium truncate',
                size === 'sm' ? 'text-[13px] sm:text-sm' : 'text-[15px] sm:text-base',
                disabled ? 'text-text-tertiary' : 'text-text-primary'
              )}
            >
              {title}
            </span>
          </div>

          {/* Trailing Directional Chevron */}
          <span
            className={cn(
              'shrink-0 flex items-center justify-center transition-transform duration-200 ease-out',
              size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5',
              isExpanded ? 'rotate-180 text-action-primary' : 'text-text-secondary',
              disabled && 'text-text-tertiary opacity-70'
            )}
            aria-hidden="true"
          >
            <svg
              className="w-full h-full"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 7.5L10 12.5L15 7.5" />
            </svg>
          </span>
        </button>

        {/* Expandable Disclosure Content Body */}
        {isExpanded && (
          <div
            id={contentId}
            role="region"
            aria-labelledby={triggerId}
            className={cn(
              'animate-in fade-in-50 duration-200 ease-out pr-4',
              size === 'sm' ? 'pb-3' : 'pb-4',
              contentPaddingLeft
            )}
          >
            <div
              className={cn(
                'text-text-secondary leading-relaxed',
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}
            >
              {children}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Accordion.displayName = 'Accordion';

/**
 * Multi-Item Accordion Group / List Container
 */
export interface AccordionGroupItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * List of accordion items to render.
   */
  items: AccordionGroupItem[];

  /**
   * Target scale and padding density across all items.
   * @default 'md'
   */
  size?: AccordionSize;

  /**
   * Expansion mode:
   * - 'single': only one item can be expanded at a time.
   * - 'multiple': multiple items can be simultaneously open.
   * @default 'single'
   */
  type?: 'single' | 'multiple';

  /**
   * Default open item ID(s).
   */
  defaultExpandedIds?: string[];

  /**
   * Whether items display 1px divider lines.
   * @default true
   */
  divider?: boolean;
}

export const AccordionGroup = forwardRef<HTMLDivElement, AccordionGroupProps>(
  (
    {
      items,
      size = 'md',
      type = 'single',
      defaultExpandedIds = [],
      divider = true,
      className,
      ...rest
    },
    ref
  ) => {
    const [expandedIds, setExpandedIds] = useState<string[]>(defaultExpandedIds);

    const handleItemToggle = (itemId: string, expanded: boolean) => {
      if (type === 'single') {
        setExpandedIds(expanded ? [itemId] : []);
      } else {
        setExpandedIds((prev) =>
          expanded ? [...prev, itemId] : prev.filter((id) => id !== itemId)
        );
      }
    };

    return (
      <div ref={ref} className={cn('w-full flex flex-col', className)} {...rest}>
        {items.map((item) => (
          <Accordion
            key={item.id}
            title={item.title}
            size={size}
            icon={item.icon}
            divider={divider}
            disabled={item.disabled}
            expanded={expandedIds.includes(item.id)}
            onToggle={(isNowExpanded) => handleItemToggle(item.id, isNowExpanded)}
          >
            {item.content}
          </Accordion>
        ))}
      </div>
    );
  }
);

AccordionGroup.displayName = 'AccordionGroup';

export default Accordion;
