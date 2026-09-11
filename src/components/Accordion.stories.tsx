import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import { Accordion, AccordionGroup } from './Accordion';

const meta = {
  title: 'Design System/Molecules/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical disclosure and expandable content molecule conforming directly to Figma Step 5F specifications (`49:54939` and `49:54955`). Features 24 variant permutations across State (Collapsed, Expanded, Disabled), Size (MD, SM), Leading Icon, and 1px Divider options.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Scale and internal padding density.',
    },
    divider: {
      control: 'boolean',
      description: 'Toggles the 1px bottom hairline divider line.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interactive disclosure expansion.',
    },
    defaultExpanded: {
      control: 'boolean',
      description: 'Initial disclosure state.',
    },
    onToggle: { action: 'toggled' },
  },
  args: {
    title: 'How long does delivery take?',
    size: 'md',
    icon: '🚚',
    divider: true,
    disabled: false,
    defaultExpanded: false,
    children: 'Orders are typically delivered within 3–5 business days depending on location.',
    onToggle: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[560px] max-w-full p-4 bg-bg-surface font-sans">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default Collapsed (Figma Default Variant)
 * State=Collapsed, Size=MD, Icon=Leading, Divider=Visible
 */
export const DefaultCollapsed: Story = {
  args: {
    title: 'How long does delivery take?',
    defaultExpanded: false,
  },
};

/**
 * 02. Expanded
 * State=Expanded, Size=MD, Icon=Leading, Divider=Visible
 */
export const Expanded: Story = {
  args: {
    title: 'How long does delivery take?',
    defaultExpanded: true,
    children:
      'Orders are typically delivered within 3–5 business days depending on location. Tracking information is sent via email and SMS once dispatched.',
  },
};

/**
 * 03. Disabled State
 * State=Disabled, Size=MD, Icon=Leading, Divider=Visible
 */
export const Disabled: Story = {
  args: {
    title: 'International shipping (Currently Unavailable)',
    disabled: true,
    children: 'International deliveries are temporarily paused during fulfillment maintenance.',
  },
};

/**
 * 04. Without Leading Icon
 * Icon=None, Size=MD, Divider=Visible
 */
export const WithoutIcon: Story = {
  args: {
    title: 'What payment methods do you accept?',
    icon: null,
    children: 'We accept Paystack, Debit Cards (Visa, Mastercard, Verve), and Direct Bank Transfers.',
  },
};

/**
 * 05. Without Divider
 * Divider=Hidden, Size=MD
 */
export const WithoutDivider: Story = {
  args: {
    title: 'Can I return personalized items?',
    divider: false,
    children:
      'Due to custom dedication prints and photo personalization, custom doodle books cannot be returned once printed.',
  },
};

/**
 * 06. Size SM (Compact Scale)
 * Size=SM, Icon=Leading, Divider=Visible
 */
export const SizeSM: Story = {
  args: {
    size: 'sm',
    title: 'Compact Sidebar FAQ',
    icon: '💡',
    children: 'Reduced padding density designed for dialogs, sidebars, or dense mobile layouts.',
  },
};

/**
 * 07. Product Specifications Scenario
 * Authentic storefront example showing paper weight, materials, and binding details.
 */
export const ProductSpecifications: Story = {
  args: {
    title: 'Paper Stock & Artist Materials',
    icon: '🎨',
    defaultExpanded: true,
    children: (
      <div className="space-y-2 text-xs sm:text-sm">
        <p>• Premium 200gsm ultra-thick archival bleed-proof cartridge paper.</p>
        <p>• Suitable for watercolor pencils, alcohol markers, and acrylic paint markers.</p>
        <p>• Lay-flat spiral binding designed for effortless coloring on both sides.</p>
      </div>
    ),
  },
};

/**
 * 08. Multi-Item Accordion Group
 * Multi-item stack demonstrating single-expanded behavior.
 */
export const AccordionGroupDemo: Story = {
  render: () => (
    <AccordionGroup
      type="single"
      defaultExpandedIds={['faq-1']}
      items={[
        {
          id: 'faq-1',
          title: 'How long does custom photo personalization take?',
          icon: '📷',
          content:
            'Photo transformations are hand-reviewed and processed within 24–48 hours before printing.',
        },
        {
          id: 'faq-2',
          title: 'What if my photo resolution is too low?',
          icon: '⚠️',
          content:
            'Our studio team will contact you via WhatsApp/email to request an alternate photo if clarity is insufficient.',
        },
        {
          id: 'faq-3',
          title: 'Can I order corporate gift bundles?',
          icon: '🎁',
          content:
            'Yes! We offer bulk tier discounts for events, schools, and corporate mindfulness programs.',
        },
      ]}
    />
  ),
};

/**
 * 09. Interactive Play Test
 * Automated verification of user click toggle, aria-expanded attribute, and callbacks.
 */
export const InteractivePlay: Story = {
  args: {
    title: 'Interactive Disclosure Test',
    icon: '✨',
    defaultExpanded: false,
    children: 'Interactive content dynamically revealed under automated testing.',
    onToggle: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Initial state: trigger is collapsed
    const trigger = canvas.getByRole('button', { name: /Interactive Disclosure Test/i });
    await expect(trigger).toBeInTheDocument();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Click trigger to expand
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onToggle).toHaveBeenCalledWith(true);

    // Verify content region visible
    const content = canvas.getByRole('region');
    await expect(content).toBeInTheDocument();
    await expect(content).toHaveTextContent(/Interactive content dynamically revealed/i);

    // Click trigger to collapse
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(args.onToggle).toHaveBeenCalledWith(false);
  },
};

/**
 * 10. CSS Token Verification
 * Checks border-default color (#edf3f7), trigger typography, and divider line.
 */
export const CssCheck: Story = {
  args: {
    title: 'CSS Token Inspection Item',
    icon: '📐',
    defaultExpanded: true,
    children: 'Inspecting border and typography tokens.',
    'data-testid': 'css-check-accordion',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const accordion = canvas.getByTestId('css-check-accordion');
    await expect(accordion).toBeInTheDocument();

    const computed = window.getComputedStyle(accordion);

    // Border Color: #EDF3F7 => rgb(237, 243, 247)
    await expect(computed.borderBottomColor).toBe('rgb(237, 243, 247)');

    // Trigger font family check: Fredoka
    const trigger = canvas.getByRole('button');
    const triggerTitle = trigger.querySelector('.font-heading');
    await expect(triggerTitle).toBeTruthy();
    const titleComputed = window.getComputedStyle(triggerTitle!);
    await expect(titleComputed.fontFamily).toMatch(/Fredoka/i);
  },
};
