import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React, { useState } from 'react';
import ComboBox, { type ComboBoxOption } from './ComboBox';

const samplePaperOptions: ComboBoxOption[] = [
  {
    value: 'matte-120',
    label: 'Standard Matte Paper (120gsm)',
    description: 'Crisp, smooth finish ideal for fine liners and gel pens.',
  },
  {
    value: 'cardstock-200',
    label: 'Heavyweight Artist Cardstock (200gsm)',
    description: 'Thick bleed-resistant sheet perfect for alcohol markers.',
  },
  {
    value: 'watercolor-300',
    label: 'Watercolor Cold-Press Paper (300gsm)',
    description: 'Textured cotton rag paper designed for wet media washes.',
  },
  {
    value: 'vellum-90',
    label: 'Vellum Tracing Overlay (90gsm)',
    description: 'Semi-translucent archival paper for line work overlay.',
    disabled: true,
  },
];

const groupedOptions: ComboBoxOption[] = [
  { value: 'pencils', label: 'Colored Pencils (72-set)', group: 'Drawing Tools' },
  { value: 'markers', label: 'Dual-Tip Brush Markers (48-set)', group: 'Drawing Tools' },
  { value: 'fineliners', label: 'Micro Fineliner Pens (0.3mm)', group: 'Drawing Tools' },
  { value: 'matte-pad', label: 'Botanical Doodles Coloring Pad', group: 'Coloring Books' },
  { value: 'mandala-book', label: 'Mindful Mandalas Hardcover', group: 'Coloring Books' },
  { value: 'gift-box', label: 'Luxury Velvet Keepsake Box', group: 'Accessories' },
  { value: 'tote-bag', label: 'Organic Cotton Canvas Tote', group: 'Accessories' },
];

const meta = {
  title: 'Design System/Atoms/ComboBox',
  component: ComboBox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical searchable single-select ComboBox adhering to Unwind & Doodle design tokens and WAI-ARIA combobox patterns. Supports size scales (SM 32px, MD 40px, LG 48px), keyboard navigation, live search filtering, creatable custom values, loading indicators, option grouping, and rich metadata.',
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
      description: 'Disables the combobox.',
    },
    required: {
      control: 'boolean',
      description: 'Marks the field as required.',
    },
    allowCustom: {
      control: 'boolean',
      description: 'Allows creating custom typed entries not in the options list.',
    },
    isLoading: {
      control: 'boolean',
      description: 'Shows loading spinner in the dropdown.',
    },
    clearable: {
      control: 'boolean',
      description: 'Shows clear button when option is selected.',
    },
    label: {
      control: 'text',
      description: 'Accessible label above the control.',
    },
    helperText: {
      control: 'text',
      description: 'Guidance note below the control.',
    },
    errorMessage: {
      control: 'text',
      description: 'Validation error message below the control.',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder when no option is selected.',
    },
  },
  args: {
    size: 'md',
    options: samplePaperOptions,
    disabled: false,
    required: false,
    allowCustom: false,
    clearable: true,
    isLoading: false,
    placeholder: 'Select paper type...',
  },
  decorators: [
    (Story) => (
      <div className="w-[380px] max-w-full p-4 min-h-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComboBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 1. Default Dropdown
 */
export const Default: Story = {
  args: {
    options: samplePaperOptions,
    defaultValue: 'matte-120',
  },
};

/**
 * 2. With Label & Helper Text
 */
export const WithLabelAndHelper: Story = {
  args: {
    label: 'Paper Type & Weight',
    helperText: 'Select the optimal paper weight for your coloring medium.',
    options: samplePaperOptions,
    defaultValue: 'cardstock-200',
  },
};

/**
 * 3. With Leading Icon
 */
export const WithLeadingIcon: Story = {
  args: {
    label: 'Delivery Location',
    placeholder: 'Search shipping city...',
    options: [
      { label: 'London, United Kingdom', value: 'london' },
      { label: 'New York, United States', value: 'nyc' },
      { label: 'Toronto, Canada', value: 'toronto' },
      { label: 'Sydney, Australia', value: 'sydney' },
    ],
    defaultValue: 'london',
    leadingIcon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
};

/**
 * 4. Rich Options with Descriptions and Icons
 */
export const RichOptions: Story = {
  args: {
    label: 'Coloring Medium & Finish',
    defaultValue: 'markers',
    options: [
      {
        value: 'markers',
        label: 'Alcohol Ink Markers',
        description: 'Vibrant, blendable gradient saturation',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
            <path d="M15 13 9 7l4-4 6 6h3l3 3" />
          </svg>
        ),
      },
      {
        value: 'pencils',
        label: 'Wax-Based Colored Pencils',
        description: 'Soft core for rich layering and burnishing',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        ),
      },
      {
        value: 'watercolor',
        label: 'Liquid Watercolor Pans',
        description: 'Luminous transparent washes and glazing',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        ),
      },
    ],
  },
};

