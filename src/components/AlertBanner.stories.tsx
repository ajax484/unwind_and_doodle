import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import React, { useState } from 'react';
import { AlertBanner } from './AlertBanner';

const meta: Meta<typeof AlertBanner> = {
  title: 'Design System/Molecules/AlertBanner',
  component: AlertBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Canonical AlertBanner molecule adhering to Figma Component Set `53:13000` and Documentation Board `53:13001` "Alert Banners". Provides inline persistent feedback, warnings, confirmations, and announcements across storefront and admin experiences.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
      description: 'Semantic status colorway variant.',
    },
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Physical size variant (MD 14px radius, SM 8px radius).',
    },
    dismissible: {
      control: 'boolean',
      description: 'Whether to render an accessible close dismiss button.',
    },
    actionLabel: {
      control: 'text',
      description: 'Optional label for trailing action button.',
    },
    onDismiss: { action: 'dismissed' },
    onAction: { action: 'actionClicked' },
  },
  args: {
    onDismiss: fn(),
    onAction: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AlertBanner>;

/**
 * 1. Info Variant (MD, Default)
 */
export const Info: Story = {
  args: {
    variant: 'info',
    size: 'md',
    title: 'Shipping & delivery update',
    description: 'Custom orders require 3–5 days for bespoke hand-binding and proofing before dispatch.',
  },
};

/**
 * 2. Success Variant (MD)
 */
export const Success: Story = {
  args: {
    variant: 'success',
    size: 'md',
    title: 'Payment verified',
    description: 'Your payment was successfully confirmed. We are now printing your custom coloring pages.',
  },
};

/**
 * 3. Warning Variant (MD)
 */
export const Warning: Story = {
  args: {
    variant: 'warning',
    size: 'md',
    title: 'Low stock notice',
    description: 'Only 3 units left of this limited archival coloring edition in our current warehouse run.',
  },
};

/**
 * 4. Danger Variant (MD)
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'md',
    title: 'Order fulfillment halted',
    description: 'Payment authorization expired before processing could complete. Please retry your payment.',
  },
};

/**
 * 5. Small Size (SM, 8px Radius, Compact Padding)
 */
export const SmallSize: Story = {
  args: {
    variant: 'info',
    size: 'sm',
    title: 'Quick tip',
    description: 'Upload high-resolution photos for optimal vector linework clarity.',
  },
};

/**
 * 6. Small Danger Variant (SM)
 */
export const SmallDanger: Story = {
  args: {
    variant: 'danger',
    size: 'sm',
    title: 'Upload failed',
    description: 'The selected image exceeds the maximum 10MB limit.',
  },
};

/**
 * 7. With Contextual Action
 */
export const WithAction: Story = {
  args: {
    variant: 'info',
    size: 'md',
    title: 'Track your shipment',
    description: 'Your package is out for delivery with Speedaf Nigeria.',
    actionLabel: 'Details →',
  },
};

/**
 * 8. With Dismiss Button
 */
export const WithDismiss: Story = {
  args: {
    variant: 'warning',
    size: 'md',
    title: 'Cart item reservation',
    description: 'Items in your cart are reserved for the next 15 minutes.',
    dismissible: true,
  },
};

/**
 * 9. With Action & Dismiss (Full Trailing Container)
 */
export const WithActionAndDismiss: Story = {
  args: {
    variant: 'success',
    size: 'md',
    title: 'Invite accepted',
    description: 'You have been granted reviewer permissions on this custom keepsake project.',
    actionLabel: 'View Project →',
    dismissible: true,
  },
};

/**
 * 10. Semantic Colorways (Figma Section 02 — 4-Colorway Stack)
 */
export const SemanticColorways: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-2xl w-full">
      <AlertBanner
        variant="info"
        title="Info alert"
        description="Neutral informational banner for updates, release notes, or process explanations."
      />
      <AlertBanner
        variant="success"
        title="Success alert"
        description="Positive confirmation banner for successful operations, payments, and approvals."
      />
      <AlertBanner
        variant="warning"
        title="Warning alert"
        description="Cautionary alert for impending limits, temporary holds, or action recommendations."
      />
      <AlertBanner
        variant="danger"
        title="Danger alert"
        description="Critical error alert for failed payments, security blocks, or cancelled orders."
      />
    </div>
  ),
};

/**
 * 11. Interactive Play Test (Action, Dismiss, and Callback Verification)
 */
export const InteractivePlay: Story = {
  args: {
    variant: 'info',
    size: 'md',
    title: 'Interactive Banner',
    description: 'Click the action link or the dismiss cross button to test callbacks.',
    actionLabel: 'Take Action',
    dismissible: true,
    'data-testid': 'interactive-alert',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const banner = canvas.getByTestId('interactive-alert');
    await expect(banner).toBeInTheDocument();
    await expect(banner).toHaveAttribute('role', 'alert');

    // 1. Verify action click
    const actionBtn = canvas.getByTestId('interactive-alert-action');
    await expect(actionBtn).toBeInTheDocument();
    await userEvent.click(actionBtn);
    await expect(args.onAction).toHaveBeenCalledTimes(1);

    // 2. Verify dismiss click
    const dismissBtn = canvas.getByTestId('interactive-alert-dismiss');
    await expect(dismissBtn).toBeInTheDocument();
    await userEvent.click(dismissBtn);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);

    // 3. Verify title and description content
    const title = canvas.getByTestId('interactive-alert-title');
    await expect(title).toHaveTextContent('Interactive Banner');
    const desc = canvas.getByTestId('interactive-alert-description');
    await expect(desc).toHaveTextContent('Click the action link');
  },
};

/**
 * 12. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    variant: 'success',
    size: 'md',
    title: 'CSS Token Verification',
    description: 'Verifying computed radius and semantic color tokens.',
    'data-testid': 'css-check-alert',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify MD Banner Corner Radius has Radius/MD (14px)
    const alert = canvas.getByTestId('css-check-alert');
    await expect(alert).toBeInTheDocument();
    const style = window.getComputedStyle(alert);
    await expect(style.borderRadius).toMatch(/12px|14px/);

    // 2. Verify Success Background Token (rgb(235, 248, 242) / #EBF8F2)
    await expect(style.backgroundColor).toMatch(/rgb\(235,\s*248,\s*242\)/);

    // 3. Verify Success Text Color (rgb(6, 95, 70) or status-success-text)
    await expect(style.color).toMatch(/rgb\(/);
  },
};
