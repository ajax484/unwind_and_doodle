import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React, { useState } from 'react';
import { Tabs, type TabsProps } from './Tabs';

const sampleProductTabs = [
  {
    id: 'details',
    label: 'Materials & Quality',
    panel: (
      <div className="p-4 bg-bg-surface border border-border-default rounded-xl text-sm text-text-secondary">
        Printed on 160gsm bleed-resistant archival paper. Designed for colored pencils and markers.
      </div>
    ),
  },
  {
    id: 'shipping',
    label: 'Delivery & Shipping',
    panel: (
      <div className="p-4 bg-bg-surface border border-border-default rounded-xl text-sm text-text-secondary">
        Express nationwide shipping across Nigeria. Orders dispatched within 24–48 hours.
      </div>
    ),
  },
  {
    id: 'customization',
    label: 'Customization Guide',
    panel: (
      <div className="p-4 bg-bg-surface border border-border-default rounded-xl text-sm text-text-secondary">
        Add custom names, personalized gift messages, and bespoke cover foil stamping.
      </div>
    ),
  },
];

const meta = {
  title: 'Design System/Molecules/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    style: {
      control: 'radio',
      options: ['underline', 'segmented'],
      description: 'Visual presentation style of the tabs',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
      description: 'Size scale for tab items',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether tabs fill full container width (segmented)',
    },
  },
  args: {
    tabs: sampleProductTabs,
    style: 'underline',
    size: 'md',
    fullWidth: false,
    'aria-label': 'Sample navigation tabs',
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnderlineDefault: Story = {
  args: {
    style: 'underline',
    size: 'md',
    tabs: sampleProductTabs,
    defaultActiveTab: 'details',
    'aria-label': 'Product details tabs',
  },
  render: (args) => (
    <div className="w-[600px] max-w-full p-4 bg-bg-surface rounded-2xl border border-border-default">
      <Tabs {...args} />
    </div>
  ),
};

export const SegmentedDefault: Story = {
  args: {
    style: 'segmented',
    size: 'md',
    tabs: [
      { id: 'all', label: 'All Products' },
      { id: 'coloring-books', label: 'Coloring Books' },
      { id: 'journals', label: 'Guided Journals' },
      { id: 'supplies', label: 'Art Supplies' },
    ],
    defaultActiveTab: 'all',
    'aria-label': 'Category filter tabs',
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default">
      <Tabs {...args} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-8 w-[640px] max-w-full p-6 bg-bg-surface rounded-2xl border border-border-default">
      <div className="space-y-2">
        <h4 className="text-xs font-heading font-bold text-text-tertiary uppercase tracking-wider">
          Underline (SM vs MD)
        </h4>
        <div className="space-y-4">
          <Tabs
            style="underline"
            size="sm"
            tabs={[
              { id: 'sm-1', label: 'Overview' },
              { id: 'sm-2', label: 'Specifications' },
              { id: 'sm-3', label: 'Reviews' },
            ]}
            defaultActiveTab="sm-1"
          />
          <Tabs
            style="underline"
            size="md"
            tabs={[
              { id: 'md-1', label: 'Overview' },
              { id: 'md-2', label: 'Specifications' },
              { id: 'md-3', label: 'Reviews' },
            ]}
            defaultActiveTab="md-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-heading font-bold text-text-tertiary uppercase tracking-wider">
          Segmented (SM vs MD)
        </h4>
        <div className="space-y-4">
          <div>
            <Tabs
              style="segmented"
              size="sm"
              tabs={[
                { id: 'seg-sm-1', label: 'All' },
                { id: 'seg-sm-2', label: 'Active' },
                { id: 'seg-sm-3', label: 'Archived' },
              ]}
              defaultActiveTab="seg-sm-1"
            />
          </div>
          <div>
            <Tabs
              style="segmented"
              size="md"
              tabs={[
                { id: 'seg-md-1', label: 'All' },
                { id: 'seg-md-2', label: 'Active' },
                { id: 'seg-md-3', label: 'Archived' },
              ]}
              defaultActiveTab="seg-md-1"
            />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const WithCounts: Story = {
  render: () => (
    <div className="space-y-8 w-[640px] max-w-full p-6 bg-bg-surface rounded-2xl border border-border-default">
      <div className="space-y-3">
        <h4 className="text-xs font-heading font-bold text-text-tertiary uppercase tracking-wider">
          Segmented with Badge Counts
        </h4>
        <Tabs
          style="segmented"
          size="sm"
          tabs={[
            { id: 'all', label: 'All', count: 24 },
            { id: 'unread', label: 'Unread', count: 3 },
            { id: 'archived', label: 'Archived', count: 0 },
          ]}
          defaultActiveTab="unread"
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-heading font-bold text-text-tertiary uppercase tracking-wider">
          Underline with Badge Counts
        </h4>
        <Tabs
          style="underline"
          size="md"
          tabs={[
            { id: 'active', label: 'Active Orders', count: 12 },
            { id: 'dispatched', label: 'Dispatched', count: 5 },
            { id: 'delivered', label: 'Delivered', count: 142 },
          ]}
          defaultActiveTab="active"
        />
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  args: {
    style: 'segmented',
    size: 'md',
    tabs: [
      {
        id: 'grid',
        label: 'Grid View',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        ),
      },
      {
        id: 'list',
        label: 'List View',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        ),
      },
    ],
    defaultActiveTab: 'grid',
  },
  render: (args) => (
    <div className="p-6 bg-bg-surface rounded-2xl border border-border-default">
      <Tabs {...args} />
    </div>
  ),
};

export const DisabledTabs: Story = {
  args: {
    style: 'underline',
    size: 'md',
    tabs: [
      { id: 'available', label: 'Available Now' },
      { id: 'preorder', label: 'Pre-Orders', count: 2 },
      { id: 'archived', label: 'Past Seasons (Locked)', disabled: true },
    ],
    defaultActiveTab: 'available',
  },
  render: (args) => (
    <div className="w-[500px] max-w-full p-6 bg-bg-surface rounded-2xl border border-border-default">
      <Tabs {...args} />
    </div>
  ),
};

export const FullWidthSegmented: Story = {
  args: {
    style: 'segmented',
    size: 'md',
    fullWidth: true,
    tabs: [
      { id: 'signin', label: 'Sign In' },
      { id: 'signup', label: 'Create Account' },
    ],
    defaultActiveTab: 'signin',
  },
  render: (args) => (
    <div className="w-[360px] p-6 bg-bg-surface rounded-3xl border border-border-default shadow-sm">
      <Tabs {...args} />
    </div>
  ),
};

export const InteractivePlay: Story = {
  args: {
    style: 'underline',
    size: 'md',
    tabs: [
      {
        id: 'tab-1',
        label: 'First Tab',
        panel: <div data-testid="panel-content-1">Content 1</div>,
      },
      {
        id: 'tab-2',
        label: 'Second Tab',
        panel: <div data-testid="panel-content-2">Content 2</div>,
      },
      {
        id: 'tab-3',
        label: 'Third Tab',
        disabled: true,
        panel: <div data-testid="panel-content-3">Content 3</div>,
      },
      {
        id: 'tab-4',
        label: 'Fourth Tab',
        panel: <div data-testid="panel-content-4">Content 4</div>,
      },
    ],
    defaultActiveTab: 'tab-1',
    onChange: fn(),
    'data-testid': 'interactive-tabs',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const firstTab = canvas.getByRole('tab', { name: /First Tab/i });
    const secondTab = canvas.getByRole('tab', { name: /Second Tab/i });
    const thirdTab = canvas.getByRole('tab', { name: /Third Tab/i });
    const fourthTab = canvas.getByRole('tab', { name: /Fourth Tab/i });

    // Initial state
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
    await expect(secondTab).toHaveAttribute('aria-selected', 'false');
    await expect(thirdTab).toBeDisabled();
    await expect(canvas.getByTestId('panel-content-1')).toBeInTheDocument();

    // Click to activate second tab
    await userEvent.click(secondTab);
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
    await expect(firstTab).toHaveAttribute('aria-selected', 'false');
    await expect(canvas.getByTestId('panel-content-2')).toBeInTheDocument();
    await expect(args.onChange).toHaveBeenCalledWith('tab-2');

    // Test Arrow navigation: focus second tab and press ArrowRight (should skip disabled tab-3 and go to tab-4)
    secondTab.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(fourthTab).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.getByTestId('panel-content-4')).toBeInTheDocument();

    // ArrowRight again wraps around to tab-1
    await userEvent.keyboard('{ArrowRight}');
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');

    // ArrowLeft wraps around backwards to tab-4
    await userEvent.keyboard('{ArrowLeft}');
    await expect(fourthTab).toHaveAttribute('aria-selected', 'true');

    // Home jumps to tab-1
    await userEvent.keyboard('{Home}');
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');

    // End jumps to tab-4 (last non-disabled)
    await userEvent.keyboard('{End}');
    await expect(fourthTab).toHaveAttribute('aria-selected', 'true');
  },
};

export const CssCheck: Story = {
  args: {
    style: 'underline',
    size: 'md',
    tabs: [
      { id: 'active-check', label: 'Active Check' },
      { id: 'inactive-check', label: 'Inactive Check' },
    ],
    defaultActiveTab: 'active-check',
    'data-testid': 'css-check-tabs',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const activeTab = canvas.getByTestId('tab-active-check');
    const inactiveTab = canvas.getByTestId('tab-inactive-check');

    await expect(activeTab).toBeInTheDocument();
    await expect(inactiveTab).toBeInTheDocument();

    const activeStyle = window.getComputedStyle(activeTab);
    const inactiveStyle = window.getComputedStyle(inactiveTab);

    // Active bottom border color should be Brand Rose (#D99BA3 => rgb(217, 155, 163))
    await expect(activeStyle.borderBottomColor).toBe('rgb(217, 155, 163)');

    // Font heading should be Fredoka
    await expect(activeStyle.fontFamily).toMatch(/Fredoka/);

    // Active text should be primary charcoal rgb(36, 51, 66)
    await expect(activeStyle.color).toBe('rgb(36, 51, 66)');

    // Inactive text should be secondary slate rgb(82, 101, 122)
    await expect(inactiveStyle.color).toBe('rgb(82, 101, 122)');
  },
};
