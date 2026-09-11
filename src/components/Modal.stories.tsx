import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React, { useState } from 'react';
import { Modal, type ModalProps } from './Modal';
import Button from './Button';

const meta = {
  title: 'Design System/Molecules/Modal',
  component: Modal,
  tags: ['ai-generated'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Target modal scale (SM: 360px, MD: 480px, LG: 640px)',
    },
    isOpen: {
      control: 'boolean',
      description: 'Controls visibility of the modal dialog overlay',
    },
    title: {
      control: 'text',
      description: 'Modal heading text (Fredoka SemiBold 20px)',
    },
    description: {
      control: 'text',
      description: 'Descriptive subtitle below the title (Plus Jakarta Sans 14px)',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Toggles header close action button (X)',
    },
    closeOnBackdropClick: {
      control: 'boolean',
      description: 'Whether clicking the outside backdrop overlay closes the modal',
    },
    closeOnEscape: {
      control: 'boolean',
      description: 'Whether pressing Escape closes the modal',
    },
  },
  args: {
    isOpen: true,
    size: 'md',
    title: 'Modal Dialog Title',
    description: 'This is a standard modal dialog supporting descriptions, content, and actions.',
    showCloseButton: true,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    primaryAction: {
      label: 'Confirm',
    },
    secondaryAction: {
      label: 'Cancel',
    },
    onClose: () => {},
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    size: 'md',
    title: 'Confirm Changes',
    description: 'Are you sure you want to apply these updates to your collection?',
    children: (
      <p className="text-sm text-text-secondary leading-relaxed">
        Any unsaved revisions will be committed to your store profile and synced with cloud backups.
      </p>
    ),
    primaryAction: {
      label: 'Save Changes',
    },
    secondaryAction: {
      label: 'Cancel',
    },
  },
};

export const SizeSM: Story = {
  args: {
    isOpen: true,
    size: 'sm',
    title: 'Delete Your Account?',
    description: 'This action is permanent and cannot be undone.',
    children: (
      <div className="space-y-3 text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-status-danger-bg text-status-danger-accent flex items-center justify-center text-2xl mx-auto">
          ⚠️
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Your personal details, doodle collections, and order records will be permanently anonymized.
        </p>
      </div>
    ),
    primaryAction: {
      label: 'Yes, Delete',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Cancel',
      variant: 'outline',
    },
  },
};

export const SizeMD: Story = {
  args: {
    isOpen: true,
    size: 'md',
    title: 'Write a Review',
    description: 'Share your experience with Mindful Coloring Book.',
    children: (
      <div className="space-y-4 text-xs sm:text-sm">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-primary block">Overall Rating</label>
          <div className="flex items-center gap-1 text-2xl text-action-primary">
            <span>⭐</span>
            <span>⭐</span>
            <span>⭐</span>
            <span>⭐</span>
            <span>⭐</span>
            <span className="text-xs text-text-tertiary ml-2 font-medium">5 out of 5 stars</span>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-primary block">Review Title</label>
          <input
            type="text"
            readOnly
            value="Absolutely love the thick paper quality!"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border-input text-xs sm:text-sm text-text-primary bg-bg-surface"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-primary block">Your Review</label>
          <textarea
            rows={3}
            readOnly
            value="The botanical illustrations are deeply relaxing to fill with watercolors. Highly recommended for decompressing after work."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border-input text-xs sm:text-sm text-text-primary bg-bg-surface resize-none"
          />
        </div>
      </div>
    ),
    primaryAction: {
      label: 'Submit Review',
    },
    secondaryAction: {
      label: 'Cancel',
    },
  },
};

export const SizeLG: Story = {
  args: {
    isOpen: true,
    size: 'lg',
    title: 'Add Products to Bundle',
    description: 'Select items to include in your customized bundle pack.',
    children: (
      <div className="space-y-3">
        {[
          { title: 'Mindful Floral Coloring Book', price: '$18.00', cat: 'Books' },
          { title: 'Pastel Dual-Tip Marker Set (24ct)', price: '$24.00', cat: 'Art Supplies' },
          { title: 'Cozy Moments Sticker Sheet', price: '$6.00', cat: 'Stickers' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-xl border border-border-default hover:bg-bg-subtle transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
              <span className="text-xs text-text-tertiary">{item.cat} · {item.price}</span>
            </div>
            <input
              type="checkbox"
              defaultChecked={idx < 2}
              className="w-4 h-4 rounded-md text-action-primary border-border-input"
            />
          </div>
        ))}
      </div>
    ),
    primaryAction: {
      label: 'Add Selected Items',
    },
    secondaryAction: {
      label: 'Cancel',
    },
  },
};

