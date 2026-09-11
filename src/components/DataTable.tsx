'use client';

import React, { useState, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Checkbox } from './Checkbox';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';

export type DataTableDensity = 'default' | 'compact';
export type DataTableState = 'default' | 'loading' | 'empty';
export type DataTableSelection = 'none' | 'single' | 'multiple';

export interface DataTableColumn<TData> {
  /**
   * Unique identifier for the column
   */
  id: string;
  /**
   * Rendered header label or node
   */
  header: React.ReactNode;
  /**
   * Property key on row record to access
   */
  accessorKey?: keyof TData;
  /**
   * Custom cell renderer function
   */
  cell?: (info: { row: TData; index: number; value: any }) => React.ReactNode;
  /**
   * Text/content alignment
   * @default 'left'
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Width override (e.g. '120px', '25%')
   */
  width?: string | number;
  /**
   * Whether this column supports sorting
   * @default false
   */
  sortable?: boolean;
  /**
   * Optional custom CSS class for header and cells
   */
  className?: string;
}

export interface DataTablePaginationConfig {
  /**
   * Current active 1-based page number
   */
  currentPage: number;
  /**
   * Total number of pages
   */
  totalPages: number;
  /**
   * Callback fired when page is changed
   */
  onPageChange: (page: number) => void;
  /**
   * Optional total count of records across all pages
   */
  totalCount?: number;
  /**
   * Number of items per page
   * @default 10
   */
  pageSize?: number;
  /**
   * Noun describing the items (e.g. 'orders', 'customers', 'products')
   * @default 'items'
   */
  itemLabel?: string;
}

export const dataTableVariants = cva(
  'w-full bg-bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden',
  {
    variants: {
      density: {
        default: '',
        compact: '',
      },
    },
    defaultVariants: {
      density: 'default',
    },
  }
);

export interface DataTableProps<TData>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof dataTableVariants> {
  /**
   * Column definitions
   */
  columns: DataTableColumn<TData>[];
  /**
   * Array of data records
   */
  data?: TData[];
  /**
   * Lifecycle display state
   * @default 'default'
   */
  state?: DataTableState;
  /**
   * Sizing density scale
   * @default 'default'
   */
  density?: DataTableDensity;
  /**
   * Row selection mode
   * @default 'none'
   */
  selection?: DataTableSelection;
  /**
   * List of currently selected row IDs (controlled)
   */
  selectedRowKeys?: string[];
  /**
   * Callback fired when selection changes
   */
  onSelectionChange?: (selectedKeys: string[]) => void;
  /**
   * Row ID extractor (defaults to row.id or string index)
   */
  getRowId?: (row: TData, index: number) => string;
  /**
   * Active sort column ID
   */
  sortColumn?: string;
  /**
   * Active sort direction
   */
  sortDirection?: 'asc' | 'desc';
  /**
   * Callback triggered when a sortable column header is clicked
   */
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  /**
   * Whether to render the integrated bottom pagination bar
   * @default false
   */
  showPagination?: boolean;
  /**
   * Configuration for the bottom pagination bar
   */
  paginationProps?: DataTablePaginationConfig;
  /**
   * Title text when state="empty"
   * @default 'No records found'
   */
  emptyTitle?: string;
  /**
   * Description text when state="empty"
   * @default 'There are currently no records to display.'
   */
  emptyDescription?: string;
  /**
   * Optional primary action for empty state
   */
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Number of skeleton loading rows to render when state="loading"
   * @default 4
   */
  loadingRowCount?: number;
  /**
   * Optional test identifier for testing libraries
   * @default 'data-table'
   */
  'data-testid'?: string;
}

/**
 * Sort Direction Indicator Icon
 */
function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
  return (
    <span className="inline-flex flex-col items-center justify-center shrink-0 ml-1 text-text-tertiary">
      <svg
        className={cn('w-3 h-3 transition-colors', direction === 'asc' ? 'text-action-primary' : 'text-text-tertiary/60')}
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 2.5L2.5 6.5H9.5L6 2.5Z" />
      </svg>
      <svg
        className={cn('w-3 h-3 -mt-1 transition-colors', direction === 'desc' ? 'text-action-primary' : 'text-text-tertiary/60')}
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 9.5L9.5 5.5H2.5L6 9.5Z" />
      </svg>
    </span>
  );
}

