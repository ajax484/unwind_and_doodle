import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import { CartItemRow } from './CartItemRow';

const meta = {
  title: 'Design System/Molecules/CartItemRow',
  component: CartItemRow,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] sm:w-[420px] py-4">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    state: {
      control: 'radio',
      options: ['default', 'disabled'],
      description: 'Interaction state: default active vs disabled/muted',
    },
    quantityMode: {
      control: 'radio',
      options: ['editable', 'static'],
      description: 'Quantity controls: interactive stepper vs static label',
    },
    showRemove: {
      control: 'boolean',
      description: 'Whether remove action button is displayed',
    },
    showAddons: {
      control: 'boolean',
      description: 'Whether companion add-ons are displayed',
    },
    price: {
      control: 'number',
      description: 'Total line item price in minor currency units',
    },
    quantity: {
      control: 'number',
      description: 'Item quantity count',
    },
    isAvailable: {
      control: 'boolean',
      description: 'Whether product is currently available in stock',
    },
    isUpdating: {
      control: 'boolean',
      description: 'Loading flag during asynchronous cart mutation',
    },
  },
  args: {
    id: 'cart-item-1',
    name: 'Mindful Garden Coloring Book',
    slug: 'mindful-garden-coloring-book',
    image:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=240',
    price: 18500,
    unitPrice: 18500,
    quantity: 1,
    state: 'default',
    quantityMode: 'editable',
    showRemove: true,
    showAddons: true,
    isAvailable: true,
    isUpdating: false,
    addons: [
      { id: 'addon-1', name: 'Gift wrapping', price: 2000, quantity: 1 },
      { id: 'addon-2', name: 'Personalized gift card', price: 1000, quantity: 1 },
    ],
  },
} satisfies Meta<typeof CartItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Canonical Master Default Variant
 * Full interactive row with 80x80 thumbnail, line price, add-on breakdown, quantity stepper, and remove action.
 */
export const Default: Story = {
  args: {
    state: 'default',
    quantityMode: 'editable',
    showAddons: true,
    showRemove: true,
  },
};

/**
 * 02. Canonical Disabled State
 * Muted surface and disabled action controls for locked or archived cart items.
 */
export const Disabled: Story = {
  args: {
    state: 'disabled',
    price: 18500,
  },
};

/**
 * 03. Without Add-ons
 * Clean cart item without companion add-on accessories.
 */
export const WithoutAddons: Story = {
  args: {
    addons: [],
    showAddons: false,
    name: 'Botanical Fine Liner 24-Pen Collection',
    price: 12000,
    unitPrice: 12000,
  },
};

/**
 * 04. Static Quantity Mode
 * Non-interactive quantity label ('Qty 2') for checkout order reviews and invoices.
 */
export const StaticQuantity: Story = {
  args: {
    quantityMode: 'static',
    quantity: 2,
    price: 37000,
    showRemove: false,
  },
};

/**
 * 05. Without Remove Action
 * Locked cart item row where item deletion is restricted.
 */
export const WithoutRemove: Story = {
  args: {
    showRemove: false,
  },
};

/**
 * 06. With Photo Customization Details
 * Personalized keepsake item showcasing attached customer photo count and dedicated note.
 */
export const WithCustomization: Story = {
  args: {
    name: 'Custom Portrait Keepsake Coloring Album',
    price: 28000,
    unitPrice: 28000,
    customizationDetails: (
      <div className="p-2.5 rounded-lg bg-bg-accent/60 border border-border-default/60 space-y-1 text-xs text-text-secondary">
        <div className="flex items-center justify-between font-semibold text-text-primary">
          <span className="flex items-center gap-1">✨ Custom Photo Edition</span>
          <span className="text-[11px] text-action-primary">2 photos attached</span>
        </div>
        <p className="text-[11px] italic text-text-secondary">"For Amara's 30th Birthday keepsake"</p>
      </div>
    ),
  },
};

/**
 * 07. With Coloring Book Theme Customization
 * Displays selected theme curation chips and custom printed cover title.
 */
