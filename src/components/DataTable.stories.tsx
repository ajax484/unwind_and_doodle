import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import React, { useState } from 'react';
import { DataTable, type DataTableColumn } from './DataTable';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Avatar } from './Avatar';
import Badge from './Badge';

interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  total: string;
  date: string;
}

const sampleOrders: OrderItem[] = [
  {
    id: 'ord-1001',
    orderNumber: '#UD-1001',
    customerName: 'Amina Okafor',
    customerEmail: 'amina@example.com',
    status: 'confirmed',
    paymentStatus: 'paid',
    total: '₦45,000',
    date: 'Sep 7, 2026',
  },
  {
    id: 'ord-1002',
    orderNumber: '#UD-1002',
    customerName: 'Bilal Yusuf',
    customerEmail: 'bilal@example.com',
    status: 'shipped',
    paymentStatus: 'paid',
    total: '₦28,500',
    date: 'Sep 6, 2026',
  },
  {
    id: 'ord-1003',
    orderNumber: '#UD-1003',
    customerName: 'Dr. Chidi Nwosu',
    customerEmail: 'chidi@example.com',
    status: 'pending',
    paymentStatus: 'pending',
    total: '₦62,000',
    date: 'Sep 5, 2026',
  },
  {
    id: 'ord-1004',
    orderNumber: '#UD-1004',
    customerName: 'Fatima Aliyu',
    customerEmail: 'fatima@example.com',
    status: 'delivered',
    paymentStatus: 'paid',
    total: '₦19,500',
    date: 'Sep 4, 2026',
  },
];

const orderColumns: DataTableColumn<OrderItem>[] = [
  {
    id: 'orderNumber',
    header: 'Order',
    accessorKey: 'orderNumber',
    cell: ({ row }) => (
      <span className="font-mono font-bold text-text-primary hover:text-action-primary cursor-pointer">
        {row.orderNumber}
      </span>
    ),
  },
  {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <div>
        <div className="font-semibold text-text-primary">{row.customerName}</div>
        <div className="text-xs text-text-tertiary">{row.customerEmail}</div>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <OrderStatusBadge status={row.status} size="sm" />,
  },
  {
    id: 'total',
    header: 'Total',
    accessorKey: 'total',
    align: 'right',
    cell: ({ row }) => <span className="font-semibold text-text-primary">{row.total}</span>,
  },
  {
    id: 'date',
    header: 'Date',
    accessorKey: 'date',
    align: 'right',
    cell: ({ row }) => <span className="text-text-tertiary text-xs">{row.date}</span>,
  },
  {
    id: 'actions',
    header: 'Action',
    align: 'right',
    cell: ({ row }) => (
      <button
        type="button"
        className="px-2.5 py-1 rounded-lg bg-bg-subtle hover:bg-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer"
      >
        View →
      </button>
    ),
  },
];