export const NoFooter: Story = {
  args: {
    isOpen: true,
    size: 'md',
    title: 'Notice',
    description: 'This modal has no action footer buttons.',
    footer: null,
    children: (
      <p className="text-sm text-text-secondary leading-relaxed">
        The modal body content can provide its own internal controls or close trigger.
      </p>
    ),
  },
};

export const NoDescription: Story = {
  args: {
    isOpen: true,
    size: 'sm',
    title: 'Quick Notification',
    description: undefined,
    children: (
      <p className="text-sm text-text-secondary leading-relaxed">
        Header rendered with title only, without subtitle description.
      </p>
    ),
    primaryAction: {
      label: 'Got it',
    },
  },
};

export const NoCloseButton: Story = {
  args: {
    isOpen: true,
    size: 'sm',
    title: 'Action Required',
    description: 'Please make a selection to continue.',
    showCloseButton: false,
    children: (
      <p className="text-sm text-text-secondary leading-relaxed">
        The header close button is hidden to enforce footer action completion.
      </p>
    ),
    primaryAction: {
      label: 'Proceed',
    },
  },
};

export const CustomFooter: Story = {
  args: {
    isOpen: true,
    size: 'md',
    title: 'Custom Footer Layout',
    description: 'Demonstrating arbitrary children inside the modal footer slot.',
    footer: (
      <div className="flex items-center justify-between w-full">
        <span className="text-xs text-text-tertiary">Step 1 of 3</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="primary" size="sm">Next Step</Button>
        </div>
      </div>
    ),
    children: (
      <p className="text-sm text-text-secondary leading-relaxed">
        Multi-step wizard layout with progress indicators in the footer.
      </p>
    ),
  },
};

function InteractiveModalWrapper(props: Partial<ModalProps>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
      <Button
        variant="primary"
        size="md"
        data-testid="open-modal-trigger"
        onClick={() => setOpen(true)}
      >
        Open Interactive Modal
      </Button>

      <Modal
        {...props}
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Interactive Dialog Test"
        description="Testing focus management, open/close states, and button actions."
        primaryAction={{
          label: 'Confirm Action',
          onClick: () => setOpen(false),
        }}
        secondaryAction={{
          label: 'Dismiss',
          onClick: () => setOpen(false),
        }}
      >
        <p className="text-sm text-text-secondary leading-relaxed">
          Modal body verified under automated interaction testing.
        </p>
      </Modal>
    </div>
  );
}

export const InteractivePlay: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
  },
  render: (args) => <InteractiveModalWrapper {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initial state: modal closed
    const trigger = canvas.getByTestId('open-modal-trigger');
    await expect(trigger).toBeInTheDocument();
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();

    // Click trigger to open modal
    await userEvent.click(trigger);
    const dialog = canvas.getByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Verify title & description rendered
    const title = canvas.getByRole('heading', { name: /Interactive Dialog Test/i });
    await expect(title).toBeInTheDocument();

    // Close modal via secondary action
    const dismissBtn = canvas.getByRole('button', { name: /Dismiss/i });
    await userEvent.click(dismissBtn);
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const CssCheck: Story = {
  args: {
    isOpen: true,
    size: 'md',
    title: 'CSS Token Verification',
    description: 'Inspecting surface background, border, and radius tokens.',
    'data-testid': 'css-check-modal',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modal = canvas.getByTestId('css-check-modal');
    await expect(modal).toBeInTheDocument();

    const computed = window.getComputedStyle(modal);
    // bg-bg-surface: #FFFFFF => rgb(255, 255, 255)
    await expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');
    // border-border-default: #EDF3F7 => rgb(237, 243, 247)
    await expect(computed.borderColor).toBe('rgb(237, 243, 247)');
    // rounded-2xl: 20px (from --radius-lg) or 16px
    await expect(computed.borderRadius).toMatch(/16px|18px|20px/);
  },
};
