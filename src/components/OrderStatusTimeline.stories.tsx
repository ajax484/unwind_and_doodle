import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import React from 'react';
import OrderStatusTimeline, { OrderStatusHistoryItem } from './OrderStatusTimeline';

const sampleHistory: OrderStatusHistoryItem[] = [
  { status: 'created', note: 'Order placed via online storefront', createdAt: '2026-09-02T09:30:00Z' },
  { status: 'pending', note: 'Payment verified via Paystack', createdAt: '2026-09-02T09:45:00Z' },
  { status: 'confirmed', note: 'Packing & preparing at Lagos Hub', createdAt: '2026-09-03T08:15:00Z' },
];

const meta = {
  title: 'Design System/Molecules/OrderStatusTimeline',
  component: OrderStatusTimeline,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical OrderStatusTimeline molecule conforming directly to Figma design system specifications (`43:42961` and `43:46692`). Supports 5 fulfillment stages (Created, Pending, Confirmed, Shipped, Delivered) across Horizontal ribbons and Vertical steppers in SM and MD sizes, integrated alert banners, and accessible indicators.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[420px] sm:w-[560px] max-w-full p-2">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    status: {
      control: 'select',
      options: ['created', 'pending', 'confirmed', 'shipped', 'received', 'cancelled', 'refunded'],
      description: 'Order progression lifecycle state.',
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Timeline layout direction (Horizontal ribbon vs Vertical stepper).',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
      description: 'Scale variant: SM (26px indicators) vs MD (32px indicators).',
    },
    showAlertBanner: {
      control: 'boolean',
      description: 'Controls visibility of integrated status alert banner.',
    },
    showCardTitle: {
      control: 'boolean',
      description: 'Toggles card heading title.',
    },
  },
  args: {
    status: 'confirmed',
    orientation: 'horizontal',
    size: 'md',
    showCardTitle: true,
    history: sampleHistory,
  },
} satisfies Meta<typeof OrderStatusTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default Canonical Variant
 * Baseline canonical horizontal presentation adhering to Figma master variant Status=Confirmed, Orientation=Horizontal, Size=MD.
 */
export const Default: Story = {
  args: {},
};

/**
 * 02. Vertical Stepper Mode
 * Mobile and sidebar vertical stepper with left indicator column and continuous connecting line boxes.
 */
export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
};

/**
 * 03. Alternative Scale (Compact SM Scale)
 * Compact scale variant with 26px indicators and 2px connecting line segments.
 */
export const AlternativeMode: Story = {
  args: {
    size: 'sm',
    status: 'shipped',
  },
};

/**
 * 04. With Alert Banner
 * Active order with top integrated status banner for real-time tracking information.
 */
export const WithAlertBanner: Story = {
  args: {
    showAlertBanner: true,
    status: 'confirmed',
    bannerTitle: 'Fulfillment in progress',
    bannerDescription: 'Dispatched and tracked via Lagos fulfillment hub.',
  },
};

/**
 * 05. Initial Step (Created / Placed)
 * Stage 1 baseline state when an order is newly submitted.
 */
export const Created: Story = {
  args: {
    status: 'created',
    history: [sampleHistory[0]],
  },
};

/**
 * 06. In-Transit Step (Shipped)
 * Stage 4 progression with courier dispatch details.
 */
export const Shipped: Story = {
  args: {
    status: 'shipped',
    history: [
      ...sampleHistory,
      { status: 'shipped', note: 'Handed over to courier', createdAt: '2026-09-04T11:00:00Z' },
    ],
  },
};

/**
 * 07. Completed Step (Delivered)
 * Stage 5 completed fulfillment with success banner and all completed checkmarks.
 */
export const Delivered: Story = {
  args: {
    status: 'received',
    showAlertBanner: true,
    history: [
      ...sampleHistory,
      { status: 'shipped', note: 'Handed over to courier', createdAt: '2026-09-04T11:00:00Z' },
      { status: 'received', note: 'Signed and delivered to customer', createdAt: '2026-09-05T14:30:00Z' },
    ],
  },
};

/**
 * 08. Exception State: Cancelled
 * Exception management view with danger alert banner and halted indicator.
 */
export const Cancelled: Story = {
  args: {
    status: 'cancelled',
    showAlertBanner: true,
    history: [
      sampleHistory[0],
      sampleHistory[1],
      { status: 'cancelled', note: 'Order cancelled by customer request', createdAt: '2026-09-03T10:00:00Z' },
    ],
  },
};

/**
 * 09. Exception State: Refunded
 * Exception management view with refund confirmation banner and preserved progression history.
 */
export const Refunded: Story = {
  args: {
    status: 'refunded',
    showAlertBanner: true,
    history: [
      sampleHistory[0],
      sampleHistory[1],
      { status: 'refunded', note: 'Paystack refund processed to original card', createdAt: '2026-09-03T12:00:00Z' },
    ],
  },
};

/**
 * 10. Interactive Play Test
 * Automated verification of step indicators, accessibility labels, and timeline rendering.
 */
export const InteractivePlay: Story = {
  args: {
    status: 'confirmed',
    showAlertBanner: true,
    history: sampleHistory,
  },
  play: async ({ canvasElement }) => {
    // 1. Settle mount timers
    await new Promise((r) => setTimeout(r, 100));

    const canvas = within(canvasElement);

    // Verify all 5 canonical step labels are present
    expect(canvas.getByText('Created')).toBeInTheDocument();
    expect(canvas.getByText('Pending')).toBeInTheDocument();
    expect(canvas.getByText('Confirmed')).toBeInTheDocument();
    expect(canvas.getByText('Shipped')).toBeInTheDocument();
    expect(canvas.getByText('Delivered')).toBeInTheDocument();

    // Verify current step indicator accessible label
    const currentIndicator = canvas.getByLabelText(/Confirmed: Current/i);
    expect(currentIndicator).toBeInTheDocument();

    // Verify alert banner is rendered with role="alert"
    const alert = canvas.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(within(alert).getByText(/Fulfillment in progress/i)).toBeInTheDocument();
  },
};

/**
 * 11. CSS Token Verification
 * Asserts computed styles adhere strictly to canonical design tokens without arbitrary fallbacks.
 */
export const CssCheck: Story = {
  args: {
    'data-testid': 'css-check-order-status-timeline',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByTestId('css-check-order-status-timeline');
    expect(container).toBeInTheDocument();

    const computed = window.getComputedStyle(container);

    // Surface token: #FFFFFF
    expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');

    // Border token: #EDF3F7
    expect(computed.borderColor).toBe('rgb(237, 243, 247)');

    // Radius: 24px
    expect(computed.borderRadius).toBe('24px');
  },
};
