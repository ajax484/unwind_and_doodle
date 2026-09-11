import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import React, { useState } from 'react';
import { ThemeSelectorCard } from './ThemeSelectorCard';

const meta: Meta<typeof ThemeSelectorCard> = {
  title: 'Design System/Molecules/ThemeSelectorCard',
  component: ThemeSelectorCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical ThemeSelectorCard molecule adhering to Figma Component Set `41:24918` and Documentation Board `41:24919` "Theme Selector Cards". Used for selecting visual themes in storefront customization flows and bundle builder experiences.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Physical size variant (MD 260px standard, SM 200px compact).',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the theme card is currently selected.',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the theme card is disabled (e.g. selection limit reached).',
    },
    showDescription: {
      control: 'boolean',
      description: 'Whether the optional theme description text is visible.',
    },
    onSelect: { action: 'selected' },
  },
  args: {
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ThemeSelectorCard>;

// Sample Theme Fixtures from Figma Section 4 & 5
const sampleThemes = [
  {
    id: 'theme-botanical',
    name: 'Botanical',
    description: 'A calm botanical-inspired collection of illustrations with lush greenery.',
    imageUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'theme-floral',
    name: 'Floral',
    description: 'Vibrant garden blooms and delicate floral petals designed for relaxation.',
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'theme-mindful',
    name: 'Mindful',
    description: 'A calm botanical-inspired collection of illustrations and mindful mandalas.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'theme-abstract',
    name: 'Abstract',
    description: 'Expressive modern curves and flowing organic shapes for creative coloring.',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80',
  },
];

/**
 * 1. Default State (MD, Unselected, Description Visible)
 */
export const Default: Story = {
  args: {
    theme: sampleThemes[0],
    size: 'md',
    selected: false,
    disabled: false,
    showDescription: true,
  },
};

/**
 * 2. Selected State (MD, 2px Brand Border, Rose Indicator with Checkmark)
 */
export const Selected: Story = {
  args: {
    theme: sampleThemes[1],
    size: 'md',
    selected: true,
    disabled: false,
    showDescription: true,
  },
};

/**
 * 3. Hover State (Simulated Hover with Elevation and Subtle Background)
 */
export const Hover: Story = {
  args: {
    theme: sampleThemes[0],
    size: 'md',
    selected: false,
    isHovered: true,
  },
};

/**
 * 4. Disabled State (50% Opacity, Muted Contrast, Pointer Events Disabled)
 */
export const Disabled: Story = {
  args: {
    theme: sampleThemes[2],
    size: 'md',
    selected: false,
    disabled: true,
  },
};

/**
 * 5. Small Size (SM, 200px Width, 12px Padding, Compact Typography)
 */
export const SmallSize: Story = {
  args: {
    theme: sampleThemes[0],
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
    theme: sampleThemes[1],
    size: 'sm',
    selected: true,
    disabled: false,
  },
};

/**
 * 7. Description Hidden (Minimal Card View)
 */
export const DescriptionHidden: Story = {
  args: {
    theme: sampleThemes[2],
    size: 'md',
    selected: false,
    showDescription: false,
  },
};

/**
 * 8. Theme Catalog Specimens (Section 4 from Figma Documentation Board)
 */
export const ThemeCatalog: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 max-w-5xl justify-center items-start">
      {sampleThemes.map((theme, idx) => (
        <ThemeSelectorCard
          key={theme.id}
          theme={theme}
          selected={idx === 1}
          showDescription={idx !== 2}
        />
      ))}
    </div>
  ),
};

/**
 * 9. Storefront Customization Step (Section 5 from Figma Documentation Board)
 * Live interactive scenario allowing user to pick up to 3 themes.
 */
export const StorefrontCustomizationStep: Story = {
  render: function CustomizationScenario() {
    const [selectedIds, setSelectedIds] = useState<string[]>([sampleThemes[0].id]);
    const maxThemes = 3;

    const toggleTheme = (id?: string) => {
      if (!id) return;
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < maxThemes ? [...prev, id] : prev
      );
    };

    return (
      <div className="w-full max-w-3xl p-6 bg-bg-surface border border-border-default rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-4">
          <div>
            <h3 className="font-heading font-bold text-xl text-text-primary flex items-center gap-2">
              <span>🎨</span> Choose a theme
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Select the visual style you'd like for your personalized coloring book.
            </p>
          </div>
          <span className="inline-flex items-center self-start sm:self-auto px-3 py-1 rounded-full text-xs font-heading font-bold bg-bg-accent text-brand-rose border border-border-accent/40">
            {selectedIds.length} / {maxThemes} themes selected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sampleThemes.slice(0, 3).map((theme) => {
            const isSelected = selectedIds.includes(theme.id);
            const isDisabled = !isSelected && selectedIds.length >= maxThemes;

            return (
              <ThemeSelectorCard
                key={theme.id}
                theme={theme}
                selected={isSelected}
                disabled={isDisabled}
                onSelect={toggleTheme}
                data-testid={`customization-card-${theme.id}`}
              />
            );
          })}
        </div>
      </div>
    );
  },
};

/**
 * 10. Interactive Play Test (Click, Keyboard, and Callback Verification)
 */
export const InteractivePlay: Story = {
  args: {
    theme: sampleThemes[0],
    size: 'md',
    selected: false,
    'data-testid': 'interactive-theme-card',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const card = canvas.getByTestId('interactive-theme-card');
    await expect(card).toBeInTheDocument();
    await expect(card).toHaveAttribute('aria-checked', 'false');

    // 1. Verify click triggers onSelect with theme id
    await userEvent.click(card);
    await expect(args.onSelect).toHaveBeenCalledWith(sampleThemes[0].id);

    // 2. Verify keyboard navigation with Space key
    await card.focus();
    await userEvent.keyboard(' ');
    await expect(args.onSelect).toHaveBeenCalledTimes(2);

    // 3. Verify keyboard navigation with Enter key
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledTimes(3);

    // 4. Verify preview and indicator rendered
    const preview = canvas.getByTestId('interactive-theme-card-preview');
    await expect(preview).toBeInTheDocument();
    const indicator = canvas.getByTestId('interactive-theme-card-indicator');
    await expect(indicator).toBeInTheDocument();
  },
};

/**
 * 11. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    theme: sampleThemes[1],
    size: 'md',
    selected: true,
    'data-testid': 'css-check-card',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify Card Corner Radius has Radius/LG (20px)
    const card = canvas.getByTestId('css-check-card');
    await expect(card).toBeInTheDocument();
    const cardStyle = window.getComputedStyle(card);
    await expect(cardStyle.borderRadius).toMatch(/16px|20px|24px/);
    // Selected card has 2px brand border (#A7C2D4 -> rgb(167, 194, 212))
    await expect(cardStyle.borderColor).toMatch(/rgb\(167,\s*194,\s*212\)/);

    // 2. Verify Preview Viewport has Radius/MD (14px)
    const preview = canvas.getByTestId('css-check-card-preview');
    await expect(preview).toBeInTheDocument();
    const previewStyle = window.getComputedStyle(preview);
    await expect(previewStyle.borderRadius).toMatch(/12px|14px/);

    // 3. Verify Selected Indicator has Rose fill (#D99BA3 -> rgb(217, 155, 163))
    const indicator = canvas.getByTestId('css-check-card-indicator');
    await expect(indicator).toBeInTheDocument();
    const indStyle = window.getComputedStyle(indicator);
    await expect(indStyle.backgroundColor).toMatch(/rgb\(217,\s*155,\s*163\)/);
  },
};
