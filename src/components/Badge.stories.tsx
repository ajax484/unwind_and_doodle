import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import React from 'react';
import { Badge } from './Badge';

const meta = {
  title: 'Design System/Atoms/Badge',
  component: Badge,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['status', 'bundle', 'tag', 'accent', 'brand'],
      description: 'Visual category of the badge',
    },
    statusType: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'info', 'purple', 'neutral'],
      description: 'Semantic status color when variant="status"',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
      description: 'Size scale (SM: 24px height, MD: 28px height)',
    },
    dot: {
      control: 'boolean',
      description: 'Renders an optical status indicator circle',
    },
    pulse: {
      control: 'boolean',
      description: 'Applies an attention-grabbing animation pulse',
    },
    disabled: {
      control: 'boolean',
      description: 'Applies muted background and text styling',
    },
    children: {
      control: 'text',
      description: 'Badge content or text label',
    },
  },
  args: {
    variant: 'status',
    statusType: 'neutral',
    size: 'md',
    dot: false,
    pulse: false,
    disabled: false,
    children: 'Badge',
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'status',
    statusType: 'neutral',
    children: 'Neutral Badge',
  },
};

export const Success: Story = {
  args: {
    variant: 'status',
    statusType: 'success',
    dot: true,
    children: 'Delivered',
  },
};

export const Warning: Story = {
  args: {
    variant: 'status',
    statusType: 'warning',
    dot: true,
    pulse: true,
    children: 'Pending Review',
  },
};

export const Danger: Story = {
  args: {
    variant: 'status',
    statusType: 'danger',
    dot: true,
    children: 'Cancelled',
  },
};

export const Info: Story = {
  args: {
    variant: 'status',
    statusType: 'info',
    dot: true,
    children: 'Shipped',
  },
};

export const Purple: Story = {
  args: {
    variant: 'status',
    statusType: 'purple',
    dot: true,
    children: 'Refunded',
  },
};

export const Bundle: Story = {
  args: {
    variant: 'bundle',
    size: 'md',
    icon: <span className="mr-1">📦</span>,
    children: 'Bundle • 3 Items',
  },
};

export const Tag: Story = {
  args: {
    variant: 'tag',
    size: 'md',
    children: 'Coloring Book',
  },
};

export const Accent: Story = {
  args: {
    variant: 'accent',
    size: 'sm',
    icon: <span className="mr-0.5">✨</span>,
    children: 'Custom Photo',
  },
};

export const Brand: Story = {
  args: {
    variant: 'brand',
    dot: true,
    children: 'Confirmed',
  },
};

export const Small: Story = {
  args: {
    variant: 'status',
    statusType: 'success',
    size: 'sm',
    dot: true,
    children: 'In Stock',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'status',
    statusType: 'neutral',
    disabled: true,
    children: 'Disabled Badge',
  },
};

export const InteractivePlay: Story = {
  args: {
    variant: 'status',
    statusType: 'success',
    dot: true,
    children: 'Interactive Test',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Interactive Test');
    await expect(badge).toBeInTheDocument();
  },
};

export const CssCheck: Story = {
  args: {
    variant: 'status',
    statusType: 'success',
    children: 'Token Style Check',
    'data-testid': 'css-check-badge',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByTestId('css-check-badge');
    await expect(badge).toBeInTheDocument();
    const computedBg = window.getComputedStyle(badge).backgroundColor;
    // --color-status-success-bg: #EBF8F2 => rgb(235, 248, 242)
    await expect(computedBg).toBe('rgb(235, 248, 242)');
  },
};
