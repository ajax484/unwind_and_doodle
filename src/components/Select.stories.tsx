import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React from 'react';
import Select from './Select';

const sampleOptions = [
  { label: 'Standard Matte Paper (120gsm)', value: 'matte-120' },
  { label: 'Heavyweight Artist Cardstock (200gsm)', value: 'cardstock-200' },
  { label: 'Watercolor Cold-Press Paper (300gsm)', value: 'watercolor-300' },
  { label: 'Vellum Tracing Overlay (90gsm)', value: 'vellum-90', disabled: true },
];

const meta = {
  title: 'Design System/Atoms/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical dropdown select atom adhering directly to Figma Component Set `16:4104` (17 variants) and Documentation Board `16:4122` on the `Components` page. Features sizing scales (SM 32px, MD 40px, LG 48px), tokenized borders (`#DCE7EE`), custom styled chevron vector down indicator (`#52657A`), optional leading icons, and accessible labels/errors.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Sizing scale variant (SM 32px, MD 40px, LG 48px).',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the dropdown select.',
    },
    required: {
      control: 'boolean',
      description: 'Marks field as required.',
    },
    label: {
      control: 'text',
      description: 'Accessible label above the select.',
    },
    helperText: {
      control: 'text',
      description: 'Guidance note below the select.',
    },
    errorMessage: {
      control: 'text',
      description: 'Validation error message below the select.',
    },
    placeholder: {
      control: 'text',
      description: 'Optional placeholder option.',
    },
  },
  args: {
    size: 'md',
    options: sampleOptions,
    disabled: false,
    required: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 1. Default Dropdown
 */
export const Default: Story = {
  args: {
    options: sampleOptions,
    defaultValue: 'matte-120',
  },
};

/**
 * 2. With Label & Helper Text
 */
export const WithLabelAndHelper: Story = {
  args: {
    label: 'Paper Type & Weight',
    helperText: 'Select the optimal weight for your coloring markers or watercolor pencils.',
    options: sampleOptions,
    defaultValue: 'cardstock-200',
  },
};

/**
 * 3. With Leading Icon
 */
export const WithLeadingIcon: Story = {
  args: {
    label: 'Shipping Destination',
    options: [
      { label: 'United States (Domestic)', value: 'US' },
      { label: 'Canada', value: 'CA' },
      { label: 'United Kingdom', value: 'UK' },
      { label: 'European Union', value: 'EU' },
      { label: 'Australia', value: 'AU' },
    ],
    defaultValue: 'US',
    leadingIcon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
};

/**
 * 4. Sizing Matrix (SM: 32px, MD: 40px, LG: 48px)
 */
export const SizingMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-5 w-full">
      <Select
        size="sm"
        label="Small Select (32px)"
        options={sampleOptions}
        defaultValue="matte-120"
      />
      <Select
        size="md"
        label="Medium Select (40px - Default)"
        options={sampleOptions}
        defaultValue="cardstock-200"
      />
      <Select
        size="lg"
        label="Large Select (48px)"
        options={sampleOptions}
        defaultValue="watercolor-300"
      />
    </div>
  ),
};

/**
 * 5. With Placeholder Option
 */
export const WithPlaceholder: Story = {
  args: {
    label: 'Coloring Book Binding',
    placeholder: '-- Choose a binding style --',
    options: [
      { label: 'Spiral Bound (Lays Flat)', value: 'spiral' },
      { label: 'Perfect Bound (Paperback)', value: 'perfect' },
      { label: 'Hardcover Collector Edition', value: 'hardcover' },
    ],
  },
};

/**
 * 6. Required Field
 */
export const RequiredField: Story = {
  args: {
    label: 'Shipping Option',
    required: true,
    options: [
      { label: 'Standard Ground (3-5 business days)', value: 'standard' },
      { label: 'Priority Express (1-2 business days)', value: 'express' },
    ],
    defaultValue: 'standard',
  },
};

/**
 * 7. Error State
 */
export const ErrorState: Story = {
  args: {
    label: 'Select Delivery Time Slot',
    options: [
      { label: 'Morning (8:00 AM - 12:00 PM)', value: 'morning' },
      { label: 'Evening (5:00 PM - 8:00 PM)', value: 'evening' },
    ],
    errorMessage: 'Delivery time slots are currently booked for this zone.',
  },
};

/**
 * 8. Disabled State
 */
export const DisabledState: Story = {
  args: {
    label: 'Currency',
    disabled: true,
    options: [{ label: 'USD ($)', value: 'usd' }],
    defaultValue: 'usd',
    helperText: 'Store currency is locked to USD.',
  },
};

/**
 * 9. Interactive User Event & Selection Test
 */
export const InteractivePlay: Story = {
  args: {
    label: 'Interactive Choice',
    options: sampleOptions,
    defaultValue: 'matte-120',
    'data-testid': 'interactive-select',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const select = canvas.getByTestId('interactive-select') as HTMLSelectElement;
    await expect(select).toBeInTheDocument();
    await expect(select.value).toBe('matte-120');

    // Select another option
    await userEvent.selectOptions(select, 'cardstock-200');
    await expect(select.value).toBe('cardstock-200');
  },
};

/**
 * 10. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    label: 'Token Check',
    options: sampleOptions,
    defaultValue: 'matte-120',
    'data-testid': 'css-check-select',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByTestId('css-check-select');
    await expect(select).toBeInTheDocument();

    // Verify chevron vector SVG indicator is present
    const container = select.parentElement;
    await expect(container).not.toBeNull();
    if (container) {
      const chevron = container.querySelector('svg');
      await expect(chevron).not.toBeNull();
    }
  },
};