const meta: Meta<typeof DataTable> = {
  title: 'Design System/Organisms/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Canonical DataTable organism adhering to Figma Component Set `52:60334` and Documentation Board `Data Tables` (`52:63775`). Establishes an authoritative, responsive tabular data presentation for backoffice operations across Orders, Customers, Products, and Inventory.',
      },
    },
  },
  argTypes: {
    state: {
      control: 'radio',
      options: ['default', 'loading', 'empty'],
      description: 'Lifecycle state of the table display.',
    },
    density: {
      control: 'radio',
      options: ['default', 'compact'],
      description: 'Vertical row density (Default ~52px vs Compact ~40px).',
    },
    selection: {
      control: 'radio',
      options: ['none', 'single', 'multiple'],
      description: 'Row selection mode.',
    },
    showPagination: {
      control: 'boolean',
      description: 'Whether to render the integrated bottom pagination bar.',
    },
  },
  args: {
    columns: orderColumns as any,
    data: sampleOrders as any,
    state: 'default',
    density: 'default',
    selection: 'none',
    showPagination: true,
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

/**
 * 1. Default Admin Orders Table
 */
export const Default: Story = {
  args: {
    columns: orderColumns as any,
    data: sampleOrders as any,
    state: 'default',
    density: 'default',
    selection: 'none',
    showPagination: true,
    paginationProps: {
      currentPage: 1,
      totalPages: 5,
      totalCount: 48,
      pageSize: 10,
      itemLabel: 'orders',
      onPageChange: fn(),
    },
  },
};

/**
 * 2. Compact Density (Dense Operational Datasets)
 */
export const CompactDensity: Story = {
  args: {
    columns: orderColumns as any,
    data: sampleOrders as any,
    state: 'default',
    density: 'compact',
    selection: 'none',
    showPagination: true,
    paginationProps: {
      currentPage: 1,
      totalPages: 3,
      totalCount: 28,
      pageSize: 10,
      itemLabel: 'orders',
      onPageChange: fn(),
    },
  },
};

/**
 * 3. Multi-Row Selection with Checkbox Column
 */
export const MultiSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(['ord-1002']);
    return (
      <DataTable
        columns={orderColumns}
        data={sampleOrders}
        selection="multiple"
        selectedRowKeys={selected}
        onSelectionChange={setSelected}
        showPagination={true}
        paginationProps={{
          currentPage: 1,
          totalPages: 4,
          totalCount: 36,
          onPageChange: fn(),
        }}
      />
    );
  },
};

/**
 * 4. Single Row Selection
 */
export const SingleSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(['ord-1001']);
    return (
      <DataTable
        columns={orderColumns}
        data={sampleOrders}
        selection="single"
        selectedRowKeys={selected}
        onSelectionChange={setSelected}
        showPagination={false}
      />
    );
  },
};

/**
 * 5. Loading State (Animated Skeleton Rows)
 */
export const LoadingState: Story = {
  args: {
    columns: orderColumns as any,
    data: [] as any,
    state: 'loading',
    density: 'default',
    loadingRowCount: 4,
    showPagination: true,
    paginationProps: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      onPageChange: fn(),
    },
  },
};

/**
 * 6. Empty State (Zero Data Callout)
 */
export const EmptyStateStory: Story = {
  name: 'Empty State',
  args: {
    columns: orderColumns as any,
    data: [] as any,
    state: 'empty',
    emptyTitle: 'No orders yet',
    emptyDescription: 'Orders will appear here once customers start placing them.',
    emptyAction: {
      label: 'Create Manual Order',
      onClick: fn(),
    },
  },
};

/**
 * 7. Interactive Column Sorting
 */
export const SortableColumns: Story = {
  render: () => {
    const [sortCol, setSortCol] = useState<string>('orderNumber');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const sortableCols: DataTableColumn<OrderItem>[] = [
      {
        id: 'orderNumber',
        header: 'Order',
        accessorKey: 'orderNumber',
        sortable: true,
      },
      {
        id: 'customer',
        header: 'Customer',
        accessorKey: 'customerName',
        sortable: true,
      },
      {
        id: 'total',
        header: 'Total',
        accessorKey: 'total',
        align: 'right',
        sortable: true,
      },
      {
        id: 'date',
        header: 'Date',
        accessorKey: 'date',
        align: 'right',
        sortable: true,
      },
    ];

    const sortedData = [...sampleOrders].sort((a, b) => {
      const fieldA = (a as any)[sortCol] ?? '';
      const fieldB = (b as any)[sortCol] ?? '';
      return sortDir === 'asc'
        ? String(fieldA).localeCompare(String(fieldB))
        : String(fieldB).localeCompare(String(fieldA));
    });

    return (
      <DataTable
        columns={sortableCols}
        data={sortedData}
        sortColumn={sortCol}
        sortDirection={sortDir}
        onSort={(col, dir) => {
          setSortCol(col);
          setSortDir(dir);
        }}
      />
    );
  },
};

/**
 * 8. Orders Domain Demo (Figma Section 05)
 */
export const OrdersDomainDemo: Story = {
  args: {
    columns: orderColumns as any,
    data: sampleOrders as any,
    density: 'default',
    selection: 'multiple',
    showPagination: true,
    paginationProps: {
      currentPage: 1,
      totalPages: 5,
      totalCount: 48,
      pageSize: 10,
      itemLabel: 'orders',
      onPageChange: fn(),
    },
  },
};

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  lifetimeValue: string;
  joinedDate: string;
}

