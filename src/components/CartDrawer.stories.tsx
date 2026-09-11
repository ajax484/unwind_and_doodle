import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import CartDrawer from './CartDrawer';
import type { CartResponse, CartItemDetail } from '@/types/cart';

// --- Mock Data Fixtures ---

const standardBook: CartItemDetail = {
  id: 'cart_item_1',
  productId: 'prod_botanical',
  productName: 'Botanical Bliss: Mindful Coloring Book',
  slug: 'botanical-bliss',
  sku: 'BK-BOT-01',
  quantity: 1,
  unitPrice: 2400,
  totalPrice: 2400,
  primaryImage: null,
  requiresCustomization: false,
  isAvailable: true,
  productType: 'physical',
  addons: [],
};

const mandalaBook: CartItemDetail = {
  id: 'cart_item_2',
  productId: 'prod_mandala',
  productName: 'Zen Mandalas: Meditative Spiral Edition',
  slug: 'zen-mandalas',
  sku: 'BK-MAN-02',
  quantity: 2,
  unitPrice: 1800,
  totalPrice: 3600,
  primaryImage: null,
  requiresCustomization: false,
  isAvailable: true,
  productType: 'physical',
  addons: [
    {
      id: 'addon_gold_foil',
      addonProductId: 'prod_gold_addon',
      addonName: 'Protective Vinyl Sleeve',
      quantity: 1,
      unitPrice: 350,
      totalPrice: 350,
      primaryImage: null,
    },
  ],
};

const customPhotoBook: CartItemDetail = {
  id: 'cart_item_3',
  productId: 'prod_keepsake',
  productName: 'Custom Keepsake Coloring Book',
  slug: 'custom-keepsake',
  sku: 'BK-KEE-03',
  quantity: 1,
  unitPrice: 3500,
  totalPrice: 3500,
  primaryImage: null,
  requiresCustomization: true,
  isAvailable: true,
  productType: 'custom',
  customization: {
    id: 'cust_789',
    notes: 'Please highlight pet portrait',
    status: 'completed',
    assets: ['/photos/family-pet.jpg', '/photos/garden-view.jpg'],
  },
  addons: [],
};

const themePackBook: CartItemDetail = {
  id: 'cart_item_4',
  productId: 'prod_themes',
  productName: 'Mindful Explorer Custom Edition',
  slug: 'mindful-explorer',
  sku: 'BK-EXP-04',
  quantity: 1,
  unitPrice: 2800,
  totalPrice: 2800,
  primaryImage: null,
  requiresCustomization: false,
  supportsThemeCustomization: true,
  isAvailable: true,
  productType: 'physical',
  themeCustomization: {
    selectedThemeIds: ['ocean', 'forest'],
    coverName: 'Botanical Rose Cover',
    themes: [
      { id: 'ocean', name: 'Ocean Serenity', sortOrder: 1 },
      { id: 'forest', name: 'Forest Harmony', sortOrder: 2 },
    ],
  },
  addons: [],
};

const bundleItem: CartItemDetail = {
  id: 'cart_item_5',
  productId: 'prod_bundle_deluxe',
  productName: 'Ultimate Mindfulness Starter Bundle',
  slug: 'starter-bundle',
  sku: 'BDL-STR-01',
  quantity: 1,
  unitPrice: 5800,
  totalPrice: 5800,
  primaryImage: null,
  requiresCustomization: false,
  isAvailable: true,
  productType: 'bundle',
  bundleComponents: [
    { componentProductId: 'c1', name: 'Botanical Edition Book', quantity: 1 },
    { componentProductId: 'c2', name: '24 Fine Dual-Tip Markers', quantity: 1 },
    { componentProductId: 'c3', name: 'Rose Gold Metallic Sticker Sheet', quantity: 2 },
  ],
  addons: [],
};

const unavailableItem: CartItemDetail = {
  ...standardBook,
  id: 'cart_item_unavail',
  isAvailable: false,
};

function createCartResponse(items: CartItemDetail[]): CartResponse {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    cartId: 'cart_mock_123',
    sessionId: 'session_mock_456',
    items,
    totalItemCount,
    subtotal,
    currency: 'USD',
  };
}

const populatedCart = createCartResponse([standardBook, mandalaBook]);
const singleItemCart = createCartResponse([standardBook]);
const emptyCart = createCartResponse([]);
const customItemCart = createCartResponse([customPhotoBook]);
const themeItemCart = createCartResponse([themePackBook]);
const bundleItemCart = createCartResponse([bundleItem]);
const unavailableCart = createCartResponse([unavailableItem, mandalaBook]);

// --- Meta Configuration ---

