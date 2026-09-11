import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import { ProductCard } from './ProductCard';

const meta = {
  title: 'Design System/Molecules/ProductCard',
  component: ProductCard,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] sm:w-[320px] py-4">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['standard', 'custom', 'bundle', 'out_of_stock'],
      description: 'Canonical visual & capability variant archetype',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
      description: 'Card internal padding density',
    },
    actionLayout: {
      control: 'radio',
      options: ['full', 'inline'],
      description: 'Action button layout orientation (full-width vs inline with price)',
    },
    price: {
      control: 'number',
      description: 'Product price in minor currency units (e.g. 1999 for £19.99)',
    },
    isAvailable: {
      control: 'boolean',
      description: 'Inventory availability status',
    },
    showBadge: {
      control: 'boolean',
      description: 'Whether media overlay badge is visible',
    },
    badgeText: {
      control: 'text',
      description: 'Custom textual override for the top-left media badge',
    },
    showCapabilities: {
      control: 'boolean',
      description: 'Whether subordinate product capability metadata is displayed',
    },
    capabilityText: {
      control: 'text',
      description: 'Custom textual override for capability metadata',
    },
    showRating: {
      control: 'boolean',
      description: 'Whether star rating row is displayed',
    },
    rating: {
      control: { type: 'range', min: 0, max: 5, step: 0.1 },
      description: 'Numeric star rating score',
    },
    reviewCount: {
      control: 'number',
      description: 'Total review count for social proof',
    },
    showAction: {
      control: 'boolean',
      description: 'Whether bottom action button is displayed',
    },
    actionText: {
      control: 'text',
      description: 'Custom textual override for the action button',
    },
  },
  args: {
    id: 'prod-demo-1',
    name: 'Mindful Garden Coloring Book',
    slug: 'mindful-garden-coloring-book',
    price: 1800,
    primaryImage:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    isAvailable: true,
    requiresCustomization: false,
    productType: 'physical',
    categories: [{ id: 'cat-1', name: 'Coloring Books' }],
    rating: 4.9,
    reviewCount: 24,
    showRating: true,
    showCapabilities: true,
    showAction: true,
    actionLayout: 'full',
  },
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Canonical Standard Variant
 * Standard catalog item with category eyebrow, Fredoka heading, rating, and primary action.
 */
export const Default: Story = {
  args: {
    variant: 'standard',
    name: 'Mindful Garden Coloring Book',
    price: 1800,
  },
};

/**
 * 02. Canonical Custom Variant
 * Personalized keepsake item with photo customization badge and customization capability metadata.
 */
export const Custom: Story = {
  args: {
    variant: 'custom',
    name: 'Custom Portrait Keepsake Coloring Album',
    slug: 'custom-portrait-keepsake-album',
    price: 2499,
    requiresCustomization: true,
    productType: 'custom',
    categories: [{ id: 'cat-2', name: 'Personalized Editions' }],
    rating: 5.0,
    reviewCount: 48,
    primaryImage:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=600',
  },
};

/**
 * 03. Canonical Bundle Variant
 * Multi-product set showcasing bundle purple badge, component count, and bundle action.
 */
export const Bundle: Story = {
  args: {
    variant: 'bundle',
    name: 'Ultimate Mindful Art & Relaxation Kit',
    slug: 'ultimate-mindful-art-kit',
    price: 4500,
    productType: 'bundle',
    bundleComponentsCount: 3,
    categories: [{ id: 'cat-3', name: 'Gift Bundles' }],
    rating: 4.8,
    reviewCount: 62,
    primaryImage:
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600',
  },
};

/**
 * 04. Canonical Out of Stock Variant
 * Sold out item showing danger badge and disabled action button.
 */
export const OutOfStock: Story = {
  args: {
    variant: 'out_of_stock',
    name: 'Botanical Fine Liner 24-Pen Collection',
    slug: 'botanical-fine-liner-pens',
    price: 2200,
    isAvailable: false,
    categories: [{ id: 'cat-4', name: 'Art Supplies' }],
    rating: 4.7,
    reviewCount: 15,
  },
};

