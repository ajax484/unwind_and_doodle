import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent } from 'storybook/test';
import React, { useState } from 'react';
import { RatingStars, type RatingStarsProps } from './RatingStars';

const meta = {
  title: 'Design System/Atoms/RatingStars',
  component: RatingStars,
  tags: ['ai-generated'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    rating: {
      control: { type: 'range', min: 0, max: 5, step: 0.1 },
      description: 'Numeric rating score between 0 and 5',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Star scale (SM: 16px, MD: 20px, LG: 24px)',
    },
    showValue: {
      control: 'boolean',
      description: 'Display numeric rating score alongside stars',
    },
    reviewCount: {
      control: 'number',
      description: 'Number of customer reviews to display in parenthesis',
    },
    interactive: {
      control: 'boolean',
      description: 'Enable interactive rating selection picker mode',
    },
  },
  args: {
    rating: 5,
    size: 'sm',
    showValue: false,
    interactive: false,
  },
} satisfies Meta<typeof RatingStars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    rating: 5,
    size: 'sm',
    showValue: false,
  },
};

export const SizeSM: Story = {
  args: {
    rating: 5,
    size: 'sm',
    showValue: true,
  },
};

export const SizeMD: Story = {
  args: {
    rating: 4.8,
    size: 'md',
    showValue: true,
    reviewCount: 42,
  },
};

export const SizeLG: Story = {
  args: {
    rating: 5,
    size: 'lg',
    showValue: true,
    reviewCount: 128,
  },
};

export const WithNumericValue: Story = {
  args: {
    rating: 4.9,
    size: 'md',
    showValue: true,
  },
};

export const WithReviewCount: Story = {
  args: {
    rating: 4.7,
    size: 'md',
    showValue: true,
    reviewCount: 184,
  },
};

export const FractionalRating: Story = {
  args: {
    rating: 3.5,
    size: 'md',
    showValue: true,
    reviewCount: 96,
  },
};

export const ZeroRating: Story = {
  args: {
    rating: 0,
    size: 'md',
    showValue: true,
    reviewCount: 0,
  },
};

function InteractiveRatingWrapper(props: Partial<RatingStarsProps>) {
  const [rating, setRating] = useState(3);

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <RatingStars
        {...props}
        rating={rating}
        interactive
        onRatingChange={setRating}
        size="lg"
        data-testid="interactive-rating-stars"
      />
      <span
        data-testid="selected-rating-display"
        className="text-xs font-semibold text-text-secondary"
      >
        Selected rating: {rating} out of 5 stars
      </span>
    </div>
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveRatingWrapper {...args} />,
};

export const InteractivePlay: Story = {
  render: (args) => <InteractiveRatingWrapper {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initial state check
    const display = canvas.getByTestId('selected-rating-display');
    await expect(display).toHaveTextContent('Selected rating: 3 out of 5 stars');

    // Click on star 5
    const star5 = canvas.getByRole('radio', { name: '5 stars' });
    await userEvent.click(star5);
    await expect(display).toHaveTextContent('Selected rating: 5 out of 5 stars');

    // Click on star 2
    const star2 = canvas.getByRole('radio', { name: '2 stars' });
    await userEvent.click(star2);
    await expect(display).toHaveTextContent('Selected rating: 2 out of 5 stars');
  },
};

export const CssCheck: Story = {
  args: {
    rating: 5,
    size: 'md',
    'data-testid': 'css-check-stars',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const root = canvas.getByTestId('css-check-stars');
    await expect(root).toBeInTheDocument();

    const svg = root.querySelector('svg');
    await expect(svg).toBeInTheDocument();

    const computed = window.getComputedStyle(svg!);
    // fill-action-primary: #D99BA3 => rgb(217, 155, 163)
    await expect(computed.fill).toBe('rgb(217, 155, 163)');
  },
};