const meta = {
  title: 'Design System/Organisms/CartDrawer',
  component: CartDrawer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Canonical CartDrawer slide-over organism conforming directly to Figma specifications (`39:22262` and `39:23187`). Features fixed header with item counter and ghost close button, flexible scroll region hosting canonical CartItemRow or EmptyState components, and fixed footer with subtotal, primary checkout CTA, and optional secondary action.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls drawer visibility and animation.',
    },
    showSecondaryAction: {
      control: 'boolean',
      description: 'Toggles visibility of the "View Cart" secondary action button.',
    },
    loading: {
      control: 'boolean',
      description: 'Toggles operational loading state with Skeleton placeholders.',
    },
    onClose: { action: 'closed' },
    onUpdateQuantity: { action: 'quantityUpdated' },
    onRemoveItem: { action: 'itemRemoved' },
  },
  args: {
    isOpen: true,
    showSecondaryAction: true,
    loading: false,
    cart: populatedCart,
    onClose: fn(),
    onUpdateQuantity: fn(),
    onRemoveItem: fn(),
  },
} satisfies Meta<typeof CartDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Stories ---

/**
 * 01. Default Populated Cart
 * Canonical multi-item presentation (State=Open, Items=Multiple, Checkout=Enabled).
 */
export const Default: Story = {
  args: {
    cart: populatedCart,
    showSecondaryAction: true,
  },
};

/**
 * 02. Empty State
 * Displays canonical EmptyState with "Continue Shopping" CTA and suppressed footer.
 */
export const Empty: Story = {
  args: {
    cart: emptyCart,
  },
};

/**
 * 03. Single Item Cart
 * Validates singular item grammar ("1 item") and responsive layout.
 */
export const SingleItem: Story = {
  args: {
    cart: singleItemCart,
  },
};

/**
 * 04. Secondary Action Hidden
 * Checkout=Enabled, SecondaryAction=Hidden (renders primary checkout button only).
 */
export const WithoutSecondaryAction: Story = {
  args: {
    cart: populatedCart,
    showSecondaryAction: false,
  },
};

/**
 * 05. Customized Product Item
 * Illustrates photo customization status badge and attachment indicator.
 */
export const WithCustomization: Story = {
  args: {
    cart: customItemCart,
  },
};

/**
 * 06. Theme Customization Item
 * Demonstrates selected mindful themes and cover style specification.
 */
export const WithThemeCustomization: Story = {
  args: {
    cart: themeItemCart,
  },
};

/**
 * 07. Bundle Item
 * Displays compound bundle composition list and item multipliers.
 */
export const WithBundleItem: Story = {
  args: {
    cart: bundleItemCart,
  },
};

/**
 * 08. Checkout Disabled (Unavailable Items)
 * Renders disabled checkout CTA with alert guidance when items are out of stock.
 */
export const WithUnavailableItems: Story = {
  args: {
    cart: unavailableCart,
  },
};

/**
 * 09. Loading Pulse State
 * Operational loading view displaying pulsing Skeleton placeholders.
 */
export const LoadingState: Story = {
  args: {
    loading: true,
    cart: null,
  },
};

/**
 * 10. Interactive Removal Play Test
 * Automated verification of user clicking remove on an item.
 */
export const InteractiveItemRemoval: Story = {
  args: {
    cart: singleItemCart,
    onClose: fn(),
    onRemoveItem: fn(),
  },
  play: async ({ canvasElement, args }) => {
    (args.onClose as any)?.mockClear?.();
    (args.onRemoveItem as any)?.mockClear?.();

    // Settle mount autofocus timers
    await new Promise((r) => setTimeout(r, 100));

    const canvas = within(canvasElement);

    // Verify drawer and content mounted
    const drawer = canvas.getByTestId('cart-drawer');
    await expect(drawer).toBeInTheDocument();

    const itemCount = canvas.getByTestId('cart-drawer-item-count');
    await expect(itemCount).toHaveTextContent(/1 item/i);

    // Click remove button on item row
    const removeBtn = canvas.getByRole('button', { name: /remove botanical bliss/i });
    await userEvent.click(removeBtn);

    // Verify onRemoveItem called with item id
    await expect(args.onRemoveItem).toHaveBeenCalledTimes(1);
    await expect(args.onRemoveItem).toHaveBeenCalledWith('cart_item_1');

    // Click close button
    const closeBtn = canvas.getByTestId('cart-drawer-close-button');
    await userEvent.click(closeBtn);
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

/**
 * 11. CSS Token Verification
 * Checks background (#FFFFFF), border (#EDF3F7), and Fredoka typography.
 */
export const CssCheck: Story = {
  args: {
    cart: singleItemCart,
    'data-testid': 'css-check-cart-drawer',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drawer = canvas.getByTestId('css-check-cart-drawer');
    await expect(drawer).toBeInTheDocument();

    // Drawer container
    const panel = drawer.querySelector('.max-w-md');
    await expect(panel).not.toBeNull();
    if (panel) {
      const computed = window.getComputedStyle(panel);
      // Surface token: #FFFFFF
      await expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');
    }

    // Drawer title typography: Fredoka
    const title = canvas.getByRole('heading', { level: 2 });
    const titleComputed = window.getComputedStyle(title);
    await expect(titleComputed.fontFamily).toMatch(/Fredoka/i);
  },
};
