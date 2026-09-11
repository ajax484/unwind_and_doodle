import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Design System/Molecules/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Canonical Breadcrumbs navigation molecule adhering to Figma Component Set `52:56481` and Documentation Board `52:56482` "Breadcrumbs". Establishes an accessible, responsive hierarchy indicator for storefront navigation and administrative workflows.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Physical size variant (MD 14px storefront default, SM 12px admin/compact).',
    },
    showHome: {
      control: 'boolean',
      description: 'Whether to lead with an accessible Home icon.',
    },
    maxItems: {
      control: 'number',
      description: 'Maximum visible items before intermediate ancestors collapse to "…".',
    },
    onExpandMiddle: { action: 'expanded' },
  },
  args: {
    onExpandMiddle: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

const sampleStorefrontItems: BreadcrumbItem[] = [
  { label: 'Coloring Books', href: '/products?category=coloring-books' },
  { label: 'Mindful Collection', href: '/products?theme=mindful' },
  { label: 'Custom Photo Coloring Book', isCurrent: true },
];

/**
 * 1. Default Storefront Trail (MD, Home Visible, 3 Levels)
 */
export const Default: Story = {
  args: {
    items: sampleStorefrontItems,
    size: 'md',
    showHome: true,
  },
};

/**
 * 2. Small Size (SM, Admin / Dense Workflow)
 */
export const SmallSize: Story = {
  args: {
    items: [
      { label: 'Admin', href: '/admin' },
      { label: 'Orders', href: '/admin/orders' },
      { label: 'Order #UD-8421', isCurrent: true },
    ],
    size: 'sm',
    showHome: false,
  },
};

/**
 * 3. Without Home Icon (Text-Only Trail)
 */
export const WithoutHome: Story = {
  args: {
    items: sampleStorefrontItems,
    size: 'md',
    showHome: false,
  },
};

/**
 * 4. Middle Truncated Trail (Collapsed Intermediate Ancestors)
 */
export const MiddleTruncated: Story = {
  args: {
    items: [
      { label: 'Collections', href: '/collections' },
      { label: 'Keepsakes', href: '/collections/keepsakes' },
      { label: 'Personalized Editions', href: '/collections/personalized' },
      { label: 'Custom Starter Bundle', isCurrent: true },
    ],
    size: 'md',
    showHome: true,
    maxItems: 3,
  },
};

/**
 * 5. Disabled Item in Trail
 */
export const DisabledItem: Story = {
  args: {
    items: [
      { label: 'Catalog', href: '/catalog' },
      { label: 'Archived Series', disabled: true },
      { label: 'Vintage Botanicals', isCurrent: true },
    ],
    size: 'md',
    showHome: true,
  },
};

/**
 * 6. Custom Slash Separator
 */
export const CustomSeparator: Story = {
  args: {
    items: sampleStorefrontItems,
    size: 'md',
    showHome: true,
    separator: <span className="text-text-tertiary select-none font-bold text-xs">/</span>,
  },
};

/**
 * 7. Product Detail Page Context (Figma Section 05 Demo)
 */
export const ProductDetailPage: Story = {
  render: () => (
    <div className="p-4 bg-bg-surface border border-border-default rounded-2xl shadow-xs space-y-4 max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Coloring Books', href: '/products?category=coloring-books' },
          { label: 'Custom Coloring Book', isCurrent: true },
        ]}
        size="md"
        showHome={true}
      />
      <h2 className="font-heading font-bold text-2xl text-text-primary">
        Custom Photo Coloring Book
      </h2>
      <p className="text-sm text-text-secondary">
        Transform your cherished memories into hand-drawn mindful coloring pages.
      </p>
    </div>
  ),
};

/**
 * 8. Admin Order Fulfillment Context (Figma Section 05 Demo)
 */
export const AdminOrderFulfillment: Story = {
  render: () => (
    <div className="p-4 bg-bg-subtle border border-border-default rounded-xl space-y-3 max-w-xl">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Orders', href: '/admin/orders' },
          { label: 'Order #UD-1048', isCurrent: true },
        ]}
        size="sm"
        showHome={false}
      />
      <div className="flex items-center justify-between">
        <h3 className="font-mono font-bold text-lg text-text-primary">
          Order #UD-1048
        </h3>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-status-warning-bg text-status-warning-text border border-status-warning-accent/30">
          In Production
        </span>
      </div>
    </div>
  ),
};

/**
 * 9. Deep Hierarchy (5 Levels with Dynamic Truncation)
 */
export const DeepHierarchy: Story = {
  args: {
    items: [
      { label: 'Storefront', href: '/' },
      { label: 'Collections', href: '/collections' },
      { label: 'Mindful', href: '/collections/mindful' },
      { label: 'Coloring Books', href: '/collections/mindful/books' },
      { label: 'Botanical Edition', isCurrent: true },
    ],
    size: 'md',
    showHome: true,
    maxItems: 3,
  },
};

/**
 * 10. Interactive Play Test (Navigation, Ellipsis Expansion, and ARIA Semantics)
 */
export const InteractivePlay: Story = {
  args: {
    items: [
      { label: 'Catalog', href: '/catalog' },
      { label: 'Category', href: '/category' },
      { label: 'Subcategory', href: '/subcategory' },
      { label: 'Active Leaf', isCurrent: true },
    ],
    size: 'md',
    showHome: true,
    maxItems: 3,
    'data-testid': 'interactive-breadcrumbs',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const nav = canvas.getByTestId('interactive-breadcrumbs');
    await expect(nav).toBeInTheDocument();
    await expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');

    // 1. Verify active leaf element has aria-current="page"
    const current = canvas.getByTestId('interactive-breadcrumbs-current-item');
    await expect(current).toBeInTheDocument();
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(current).toHaveTextContent('Active Leaf');

    // 2. Verify middle-truncated ellipsis button is visible initially
    const ellipsisBtn = canvas.getByTestId('interactive-breadcrumbs-ellipsis-btn');
    await expect(ellipsisBtn).toBeInTheDocument();
    await expect(ellipsisBtn).toHaveAttribute('aria-label', 'Show all breadcrumbs');

    // 3. Click ellipsis button to expand all intermediate items
    await userEvent.click(ellipsisBtn);
    await expect(args.onExpandMiddle).toHaveBeenCalledTimes(1);

    // 4. Verify all items are now visible and ellipsis is gone
    await expect(canvas.queryByTestId('interactive-breadcrumbs-ellipsis-btn')).not.toBeInTheDocument();
    await expect(canvas.getByText('Category')).toBeInTheDocument();
    await expect(canvas.getByText('Subcategory')).toBeInTheDocument();
  },
};

/**
 * 11. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    items: sampleStorefrontItems,
    size: 'md',
    showHome: true,
    'data-testid': 'css-check-breadcrumbs',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify Nav typography inherits Body/Small (14px)
    const nav = canvas.getByTestId('css-check-breadcrumbs');
    await expect(nav).toBeInTheDocument();
    const navStyle = window.getComputedStyle(nav);
    await expect(navStyle.fontSize).toMatch(/14px/);

    // 2. Verify Current Item has primary text color (rgb(36, 51, 66) / #243342)
    const current = canvas.getByTestId('css-check-breadcrumbs-current-item');
    await expect(current).toBeInTheDocument();
    const currentStyle = window.getComputedStyle(current);
    await expect(currentStyle.fontWeight).toMatch(/600|700|bold/);
    await expect(currentStyle.color).toMatch(/rgb\(36,\s*51,\s*66\)/);
  },
};
