import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React from 'react';
import Textarea from './Textarea';

const meta = {
  title: 'Design System/Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical multiline textarea atom adhering directly to Figma Component Set `16:3977` (17 variants) and Documentation Board `16:4122` on the `Components` page. Features standard sizing scales (SM 80px, MD 104px, LG 128px), resize modes (vertical, none, both), real-time character counting, tokenized borders (`#DCE7EE`), and accessible error/helper messaging.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Sizing scale variant for initial height (SM 80px, MD 104px, LG 128px).',
    },
    resize: {
      control: 'radio',
      options: ['vertical', 'none', 'both'],
      description: 'CSS resize behavior.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the textarea.',
    },
    required: {
      control: 'boolean',
      description: 'Marks textarea as required.',
    },
    showCount: {
      control: 'boolean',
      description: 'Displays current character count and optional maxLength.',
    },
    maxLength: {
      control: 'number',
      description: 'Maximum permitted characters.',
    },
    label: {
      control: 'text',
      description: 'Accessible label above the textarea.',
    },
    helperText: {
      control: 'text',
      description: 'Helper note below the textarea.',
    },
    errorMessage: {
      control: 'text',
      description: 'Error validation note.',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder string.',
    },
  },
  args: {
    size: 'md',
    resize: 'vertical',
    placeholder: 'Write your notes or instructions here...',
    disabled: false,
    required: false,
    showCount: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 1. Default Textarea
 */
export const Default: Story = {
  args: {
    placeholder: 'Write your thoughts or custom instructions here...',
  },
};

/**
 * 2. With Label & Helper Text
 */
export const WithLabelAndHelper: Story = {
  args: {
    label: 'Personalized Gift Message',
    helperText: 'This message will be printed on high quality parchment cardstock.',
    placeholder: 'Dear friend, hope you enjoy coloring this book...',
  },
};

/**
 * 3. With Dynamic Character Counter
 */
export const WithCharacterCounter: Story = {
  args: {
    label: 'Custom Cover Engraving Text',
    maxLength: 100,
    showCount: true,
    defaultValue: 'Unwind & Doodle - Mindfulness Collection',
  },
};

/**
 * 4. Sizing Matrix (SM: 80px, MD: 104px, LG: 128px)
 */
export const SizingMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-5 w-full">
      <Textarea
        size="sm"
        label="Small Textarea (80px min-height)"
        placeholder="Short memo or comment..."
      />
      <Textarea
        size="md"
        label="Medium Textarea (104px min-height - Default)"
        placeholder="Standard review or feedback..."
      />
      <Textarea
        size="lg"
        label="Large Textarea (128px min-height)"
        placeholder="Extended custom instructions or notes..."
      />
    </div>
  ),
};

/**
 * 5. Resize Controls
 */
export const ResizeModes: Story = {
  render: () => (
    <div className="flex flex-col gap-5 w-full">
      <Textarea
        resize="none"
        label="Fixed Dimension (resize: none)"
        placeholder="Cannot be manually resized..."
      />
      <Textarea
        resize="vertical"
        label="Vertical Resize (resize: vertical - Default)"
        placeholder="Can be resized vertically only..."
      />
    </div>
  ),
};

/**
 * 6. Required Field
 */
export const RequiredField: Story = {
  args: {
    label: 'Delivery Instructions',
    required: true,
    placeholder: 'e.g. Gate code #1234 or leave with building concierge.',
  },
};

/**
 * 7. Error State
 */
export const ErrorState: Story = {
  args: {
    label: 'Special Request',
    defaultValue: 'Urgent weekend express delivery with custom gift wrap.',
    errorMessage: 'Custom gift wrap is temporarily unavailable for this item.',
  },
};

/**
 * 8. Disabled State
 */
export const DisabledState: Story = {
  args: {
    label: 'Order Notes',
    defaultValue: 'Packed and verified by fulfillment warehouse.',
    disabled: true,
    helperText: 'Order notes cannot be modified once shipped.',
  },
};

/**
 * 9. Interactive User Event & Counter Test
 */
export const InteractivePlay: Story = {
  args: {
    label: 'Interactive Notes',
    placeholder: 'Type something...',
    maxLength: 50,
    showCount: true,
    'data-testid': 'interactive-textarea',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const textarea = canvas.getByLabelText(/Interactive Notes/i);
    await expect(textarea).toBeInTheDocument();

    // Verify typing updates value and counter
    await userEvent.click(textarea);
    await userEvent.type(textarea, 'Testing counter');
    await expect(textarea).toHaveValue('Testing counter');

    // 15 characters typed
    const counter = canvas.getByText(/15\s*\/\s*50/);
    await expect(counter).toBeInTheDocument();
  },
};

/**
 * 10. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    label: 'CSS Token Inspection',
    placeholder: 'Token inspection...',
    'data-testid': 'css-check-textarea',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByTestId('css-check-textarea');
    await expect(textarea).toBeInTheDocument();

    const container = textarea.closest('.rounded-xl');
    await expect(container).not.toBeNull();
  },
};
