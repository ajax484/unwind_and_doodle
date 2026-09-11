import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import React from 'react';
import OrderStatusBadge from './OrderStatusBadge';

const meta = {
  title: 'Design System/Molecules/OrderStatusBadge',
  component: OrderStatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical administrative status badge molecule adhering directly to Figma Component Set `52:102317` (40 production variants) and Documentation Board `52:102318` on the `Components` page. Composes the foundational `<Badge>` atom primitive, differentiating Order fulfillment workflows from Payment gateway settlement lifecycle states using standardized semantic status design tokens.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'radio',
      options: ['order', 'payment'],
      description: 'Lifecycle context distinguishing Order fulfillment from Payment settlement.',
    },
    status: {
      control: 'select',
      options: [
        'created',
        'pending',
        'confirmed',
        'shipped',
        'delivered',
        'cancelled',
        'successful',
        'failed',
        'refunded',
      ],
      description: 'Operational status value from database schema.',
    },
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Badge sizing scale (MD 28px height vs SM 24px height).',
    },
    icon: {
      control: 'radio',
      options: ['leading', 'none', 'dot'],
      description: 'Icon presentation mode (semantic SVG icon, optical dot, or none).',
    },
    dot: {
      control: 'boolean',
      description: 'Optical indicator dot fallback override.',
    },
    pulse: {
      control: 'boolean',
      description: 'Attention-grabbing subtle breathing pulse animation.',
    },
    label: {
      control: 'text',
      description: 'Optional custom status text label.',
    },
  },
  args: {
    type: 'order',
    status: 'created',
    size: 'md',
    icon: 'leading',
  },
} satisfies Meta<typeof OrderStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default Canonical Variant
 * Baseline canonical presentation adhering to Figma master variant (Type=Order, Status=Created, Size=MD, Icon=Leading).
 */
export const Default: Story = {
  args: {
    type: 'order',
    status: 'created',
    size: 'md',
    icon: 'leading',
  },
};

/**
 * 02. Order Fulfillment Status Matrix
 * Section 02 from Figma documentation: all six operational order states (Created, Pending, Confirmed, Shipped, Delivered, Cancelled).
 */
export const OrderStatusesMatrix: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-bg-surface rounded-2xl border border-border-default">
      <OrderStatusBadge type="order" status="created" size="md" />
      <OrderStatusBadge type="order" status="pending" size="md" />
      <OrderStatusBadge type="order" status="confirmed" size="md" />
      <OrderStatusBadge type="order" status="shipped" size="md" />
      <OrderStatusBadge type="order" status="delivered" size="md" />
      <OrderStatusBadge type="order" status="cancelled" size="md" />
    </div>
  ),
};

/**
 * 03. Payment Settlement Status Matrix
 * Section 03 from Figma documentation: all four payment gateway settlement states (Successful, Pending, Failed, Refunded).
 */
export const PaymentStatusesMatrix: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-bg-surface rounded-2xl border border-border-default">
      <OrderStatusBadge type="payment" status="successful" size="md" />
      <OrderStatusBadge type="payment" status="pending" size="md" />
      <OrderStatusBadge type="payment" status="failed" size="md" />
      <OrderStatusBadge type="payment" status="refunded" size="md" />
    </div>
  ),
};

/**
 * 04. Size Scale Comparison
 * Demonstrating Standard MD (28px) vs Compact SM (24px) for dense administrative tables.
 */
export const SizeComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4 bg-bg-surface rounded-2xl border border-border-default">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-text-secondary w-16">MD (28px):</span>
        <OrderStatusBadge type="order" status="confirmed" size="md" />
        <OrderStatusBadge type="payment" status="successful" size="md" />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-text-secondary w-16">SM (24px):</span>
        <OrderStatusBadge type="order" status="confirmed" size="sm" />
        <OrderStatusBadge type="payment" status="successful" size="sm" />
      </div>
    </div>
  ),
};

/**
 * 05. Text-Only Presentation (Icon=None)
 * Section 04 from Figma documentation: proves accessible text label communicates status independently of iconography.
 */
export const IconNone: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-bg-surface rounded-2xl border border-border-default">
      <OrderStatusBadge type="order" status="created" icon="none" />
      <OrderStatusBadge type="order" status="pending" icon="none" />
      <OrderStatusBadge type="order" status="confirmed" icon="none" />
      <OrderStatusBadge type="order" status="shipped" icon="none" />
      <OrderStatusBadge type="payment" status="successful" icon="none" />
      <OrderStatusBadge type="payment" status="failed" icon="none" />
    </div>
  ),
};

/**
 * 06. Optical Dot Presentation (Icon=Dot)
 * Demonstrates the subtle optical indicator dot presentation.
 */
export const DotIndicator: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-bg-surface rounded-2xl border border-border-default">
      <OrderStatusBadge type="order" status="created" icon="dot" />
      <OrderStatusBadge type="order" status="pending" icon="dot" />
      <OrderStatusBadge type="order" status="confirmed" icon="dot" />
      <OrderStatusBadge type="order" status="shipped" icon="dot" />
      <OrderStatusBadge type="payment" status="successful" icon="dot" />
      <OrderStatusBadge type="payment" status="failed" icon="dot" />
    </div>
  ),
};

