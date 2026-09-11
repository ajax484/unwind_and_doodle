import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import { Toast } from './Toast';

const meta = {
  title: 'Design System/Molecules/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical floating transient notification molecule conforming directly to Figma Step 5E specifications (`46:54032` and `47:54305`). Features 4 semantic status colorways, 2 scales (MD, SM), asynchronous loading states, and contextual action & dismiss controls.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info'],
      description: 'Semantic status colorway and iconography theme.',
    },
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Target viewport scale and internal padding density.',
    },
    state: {
      control: 'radio',
      options: ['default', 'loading'],
      description: 'Operational state: static default vs asynchronous loading.',
    },
    showAction: {
      control: 'boolean',
      description: 'Toggles visibility of the inline action button.',
    },
    showDismiss: {
      control: 'boolean',
      description: 'Toggles visibility of the close/dismiss button.',
    },
    onDismiss: { action: 'dismissed' },
  },
  args: {
    variant: 'success',
    size: 'md',
    state: 'default',
    title: 'Review submitted',
    message: 'Your review has been published.',
    showAction: false,
    showDismiss: true,
    onDismiss: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full p-4 flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Success MD (Default Variant)
 * Canonical success confirmation notification.
 */
export const SuccessMD: Story = {
  args: {
    variant: 'success',
    size: 'md',
    title: 'Review submitted',
    message: 'Your review has been published.',
  },
};

/**
 * 02. Warning MD
 * Cautionary notification highlighting validation or missing requirements.
 */
export const WarningMD: Story = {
  args: {
    variant: 'warning',
    size: 'md',
    title: 'Almost there',
    message: 'Please check the required fields before continuing.',
  },
};

/**
 * 03. Error MD
 * High-priority error notification with aria-live="assertive".
 */
export const ErrorMD: Story = {
  args: {
    variant: 'error',
    size: 'md',
    title: "Couldn't save changes",
    message: 'A network error occurred. Please try again.',
  },
};

/**
 * 04. Info MD
 * Informational status update or general activity alert.
 */
export const InfoMD: Story = {
  args: {
    variant: 'info',
    size: 'md',
    title: 'Cart updated',
    message: 'Your item quantity has been updated.',
  },
};

/**
 * 05. Size SM
 * Compact density variant optimized for mobile viewports or dense dialogs.
 */
export const SizeSM: Story = {
  args: {
    variant: 'success',
    size: 'sm',
    title: 'Item saved',
    message: 'Saved to wishlist.',
  },
};

/**
 * 06. With Action Button
 * Production scenario featuring a contextual button (e.g., "Undo" or "View cart").
 */
export const WithAction: Story = {
  args: {
    variant: 'success',
    size: 'md',
    title: 'Added to cart',
    message: 'Mindful Coloring Book (Qty 1)',
    showAction: true,
    action: {
      label: 'View cart',
      onClick: fn(),
    },
  },
};

/**
 * 07. Without Dismiss Button
 * Persistent mode requiring action or timeout for dismissal.
 */
export const WithoutDismiss: Story = {
  args: {
    variant: 'warning',
    size: 'md',
    title: 'Session expiring',
    message: 'Your checkout session expires in 2 minutes.',
    showDismiss: false,
    showAction: true,
    action: {
      label: 'Extend',
      onClick: fn(),
    },
  },
};

/**
 * 08. Loading State
 * Asynchronous pending state composing canonical Spinner atom.
 */
export const Loading: Story = {
  args: {
    variant: 'info',
    size: 'md',
    state: 'loading',
    title: 'Saving changes...',
    message: 'Please wait while we update your account.',
    showAction: false,
  },
};

/**
 * 09. Interactive Play Test
 * Automated verification of action click and dismiss callbacks.
 */
export const InteractivePlay: Story = {
  args: {
    variant: 'success',
    size: 'md',
    title: 'Interactive Test',
    message: 'Click the action or dismiss trigger.',
    showAction: true,
    action: {
      label: 'Undo',
      onClick: fn(),
    },
    onDismiss: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify Toast rendered with semantic role
    const toastElement = canvas.getByRole('status');
    await expect(toastElement).toBeInTheDocument();

    // Verify Action button interaction
    const actionBtn = canvas.getByRole('button', { name: /Undo/i });
    await expect(actionBtn).toBeInTheDocument();
    await userEvent.click(actionBtn);
    if (
      args.action &&
      typeof args.action === 'object' &&
      'onClick' in args.action &&
      typeof args.action.onClick === 'function'
    ) {
      await expect(args.action.onClick).toHaveBeenCalledTimes(1);
    }

    // Verify Dismiss button interaction
    const dismissBtn = canvas.getByRole('button', { name: /Dismiss notification/i });
    await expect(dismissBtn).toBeInTheDocument();
    await userEvent.click(dismissBtn);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

/**
 * 10. CSS Token Verification
 * Checks background color (#ebf8f2), border color (#10b981), border-radius (16px), and Fredoka font.
 */
export const CssCheck: Story = {
  args: {
    variant: 'success',
    size: 'md',
    title: 'CSS Token Verification',
    message: 'Verifying computed design tokens against Figma specs.',
    'data-testid': 'css-check-toast',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toast = canvas.getByTestId('css-check-toast');
    await expect(toast).toBeInTheDocument();

    const computed = window.getComputedStyle(toast);

    // Background: #EBF8F2 => rgb(235, 248, 242)
    await expect(computed.backgroundColor).toBe('rgb(235, 248, 242)');

    // Border Color: #10B981 => rgb(16, 185, 129)
    await expect(computed.borderColor).toBe('rgb(16, 185, 129)');

    // Border Radius: Radius/LG = 16px
    await expect(computed.borderRadius).toBe('16px');

    // Title Font Family: Fredoka
    const heading = canvas.getByRole('heading', { level: 3 });
    const headingComputed = window.getComputedStyle(heading);
    await expect(headingComputed.fontFamily).toMatch(/Fredoka/i);
  },
};
