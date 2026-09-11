import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import React from 'react';
import { Spinner } from './Spinner';

const meta = {
  title: 'Design System/Atoms/Spinner',
  component: Spinner,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Size scale (SM: 16px, MD: 24px default, LG: 40px)',
    },
    color: {
      control: 'select',
      options: ['rose', 'blue', 'charcoal', 'white', 'current'],
      description: 'Semantic color mapping',
    },
    label: {
      control: 'text',
      description: 'Accessible screen-reader loading label',
    },
  },
  args: {
    size: 'md',
    color: 'rose',
    label: 'Loading...',
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    color: 'rose',
  },
};

export const Rose: Story = {
  args: {
    size: 'md',
    color: 'rose',
  },
};

export const Blue: Story = {
  args: {
    size: 'md',
    color: 'blue',
  },
};

export const Charcoal: Story = {
  args: {
    size: 'md',
    color: 'charcoal',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    color: 'rose',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    color: 'rose',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    color: 'rose',
  },
};

export const InteractivePlay: Story = {
  args: {
    size: 'md',
    color: 'rose',
    label: 'Loading content...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const spinner = canvas.getByRole('status', { name: /Loading content.../i });
    await expect(spinner).toBeInTheDocument();
  },
};

export const CssCheck: Story = {
  args: {
    size: 'md',
    color: 'rose',
    'data-testid': 'css-check-spinner',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const spinner = canvas.getByTestId('css-check-spinner');
    await expect(spinner).toBeInTheDocument();
    const computedColor = window.getComputedStyle(spinner).color;
    // --color-action-primary: #D99BA3 => rgb(217, 155, 163)
    await expect(computedColor).toBe('rgb(217, 155, 163)');
  },
};
