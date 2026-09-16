import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React from 'react';
import RichTextEditor from './RichTextEditor';

const meta = {
  title: 'Design System/Molecules/RichTextEditor',
  component: RichTextEditor,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical rich text editor molecule powered by TipTap and ProseMirror. Features responsive toolbar formatting (Bold, Italic, Strikethrough, Paragraph, H2, H3, Lists, Blockquotes, Links, Undo/Redo), canonical sizing scales (SM 110px, MD 140px, LG 180px), tokenized borders, and accessible error/helper messaging.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Sizing scale variant for initial height (SM 110px, MD 140px, LG 180px).',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the rich text editor.',
    },
    required: {
      control: 'boolean',
      description: 'Marks editor as required with an asterisk.',
    },
    label: {
      control: 'text',
      description: 'Accessible label above the editor.',
    },
    helperText: {
      control: 'text',
      description: 'Helper note below the editor.',
    },
    errorMessage: {
      control: 'text',
      description: 'Validation error message below the editor.',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder string.',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[440px] max-w-full p-4 bg-bg-surface rounded-2xl shadow-xs border border-border-default/50">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default interactive state with standard medium sizing.
 */
export const Default: Story = {
  args: {
    size: 'md',
    placeholder: 'Write a detailed description...',
    value: '<p>Welcome to <strong>Unwind & Doodle</strong>! Add rich details here.</p>',
    onChange: () => {},
  },
};

/**
 * Standard Form Field presentation with accessible Label, Required marker, and Helper note.
 */
export const WithLabelAndHelper: Story = {
  args: {
    label: 'Product Description',
    required: true,
    helperText: 'Use bullet points and bolding to highlight features.',
    size: 'md',
    value: '<p>Includes 30 hand-drawn coloring illustrations on premium heavyweight cardstock.</p>',
    onChange: () => {},
  },
};

/**
 * Form validation error state with accessible role="alert" message and danger ring.
 */
export const WithError: Story = {
  args: {
    label: 'Bundle Description',
    required: true,
    errorMessage: 'Description must contain at least 20 characters.',
    size: 'md',
    value: '<p>Too short</p>',
    onChange: () => {},
  },
};

/**
 * Compact Sizing Scale (SM: min-h 110px).
 */
export const SizeSM: Story = {
  args: {
    label: 'Short Summary',
    size: 'sm',
    value: '<p>Compact notes and brief instructions.</p>',
    onChange: () => {},
  },
};

/**
 * Spacious Sizing Scale (LG: min-h 180px).
 */
export const SizeLG: Story = {
  args: {
    label: 'Full Workshop Syllabus',
    size: 'lg',
    value: '<h2>Course Overview</h2><p>A comprehensive multi-week artistic journey.</p>',
    onChange: () => {},
  },
};

/**
 * Disabled read-only state.
 */
export const Disabled: Story = {
  args: {
    label: 'Archived Description',
    disabled: true,
    helperText: 'This product has been archived and cannot be edited.',
    value: '<p>Archived content that is locked against modifications.</p>',
    onChange: () => {},
  },
};

/**
 * Interactive play test verifying toolbar buttons and accessible regions.
 */
export const InteractivePlay: Story = {
  args: {
    label: 'Live Test Editor',
    helperText: 'Interactive test instance',
    size: 'md',
    value: '<p>Initial test content</p>',
    onChange: () => {},
    'data-testid': 'interactive-editor',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Assert container testid exists
    const editor = canvas.getByTestId('interactive-editor');
    await expect(editor).toBeInTheDocument();

    // Assert label and helper text exist
    const label = canvas.getByText('Live Test Editor');
    await expect(label).toBeInTheDocument();

    const helper = canvas.getByText('Interactive test instance');
    await expect(helper).toBeInTheDocument();

    // Assert bold button exists and is clickable
    const boldBtn = canvas.getByRole('button', { name: 'Bold' });
    await expect(boldBtn).toBeInTheDocument();
    await userEvent.click(boldBtn);
  },
};