/**
 * 5. Grouped Options
 */
export const Grouped: Story = {
  args: {
    label: 'Add Complementary Item',
    options: groupedOptions,
    defaultValue: 'markers',
  },
};

/**
 * 6. Creatable Custom Values
 */
export const CreatableCustomValues: Story = {
  render: () => {
    const [val, setVal] = useState<string | number | null>('Art Therapy Workshop');
    return (
      <ComboBox
        label="Gift Occasion / Custom Note"
        helperText="Select a predefined occasion or type your own custom occasion."
        allowCustom
        options={[
          { value: 'birthday', label: 'Birthday Celebration' },
          { value: 'stress-relief', label: 'Mindful Stress Relief' },
          { value: 'holiday', label: 'Holiday & Seasonal Cheer' },
        ]}
        value={val}
        onChange={(nextVal) => setVal(nextVal)}
      />
    );
  },
};

/**
 * 7. Async Loading State
 */
export const AsyncLoading: Story = {
  args: {
    label: 'Live Inventory Search',
    isLoading: true,
    options: [],
    searchPlaceholder: 'Searching SKU catalog...',
  },
};

/**
 * 8. Sizing Matrix (SM: 32px, MD: 40px, LG: 48px)
 */
export const SizingMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full">
      <ComboBox
        size="sm"
        label="Small ComboBox (32px)"
        options={samplePaperOptions}
        defaultValue="matte-120"
      />
      <ComboBox
        size="md"
        label="Medium ComboBox (40px - Default)"
        options={samplePaperOptions}
        defaultValue="cardstock-200"
      />
      <ComboBox
        size="lg"
        label="Large ComboBox (48px)"
        options={samplePaperOptions}
        defaultValue="watercolor-300"
      />
    </div>
  ),
};

/**
 * 9. Error State
 */
export const ErrorState: Story = {
  args: {
    label: 'Shipping Carrier',
    options: samplePaperOptions,
    errorMessage: 'Please select an available shipping method for this area.',
  },
};

/**
 * 10. Disabled State
 */
export const DisabledState: Story = {
  args: {
    label: 'Standard Pack Size',
    disabled: true,
    options: samplePaperOptions,
    defaultValue: 'matte-120',
    helperText: 'Pack size cannot be modified for this item.',
  },
};

/**
 * 11. Interactive User Event & Selection Test
 */
export const InteractivePlay: Story = {
  args: {
    label: 'Interactive Test',
    options: samplePaperOptions,
    defaultValue: 'matte-120',
    'data-testid': 'interactive-combobox',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const trigger = canvas.getByRole('button');
    await expect(trigger).toBeInTheDocument();
    await expect(trigger).toHaveTextContent('Standard Matte Paper (120gsm)');

    // Click trigger to open dropdown
    await userEvent.click(trigger);
    const searchInput = canvas.getByRole('textbox', { name: /search/i });
    await expect(searchInput).toBeInTheDocument();

    // Type to filter options
    await userEvent.type(searchInput, 'Artist');
    const option = canvas.getByRole('option', { name: /Artist/i });
    await expect(option).toBeInTheDocument();

    // Click to select filtered option
    await userEvent.click(option);
    await expect(trigger).toHaveTextContent('Heavyweight Artist Cardstock (200gsm)');
  },
};
