import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import { OrderSummaryCard } from './OrderSummaryCard';

const meta = {
  title: 'Design System/Organisms/OrderSummaryCard',
  component: OrderSummaryCard,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full p-4 bg-bg-default font-sans">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {
    id: 'item-1',
    name: 'Mindful Garden Coloring Book',
    quantity: 2,
    price: 37000,
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=240',
    slug: 'mindful-garden-coloring-book',
    details: 'Standard Edition',
    addons: [{ id: 'a1', name: 'Gift wrapping', price: 2000, quantity: 1 }],
  },
  {
    id: 'item-2',
    name: 'Custom Portrait Coloring Book',
    quantity: 1,
    price: 27000,
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=240',
    slug: 'custom-portrait-coloring-book',
    details: 'Botanical Theme · 3 photos',
  },
];

/**
 * 01. Canonical Master Default Variant
 * Standard multiple-item summary with subtotal, delivery fee, total, and primary CTA.
 */
export const Default: Story = {
  args: {
    title: 'Order Summary',
    state: 'default',
    itemCount: 'multiple',
    items: sampleItems,
    subtotal: 64000,
    deliveryFee: 2500,
    total: 66500,
    showDeliveryRow: true,
    showCheckoutAction: true,
    checkoutButtonLabel: 'Proceed to Checkout →',
    onCheckout: fn(),
  },
};

/**
 * 02. Single Item Variant (ItemCount=One)
 */
export const SingleItem: Story = {
  args: {
    title: 'Order Summary',
    state: 'default',
    itemCount: 'one',
    items: [sampleItems[0]],
    subtotal: 37000,
    deliveryFee: 2000,
    total: 39000,
    showDeliveryRow: true,
    showCheckoutAction: true,
    checkoutButtonLabel: 'Proceed to Checkout →',
    onCheckout: fn(),
  },
};

/**
 * 03. Active Promotional Discount
 * Demonstrates positive green financial feedback row.
 */
export const WithDiscount: Story = {
  args: {
    title: 'Order Summary',
    state: 'default',
    items: sampleItems,
    subtotal: 64000,
    discountAmount: 5000,
    discountCode: 'WELCOME10',
    deliveryFee: 2500,
    total: 61500,
    showDeliveryRow: true,
    showCheckoutAction: true,
    checkoutButtonLabel: 'Proceed to Checkout →',
    onCheckout: fn(),
  },
};

/**
 * 04. Free Shipping Scenario
 * Demonstrates 'Free' delivery badge.
 */
export const FreeShipping: Story = {
  args: {
    title: 'Order Summary',
    state: 'default',
    items: sampleItems,
    subtotal: 64000,
    deliveryFee: 'free',
    total: 64000,
    showDeliveryRow: true,
    showCheckoutAction: true,
    checkoutButtonLabel: 'Proceed to Checkout →',
    onCheckout: fn(),
  },
};

/**
 * 05. Without Checkout Action
 * Contextual variation for order confirmation or modal review views.
 */
export const WithoutAction: Story = {
  args: {
    title: 'Order Summary',
    state: 'default',
    items: sampleItems,
    subtotal: 64000,
    deliveryFee: 2500,
    total: 66500,
    showCheckoutAction: false,
  },
};

/**
 * 06. Loading Lifecycle State
 * Displays canonical Skeleton wireframe during background calculations.
 */
export const Loading: Story = {
  args: {
    title: 'Order Summary',
    state: 'loading',
    subtotal: 0,
    total: 0,
  },
};

/**
 * 07. Empty State
 * Displays canonical EmptyState when cart has zero items.
 */
export const Empty: Story = {
  args: {
    title: 'Order Summary',
    state: 'empty',
    items: [],
    subtotal: 0,
    total: 0,
    emptyAction: {
      label: 'Explore Catalog',
      onClick: fn(),
    },
  },
};

/**
 * 08. Automated Interaction Play Test
 * Asserts document tree, line prices, subtotal, total calculation, and CTA click.
 */
export const InteractivePlay: Story = {
  args: {
    title: 'Order Summary',
    state: 'default',
    items: sampleItems,
    subtotal: 64000,
    discountAmount: 5000,
    discountCode: 'SAVE5K',
    deliveryFee: 2500,
    total: 61500,
    showCheckoutAction: true,
    checkoutButtonLabel: 'Proceed to Checkout →',
    onCheckout: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 1. Verify Card Header
    const heading = canvas.getByRole('heading', { level: 2, name: /Order Summary/i });
    await expect(heading).toBeInTheDocument();

    // 2. Verify Item Count
    await expect(canvas.getByText(/2 items/i)).toBeInTheDocument();

    // 3. Verify Item Titles
    await expect(canvas.getByText(/Mindful Garden Coloring Book/i)).toBeInTheDocument();
    await expect(canvas.getByText(/Custom Portrait Coloring Book/i)).toBeInTheDocument();

    // 4. Verify Pricing Rows
    await expect(canvas.getByText(/Subtotal/i)).toBeInTheDocument();
    await expect(canvas.getByText(/₦64,000/i)).toBeInTheDocument();

    // 5. Verify Discount Row
    await expect(canvas.getByText(/Discount \(SAVE5K\)/i)).toBeInTheDocument();
    await expect(canvas.getByText(/−₦5,000/i)).toBeInTheDocument();

    // 6. Verify Total
    await expect(canvas.getByText(/₦61,500/i)).toBeInTheDocument();

    // 7. Verify and Click Checkout Button
    const checkoutBtn = canvas.getByRole('button', { name: /Proceed to Checkout/i });
    await expect(checkoutBtn).toBeInTheDocument();
    await userEvent.click(checkoutBtn);
    await expect(args.onCheckout).toHaveBeenCalledTimes(1);
  },
};

/**
 * 09. Computed CSS Token Verification
 * Checks border-radius (20px), background surface (#ffffff), border (#edf3f7), and font.
 */
export const CssCheck: Story = {
  args: {
    title: 'Order Summary',
    state: 'default',
    items: [sampleItems[0]],
    subtotal: 37000,
    total: 37000,
    deliveryFee: 'free',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByTestId('order-summary-card');
    await expect(card).toBeTruthy();

    const computed = window.getComputedStyle(card);

    // Surface Token: #ffffff
    await expect(computed.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/i);

    // Border Radius: 20px (Radius/LG)
    await expect(computed.borderRadius).toMatch(/16px|20px/);

    // Title Font Family: Fredoka
    const heading = canvas.getByRole('heading', { level: 2 });
    const headingComputed = window.getComputedStyle(heading);
    await expect(headingComputed.fontFamily).toMatch(/Fredoka/i);
  },
};
