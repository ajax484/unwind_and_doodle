import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React, { useState } from 'react';
import Checkbox from './Checkbox';

const meta = {
  title: 'Design System/Atoms/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical selection checkbox atom adhering directly to Figma Component Set `16:4121` (4 production variants) and Documentation Board `16:4122` on the `Components` page. Features 20px optical box dimension, `Radius/SM` (8px), Rose active fill (`#D99BA3`), crisp vector checkmark / minus SVGs, accessible labels, and support for indeterminate tri-state.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Controlled checked state.',
    },
    defaultChecked: {
      control: 'boolean',
      description: 'Initial unchecked/checked state.',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Partial tri-state selection representation.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables user interaction.',
    },
    label: {
      control: 'text',
      description: 'Primary text label beside the checkbox.',
    },
    description: {
      control: 'text',
      description: 'Secondary guidance description under label.',
    },
    errorMessage: {
      control: 'text',
      description: 'Validation error message below control.',
    },
  },
  args: {
    label: 'Subscribe to newsletter',
    disabled: false,
    indeterminate: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[380px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 1. Default Unchecked
 */
export const Default: Story = {
  args: {
    label: 'Save this shipping address for future orders',
  },
};

/**
 * 2. Checked State
 */
export const Checked: Story = {
  args: {
    label: 'I accept the terms and conditions',
    defaultChecked: true,
  },
};

/**
 * 3. Indeterminate (Tri-State)
 */
export const Indeterminate: Story = {
  args: {
    label: 'Select all cart items (2 of 5 selected)',
    indeterminate: true,
  },
};

/**
 * 4. With Description
 */
export const WithDescription: Story = {
  args: {
    label: 'Gift Packaging & Artisan Wax Seal',
    description: 'Each book is wrapped in acid-free mulberry paper with a hand-pressed dried botanical seal.',
    defaultChecked: true,
  },
};

/**
 * 5. Error Validation State
 */
export const ErrorState: Story = {
  args: {
    label: 'I confirm that I am at least 18 years of age',
    errorMessage: 'You must confirm age eligibility to proceed.',
  },
};

/**
 * 6. Disabled Unchecked
 */
export const DisabledUnchecked: Story = {
  args: {
    label: 'SMS Shipment Tracking Alerts',
    description: 'SMS notification service is currently undergoing maintenance.',
    disabled: true,
  },
};

/**
 * 7. Disabled Checked
 */
export const DisabledChecked: Story = {
  args: {
    label: 'Essential Functional & Security Cookies',
    description: 'Required for core session state and CSRF authentication security.',
    disabled: true,
    defaultChecked: true,
  },
};

/**
 * 8. State Matrix (Figma Component Set 16:4121 Variants)
 */
export const StateMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-full">
      <Checkbox label="Variant 1: State=Unchecked" />
      <Checkbox label="Variant 2: State=Checked" defaultChecked />
      <Checkbox label="Variant 3: State=Indeterminate" indeterminate />
      <Checkbox label="Variant 4: State=Disabled" disabled defaultChecked />
    </div>
  ),
};

/**
 * 9. Interactive User Event & Check Test
 */
export const InteractivePlay: Story = {
  args: {
    label: 'Interactive Checkbox',
    'data-testid': 'interactive-check',
  },
  render: (args) => {
    const InteractiveWrapper = () => {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          {...args}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
      );
    };
    return <InteractiveWrapper />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const input = canvas.getByTestId('interactive-check') as HTMLInputElement;
    await expect(input).toBeInTheDocument();
    await expect(input.checked).toBe(false);

    // Click to check
    await userEvent.click(input);
    await expect(input.checked).toBe(true);

    // Click to uncheck
    await userEvent.click(input);
    await expect(input.checked).toBe(false);
  },
};

/**
 * 10. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    label: 'CSS Box Geometry',
    'data-testid': 'css-check-box',
    defaultChecked: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId('css-check-box');
    await expect(input).toBeInTheDocument();

    // Verify visual box element
    const visualBox = input.parentElement?.querySelector('.rounded-lg');
    await expect(visualBox).not.toBeNull();
    if (visualBox) {
      const computed = window.getComputedStyle(visualBox);
      // Dimensions: 20px (w-5 h-5 -> 1.25rem = 20px)
      await expect(computed.width).toBe('20px');
      await expect(computed.height).toBe('20px');
    }
  },
};
