import { V1CampaignBlock } from '@/types/marketing-builder';

export interface V1EmailTemplatePreset {
  id: string;
  name: string;
  description: string;
  category: 'launch' | 'editorial' | 'welcome' | 'blank';
  defaultSubject: string;
  defaultPreviewText: string;
  blocks: V1CampaignBlock[];
}

export const V1_EMAIL_TEMPLATES: V1EmailTemplatePreset[] = [
  {
    id: 'product_launch',
    name: 'Product Launch',
    description: 'Hero announcement, featured product preorder card, callout notice, and call-to-action button.',
    category: 'launch',
    defaultSubject: 'I made something for the girls 🎀',
    defaultPreviewText: 'Limited edition A6 custom colouring book — your name goes on it.',
    blocks: [
      {
        id: 'block_launch_text_1',
        type: 'text',
        data: {
          content: 'I made something for the girls 🎀',
          style: 'heading',
          align: 'center',
        },
      },
      {
        id: 'block_launch_text_2',
        type: 'text',
        data: {
          content: 'Hi {{first_name}}, okay I made something specifically for the girls 😭 Just 30 pages of pretty little things: bags, perfume, flowers, bows, getting-ready moments... and she is tiny A6 size so you can throw her in your bag!',
          style: 'body',
          align: 'left',
        },
      },
      {
        id: 'block_launch_callout',
        type: 'callout',
        data: {
          title: 'Personalized Cover Edition ♡',
          message: "Your name goes right on the cover: {{first_name}}'s Colouring Book ♡",
          variant: 'rose',
        },
      },
      {
        id: 'block_launch_product',
        type: 'product',
        data: {
          productId: 'prod-for-the-girls',
          title: 'For the Girls — A6 Custom Colouring Book',
          price: 5500,
          badge: 'Limited Preorder',
          description: '30 aesthetic hand-drawn pages + your personalized name printed on the cover.',
          ctaText: 'Preorder for ₦5,500',
          ctaUrl: '/products/for-the-girls',
          showPrice: true,
          showDescription: true,
          showCta: true,
        },
      },
      {
        id: 'block_launch_divider',
        type: 'divider',
        data: { spacing: 'md' },
      },
      {
        id: 'block_launch_button',
        type: 'button',
        data: {
          text: 'Preorder "For the Girls" Now 🎀',
          url: '/products/for-the-girls',
          style: 'rose',
          align: 'center',
        },
      },
    ],
  },
  {
    id: 'editorial_decompression',
    name: 'Editorial & Story',
    description: 'Thoughtful narrative, brand wisdom, subtle callout reflection, and collection exploration.',
    category: 'editorial',
    defaultSubject: 'Take a screen-free breath today 🤍',
    defaultPreviewText: 'Your gentle reminder to pause, unwind, and doodle.',
    blocks: [
      {
        id: 'block_edit_text_1',
        type: 'text',
        data: {
          content: 'A Gentle Moment for Yourself 🤍',
          style: 'heading',
          align: 'center',
        },
      },
      {
        id: 'block_edit_text_2',
        type: 'text',
        data: {
          content: 'Hi {{first_name}}, when was the last time you spent 20 minutes doing something completely screen-free with your hands?\n\nBetween notifications, work deadlines, and daily stress, our minds rarely get a quiet second to reset. Colouring and journaling aren\'t about artistic perfection — they are practical tools for mental decompression.',
          style: 'body',
          align: 'left',
        },
      },
      {
        id: 'block_edit_callout',
        type: 'callout',
        data: {
          title: 'Mindful Practice of the Week',
          message: 'Put on your favourite playlist, grab your pens, and give yourself 15 minutes of uninterrupted creative peace.',
          variant: 'blue',
        },
      },
      {
        id: 'block_edit_button',
        type: 'button',
        data: {
          text: 'Explore Creative Books & Kits',
          url: '/products',
          style: 'primary',
          align: 'center',
        },
      },
    ],
  },
  {
    id: 'welcome_onboarding',
    name: 'Welcome Series',
    description: 'Warm greeting, community favorites in a 2-column grid, and welcome call-to-action.',
    category: 'welcome',
    defaultSubject: 'Welcome to Unwind & Doodle 🎨',
    defaultPreviewText: 'Your creative unwinding journey begins here.',
    blocks: [
      {
        id: 'block_welcome_text_1',
        type: 'text',
        data: {
          content: 'Welcome to Unwind & Doodle 🎨',
          style: 'heading',
          align: 'center',
        },
      },
      {
        id: 'block_welcome_text_2',
        type: 'text',
        data: {
          content: 'Hi {{first_name}}, we are so happy you\'re here! At Unwind & Doodle, we believe everyone deserves moments of screen-free peace.\n\nHere are a few community favourites crafted right here in Nigeria:',
          style: 'body',
          align: 'left',
        },
      },
      {
        id: 'block_welcome_grid',
        type: 'product_grid',
        data: {
          heading: 'Community Favorites',
          products: [
            {
              productId: 'prod-general-book',
              title: 'General Colouring Book',
              price: 6500,
              slug: 'general-colouring-book',
            },
            {
              productId: 'prod-vent-to-me',
              title: 'Vent to Me Journal',
              price: 8500,
              slug: 'vent-to-me',
            },
          ],
        },
      },
      {
        id: 'block_welcome_button',
        type: 'button',
        data: {
          text: 'Browse Complete Catalog',
          url: '/products',
          style: 'rose',
          align: 'center',
        },
      },
    ],
  },
  {
    id: 'blank_canvas',
    name: 'Blank Canvas',
    description: 'Start completely fresh with a clean text block ready for your words.',
    category: 'blank',
    defaultSubject: '',
    defaultPreviewText: '',
    blocks: [
      {
        id: 'block_blank_text',
        type: 'text',
        data: {
          content: 'Hi {{first_name}},\n\nWrite your email message here...',
          style: 'body',
          align: 'left',
        },
      },
    ],
  },
];

// Re-export for legacy consumers
export const EMAIL_TEMPLATE_PRESETS = V1_EMAIL_TEMPLATES;
export type EmailTemplatePreset = V1EmailTemplatePreset;
