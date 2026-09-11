import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React, { useState } from 'react';
import ReviewModal from './ReviewModal';

const meta = {
  title: 'Design System/Organisms/ReviewModal',
  component: ReviewModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical review submission dialog organism conforming directly to Figma Step 5D specifications (`43:51475` and `43:53132`). Features 4 lifecycle states (Default, Loading, Success, Error), product context card, interactive RatingStars picker with textual feedback, and accessible dialog management.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls dialog visibility.',
    },
    showProductContext: {
      control: 'boolean',
      description: 'Toggles the thumbnail product context row.',
    },
    showValidationAlert: {
      control: 'boolean',
      description: 'Toggles inline validation prompt alert.',
    },
    state: {
      control: 'select',
      options: ['default', 'loading', 'success', 'error'],
      description: 'Forces specific lifecycle state view.',
    },
    initialRating: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Initial star rating value.',
    },
    onClose: { action: 'closed' },
    onSuccess: { action: 'succeeded' },
  },
  args: {
    isOpen: true,
    orderId: 'ord_12345',
    productId: 'prod_mindful',
    productName: 'Mindful Coloring Book (Botanical Edition)',
    productImage: null,
    showProductContext: true,
    showValidationAlert: false,
    initialRating: 5,
    initialTitle: '',
    initialBody: '',
    onClose: fn(),
    onSuccess: fn(),
  },
} satisfies Meta<typeof ReviewModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default State
 * Initial presentation with 5 stars selected and product context card.
 */
export const Default: Story = {
  args: {
    initialRating: 5,
  },
};

/**
 * 02. Zero Rating State
 * Prompt state requiring customer to select a rating.
 */
export const ZeroRating: Story = {
  args: {
    initialRating: 0,
  },
};

/**
 * 03. Without Product Context
 * Compact variant with showProductContext=false.
 */
export const WithoutProductContext: Story = {
  args: {
    showProductContext: false,
  },
};

/**
 * 04. With Validation Alert
 * Toggles the warning guidance prompt.
 */
export const WithValidationAlert: Story = {
  args: {
    showValidationAlert: true,
    initialRating: 0,
  },
};

/**
 * 05. Loading State
 * Asynchronous submission with disabled form and Spinner in submit button.
 */
export const Loading: Story = {
  args: {
    state: 'loading',
    initialRating: 5,
    initialTitle: 'Absolutely wonderful book!',
    initialBody: 'The 200gsm paper is so thick and markers do not bleed through.',
  },
};

/**
 * 06. Success Confirmation
 * Dedicated success screen with checkmark, submitted rating summary, and Done button.
 */
export const Success: Story = {
  args: {
    state: 'success',
    initialRating: 5,
  },
};

/**
 * 07. Error Recovery State
 * Resilient recovery banner with preserved form fields and Try Again trigger.
 */
export const ErrorState: Story = {
  args: {
    state: 'error',
    initialRating: 4,
    initialTitle: 'Great book but packaging was slightly dented',
    initialBody: 'Illustrations are top notch, but postal handling was rough.',
  },
};

/**
 * 08. Interactive Star Rating Picker
 * Automated verification of clicking stars and verifying textual label updates.
 */
export const InteractiveStarRating: Story = {
  args: {
    initialRating: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initial check: rating label shows "Select a rating"
    const feedbackLabel = canvas.getByTestId('rating-feedback-label');
    await expect(feedbackLabel).toHaveTextContent(/Select a rating/i);

    // Click 4th star button
    const starButtons = canvas.getAllByRole('radio');
    await expect(starButtons.length).toBe(5);

    await userEvent.click(starButtons[3]); // 4 stars
    await expect(feedbackLabel).toHaveTextContent(/4 out of 5 · Very Good/i);

    // Click 5th star button
    await userEvent.click(starButtons[4]); // 5 stars
    await expect(feedbackLabel).toHaveTextContent(/5 out of 5 · Excellent/i);
  },
};

/**
 * 09. Interactive Form Submission
 * Automated verification of filling out the form, submitting, and transitioning to Success.
 */
export const InteractiveSubmission: Story = {
  args: {
    initialRating: 5,
    onClose: fn(),
    onSuccess: fn(),
    onSubmitReview: fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
    }),
  },
  play: async ({ canvasElement, args }) => {
    (args.onClose as any)?.mockClear?.();
    (args.onSuccess as any)?.mockClear?.();
    const canvas = within(canvasElement);

    // Wait for modal mount focus trap/autofocus (50ms) to settle
    await new Promise((r) => setTimeout(r, 100));

    // Type title and body
    const titleInput = canvas.getByPlaceholderText(/e\.g\., Beautiful mindful illustrations!/i);
    await userEvent.click(titleInput);
    await userEvent.type(titleInput, 'Amazing Paper Quality');

    const bodyTextarea = canvas.getByPlaceholderText(/Tell us what you liked/i);
    await userEvent.click(bodyTextarea);
    await userEvent.type(bodyTextarea, 'The spiral binding makes coloring on both sides so easy.');

    // Click submit
    const submitBtn = canvas.getByTestId('review-submit-button');
    await userEvent.click(submitBtn);

    // Verify onSubmitReview called
    await expect(args.onSubmitReview).toHaveBeenCalledTimes(1);

    // Verify Success screen rendered
    const successScreen = await canvas.findByTestId('review-success-screen');
    await expect(successScreen).toBeInTheDocument();
    await expect(canvas.getByText(/Review submitted successfully!/i)).toBeInTheDocument();

    // Click Done button
    const doneBtn = canvas.getByTestId('review-done-button');
    await userEvent.click(doneBtn);

    await expect(args.onSuccess).toHaveBeenCalledTimes(1);
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

/**
 * 10. CSS Token Verification
 * Checks background (#FFFFFF), border-default (#EDF3F7), and Fredoka typography.
 */
export const CssCheck: Story = {
  args: {
    'data-testid': 'css-check-review-modal',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modal = canvas.getByTestId('css-check-review-modal');
    await expect(modal).toBeInTheDocument();

    const computed = window.getComputedStyle(modal);

    // Surface Token: #FFFFFF => rgb(255, 255, 255)
    await expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');

    // Border Color: #EDF3F7 => rgb(237, 243, 247)
    await expect(computed.borderColor).toBe('rgb(237, 243, 247)');

    // Title Font Family: Fredoka
    const heading = canvas.getByRole('heading', { level: 2 });
    const headingComputed = window.getComputedStyle(heading);
    await expect(headingComputed.fontFamily).toMatch(/Fredoka/i);
  },
};