const sampleCustomers: CustomerItem[] = [
  {
    id: 'cust-1',
    name: 'Amina Okafor',
    email: 'amina@example.com',
    orderCount: 5,
    lifetimeValue: '₦185,000',
    joinedDate: 'Jan 12, 2026',
  },
  {
    id: 'cust-2',
    name: 'Bilal Yusuf',
    email: 'bilal@example.com',
    orderCount: 3,
    lifetimeValue: '₦94,000',
    joinedDate: 'Mar 3, 2026',
  },
  {
    id: 'cust-3',
    name: 'Dr. Chidi Nwosu',
    email: 'chidi@example.com',
    orderCount: 8,
    lifetimeValue: '₦320,000',
    joinedDate: 'Nov 18, 2025',
  },
];

/**
 * 9. Customers Domain Demo (Figma Section 05)
 */
export const CustomersDomainDemo: Story = {
  render: () => {
    const customerCols: DataTableColumn<CustomerItem>[] = [
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} size="sm" />
            <div>
              <div className="font-semibold text-text-primary">{row.name}</div>
              <div className="text-xs text-text-tertiary">{row.email}</div>
            </div>
          </div>
        ),
      },
      {
        id: 'orders',
        header: 'Orders',
        accessorKey: 'orderCount',
        align: 'center',
        cell: ({ row }) => (
          <span className="font-semibold text-text-primary">{row.orderCount}</span>
        ),
      },
      {
        id: 'ltv',
        header: 'Lifetime Value',
        accessorKey: 'lifetimeValue',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-heading font-bold text-text-primary">{row.lifetimeValue}</span>
        ),
      },
      {
        id: 'joined',
        header: 'Joined',
        accessorKey: 'joinedDate',
        align: 'right',
        cell: ({ row }) => <span className="text-xs text-text-tertiary">{row.joinedDate}</span>,
      },
    ];

    return (
      <DataTable
        columns={customerCols}
        data={sampleCustomers}
        density="default"
        showPagination={true}
        paginationProps={{
          currentPage: 1,
          totalPages: 2,
          totalCount: 16,
          itemLabel: 'customers',
          onPageChange: fn(),
        }}
      />
    );
  },
};

interface ProductItem {
  id: string;
  title: string;
  category: string;
  price: string;
  stock: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const sampleProducts: ProductItem[] = [
  {
    id: 'prod-1',
    title: 'Custom Photo Coloring Book',
    category: 'Coloring Books',
    price: '₦24,500',
    stock: 142,
    stockStatus: 'in_stock',
  },
  {
    id: 'prod-2',
    title: 'Mindful Garden Edition',
    category: 'Coloring Books',
    price: '₦18,000',
    stock: 8,
    stockStatus: 'low_stock',
  },
  {
    id: 'prod-3',
    title: 'Fine-Liner Marker Set (24-Pack)',
    category: 'Stationery',
    price: '₦12,500',
    stock: 0,
    stockStatus: 'out_of_stock',
  },
];

/**
 * 10. Products Domain Demo (Figma Section 05)
 */
export const ProductsDomainDemo: Story = {
  render: () => {
    const productCols: DataTableColumn<ProductItem>[] = [
      {
        id: 'title',
        header: 'Product',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-text-primary">{row.title}</div>
            <div className="text-xs text-text-tertiary">{row.category}</div>
          </div>
        ),
      },
      {
        id: 'price',
        header: 'Price',
        accessorKey: 'price',
        align: 'right',
        cell: ({ row }) => (
          <span className="font-heading font-bold text-text-primary">{row.price}</span>
        ),
      },
      {
        id: 'stock',
        header: 'Stock Status',
        align: 'center',
        cell: ({ row }) => {
          const statusType: 'success' | 'warning' | 'danger' =
            row.stockStatus === 'in_stock'
              ? 'success'
              : row.stockStatus === 'low_stock'
              ? 'warning'
              : 'danger';
          const label =
            row.stockStatus === 'in_stock'
              ? `${row.stock} in stock`
              : row.stockStatus === 'low_stock'
              ? `Low (${row.stock})`
              : 'Out of stock';
          return <Badge variant="status" statusType={statusType} size="sm">{label}</Badge>;
        },
      },
    ];

    return (
      <DataTable
        columns={productCols}
        data={sampleProducts}
        density="compact"
        selection="multiple"
      />
    );
  },
};

