import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Design System/Molecules/EmptyState',
  component: EmptyState,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Scale and target max-width (SM: 340px, MD: 440px, LG: 560px)',
    },
    title: {
      control: 'text',
      description: 'Primary headline text (Fredoka Bold)',
    },
    description: {
      control: 'text',
      description: 'Supporting description text (Plus Jakarta Sans)',
    },
    icon: {
      control: 'boolean',
      description: 'Whether visual icon container is visible',
    },
  },
  args: {
    size: 'md',
    title: 'Your cart is empty',
    description: 'Add something thoughtful to your cart and make space for creativity.',
    icon: true,
    primaryAction: {
      label: 'Start Shopping',
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    title: 'Your cart is empty',
    description: 'Add something thoughtful to your cart and make space for creativity.',
    primaryAction: {
      label: 'Start Shopping',
    },
  },
};

export const SizeSM: Story = {
  args: {
    size: 'sm',
    title: 'No recent searches',
    description: 'Try searching for coloring books, markers, or stickers.',
    primaryAction: {
      label: 'Browse Catalog',
    },
  },
};

export const SizeMD: Story = {
  args: {
    size: 'md',
    title: 'No orders yet',
    description: 'When you place an order, its real-time shipping status will show up here.',
    primaryAction: {
      label: 'Explore Products',
    },
  },
};

export const SizeLG: Story = {
  args: {
    size: 'lg',
    title: 'No customer reviews recorded',
    description: 'Be the first to share your mindful coloring journey with our community.',
    primaryAction: {
      label: 'Write First Review',
    },
  },
};

export const DualActions: Story = {
  args: {
    size: 'md',
    title: 'No matching items found',
    description: 'We couldn’t find anything matching your search filters. Try clearing your selection.',
    primaryAction: {
      label: 'Clear Filters',
    },
    secondaryAction: {
      label: 'View All Collections',
    },
  },
};

export const NoIcon: Story = {
  args: {
    size: 'sm',
    icon: false,
    title: 'Zero results found',
    description: 'Check your spelling or try broader keywords.',
    primaryAction: {
      label: 'Reset Search',
    },
  },
};

export const NoDescription: Story = {
  args: {
    size: 'sm',
    title: 'No notifications at this time',
    description: undefined,
  },
};

export const CustomIcon: Story = {
  args: {
    size: 'md',
    icon: (
      <svg
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        className="w-full h-full text-action-primary"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    title: 'Your wishlist is empty',
    description: 'Save your favorite doodle packs and art supplies to review later.',
    primaryAction: {
      label: 'Explore Catalog',
    },
  },
};

export const InteractivePlay: Story = {
  args: {
    size: 'md',
    title: 'Interactive Test State',
    description: 'Verifying click action triggers in test harness.',
    primaryAction: {
      label: 'Primary Click Action',
      onClick: fn(),
    },
    secondaryAction: {
      label: 'Secondary Click Action',
      onClick: fn(),
    },
    'data-testid': 'interactive-empty-state',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify accessible role and content
    const heading = canvas.getByRole('heading', { name: /Interactive Test State/i });
    await expect(heading).toBeInTheDocument();

    const primaryBtn = canvas.getByRole('button', { name: /Primary Click Action/i });
    await userEvent.click(primaryBtn);
    await expect(args.primaryAction?.onClick).toHaveBeenCalledTimes(1);

    const secondaryBtn = canvas.getByRole('button', { name: /Secondary Click Action/i });
    await userEvent.click(secondaryBtn);
    await expect(args.secondaryAction?.onClick).toHaveBeenCalledTimes(1);
  },
};

export const CssCheck: Story = {
  args: {
    size: 'md',
    title: 'CSS Token Inspection',
    description: 'Inspecting surface and typography token inheritance.',
    'data-testid': 'css-check-empty-state',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const root = canvas.getByTestId('css-check-empty-state');
    await expect(root).toBeInTheDocument();

    const heading = root.querySelector('h3');
    await expect(heading).toBeInTheDocument();
    const headingStyle = window.getComputedStyle(heading!);

    // text-text-primary: #243342 => rgb(36, 51, 66)
    await expect(headingStyle.color).toBe('rgb(36, 51, 66)');
    // font-heading: Fredoka
    await expect(headingStyle.fontFamily).toMatch(/Fredoka/);
  },
};
