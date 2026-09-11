import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import React from 'react';
import { Avatar } from './Avatar';

const SAMPLE_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

const meta = {
  title: 'Design System/Atoms/Avatar',
  component: Avatar,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Avatar scale (SM: 32px, MD: 40px, LG: 48px, XL: 64px)',
    },
    status: {
      control: 'select',
      options: ['none', 'online', 'offline', 'away'],
      description: 'Presence / status indicator badge',
    },
    name: {
      control: 'text',
      description: 'User full name (used for accessible label and initials extraction)',
    },
    initials: {
      control: 'text',
      description: 'Explicit 2-letter monogram',
    },
    src: {
      control: 'text',
      description: 'Source URL of avatar image',
    },
    alt: {
      control: 'text',
      description: 'Accessible image alternate text',
    },
  },
  args: {
    size: 'md',
    status: 'none',
    src: SAMPLE_AVATAR_URL,
    name: 'Bella Vance',
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    status: 'none',
    src: SAMPLE_AVATAR_URL,
    name: 'Bella Vance',
  },
};

export const InitialsDefault: Story = {
  args: {
    size: 'md',
    status: 'none',
    src: undefined,
    name: 'Bella Vance',
    initials: 'BV',
  },
};

export const SizeSM: Story = {
  args: {
    size: 'sm',
    src: SAMPLE_AVATAR_URL,
    name: 'Sarah Jenkins',
  },
};

export const SizeMD: Story = {
  args: {
    size: 'md',
    src: SAMPLE_AVATAR_URL,
    name: 'Sarah Jenkins',
  },
};

export const SizeLG: Story = {
  args: {
    size: 'lg',
    src: SAMPLE_AVATAR_URL,
    name: 'Sarah Jenkins',
  },
};

export const SizeXL: Story = {
  args: {
    size: 'xl',
    src: SAMPLE_AVATAR_URL,
    name: 'Sarah Jenkins',
  },
};

export const InitialsSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="sm" name="Sarah Jenkins" />
      <Avatar size="md" name="Bella Vance" />
      <Avatar size="lg" name="Amara Nwosu" />
      <Avatar size="xl" name="Chloe Morgan" />
    </div>
  ),
};

export const StatusOnline: Story = {
  args: {
    size: 'md',
    status: 'online',
    src: SAMPLE_AVATAR_URL,
    name: 'Bella Vance',
  },
};

export const StatusAway: Story = {
  args: {
    size: 'md',
    status: 'away',
    src: SAMPLE_AVATAR_URL,
    name: 'Bella Vance',
  },
};

export const StatusOffline: Story = {
  args: {
    size: 'md',
    status: 'offline',
    src: SAMPLE_AVATAR_URL,
    name: 'Bella Vance',
  },
};

export const StatusMatrix: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="w-16 text-xs text-text-tertiary font-medium">SM (32px):</span>
        <Avatar size="sm" status="none" name="Alex Doe" />
        <Avatar size="sm" status="online" name="Bella Vance" />
        <Avatar size="sm" status="away" name="Chris Pratt" />
        <Avatar size="sm" status="offline" name="Dana Scully" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-xs text-text-tertiary font-medium">MD (40px):</span>
        <Avatar size="md" status="none" name="Alex Doe" />
        <Avatar size="md" status="online" name="Bella Vance" />
        <Avatar size="md" status="away" name="Chris Pratt" />
        <Avatar size="md" status="offline" name="Dana Scully" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-xs text-text-tertiary font-medium">LG (48px):</span>
        <Avatar size="lg" status="none" name="Alex Doe" />
        <Avatar size="lg" status="online" name="Bella Vance" />
        <Avatar size="lg" status="away" name="Chris Pratt" />
        <Avatar size="lg" status="offline" name="Dana Scully" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-xs text-text-tertiary font-medium">XL (64px):</span>
        <Avatar size="xl" status="none" name="Alex Doe" />
        <Avatar size="xl" status="online" name="Bella Vance" />
        <Avatar size="xl" status="away" name="Chris Pratt" />
        <Avatar size="xl" status="offline" name="Dana Scully" />
      </div>
    </div>
  ),
};

export const FallbackOnError: Story = {
  args: {
    size: 'md',
    src: 'https://invalid-broken-domain-url.xyz/broken.jpg',
    name: 'John Doe',
    status: 'online',
  },
};

export const InteractivePlay: Story = {
  args: {
    size: 'md',
    name: 'Bella Vance',
    status: 'online',
    initials: 'BV',
    src: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const avatar = canvas.getByRole('img', { name: /Bella Vance/i });
    await expect(avatar).toBeInTheDocument();
    const status = canvas.getByRole('status');
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveAttribute('aria-label', 'Online');
  },
};

export const CssCheck: Story = {
  args: {
    size: 'md',
    name: 'Token Check',
    initials: 'TC',
    src: undefined,
    'data-testid': 'css-check-avatar',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const avatar = canvas.getByTestId('css-check-avatar');
    await expect(avatar).toBeInTheDocument();
    const computed = window.getComputedStyle(avatar);
    // --color-bg-subtle: #F4F8FA => rgb(244, 248, 250)
    await expect(computed.backgroundColor).toBe('rgb(244, 248, 250)');
    // Circular radius check (Tailwind rounded-full computes to 9999px, 50%, or 3.35544e+07px in Chromium)
    await expect(computed.borderRadius).toMatch(/9999px|50%|3\.35544e\+07px/);
  },
};
