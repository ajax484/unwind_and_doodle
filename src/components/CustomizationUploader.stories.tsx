import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import CustomizationUploader from './CustomizationUploader';

const sampleImages = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80',
];

const meta = {
  title: 'Design System/Molecules/CustomizationUploader',
  component: CustomizationUploader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical CustomizationUploader molecule conforming directly to Figma design system specifications (`43:29976` and `43:30904`). Features 6 lifecycle states (Empty, Ready, Uploading, Uploaded, Error, Disabled), 3 sizes (SM, MD, LG), drag-and-drop dropzone, canonical Button and Spinner composition, thumbnail preview grid with accessible removal, and customer dedication notes.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[380px] sm:w-[460px] max-w-full p-2">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Component scale: SM (380px), MD (460px), LG (540px).',
    },
    multiple: {
      control: 'boolean',
      description: 'Allows multiple file uploads (Figma Allow Multiple Files).',
    },
    showNotes: {
      control: 'boolean',
      description: 'Toggles customer dedication notes textarea (Figma Show Notes Field).',
    },
    disabled: {
      control: 'boolean',
      description: 'Mutes dropzone and input controls.',
    },
    maxFiles: {
      control: 'number',
      description: 'Maximum allowable photos for multi-file mode.',
    },
    uploadProgress: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Controlled upload progress percentage.',
    },
    stateOverride: {
      control: 'select',
      options: [undefined, 'empty', 'ready', 'uploading', 'uploaded', 'error', 'disabled'],
      description: 'Explicit lifecycle state override.',
    },
    onCustomizationChange: { action: 'customizationChanged' },
  },
  args: {
    size: 'md',
    multiple: true,
    showNotes: true,
    maxFiles: 5,
    disabled: false,
    onCustomizationChange: fn(),
  },
} satisfies Meta<typeof CustomizationUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default Canonical Variant
 * Baseline canonical presentation adhering to Figma master variant State=Empty, Size=MD.
 */
export const Default: Story = {
  args: {},
};

/**
 * 02. Ready State (Drag-Over)
 * Active drag-over drop target with brand border glow and staged instructions copy.
 */
export const Ready: Story = {
  args: {
    stateOverride: 'ready',
  },
};

/**
 * 03. Alternative Mode (Single Image Mode & Compact Scale)
 * Compact SM size variant constrained to single photo selection.
 */
export const AlternativeMode: Story = {
  args: {
    size: 'sm',
    multiple: false,
    label: 'Upload an image',
    description: 'Add a single portrait photo to customize your coloring cover.',
  },
};

/**
 * 04. With Optional Elements (Large Scale & Notes Visible)
 * Expansive LG size variant with dedicated instructions and custom notes section.
 */
export const WithOptionalElements: Story = {
  args: {
    size: 'lg',
    multiple: true,
    showNotes: true,
    notesLabel: 'Special dedication',
    notesPlaceholder: 'Write a heartfelt message to print on the dedication page...',
  },
};

/**
 * 05. Loading / Uploading State
 * Operational uploading state composing canonical Rose Spinner, 60% progress track fill, and count copy.
 */
export const Loading: Story = {
  args: {
    uploadProgress: 60,
    initialUrls: sampleImages.slice(0, 2),
  },
};

/**
 * 06. Success / Uploaded State
 * Populated state displaying 3 staged photo thumbnails, count fraction indicator, and "Add more" action.
 */
export const Success: Story = {
  args: {
    initialUrls: sampleImages,
  },
};

/**
 * 07. Error / Validation State
 * Resilient recovery view with danger border, structured error alert banner, and "Try again" CTA.
 */
export const ErrorState: Story = {
  args: {
    stateOverride: 'error',
  },
};

/**
 * 08. Disabled State
 * Disabled view with muted dropzone, inactive button, and disabled textarea.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * 09. Authentic Scenario (Storefront Keepsake Product Flow)
 * Rich domain-authentic scenario featuring custom keepsake photos and personalized dedication instructions.
 */
export const AuthenticScenario: Story = {
  args: {
    size: 'md',
    multiple: true,
    showNotes: true,
    label: 'Personalize Your Keepsake Edition',
    description: 'Upload your favorite moments to be illustrated into a bespoke coloring heirloom.',
    initialUrls: sampleImages.slice(0, 2),
    initialNotes: 'For Mom on Mother’s Day! Please highlight our golden retriever Cooper on the cover.',
  },
};

/**
 * 10. Interactive Play Test
 * Automated verification of notes typing, thumbnail removal, and callback invocation.
 */
export const InteractivePlay: Story = {
  args: {
    initialUrls: [sampleImages[0], sampleImages[1]],
    initialNotes: 'Initial note',
    onCustomizationChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    // 1. Clear call counts across stories
    (args.onCustomizationChange as any)?.mockClear?.();

    // 2. Settle mount timers
    await new Promise((r) => setTimeout(r, 100));

    const canvas = within(canvasElement);

    // Verify initial thumbnails are rendered
    const removeButtons = canvas.getAllByRole('button', { name: /Remove image/i });
    expect(removeButtons.length).toBe(2);

    // Verify notes textarea interaction
    const textarea = canvas.getByPlaceholderText(/Tell us anything/i);
    await userEvent.click(textarea);
    await userEvent.type(textarea, ' with extra love');

    expect(args.onCustomizationChange).toHaveBeenCalled();

    // Verify image removal
    await userEvent.click(removeButtons[0]);
    expect(args.onCustomizationChange).toHaveBeenCalled();
  },
};

/**
 * 11. CSS Token Verification
 * Asserts computed styles adhere strictly to canonical design tokens without raw hex fallbacks.
 */
export const CssCheck: Story = {
  args: {
    'data-testid': 'css-check-customization-uploader',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByTestId('css-check-customization-uploader');
    expect(container).toBeInTheDocument();

    const computed = window.getComputedStyle(container);

    // Surface token: #FFFFFF
    expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');

    // Border token: #EDF3F7
    expect(computed.borderColor).toBe('rgb(237, 243, 247)');

    // Radius: 24px
    expect(computed.borderRadius).toBe('24px');
  },
};
