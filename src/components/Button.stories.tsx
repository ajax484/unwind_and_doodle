import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within, userEvent } from 'storybook/test';
import React from 'react';
import { Button } from './Button';

const meta = {
  title: 'Design System/Atoms/Button',
  component: Button,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'stepper'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the button',
    },
    loading: {
      control: 'boolean',
      description: 'Displays a spinner and disables button interaction',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables user interaction and styles as muted',
    },
    iconOnly: {
      control: 'boolean',
      description: 'Renders the button as a square/circular icon container',
    },
    children: {
      control: 'text',
      description: 'Button text or child elements',
    },
  },
  args: {
    onClick: fn(),
    children: 'Button',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    iconOnly: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Canonical Figma Default
export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Primary Action',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    children: 'Secondary Action',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    size: 'md',
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    children: 'Ghost Action',
  },
};

export const Stepper: Story = {
  args: {
    variant: 'stepper',
    size: 'md',
    children: '+',
    'aria-label': 'Increase quantity',
  },
};

export const WithLeadingIcon: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Favorite',
    leadingIcon: (
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

export const WithTrailingIcon: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    children: 'Next Step',
    trailingIcon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    ),
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    loading: true,
    children: 'Processing...',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
    children: 'Disabled Button',
  },
};

export const InteractivePlay: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Click to Test',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Click to Test/i });
    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

// Required single CssCheck story verifying Tailwind @theme tokens compile in Storybook
export const CssCheck: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Design Token Check',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Design Token Check/i });
    const computedBg = window.getComputedStyle(button).backgroundColor;
    // --color-action-primary: #D99BA3 => rgb(217, 155, 163)
    await expect(computedBg).toBe('rgb(217, 155, 163)');
    const computedFont = window.getComputedStyle(button).fontFamily;
    await expect(computedFont.toLowerCase()).toContain('fredoka');
  },
};
