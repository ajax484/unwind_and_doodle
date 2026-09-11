import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React, { useState } from 'react';
import { Pagination, type PaginationProps } from './Pagination';

const meta = {
  title: 'Design System/Molecules/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md'],
      description: 'Sizing scale for pagination buttons (SM: 32px, MD: 40px)',
    },
    currentPage: {
      control: 'number',
      description: 'Active 1-based page number',
    },
    totalPages: {
      control: 'number',
      description: 'Total number of pages',
    },
    showLabels: {
      control: 'boolean',
      description: 'Whether to show textual Previous/Next labels',
    },
  },
  args: {
    size: 'md',
    currentPage: 2,
    totalPages: 5,
    showLabels: false,
    onPageChange: fn(),
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    currentPage: 2,
    totalPages: 5,
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs">
      <Pagination {...args} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-8 p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs">
      <div className="space-y-2">
        <h4 className="text-xs font-heading font-bold text-text-tertiary uppercase tracking-wider">
          SM Scale (32px controls, 4px gap)
        </h4>
        <Pagination size="sm" currentPage={2} totalPages={5} onPageChange={fn()} />
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-heading font-bold text-text-tertiary uppercase tracking-wider">
          MD Scale (40px controls, 8px gap)
        </h4>
        <Pagination size="md" currentPage={2} totalPages={5} onPageChange={fn()} />
      </div>
    </div>
  ),
};

export const ShortRange: Story = {
  args: {
    size: 'md',
    currentPage: 3,
    totalPages: 4,
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs">
      <Pagination {...args} />
    </div>
  ),
};

export const LongRangeFirst: Story = {
  args: {
    size: 'md',
    currentPage: 1,
    totalPages: 10,
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs">
      <Pagination {...args} />
    </div>
  ),
};

export const LongRangeMiddle: Story = {
  args: {
    size: 'md',
    currentPage: 5,
    totalPages: 10,
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs">
      <Pagination {...args} />
    </div>
  ),
};

export const LongRangeLast: Story = {
  args: {
    size: 'md',
    currentPage: 10,
    totalPages: 10,
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs">
      <Pagination {...args} />
    </div>
  ),
};

export const WithLabels: Story = {
  args: {
    size: 'sm',
    currentPage: 2,
    totalPages: 6,
    showLabels: true,
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default shadow-xs">
      <Pagination {...args} />
    </div>
  ),
};

export const InteractivePlay: Story = {
  args: {
    size: 'md',
    currentPage: 1,
    totalPages: 5,
    onPageChange: fn(),
    'data-testid': 'interactive-pagination',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const prevBtn = canvas.getByTestId('pagination-prev');
    const nextBtn = canvas.getByTestId('pagination-next');
    const page1 = canvas.getByTestId('pagination-page-1');
    const page2 = canvas.getByTestId('pagination-page-2');
    const page3 = canvas.getByTestId('pagination-page-3');

    // On page 1, previous should be disabled
    await expect(prevBtn).toBeDisabled();
    await expect(page1).toHaveAttribute('aria-current', 'page');
    await expect(page2).not.toHaveAttribute('aria-current');

    // Click Next button
    await userEvent.click(nextBtn);
    await expect(args.onPageChange).toHaveBeenCalledWith(2);

    // Click page 3 button
    await userEvent.click(page3);
    await expect(args.onPageChange).toHaveBeenCalledWith(3);
  },
};

export const CssCheck: Story = {
  args: {
    size: 'md',
    currentPage: 1,
    totalPages: 3,
    onPageChange: fn(),
    'data-testid': 'css-check-pagination',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const activePage = canvas.getByTestId('pagination-page-1');
    const inactivePage = canvas.getByTestId('pagination-page-2');

    await expect(activePage).toBeInTheDocument();
    await expect(inactivePage).toBeInTheDocument();

    const activeStyle = window.getComputedStyle(activePage);
    const inactiveStyle = window.getComputedStyle(inactivePage);

    // Active page background should be bg-bg-subtle (#F4F8FA => rgb(244, 248, 250))
    await expect(activeStyle.backgroundColor).toBe('rgb(244, 248, 250)');

    // Active page text should be text-text-primary (#243342 => rgb(36, 51, 66))
    await expect(activeStyle.color).toBe('rgb(36, 51, 66)');

    // Inactive page text should be text-text-secondary (#52657A => rgb(82, 101, 122))
    await expect(inactiveStyle.color).toBe('rgb(82, 101, 122)');

    // Typography font heading should be Fredoka
    await expect(activeStyle.fontFamily).toMatch(/Fredoka/);
  },
};
