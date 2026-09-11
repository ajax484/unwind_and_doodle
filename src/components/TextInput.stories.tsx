import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React from 'react';
import TextInput from './TextInput';

const meta = {
  title: 'Design System/Atoms/TextInput',
  component: TextInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical text input atom adhering directly to Figma Component Set `16:3840` (19 variants) and Documentation Board `16:4122` on the `Components` page. Features standard sizing scales (SM 32px, MD 40px, LG 48px), tokenized borders (`#DCE7EE`), brand focus rings (`#A7C2D4`), leading/trailing icon slots, accessible label pairing with `useId()`, and error states.',
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
      description: 'Disables the input and applies disabled styling tokens.',
    },
    required: {
      control: 'boolean',
      description: 'Marks input as required with an asterisk.',
    },
    label: {
      control: 'text',
      description: 'Accessible label above the input.',
    },
    helperText: {
      control: 'text',
      description: 'Helper guidance note below the input.',
    },
    errorMessage: {
      control: 'text',
      description: 'Validation error message below the input.',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder string.',
    },
  },
  args: {
    size: 'md',
    placeholder: 'Enter your email...',
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
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 1. Default Unfilled Input
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter your email address...',
  },
};

/**
 * 2. With Label & Helper Text
 */
export const WithLabelAndHelper: Story = {
  args: {
    label: 'Email Address',
    helperText: 'We will never share your email with third parties.',
    placeholder: 'alex@example.com',
  },
};

/**
 * 3. Required Input Field
 */
export const RequiredField: Story = {
  args: {
    label: 'Full Name',
    required: true,
    placeholder: 'Jane Doe',
  },
};

/**
 * 4. Sizing Matrix (SM: 32px, MD: 40px, LG: 48px)
 */
export const SizingMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-5 w-full">
      <TextInput
        size="sm"
        label="Small Input (32px)"
        placeholder="Compact field..."
      />
      <TextInput
        size="md"
        label="Medium Input (40px - Default)"
        placeholder="Standard field..."
      />
      <TextInput
        size="lg"
        label="Large Input (48px)"
        placeholder="Spacious field..."
      />
    </div>
  ),
};

/**
 * 5. With Leading Icon
 */
export const WithLeadingIcon: Story = {
  args: {
    label: 'Search Catalog',
    placeholder: 'Search coloring books, markers...',
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
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
};

/**
 * 6. With Trailing Icon
 */
export const WithTrailingIcon: Story = {
  args: {
    label: 'Password',
    type: 'password',
    defaultValue: 'supersecret',
    trailingIcon: (
      <button
        type="button"
        className="text-text-placeholder hover:text-text-primary transition-colors focus:outline-none"
        aria-label="Toggle password visibility"
      >
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
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    ),
  },
};

/**
 * 7. With Both Icons
 */
export const WithBothIcons: Story = {
  args: {
    label: 'Contact Email',
    defaultValue: 'support@unwindanddoodle.com',
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
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    trailingIcon: (
      <span className="text-status-success-accent" aria-label="Valid email">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    ),
  },
};

/**
 * 8. Error State with Validation Alert
 */
export const ErrorState: Story = {
  args: {
    label: 'Email Address',
    defaultValue: 'invalid-email-format',
    errorMessage: 'Please enter a valid email address with @ domain.',
  },
};

/**
 * 9. Disabled State
 */
export const DisabledState: Story = {
  args: {
    label: 'Account Reference Code',
    defaultValue: 'ACC-8921-X99',
    disabled: true,
    helperText: 'System generated code cannot be modified.',
  },
};

/**
 * 10. Interactive User Event & Accessibility Test
 */
export const InteractivePlay: Story = {
  args: {
    label: 'Interactive Email',
    placeholder: 'Type here...',
    helperText: 'Enter your preferred address',
    'data-testid': 'interactive-input',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify accessible label binding
    const input = canvas.getByLabelText(/Interactive Email/i);
    await expect(input).toBeInTheDocument();

    // Verify typing
    await userEvent.click(input);
    await userEvent.type(input, 'hello@world.com');
    await expect(input).toHaveValue('hello@world.com');

    // Verify aria-describedby connects to helper text
    const helper = canvas.getByText('Enter your preferred address');
    await expect(helper).toBeInTheDocument();
    await expect(input).toHaveAttribute('aria-describedby', helper.id);
  },
};

/**
 * 11. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    label: 'Token Test',
    placeholder: 'Testing tokens...',
    'data-testid': 'css-check-input',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId('css-check-input');
    await expect(input).toBeInTheDocument();

    // The wrapper container holds border tokens
    const container = input.parentElement;
    await expect(container).not.toBeNull();
    if (container) {
      const computed = window.getComputedStyle(container);
      // Border radius 14px (Radius/MD -> rounded-xl ~ 12-14px)
      await expect(computed.borderRadius).not.toBe('0px');
    }
  },
};
