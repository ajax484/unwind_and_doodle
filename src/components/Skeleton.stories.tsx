import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import React from 'react';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'Design System/Atoms/Skeleton',
  component: Skeleton,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'image', 'card', 'tableRow', 'custom'],
      description: 'Structural skeleton placeholder type',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Scale tier (SM, MD default, LG)',
    },
    lines: {
      control: 'radio',
      options: [1, 2, 3],
      description: 'Number of organic text lines for type="text"',
    },
  },
  args: {
    type: 'text',
    size: 'md',
    lines: 1,
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    size: 'md',
    lines: 1,
    className: 'w-64',
  },
};

export const TextSingleLine: Story = {
  args: {
    type: 'text',
    size: 'md',
    lines: 1,
    className: 'w-72',
  },
};

export const TextMultiLine: Story = {
  args: {
    type: 'text',
    size: 'md',
    lines: 3,
    className: 'w-80',
  },
};

export const Image: Story = {
  args: {
    type: 'image',
    size: 'md',
  },
};

export const Card: Story = {
  args: {
    type: 'card',
    size: 'md',
  },
};

export const TableRow: Story = {
  args: {
    type: 'tableRow',
    size: 'md',
    className: 'w-[500px]',
  },
};

export const CustomBlock: Story = {
  args: {
    type: 'custom',
    className: 'w-64 h-32 rounded-2xl',
  },
};

export const InteractivePlay: Story = {
  args: {
    type: 'text',
    className: 'w-64',
    'data-testid': 'interactive-skeleton',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const skeleton = canvas.getByTestId('interactive-skeleton');
    await expect(skeleton).toBeInTheDocument();
  },
};

export const CssCheck: Story = {
  args: {
    type: 'custom',
    className: 'w-32 h-12',
    'data-testid': 'css-check-skeleton',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const skeleton = canvas.getByTestId('css-check-skeleton');
    await expect(skeleton).toBeInTheDocument();
    const computedBg = window.getComputedStyle(skeleton).backgroundColor;
    // --color-bg-subtle: #F4F8FA => rgb(244, 248, 250)
    await expect(computedBg).toBe('rgb(244, 248, 250)');
  },
};
