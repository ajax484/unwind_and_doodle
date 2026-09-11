import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import React, { useState } from 'react';
import { AddonCompanionCard, AddonCompanionCardData } from './AddonCompanionCard';

const meta: Meta<typeof AddonCompanionCard> = {
  title: 'Design System/Molecules/AddonCompanionCard',
  component: AddonCompanionCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical AddonCompanionCard molecule adhering to Figma Component Set `41:25498` and Documentation Board `41:26969` "Addon Companion Cards". Used for selecting optional complementary accessories, gift wraps, and coloring tools in storefront customization flows.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Physical size variant (MD 380px standard, SM 320px compact).',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the add-on is currently selected.',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the add-on is disabled.',
    },
    showImage: {
      control: 'boolean',
      description: 'Whether the add-on image/motif is visible.',
    },
    showDescription: {
      control: 'boolean',
      description: 'Whether the add-on description text is visible.',
    },
    onSelect: { action: 'selected' },
  },
  args: {
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AddonCompanionCard>;

// 4 Canonical Add-on Specimens from Figma Section 4 & 5
const sampleAddons: AddonCompanionCardData[] = [
  {
    id: 'addon-gift-wrapping',
    name: 'Gift Wrapping',
    description: 'A simple gift-ready finish for your order.',
    price: 2000,
    motif: 'gift',
  },
  {
    id: 'addon-greeting-card',
    name: 'Greeting Card',
    description: 'Add a personal message to your order.',
    price: 1500,
    motif: 'card',
  },
  {
    id: 'addon-sticker-pack',
    name: 'Sticker Pack',
    description: 'A small collection of matching stickers.',
    price: 1000,
    motif: 'stickers',
  },
  {
    id: 'addon-extra-prints',
    name: 'Extra Prints',
    description: 'Additional printed copies of your uploaded artwork.',
    price: 3000,
    motif: 'prints',
  },
];

/**
 * 1. Default State (MD, Unselected, Gift Wrapping with image and description)
 */
export const Default: Story = {
  args: {
    addon: sampleAddons[0],
    size: 'md',
    selected: false,
    disabled: false,
    showImage: true,
    showDescription: true,
  },
};

/**
 * 2. Selected State (MD, 2px Brand Border, Rose Checkbox Indicator)
 */
export const Selected: Story = {
  args: {
    addon: sampleAddons[0],
    size: 'md',
    selected: true,
    disabled: false,
    showImage: true,
    showDescription: true,
  },
};

/**
 * 3. Hover State (Simulated Hover with Elevation and Highlight)
 */
export const Hover: Story = {
  args: {
    addon: sampleAddons[1],
    size: 'md',
    selected: false,
    isHovered: true,
  },
};

/**
 * 4. Disabled State (Muted Contrast, Inactive Indicator, Pointer Events Disabled)
 */
export const Disabled: Story = {
  args: {
    addon: sampleAddons[2],
    size: 'md',
    selected: false,
    disabled: true,
  },
};

/**
 * 5. Small Size (SM, 320px Width, 12px Padding, 56×56px Image)
 */
export const SmallSize: Story = {
  args: {
    addon: sampleAddons[0],
    size: 'sm',
    selected: false,
    disabled: false,
  },
};

/**
 * 6. Small Selected State
 */
export const SmallSelected: Story = {
  args: {
    addon: sampleAddons[1],
    size: 'sm',
    selected: true,
    disabled: false,
  },
};

/**
 * 7. Description Hidden (Compact Single-Row Vertical Layout)
 */
export const DescriptionHidden: Story = {
  args: {
    addon: sampleAddons[2],
    size: 'md',
    selected: false,
    showDescription: false,
  },
};

/**
 * 8. Image Hidden (Adaptive Full-Width Content Expansion)
 */
export const ImageHidden: Story = {
  args: {
    addon: sampleAddons[3],
    size: 'md',
    selected: false,
    showImage: false,
    showDescription: true,
  },
};

/**
 * 9. Canonical Specimens (Figma Section 4 — 2×2 Specimen Grid)
 */
export const CanonicalSpecimens: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <AddonCompanionCard addon={sampleAddons[0]} selected={true} />
      <AddonCompanionCard addon={sampleAddons[1]} selected={false} />
      <AddonCompanionCard addon={sampleAddons[2]} selected={true} />
      <AddonCompanionCard addon={sampleAddons[3]} selected={false} />
    </div>
  ),
};

/**
 * 10. Interactive Customization Flow (Figma Section 5 — In-Context Customization Panel)
 */