/**
 * Canonical DataTable Component
 *
 * Grounded in Figma Component Set `DataTable` (Node ID: 52:60334, 18 variants)
 * and Documentation Board `Data Tables` (52:63775) on the `Components` page.
 *
 * Features:
 * - Generic typing <TData> with declarative column descriptors
 * - State lifecycle: 'default', 'loading' (Skeleton rows), and 'empty' (EmptyState)
 * - Row selection: 'none', 'single', and 'multiple' with select-all checkbox support
 * - Density modes: 'default' (~52px rows) and 'compact' (~40px rows)
 * - Accessible column sorting with sort chevrons and ARIA announcements
 * - Fully integrated canonical `Pagination` bar with item range calculation
 * - Responsive horizontal scrolling container preserving mobile viewports
 */
export function DataTable<TData>({
  columns = [],
  data = [],
  state = 'default',
  density = 'default',
  selection = 'none',
  selectedRowKeys: controlledSelectedKeys,
  onSelectionChange,
  getRowId = (row: any, idx) => row?.id || String(idx),
  sortColumn,
  sortDirection,
  onSort,
  showPagination = false,
  paginationProps,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no records to display.',
  emptyAction,
  loadingRowCount = 4,
  className,
  'data-testid': testId = 'data-table',
  ...props
}: DataTableProps<TData>) {
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>([]);
  const isControlled = controlledSelectedKeys !== undefined;
  const currentSelectedKeys = isControlled ? controlledSelectedKeys : internalSelectedKeys;

  const updateSelection = (newKeys: string[]) => {
    if (!isControlled) {
      setInternalSelectedKeys(newKeys);
    }
    onSelectionChange?.(newKeys);
  };

  const isAllSelected =
    data.length > 0 &&
    data.every((row, idx) => currentSelectedKeys.includes(getRowId(row, idx)));

  const isSomeSelected =
    currentSelectedKeys.length > 0 && !isAllSelected;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allKeys = data.map((row, idx) => getRowId(row, idx));
      updateSelection(allKeys);
    } else {
      updateSelection([]);
    }
  };

  const handleRowSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (selection === 'single') {
      updateSelection([key]);
      return;
    }

    if (currentSelectedKeys.includes(key)) {
      updateSelection(currentSelectedKeys.filter((k) => k !== key));
    } else {
      updateSelection([...currentSelectedKeys, key]);
    }
  };

  const handleSortClick = (columnId: string) => {
    if (!onSort) return;
    if (sortColumn === columnId) {
      onSort(columnId, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnId, 'asc');
    }
  };

  const totalColumns = columns.length + (selection !== 'none' ? 1 : 0);

  // Compute pagination summary range (e.g. "Showing 1 to 10 of 48 items")
  let paginationSummary = '';
  if (paginationProps) {
    const { currentPage, totalCount, pageSize = 10, itemLabel = 'items' } = paginationProps;
    if (totalCount !== undefined) {
      const start = Math.min((currentPage - 1) * pageSize + 1, totalCount);
      const end = Math.min(currentPage * pageSize, totalCount);
      paginationSummary = `Showing ${start} to ${end} of ${totalCount} ${itemLabel}`;
    } else {
      paginationSummary = `Page ${currentPage} of ${paginationProps.totalPages}`;
    }
  }

  return (
    <div
      data-testid={testId}
      className={cn(dataTableVariants({ density }), className)}
      {...props}
    >
      {/* Responsive Horizontal Scroll Wrapper */}
      <div className="w-full overflow-x-auto">
        <table
          className="w-full text-left border-collapse"
          data-testid={`${testId}-table`}
        >
          {/* Header Row */}
          <thead className="bg-bg-subtle/90 border-b border-border-default select-none">
            <tr>
              {/* Selection Column Header */}
              {selection !== 'none' && (
                <th
                  scope="col"
                  className={cn(
                    'w-12 text-center align-middle',
                    density === 'compact' ? 'py-2 px-3' : 'py-3 px-4'
                  )}
                  data-testid={`${testId}-header-select`}
                >
                  {selection === 'multiple' ? (
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isSomeSelected}
                        onChange={handleSelectAll}
                        aria-label="Select all rows"
                        data-testid={`${testId}-select-all`}
                      />
                    </div>
                  ) : null}
                </th>
              )}

              {/* Data Column Headers */}
              {columns.map((col) => {
                const isSorted = sortColumn === col.id;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={
                      isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={cn(
                      'font-semibold text-xs text-text-secondary uppercase tracking-wider',
                      density === 'compact' ? 'py-2 px-3' : 'py-3 px-4',
                      alignClass,
                      col.className
                    )}
                    data-testid={`${testId}-col-header-${col.id}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(col.id)}
                        className={cn(
                          'inline-flex items-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/50 rounded-xs transition-colors',
                          col.align === 'right' && 'ml-auto',
                          col.align === 'center' && 'mx-auto'
                        )}
                        aria-label={`Sort by ${String(col.header)}`}
                      >
                        <span className="group-hover:text-text-primary transition-colors">
                          {col.header}
                        </span>
                        <SortIcon direction={isSorted ? sortDirection : undefined} />
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border-default">
            {/* 1. Loading State */}
            {state === 'loading' && (
              <>
                {Array.from({ length: loadingRowCount }).map((_, rIdx) => (
                  <tr
                    key={`loading-row-${rIdx}`}
                    data-testid={`${testId}-loading-row`}
                    className="bg-bg-surface animate-pulse"
                  >
                    {selection !== 'none' && (
                      <td className={density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'}>
                        <div className="w-5 h-5 rounded-md bg-bg-subtle mx-auto" />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td
                        key={`loading-cell-${cIdx}`}
                        className={density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'}
                      >
                        <div
                          className={cn(
                            'h-4 rounded-md bg-bg-subtle',
                            cIdx === 0 ? 'w-3/4' : cIdx === columns.length - 1 ? 'w-1/2 ml-auto' : 'w-2/3'
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {/* 2. Empty State */}
            {state === 'empty' && (
              <tr data-testid={`${testId}-empty-row`}>
                <td
                  colSpan={totalColumns}
                  className="py-12 px-4 text-center bg-bg-surface"
                >
                  <EmptyState
                    size="sm"
                    title={emptyTitle}
                    description={emptyDescription}
                    primaryAction={emptyAction}
                    data-testid={`${testId}-empty-state`}
                  />
                </td>
              </tr>
            )}

            {/* 3. Default Rendered Data Rows */}
            {state === 'default' && data.length === 0 && (
              <tr data-testid={`${testId}-empty-data-row`}>
                <td
                  colSpan={totalColumns}
                  className="py-12 px-4 text-center bg-bg-surface"
                >
                  <EmptyState
                    size="sm"
                    title={emptyTitle}
                    description={emptyDescription}
                    primaryAction={emptyAction}
                    data-testid={`${testId}-empty-state`}
                  />
                </td>
              </tr>
            )}

            {state === 'default' &&
              data.map((row, rIdx) => {
                const rowKey = getRowId(row, rIdx);
                const isSelected = currentSelectedKeys.includes(rowKey);

                return (
                  <tr
                    key={rowKey}
                    data-testid={`${testId}-row-${rIdx}`}
                    aria-selected={isSelected}
                    className={cn(
                      'transition-colors',
                      isSelected
                        ? 'bg-brand-blue-light/35 hover:bg-brand-blue-light/45'
                        : 'bg-bg-surface hover:bg-bg-subtle/50'
                    )}
                  >
                    {/* Selection Cell */}
                    {selection !== 'none' && (
                      <td
                        className={cn(
                          'w-12 text-center align-middle',
                          density === 'compact' ? 'py-2 px-3' : 'py-3.5 px-4'
                        )}
                        data-testid={`${testId}-row-select-${rIdx}`}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleRowSelect(rowKey, e)}
                            aria-label={`Select row ${rIdx + 1}`}
                            data-testid={`${testId}-row-checkbox-${rIdx}`}
                          />
                        </div>
                      </td>
                    )}

                    {/* Data Cells */}
                    {columns.map((col) => {
                      const value = col.accessorKey ? (row as any)[col.accessorKey] : undefined;
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      return (
                        <td
                          key={col.id}
                          className={cn(
                            density === 'compact'
                              ? 'py-2 px-3 text-xs'
                              : 'py-3.5 px-4 text-sm',
                            'text-text-primary align-middle',
                            alignClass,
                            col.className
                          )}
                          data-testid={`${testId}-cell-${rIdx}-${col.id}`}
                        >
                          {col.cell ? col.cell({ row, index: rIdx, value }) : (value as React.ReactNode)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Integrated Pagination Footer */}
      {showPagination && paginationProps && (
        <div
          data-testid={`${testId}-pagination-footer`}
          className="py-3 px-4 border-t border-border-default bg-bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 select-none"
        >
          {paginationSummary && (
            <span
              data-testid={`${testId}-pagination-info`}
              className="text-xs text-text-secondary font-medium"
            >
              {paginationSummary}
            </span>
          )}

          <div className="ml-auto">
            <Pagination
              currentPage={paginationProps.currentPage}
              totalPages={paginationProps.totalPages}
              onPageChange={paginationProps.onPageChange}
              size="sm"
              data-testid={`${testId}-pagination`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