/**
 * 11. Interactive Play Test (Sorting, Selection, and Pagination)
 */
export const InteractivePlay: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>([]);
    const [page, setPage] = useState<number>(1);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const testCols: DataTableColumn<OrderItem>[] = [
      {
        id: 'orderNumber',
        header: 'Order',
        accessorKey: 'orderNumber',
        sortable: true,
      },
      {
        id: 'customer',
        header: 'Customer',
        accessorKey: 'customerName',
      },
      {
        id: 'total',
        header: 'Total',
        accessorKey: 'total',
        align: 'right',
      },
    ];

    return (
      <DataTable
        columns={testCols}
        data={sampleOrders}
        selection="multiple"
        selectedRowKeys={selected}
        onSelectionChange={setSelected}
        sortColumn="orderNumber"
        sortDirection={sortDirection}
        onSort={(_, dir) => setSortDirection(dir)}
        showPagination={true}
        paginationProps={{
          currentPage: page,
          totalPages: 3,
          totalCount: 30,
          pageSize: 10,
          itemLabel: 'orders',
          onPageChange: setPage,
        }}
        data-testid="interactive-data-table"
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify Table and Table Headers Exist
    const table = canvas.getByTestId('interactive-data-table-table');
    await expect(table).toBeInTheDocument();

    const orderHeader = canvas.getByTestId('interactive-data-table-col-header-orderNumber');
    await expect(orderHeader).toBeInTheDocument();
    await expect(orderHeader).toHaveTextContent('Order');

    // 2. Test Select All Interaction
    const selectAllCheckbox = canvas.getByTestId('interactive-data-table-select-all');
    await expect(selectAllCheckbox).toBeInTheDocument();
    await userEvent.click(selectAllCheckbox);

    // Verify all row checkboxes become checked
    const row0 = canvas.getByTestId('interactive-data-table-row-0');
    await expect(row0).toHaveAttribute('aria-selected', 'true');

    // 3. Test Individual Row Deselection
    const row0Checkbox = canvas.getByTestId('interactive-data-table-row-checkbox-0');
    await userEvent.click(row0Checkbox);
    await expect(row0).toHaveAttribute('aria-selected', 'false');

    // 4. Test Column Sort Interaction
    const sortBtn = within(orderHeader).getByRole('button');
    await expect(sortBtn).toBeInTheDocument();
    await userEvent.click(sortBtn);

    // 5. Test Pagination Footer & Next Page Click
    const paginationInfo = canvas.getByTestId('interactive-data-table-pagination-info');
    await expect(paginationInfo).toBeInTheDocument();
    await expect(paginationInfo).toHaveTextContent('Showing 1 to 10 of 30 orders');

    const nextBtn = canvas.getByTestId('pagination-next');
    await userEvent.click(nextBtn);
    await expect(paginationInfo).toHaveTextContent('Showing 11 to 20 of 30 orders');
  },
};

/**
 * 12. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    columns: orderColumns as any,
    data: sampleOrders.slice(0, 2) as any,
    'data-testid': 'css-check-data-table',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const container = canvas.getByTestId('css-check-data-table');
    await expect(container).toBeInTheDocument();

    const style = window.getComputedStyle(container);

    // 1. Verify 16px radius (rounded-2xl)
    await expect(style.borderRadius).toMatch(/16px/);

    // 2. Verify Background surface (#FFFFFF / rgb(255, 255, 255))
    await expect(style.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);

    // 3. Verify Border Default (#EDF3F7 / rgb(237, 243, 247))
    await expect(style.borderColor).toMatch(/rgb\(237,\s*243,\s*247\)/);
  },
};