export const WithThemeCustomization: Story = {
  args: {
    name: 'Custom Mindful Coloring Album',
    price: 22000,
    unitPrice: 22000,
    themeDetails: (
      <div className="p-2.5 rounded-lg bg-bg-accent/70 border border-brand-rose/20 space-y-1 text-xs text-text-secondary">
        <div>
          <span className="font-heading font-semibold text-text-primary">Themes:</span>{' '}
          <span className="font-medium text-text-primary">Floral Garden · Ocean Waves · Midnight Forest</span>
        </div>
        <div>
          <span className="font-heading font-semibold text-text-primary">Cover:</span>{' '}
          <span className="font-medium text-text-primary">Kemi's Creative Journey</span>
        </div>
      </div>
    ),
  },
};

/**
 * 08. Multi-Product Bundle Kit
 * Displays component items breakdown included within the multi-pack.
 */
export const BundleItem: Story = {
  args: {
    name: 'Ultimate Mindful Art & Relaxation Kit',
    price: 45000,
    unitPrice: 45000,
    bundleDetails: (
      <div className="p-2.5 rounded-lg bg-status-purple-base/5 border border-status-purple-base/20 space-y-1 text-xs">
        <div className="font-heading font-semibold text-status-purple-base text-[11px] uppercase tracking-wider flex items-center justify-between">
          <span>📦 Bundle Includes</span>
          <span>3 items</span>
        </div>
        <div className="space-y-0.5 text-text-secondary">
          <div className="flex justify-between"><span>• Mindful Garden Coloring Book</span><span>× 1</span></div>
          <div className="flex justify-between"><span>• 24-Coloring Pencil Tin</span><span>× 1</span></div>
          <div className="flex justify-between"><span>• Dual Fineliner Pen Set</span><span>× 1</span></div>
        </div>
      </div>
    ),
  },
};

/**
 * 09. Unavailable / Depleted Inventory Item
 * Displays out-of-stock warning tag and disables quantity increments.
 */
export const Unavailable: Story = {
  args: {
    isAvailable: false,
    name: 'Limited Edition Hardcover Journal',
    price: 15000,
  },
};

/**
 * 10. Automated Vitest Interaction Play Test
 * Verifies heading accessibility, price display, stepper increments/decrements, and remove action trigger.
 */
export const InteractivePlay: Story = {
  args: {
    name: 'Interactive Test Product',
    price: 18500,
    quantity: 2,
    onQuantityChange: fn(),
    onRemove: fn(),
    'data-testid': 'interactive-cart-row',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify title and Naira price (₦18,500)
    const title = canvas.getByRole('heading', { name: /Interactive Test Product/i });
    await expect(title).toBeInTheDocument();
    const priceEls = canvas.getAllByText(/₦18,500/i);
    await expect(priceEls[0]).toBeInTheDocument();

    // Verify stepper interactions
    const decBtn = canvas.getByRole('button', { name: /Decrease quantity/i });
    await expect(decBtn).toBeInTheDocument();
    await userEvent.click(decBtn);
    await expect(args.onQuantityChange).toHaveBeenCalledWith(1);

    const incBtn = canvas.getByRole('button', { name: /Increase quantity/i });
    await expect(incBtn).toBeInTheDocument();
    await userEvent.click(incBtn);
    await expect(args.onQuantityChange).toHaveBeenCalledWith(3);

    // Verify remove action click
    const removeBtn = canvas.getByRole('button', { name: /Remove Interactive Test Product from cart/i });
    await expect(removeBtn).toBeInTheDocument();
    await userEvent.click(removeBtn);
    await expect(args.onRemove).toHaveBeenCalledTimes(1);
  },
};

/**
 * 11. CSS Token Verification
 * Inspects computed styles against canonical design tokens (surface, border, radius, font).
 */
export const CssCheck: Story = {
  args: {
    name: 'CSS Token Inspection Item',
    price: 25000,
    'data-testid': 'css-check-cart-row',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByTestId('css-check-cart-row');
    await expect(row).toBeInTheDocument();

    // Row Surface token: #FFFFFF => rgb(255, 255, 255)
    const rowStyle = window.getComputedStyle(row);
    await expect(rowStyle.backgroundColor).toBe('rgb(255, 255, 255)');

    // Border token: #EDF3F7 => rgb(237, 243, 247)
    await expect(rowStyle.borderColor).toBe('rgb(237, 243, 247)');

    // Radius/MD token: 14px
    await expect(rowStyle.borderRadius).toBe('14px');

    // Title font-family: Fredoka
    const title = row.querySelector('h3');
    await expect(title).toBeInTheDocument();
    const titleStyle = window.getComputedStyle(title!);
    await expect(titleStyle.fontFamily).toMatch(/Fredoka/);
  },
};