/**
 * 07. Context Distinction: Order vs Payment Pending
 * Section 05 from Figma documentation: side-by-side comparison reinforcing distinct operational meaning.
 */
export const OrderVsPaymentPending: Story = {
  render: () => (
    <div className="flex flex-col sm:flex-row gap-6 p-5 bg-bg-surface rounded-2xl border border-border-default max-w-lg">
      <div className="space-y-2 flex-1">
        <span className="text-xs font-semibold text-text-primary uppercase tracking-wider block">
          Order Fulfillment
        </span>
        <OrderStatusBadge type="order" status="pending" size="md" />
        <p className="text-xs text-text-tertiary">
          Awaiting manual review, warehouse packing, or customer customization confirmation.
        </p>
      </div>
      <div className="space-y-2 flex-1 border-t sm:border-t-0 sm:border-l border-border-default pt-4 sm:pt-0 sm:pl-6">
        <span className="text-xs font-semibold text-text-primary uppercase tracking-wider block">
          Payment Gateway
        </span>
        <OrderStatusBadge type="payment" status="pending" size="md" />
        <p className="text-xs text-text-tertiary">
          Awaiting Paystack financial transaction settlement or webhook response.
        </p>
      </div>
    </div>
  ),
};

/**
 * 08. Authentic Admin Orders Table Simulation
 * Section 06 from Figma documentation: realistic administrative table rows demonstrating dual badge placement.
 */
export const AdminOrdersTableScenario: Story = {
  render: () => (
    <div className="w-full max-w-2xl bg-bg-surface rounded-2xl border border-border-default shadow-xs overflow-hidden">
      <div className="bg-bg-subtle px-4 py-3 border-b border-border-default grid grid-cols-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
        <span>Order</span>
        <span>Customer</span>
        <span>Fulfillment</span>
        <span>Payment</span>
      </div>
      <div className="divide-y divide-border-default text-xs text-text-primary font-body">
        <div className="px-4 py-3.5 grid grid-cols-4 items-center">
          <span className="font-semibold text-action-secondary-text">#UD-1042</span>
          <span>Amara O.</span>
          <div>
            <OrderStatusBadge type="order" status="pending" size="sm" />
          </div>
          <div>
            <OrderStatusBadge type="payment" status="successful" size="sm" />
          </div>
        </div>
        <div className="px-4 py-3.5 grid grid-cols-4 items-center">
          <span className="font-semibold text-action-secondary-text">#UD-1043</span>
          <span>Chidi E.</span>
          <div>
            <OrderStatusBadge type="order" status="confirmed" size="sm" />
          </div>
          <div>
            <OrderStatusBadge type="payment" status="successful" size="sm" />
          </div>
        </div>
        <div className="px-4 py-3.5 grid grid-cols-4 items-center">
          <span className="font-semibold text-action-secondary-text">#UD-1044</span>
          <span>Fatima B.</span>
          <div>
            <OrderStatusBadge type="order" status="shipped" size="sm" />
          </div>
          <div>
            <OrderStatusBadge type="payment" status="successful" size="sm" />
          </div>
        </div>
        <div className="px-4 py-3.5 grid grid-cols-4 items-center">
          <span className="font-semibold text-action-secondary-text">#UD-1045</span>
          <span>Tunde A.</span>
          <div>
            <OrderStatusBadge type="order" status="cancelled" size="sm" />
          </div>
          <div>
            <OrderStatusBadge type="payment" status="failed" size="sm" />
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * 09. Interactive Play Test
 * Automated verification of badge DOM elements, accessible naming, and status attributes.
 */
export const InteractivePlay: Story = {
  args: {
    type: 'order',
    status: 'confirmed',
    size: 'md',
    icon: 'leading',
    'data-testid': 'play-order-status-badge',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const badge = canvas.getByTestId('play-order-status-badge');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveTextContent('Confirmed');

    // Verify SVG icon exists
    const svgIcon = badge.querySelector('svg');
    await expect(svgIcon).not.toBeNull();
  },
};

/**
 * 10. CSS Token Verification
 * Asserts computed colors and typography adhere strictly to canonical design tokens without arbitrary hex values.
 */
export const CssCheck: Story = {
  args: {
    type: 'order',
    status: 'confirmed',
    size: 'md',
    icon: 'leading',
    'data-testid': 'css-check-order-badge',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByTestId('css-check-order-badge');
    await expect(badge).toBeInTheDocument();

    const computed = window.getComputedStyle(badge);

    // Verify Success Status background token: #EBF8F2 -> rgb(235, 248, 242)
    await expect(computed.backgroundColor).toMatch(/rgb\(235,\s*248,\s*242\)/);

    // Verify Success Status text token: #1F7A4D -> rgb(31, 122, 77)
    await expect(computed.color).toMatch(/rgb\(31,\s*122,\s*77\)/);
  },
};
