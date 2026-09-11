import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import React from 'react';
import { TestimonialCard } from './TestimonialCard';

const meta: Meta<typeof TestimonialCard> = {
  title: 'Design System/Molecules/TestimonialCard',
  component: TestimonialCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Canonical TestimonialCard molecule adhering to Figma Component Set `19:10006` and Documentation Board `Ratings & Testimonials` (16:2942). Organically composes canonical `RatingStars` and `Avatar` primitives into an accessible, responsive social proof card.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Physical card sizing scale (MD 24px padding / 18px quote, SM 16px padding / 14px quote).',
    },
    rating: {
      control: { type: 'range', min: 0, max: 5, step: 0.1 },
      description: 'Numeric star rating score between 0 and 5.',
    },
    showRating: {
      control: 'boolean',
      description: 'Whether to render the star rating indicator slot.',
    },
    quote: {
      control: 'text',
      description: 'Customer review or quote content.',
    },
  },
  args: {
    size: 'md',
    rating: 5,
    showRating: true,
    quote:
      'The personalized details made the whole experience feel thoughtful and special.',
    author: {
      name: 'Bilal Yusuf',
      avatarSrc: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      roleOrStatus: 'Verified customer',
      productContext: 'Custom Coloring Book',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TestimonialCard>;

/**
 * 1. Default Master Variant (MD, Rating Visible, Image Avatar, Short Quote)
 */
export const Default: Story = {
  args: {
    size: 'md',
    rating: 5,
    showRating: true,
    quote:
      'The personalized details made the whole experience feel thoughtful and special.',
    author: {
      name: 'Bilal Yusuf',
      avatarSrc: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      roleOrStatus: 'Verified customer',
      productContext: 'Custom Coloring Book',
    },
  },
};

/**
 * 2. Small Size (SM, Rating Visible, Image Avatar, Short Quote)
 */
export const SmallSize: Story = {
  args: {
    size: 'sm',
    rating: 5,
    showRating: true,
    quote:
      'The personalized details made the whole experience feel thoughtful and special.',
    author: {
      name: 'Bilal Yusuf',
      avatarSrc: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      roleOrStatus: 'Verified customer',
      productContext: 'Custom Coloring Book',
    },
  },
};

/**
 * 3. Initials Avatar Fallback (MD, Monogram 'BY')
 */
export const InitialsAvatar: Story = {
  args: {
    size: 'md',
    rating: 5,
    showRating: true,
    quote:
      'Superb paper thickness and crisp linework. The markers did not bleed through at all.',
    author: {
      name: 'Bilal Yusuf',
      initials: 'BY',
      roleOrStatus: 'Verified customer',
      productContext: 'Botanical Mindfulness Edition',
    },
  },
};

/**
 * 4. Without Rating (Rating Hidden, MD)
 */
export const WithoutRating: Story = {
  args: {
    size: 'md',
    showRating: false,
    quote:
      'Unwind & Doodle transformed our cherished anniversary photos into an unforgettable keepsake gift.',
    author: {
      name: 'Amina Okafor',
      avatarSrc: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      roleOrStatus: 'Verified purchaser',
      productContext: 'Custom Photo Keepsake',
      location: 'Lagos, Nigeria',
    },
  },
};

/**
 * 5. Small Without Rating (Rating Hidden, Initials Avatar, SM)
 */
export const SmallWithoutRating: Story = {
  args: {
    size: 'sm',
    showRating: false,
    quote:
      'Fast turnaround and the gift packaging was delightfully mindful and plastic-free.',
    author: {
      name: 'Zainab Bello',
      initials: 'ZB',
      roleOrStatus: 'Verified customer',
      productContext: 'Mindful Travel Edition',
    },
  },
};

/**
 * 6. Long Quote (MD, Natural Wrapping Demonstration)
 */
export const LongQuote: Story = {
  args: {
    size: 'md',
    rating: 5,
    showRating: true,
    quote:
      'We ordered three personalized coloring books for our family retreat, each featuring custom linework from our summer photos and chosen nature themes. The paper thickness and print quality exceeded every expectation! Even our youngest spent hours coloring peacefully.',
    author: {
      name: 'Dr. Chidi Nwosu',
      avatarSrc: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      roleOrStatus: 'Verified customer',
      productContext: 'Family Keepsake Bundle',
      location: 'Abuja, Nigeria',
    },
  },
};

/**
 * 7. Small Long Quote (SM, Dense Natural Wrapping)
 */
export const SmallLongQuote: Story = {
  args: {
    size: 'sm',
    rating: 4.8,
    showRating: true,
    quote:
      'A wonderful calming evening ritual. The pairing of subtle prompts with delicate line art makes unwinding genuinely therapeutic after long workdays.',
    author: {
      name: 'Fatima Aliyu',
      avatarSrc: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      roleOrStatus: 'Verified purchaser',
      productContext: 'Evening Reflections Journal',
    },
  },
};

/**
 * 8. Storefront Customer Review Grid (Figma Section 05 Multi-Column Layout)
 */
export const StorefrontShowcase: Story = {
  render: () => (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-xs font-heading font-semibold uppercase tracking-wider text-brand-rose block">
          Customer Reflections
        </span>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
          Loved by Mindful Creators Everywhere
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TestimonialCard
          size="md"
          rating={5}
          quote="Turning our holiday family photos into a custom coloring book was the most heartwarming gift. The illustration quality and thick paper are absolute perfection."
          author={{
            name: 'Amina O.',
            avatarSrc: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            roleOrStatus: 'Verified customer',
            productContext: 'Custom Keepsake Coloring Book',
            location: 'Lagos, Nigeria',
          }}
        />

        <TestimonialCard
          size="md"
          rating={5}
          quote="My evening decompression ritual now starts with thirty minutes in the Botanical series. The paper takes heavy ink markers without any feathering."
          author={{
            name: 'Dr. Chidi N.',
            initials: 'CN',
            roleOrStatus: 'Verified customer',
            productContext: 'Botanical Serenity Edition',
            location: 'Abuja, Nigeria',
          }}
        />

        <TestimonialCard
          size="md"
          rating={5}
          quote="I bought the bundle for our team retreat. Everyone was so touched to find their own custom doodles inside. Such thoughtful attention to detail!"
          author={{
            name: 'Kemi A.',
            avatarSrc: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            roleOrStatus: 'Verified purchaser',
            productContext: 'Team Keepsake Bundle',
            location: 'Port Harcourt, Nigeria',
          }}
        />
      </div>
    </div>
  ),
};

/**
 * 9. Interactive Play Test (Semantics, Figures, Quotations, and Author Meta)
 */
export const InteractivePlay: Story = {
  args: {
    size: 'md',
    rating: 5,
    showRating: true,
    quote: 'The linework and paper quality exceeded all our expectations.',
    author: {
      name: 'Elena Rostova',
      initials: 'ER',
      roleOrStatus: 'Verified purchaser',
      productContext: 'Mindful Garden Edition',
      location: 'London, UK',
    },
    'data-testid': 'interactive-testimonial-card',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify Figure Container Semantics
    const card = canvas.getByTestId('interactive-testimonial-card');
    await expect(card).toBeInTheDocument();
    await expect(card.tagName.toLowerCase()).toBe('figure');

    // 2. Verify Blockquote Quote Text
    const quote = canvas.getByTestId('interactive-testimonial-card-quote');
    await expect(quote).toBeInTheDocument();
    await expect(quote.tagName.toLowerCase()).toBe('blockquote');
    await expect(quote).toHaveTextContent('The linework and paper quality exceeded all our expectations.');

    // 3. Verify RatingStars Row & Value Announcement
    const ratingContainer = canvas.getByTestId('interactive-testimonial-card-rating-container');
    await expect(ratingContainer).toBeInTheDocument();
    await expect(canvas.getByText('5.0')).toBeInTheDocument();

    // 4. Verify Author Attribution Row & Monogram Initials
    const authorRow = canvas.getByTestId('interactive-testimonial-card-author-row');
    await expect(authorRow).toBeInTheDocument();
    await expect(authorRow.tagName.toLowerCase()).toBe('figcaption');

    const authorName = canvas.getByTestId('interactive-testimonial-card-author-name');
    await expect(authorName).toHaveTextContent('Elena Rostova');

    const authorMeta = canvas.getByTestId('interactive-testimonial-card-author-meta');
    await expect(authorMeta).toHaveTextContent('Verified purchaser · Mindful Garden Edition · London, UK');

    const avatar = canvas.getByTestId('interactive-testimonial-card-avatar');
    await expect(avatar).toHaveTextContent('ER');
  },
};

/**
 * 10. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    size: 'md',
    rating: 5,
    showRating: true,
    quote: 'Token verification test quote.',
    author: {
      name: 'Token Checker',
      roleOrStatus: 'Verified',
    },
    'data-testid': 'css-check-testimonial-card',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const card = canvas.getByTestId('css-check-testimonial-card');
    await expect(card).toBeInTheDocument();

    const cardStyle = window.getComputedStyle(card);

    // 1. Verify Radius/LG token (20px)
    await expect(cardStyle.borderRadius).toMatch(/20px/);

    // 2. Verify Background Surface token (#FFFFFF / rgb(255, 255, 255))
    await expect(cardStyle.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);

    // 3. Verify Border Default token (#EDF3F7 / rgb(237, 243, 247))
    await expect(cardStyle.borderColor).toMatch(/rgb\(237,\s*243,\s*247\)/);
  },
};