/**
 * 05. Placeholder Graphic Fallback
 * Graceful degradation when no primary hero image is available.
 */
export const PlaceholderImage: Story = {
  args: {
    primaryImage: null,
    name: 'Unwind Sketchbook Edition 02',
    slug: 'unwind-sketchbook-02',
    price: 1500,
  },
};

/**
 * 06. Prominent Star Rating & Reviews
 * Demonstrating compact RatingStars integration with fractional scores.
 */
export const WithRating: Story = {
  args: {
    rating: 4.9,
    reviewCount: 128,
    showRating: true,
  },
};

/**
 * 07. Custom Tag Badge Override
 * Overriding standard tag with custom marketing badge text ("Bestseller").
 */
export const CustomBadge: Story = {
  args: {
    badgeText: 'Bestseller',
  },
};

/**
 * 08. Inline Action Button Layout
 * Responsive side-by-side price and compact action button layout.
 */
export const InlineAction: Story = {
  args: {
    actionLayout: 'inline',
    name: 'Pocket Doodle Notepad',
    price: 850,
  },
};

/**
 * 09. Without Action Button
 * Presentation mode suitable for compact carousels or non-interactive catalogs.
 */
export const WithoutAction: Story = {
  args: {
    showAction: false,
  },
};

/**
 * 10. Compact SM Density
 * Reduced internal padding (p-3 sm:p-3.5) for compact storefront grids or sidebars.
 */
export const SizeSM: Story = {
  args: {
    size: 'sm',
    name: 'Compact Mini Sketchbook',
    price: 1200,
  },
};

/**
 * 11. Without Rating Row
 * Presentation mode representing the canonical Figma Rating=None variant.
 */
export const WithoutRating: Story = {
  args: {
    showRating: false,
    name: 'New Release Coloring Journal',
    price: 1600,
  },
};

/**
 * 12. Automated Vitest Interaction Play Test
 * Verifies heading accessibility, button presence, and user click callback execution.
 */
export const InteractivePlay: Story = {
  args: {
    name: 'Interactive Test Product',
    slug: 'interactive-test-product',
    price: 2100,
    onActionClick: fn(),
    'data-testid': 'interactive-product-card',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify accessible role and content
    const heading = canvas.getByRole('heading', { name: /Interactive Test Product/i });
    await expect(heading).toBeInTheDocument();

    // Verify price formatting (₦2,100)
    const priceEl = canvas.getByText(/₦2,100/i);
    await expect(priceEl).toBeInTheDocument();

    // Verify action button click
    const actionBtn = canvas.getByRole('button', { name: /View product/i });
    await expect(actionBtn).toBeInTheDocument();
    await userEvent.click(actionBtn);
    await expect(args.onActionClick).toHaveBeenCalledTimes(1);
  },
};

/**
 * 13. CSS Token Verification
 * Inspects computed styles against canonical design tokens.
 */
export const CssCheck: Story = {
  args: {
    name: 'CSS Token Inspection Product',
    slug: 'css-token-product',
    price: 3000,
    'data-testid': 'css-check-product-card',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByTestId('css-check-product-card');
    await expect(card).toBeInTheDocument();

    // Card Surface token: #FFFFFF => rgb(255, 255, 255)
    const cardStyle = window.getComputedStyle(card);
    await expect(cardStyle.backgroundColor).toBe('rgb(255, 255, 255)');

    // Border token: #EDF3F7 => rgb(237, 243, 247)
    await expect(cardStyle.borderColor).toBe('rgb(237, 243, 247)');

    // Title typography check
    const title = card.querySelector('h3');
    await expect(title).toBeInTheDocument();
    const titleStyle = window.getComputedStyle(title!);
    await expect(titleStyle.fontFamily).toMatch(/Fredoka/);

    // Media container radius: Radius/MD = 14px
    const media = card.querySelector('a');
    await expect(media).toBeInTheDocument();
    const mediaStyle = window.getComputedStyle(media!);
    await expect(mediaStyle.borderRadius).toBe('14px');
  },
};
