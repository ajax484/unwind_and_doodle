'use client';

import React, {
  forwardRef,
  useId,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Spinner from './Spinner';

export const comboBoxContainerVariants = cva(
  [
    'relative flex items-center w-full transition-all text-left cursor-pointer select-none',
    'bg-bg-surface rounded-xl border border-border-input shadow-xs',
    'focus-within:ring-2 focus-within:ring-border-brand focus-within:border-border-brand',
    'hover:border-border-brand/70',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-xs gap-2',
        md: 'h-10 px-3.5 text-sm gap-2.5',
        lg: 'h-12 px-4 text-base gap-3',
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

export interface ComboBoxOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  group?: string;
  disabled?: boolean;
}

export interface ComboBoxProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size' | 'onChange' | 'defaultValue'>,
    VariantProps<typeof comboBoxContainerVariants> {
  /**
   * Accessible field label rendered above the control.
   */
  label?: React.ReactNode;

  /**
   * Helper description rendered below the input.
   */
  helperText?: React.ReactNode;

  /**
   * Error message displayed in red below the input with role="alert".
   */
  errorMessage?: React.ReactNode;

  /**
   * Available list of selectable options.
   */
  options?: ComboBoxOption[];

  /**
   * Controlled value of the selected option.
   */
  value?: string | number | null;

  /**
   * Uncontrolled default selected value.
   */
  defaultValue?: string | number | null;

  /**
   * Callback fired when selection changes.
   */
  onChange?: (value: string | number | null, option?: ComboBoxOption | null) => void;

  /**
   * Placeholder displayed when no option is selected.
   */
  placeholder?: string;

  /**
   * Placeholder displayed inside the search filter input.
   */
  searchPlaceholder?: string;

  /**
   * Controlled search query string.
   */
  searchQuery?: string;

  /**
   * Callback fired when search query changes (useful for async/remote fetching).
   */
  onSearchChange?: (query: string) => void;

  /**
   * Whether custom typed values can be created / selected.
   * @default false
   */
  allowCustom?: boolean;

  /**
   * Callback fired when a custom option is created.
   */
  onCreateCustom?: (query: string) => void;

  /**
   * Displays a loading spinner inside the dropdown.
   */
  isLoading?: boolean;

  /**
   * Custom empty state message rendered when no options match search.
   * @default 'No options found.'
   */
  emptyMessage?: React.ReactNode;

  /**
   * Whether to show a clear button when a value is selected.
   * @default true
   */
  clearable?: boolean;

  /**
   * Leading icon slot rendered inside the combobox trigger.
   */
  leadingIcon?: React.ReactNode;

  /**
   * Sizing scale variant.
   * - 'sm': 32px height
   * - 'md': 40px height (default)
   * - 'lg': 48px height
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether the combobox is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the field is required.
   */
  required?: boolean;

  /**
   * Custom render function for option items.
   */
  renderOption?: (
    option: ComboBoxOption,
    isSelected: boolean,
    isHighlighted: boolean
  ) => React.ReactNode;

  /**
   * Custom render function for the trigger button value label.
   */
  renderValue?: (option: ComboBoxOption | null, value: string | number | null) => React.ReactNode;

  /**
   * Class name for the outer field wrapper container.
   */
  containerClassName?: string;

  /**
   * Class name for the popover menu dropdown.
   */
  popoverClassName?: string;

  /**
   * Test identifier attribute for testing libraries.
   */
  'data-testid'?: string;
}

export interface ComboBoxRef {
  focus: () => void;
  blur: () => void;
  open: () => void;
  close: () => void;
  clear: () => void;
}

/**
 * ComboBox Component
 * Canonical searchable single-select dropdown component for Unwind & Doodle.
 *
 * Supports keyboard navigation, search filtering, creatable custom values,
 * async loading, rich option metadata (icons, descriptions, groups), and token-aligned styling.
 */
export const ComboBox = forwardRef<ComboBoxRef, ComboBoxProps>(
  (
    {
      id: explicitId,
      label,
      helperText,
      errorMessage,
      options = [],
      value: controlledValue,
      defaultValue = null,
      onChange,
      placeholder = 'Select an option...',
      searchPlaceholder = 'Search...',
      searchQuery: controlledSearchQuery,
      onSearchChange,
      allowCustom = false,
      onCreateCustom,
      isLoading = false,
      emptyMessage = 'No options found.',
      clearable = true,
      leadingIcon,
      size = 'md',
      disabled = false,
      required = false,
      renderOption,
      renderValue,
      className,
      containerClassName,
      popoverClassName,
      'data-testid': testId = 'combo-box',
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const componentId = explicitId || generatedId;
    const helperId = `${componentId}-helper`;
    const errorId = `${componentId}-error`;
    const listboxId = `${componentId}-listbox`;

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // State management
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string | number | null>(
      controlledValue !== undefined ? controlledValue : defaultValue
    );
    const [internalSearch, setInternalSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const isControlled = controlledValue !== undefined;
    const selectedValue = isControlled ? controlledValue : internalValue;

    const isSearchControlled = controlledSearchQuery !== undefined;
    const searchFilter = isSearchControlled ? controlledSearchQuery : internalSearch;

    // Synchronize controlled value
    useEffect(() => {
      if (isControlled) {
        setInternalValue(controlledValue);
      }
    }, [isControlled, controlledValue]);

    // Lookup current selected option
    const selectedOption = useMemo(() => {
      if (selectedValue === null || selectedValue === undefined || selectedValue === '') return null;
      const found = options.find((opt) => String(opt.value) === String(selectedValue));
      if (found) return found;
      if (allowCustom) {
        return {
          value: selectedValue,
          label: String(selectedValue),
        } as ComboBoxOption;
      }
      return null;
    }, [options, selectedValue, allowCustom]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      if (!searchFilter.trim()) return options;
      const query = searchFilter.toLowerCase().trim();
      return options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query) ||
          (opt.description && opt.description.toLowerCase().includes(query)) ||
          (opt.group && opt.group.toLowerCase().includes(query))
      );
    }, [options, searchFilter]);

    // Check if custom option item should be visible
    const showCustomOption = useMemo(() => {
      if (!allowCustom || !searchFilter.trim()) return false;
      const trimmed = searchFilter.trim();
      const exactMatch = options.some(
        (opt) => opt.label.toLowerCase() === trimmed.toLowerCase() || String(opt.value).toLowerCase() === trimmed.toLowerCase()
      );
      return !exactMatch;
    }, [allowCustom, searchFilter, options]);

    // Flattened items for keyboard indexing (including custom option if visible)
    const flatNavigableItems = useMemo(() => {
      const items: Array<{ type: 'option'; option: ComboBoxOption } | { type: 'custom'; query: string }> = [];
      filteredOptions.forEach((opt) => {
        if (!opt.disabled) {
          items.push({ type: 'option', option: opt });
        }
      });
      if (showCustomOption) {
        items.push({ type: 'custom', query: searchFilter.trim() });
      }
      return items;
    }, [filteredOptions, showCustomOption, searchFilter]);

    // Reset highlight when filtered items change
    useEffect(() => {
      if (isOpen) {
        setHighlightedIndex(flatNavigableItems.length > 0 ? 0 : -1);
      }
    }, [isOpen, flatNavigableItems.length]);

    // Close and handle clicks outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setInternalSearch('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [isOpen]);

    // Auto-focus search input when popover opens
    useEffect(() => {
      if (isOpen) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 30);
        return () => clearTimeout(timer);
      }
    }, [isOpen]);

    // Scroll active item into view
    useEffect(() => {
      if (isOpen && highlightedIndex >= 0 && listRef.current) {
        const activeElement = listRef.current.querySelector(
          `[data-nav-index="${highlightedIndex}"]`
        ) as HTMLElement | null;
        if (activeElement) {
          activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }, [highlightedIndex, isOpen]);

    // Select handler
    const handleSelectOption = useCallback(
      (option: ComboBoxOption) => {
        if (option.disabled) return;
        if (!isControlled) {
          setInternalValue(option.value);
        }
        onChange?.(option.value, option);
        setIsOpen(false);
        setInternalSearch('');
        triggerRef.current?.focus();
      },
      [isControlled, onChange]
    );

    // Create custom value handler
    const handleSelectCustom = useCallback(
      (customQuery: string) => {
        if (!isControlled) {
          setInternalValue(customQuery);
        }
        const newOption: ComboBoxOption = {
          value: customQuery,
          label: customQuery,
        };
        onCreateCustom?.(customQuery);
        onChange?.(customQuery, newOption);
        setIsOpen(false);
        setInternalSearch('');
        triggerRef.current?.focus();
      },
      [isControlled, onChange, onCreateCustom]
    );

    // Clear selection
    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (!isControlled) {
          setInternalValue(null);
        }
        onChange?.(null, null);
        setInternalSearch('');
        triggerRef.current?.focus();
      },
      [disabled, isControlled, onChange]
    );

    // Search input change handler
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextQuery = e.target.value;
      if (!isSearchControlled) {
        setInternalSearch(nextQuery);
      }
      onSearchChange?.(nextQuery);
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (flatNavigableItems.length === 0) return;
          setHighlightedIndex((prev) => (prev + 1) % flatNavigableItems.length);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (flatNavigableItems.length === 0) return;
          setHighlightedIndex((prev) => (prev - 1 + flatNavigableItems.length) % flatNavigableItems.length);
          break;
        }
        case 'Home': {
          e.preventDefault();
          if (flatNavigableItems.length > 0) setHighlightedIndex(0);
          break;
        }
        case 'End': {
          e.preventDefault();
          if (flatNavigableItems.length > 0) setHighlightedIndex(flatNavigableItems.length - 1);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < flatNavigableItems.length) {
            const currentItem = flatNavigableItems[highlightedIndex];
            if (currentItem.type === 'option') {
              handleSelectOption(currentItem.option);
            } else if (currentItem.type === 'custom') {
              handleSelectCustom(currentItem.query);
            }
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setIsOpen(false);
          setInternalSearch('');
          triggerRef.current?.focus();
          break;
        }
        case 'Tab': {
          setIsOpen(false);
          setInternalSearch('');
          break;
        }
      }
    };

    // Imperative ref methods
    useImperativeHandle(
      ref,
      () => ({
        focus: () => triggerRef.current?.focus(),
        blur: () => triggerRef.current?.blur(),
        open: () => {
          if (!disabled) setIsOpen(true);
        },
        close: () => setIsOpen(false),
        clear: () => {
          if (!disabled) {
            if (!isControlled) setInternalValue(null);
            onChange?.(null, null);
          }
        },
      }),
      [disabled, isControlled, onChange]
    );

    // Grouping support
    const groupedOptions = useMemo(() => {
      const groups: { [key: string]: ComboBoxOption[] } = {};
      const ungrouped: ComboBoxOption[] = [];

      filteredOptions.forEach((opt) => {
        if (opt.group) {
          if (!groups[opt.group]) groups[opt.group] = [];
          groups[opt.group].push(opt);
        } else {
          ungrouped.push(opt);
        }
      });

      return { groups, ungrouped };
    }, [filteredOptions]);

    const hasError = Boolean(errorMessage);

    // Active descendant ID for WAI-ARIA
    const activeDescendantId =
      highlightedIndex >= 0 ? `${componentId}-opt-${highlightedIndex}` : undefined;

    return (
      <div
        ref={containerRef}
        className={cn('flex flex-col gap-1.5 w-full relative', containerClassName)}
        data-testid={testId}
        {...rest}
      >
        {/* Field Label */}
        {label && (
          <label
            id={`${componentId}-label`}
            htmlFor={`${componentId}-trigger`}
            className="font-heading font-semibold text-xs sm:text-sm text-text-primary flex items-center justify-between select-none"
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
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

        {/* Trigger Button */}
        <button
          ref={triggerRef}
          id={`${componentId}-trigger`}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-labelledby={label ? `${componentId}-label` : undefined}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          className={cn(
            comboBoxContainerVariants({
              size,
              hasError,
            }),
            disabled &&
              'bg-bg-subtle text-text-tertiary border-border-default cursor-not-allowed opacity-75 hover:border-border-default focus-within:ring-0',
            className
          )}
        >
          {/* Leading Icon */}
          {leadingIcon && (
            <span className="shrink-0 text-text-placeholder flex items-center justify-center" aria-hidden="true">
              {leadingIcon}
            </span>
          )}

          {/* Value Display */}
          <div className="flex-1 truncate font-body text-left">
            {renderValue ? (
              renderValue(selectedOption, selectedValue)
            ) : selectedOption ? (
              <span className="text-text-primary flex items-center gap-2">
                {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                <span className="truncate">{selectedOption.label}</span>
              </span>
            ) : (
              <span className="text-text-placeholder">{placeholder}</span>
            )}
          </div>

          {/* Action Icons: Clear + Chevron */}
          <div className="shrink-0 flex items-center gap-1.5 text-text-secondary" aria-hidden="true">
            {clearable && selectedValue !== null && selectedValue !== undefined && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                title="Clear selection"
                aria-label="Clear selection"
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-neutral-border-soft hover:text-text-primary transition-colors text-text-tertiary"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            )}

            <span className={cn('transition-transform duration-200', isOpen && 'rotate-180')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 left-0 right-0 top-[calc(100%+6px)] min-w-[200px] overflow-hidden',
              'bg-bg-surface rounded-xl border border-border-default shadow-card',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              popoverClassName
            )}
          >
            {/* Search Input Filter Bar */}
            <div className="p-2 border-b border-border-default bg-bg-surface flex items-center gap-2">
              <span className="text-text-placeholder pl-1.5" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchFilter}
                onChange={handleSearchInputChange}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-activedescendant={activeDescendantId}
                className="w-full bg-transparent font-body text-xs sm:text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isSearchControlled) setInternalSearch('');
                    onSearchChange?.('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-text-placeholder hover:text-text-primary rounded"
                  aria-label="Clear search"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Options Listbox */}
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={typeof label === 'string' ? label : 'Options'}
              className="max-h-60 overflow-y-auto p-1 text-xs sm:text-sm font-body focus:outline-none"
            >
              {isLoading ? (
                <li className="flex items-center justify-center gap-2 py-6 text-text-tertiary font-body">
                  <Spinner size="sm" color="rose" />
                  <span>Loading options...</span>
                </li>
              ) : filteredOptions.length === 0 && !showCustomOption ? (
                <li className="py-4 px-3 text-center text-text-tertiary font-body">
                  {emptyMessage}
                </li>
              ) : (
                <>
                  {/* Ungrouped options */}
                  {groupedOptions.ungrouped.map((option) => {
                    const isSelected = String(selectedValue) === String(option.value);
                    const navIndex = flatNavigableItems.findIndex(
                      (item) => item.type === 'option' && item.option.value === option.value
                    );
                    const isHighlighted = highlightedIndex === navIndex;

                    return (
                      <li
                        key={String(option.value)}
                        id={`${componentId}-opt-${navIndex}`}
                        data-nav-index={navIndex}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled}
                        onClick={() => handleSelectOption(option)}
                        onMouseEnter={() => !option.disabled && setHighlightedIndex(navIndex)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors',
                          option.disabled && 'opacity-50 cursor-not-allowed bg-transparent text-text-tertiary',
                          !option.disabled && isHighlighted && 'bg-bg-subtle text-action-secondary-text',
                          !option.disabled && !isHighlighted && isSelected && 'bg-brand-blue-light/50 text-text-primary font-medium',
                          !option.disabled && !isHighlighted && !isSelected && 'text-text-primary hover:bg-bg-subtle'
                        )}
                      >
                        {renderOption ? (
                          renderOption(option, isSelected, isHighlighted)
                        ) : (
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {option.icon && <span className="shrink-0 text-text-secondary">{option.icon}</span>}
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{option.label}</span>
                              {option.description && (
                                <span className="text-[11px] text-text-tertiary truncate">
                                  {option.description}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {isSelected && (
                          <span className="shrink-0 ml-2 text-action-primary" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </li>
                    );
                  })}

                  {/* Grouped options */}
                  {Object.entries(groupedOptions.groups).map(([groupName, groupItems]) => (
                    <li key={groupName} className="mt-1.5 first:mt-0">
                      <div className="px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-wider text-text-tertiary select-none">
                        {groupName}
                      </div>
                      <ul role="group" aria-label={groupName} className="space-y-0.5">
                        {groupItems.map((option) => {
                          const isSelected = String(selectedValue) === String(option.value);
                          const navIndex = flatNavigableItems.findIndex(
                            (item) => item.type === 'option' && item.option.value === option.value
                          );
                          const isHighlighted = highlightedIndex === navIndex;

                          return (
                            <li
                              key={String(option.value)}
                              id={`${componentId}-opt-${navIndex}`}
                              data-nav-index={navIndex}
                              role="option"
                              aria-selected={isSelected}
                              aria-disabled={option.disabled}
                              onClick={() => handleSelectOption(option)}
                              onMouseEnter={() => !option.disabled && setHighlightedIndex(navIndex)}
                              className={cn(
                                'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors',
                                option.disabled && 'opacity-50 cursor-not-allowed bg-transparent text-text-tertiary',
                                !option.disabled && isHighlighted && 'bg-bg-subtle text-action-secondary-text',
                                !option.disabled && !isHighlighted && isSelected && 'bg-brand-blue-light/50 text-text-primary font-medium',
                                !option.disabled && !isHighlighted && !isSelected && 'text-text-primary hover:bg-bg-subtle'
                              )}
                            >
                              {renderOption ? (
                                renderOption(option, isSelected, isHighlighted)
                              ) : (
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {option.icon && <span className="shrink-0 text-text-secondary">{option.icon}</span>}
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate">{option.label}</span>
                                    {option.description && (
                                      <span className="text-[11px] text-text-tertiary truncate">
                                        {option.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {isSelected && (
                                <span className="shrink-0 ml-2 text-action-primary" aria-hidden="true">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}

                  {/* Creatable custom value item */}
                  {showCustomOption && (() => {
                    const navIndex = flatNavigableItems.findIndex((item) => item.type === 'custom');
                    const isHighlighted = highlightedIndex === navIndex;
                    const customQuery = searchFilter.trim();

                    return (
                      <li
                        key="custom-option-create"
                        id={`${componentId}-opt-${navIndex}`}
                        data-nav-index={navIndex}
                        role="option"
                        aria-selected={false}
                        onClick={() => handleSelectCustom(customQuery)}
                        onMouseEnter={() => setHighlightedIndex(navIndex)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 mt-1 rounded-lg cursor-pointer border-t border-dashed border-border-default transition-colors text-action-secondary-text',
                          isHighlighted ? 'bg-bg-subtle font-medium' : 'hover:bg-bg-subtle'
                        )}
                      >
                        <span className="p-0.5 rounded bg-action-secondary-bg text-action-secondary-text" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </span>
                        <span className="truncate">
                          Create <span className="font-semibold">&ldquo;{customQuery}&rdquo;</span>
                        </span>
                      </li>
                    );
                  })()}
                </>
              )}
            </ul>
          </div>
        )}

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

ComboBox.displayName = 'ComboBox';
export default ComboBox;