export const InteractiveCustomizationFlow: Story = {
  render: function CustomizationFlowScenario() {
    const [selectedIds, setSelectedIds] = useState<string[]>([sampleAddons[0].id!, sampleAddons[2].id!]);
    const baseBookPrice = 12000;

    const toggleAddon = (id?: string) => {
      if (!id) return;
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    };

    const addonsTotal = selectedIds.reduce((sum, id) => {
      const match = sampleAddons.find((a) => a.id === id);
      return sum + (typeof match?.price === 'number' ? match.price : 0);
    }, 0);

    const orderTotal = baseBookPrice + addonsTotal;

    return (
      <div className="w-full max-w-3xl p-6 bg-bg-surface border border-border-default rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-4">
          <div>
            <h3 className="font-heading font-bold text-xl text-text-primary flex items-center gap-2">
              <span>🎁</span> Make it extra special
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Add something extra to personalize your order.
            </p>
          </div>
          <span className="inline-flex items-center self-start sm:self-auto px-3 py-1 rounded-full text-xs font-heading font-bold bg-bg-accent text-brand-rose border border-border-accent/40">
            {selectedIds.length} add-on{selectedIds.length === 1 ? '' : 's'} selected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sampleAddons.map((addon) => (
            <AddonCompanionCard
              key={addon.id}
              addon={addon}
              selected={selectedIds.includes(addon.id!)}
              onSelect={toggleAddon}
              data-testid={`customization-addon-${addon.id}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-dashed border-border-default text-sm">
          <div className="text-text-secondary">
            Personalized Coloring Book (₦{baseBookPrice.toLocaleString()}) + Add-ons (₦{addonsTotal.toLocaleString()})
          </div>
          <div className="font-heading font-bold text-lg text-text-primary">
            Total: ₦{orderTotal.toLocaleString()}
          </div>
        </div>
      </div>
    );
  },
};

/**
 * 11. Interactive Play Test (Click, Keyboard Space/Enter, and Callback Verification)
 */
export const InteractivePlay: Story = {
  args: {
    addon: sampleAddons[0],
    size: 'md',
    selected: false,
    'data-testid': 'interactive-addon-card',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const card = canvas.getByTestId('interactive-addon-card');
    await expect(card).toBeInTheDocument();
    await expect(card).toHaveAttribute('aria-checked', 'false');

    // 1. Verify click triggers onSelect with addon id
    await userEvent.click(card);
    await expect(args.onSelect).toHaveBeenCalledWith(sampleAddons[0].id);

    // 2. Verify keyboard Space triggers onSelect
    await card.focus();
    await userEvent.keyboard(' ');
    await expect(args.onSelect).toHaveBeenCalledTimes(2);

    // 3. Verify keyboard Enter triggers onSelect
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledTimes(3);

    // 4. Verify sub-elements rendered
    const img = canvas.getByTestId('interactive-addon-card-image');
    await expect(img).toBeInTheDocument();
    const name = canvas.getByTestId('interactive-addon-card-name');
    await expect(name).toBeInTheDocument();
    await expect(name).toHaveTextContent('Gift Wrapping');
    const price = canvas.getByTestId('interactive-addon-card-price');
    await expect(price).toBeInTheDocument();
    await expect(price).toHaveTextContent('+₦2,000');
  },
};

/**
 * 12. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    addon: sampleAddons[1],
    size: 'md',
    selected: true,
    'data-testid': 'css-check-addon',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify Card Corner Radius has Radius/LG (20px)
    const card = canvas.getByTestId('css-check-addon');
    await expect(card).toBeInTheDocument();
    const cardStyle = window.getComputedStyle(card);
    await expect(cardStyle.borderRadius).toMatch(/16px|20px|24px/);
    // Selected card has 2px brand border (#A7C2D4 -> rgb(167, 194, 212))
    await expect(cardStyle.borderColor).toMatch(/rgb\(167,\s*194,\s*212\)/);

    // 2. Verify Image Viewport has Radius/MD (14px)
    const imgContainer = canvas.getByTestId('css-check-addon-image');
    await expect(imgContainer).toBeInTheDocument();
    const imgStyle = window.getComputedStyle(imgContainer);
    await expect(imgStyle.borderRadius).toMatch(/12px|14px/);

    // 3. Verify Selected Indicator has Rose fill (#D99BA3 -> rgb(217, 155, 163))
    const indicator = canvas.getByTestId('css-check-addon-indicator');
    await expect(indicator).toBeInTheDocument();
    const indStyle = window.getComputedStyle(indicator);
    await expect(indStyle.backgroundColor).toMatch(/rgb\(217,\s*155,\s*163\)/);
  },
};
