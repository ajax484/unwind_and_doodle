import { z } from 'zod';

export const STOREFRONT_PAGE_SLUGS = ['about', 'delivery', 'returns', 'faq', 'contact'] as const;
export type StorefrontPageSlug = (typeof STOREFRONT_PAGE_SLUGS)[number];

export const StorefrontPageSlugSchema = z.enum(STOREFRONT_PAGE_SLUGS);

export const PageSectionSchema = z.object({
  heading: z.string().trim().min(1, 'Section heading is required').max(160),
  body: z.string().trim().min(1, 'Section body is required').max(5000),
});

export const PageHighlightSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(200),
});

export const FaqItemSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(300),
  answer: z.string().trim().min(1, 'Answer is required').max(3000),
});

export const ContactInfoSchema = z.object({
  email: z.string().trim().max(200).optional().default(''),
  whatsapp: z.string().trim().max(100).optional().default(''),
  instagram: z.string().trim().max(200).optional().default(''),
  hours: z.string().trim().max(200).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
});

export const StorefrontPageContentSchema = z.object({
  sections: z.array(PageSectionSchema).default([]),
  highlights: z.array(PageHighlightSchema).optional(),
  faqItems: z.array(FaqItemSchema).optional(),
  contactInfo: ContactInfoSchema.optional(),
});

export const UpdateStorefrontPageSchema = z.object({
  title: z.string().trim().min(1, 'Page title is required').max(160),
  subtitle: z.string().trim().max(400).optional().nullable(),
  content: StorefrontPageContentSchema,
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
});

export type StorefrontPageSection = z.infer<typeof PageSectionSchema>;
export type StorefrontPageHighlight = z.infer<typeof PageHighlightSchema>;
export type StorefrontFaqItem = z.infer<typeof FaqItemSchema>;
export type StorefrontContactInfo = z.infer<typeof ContactInfoSchema>;
export type StorefrontPageContent = z.infer<typeof StorefrontPageContentSchema>;
export type UpdateStorefrontPageInput = z.infer<typeof UpdateStorefrontPageSchema>;

export interface StorefrontPageRecord {
  slug: StorefrontPageSlug;
  title: string;
  subtitle: string | null;
  content: StorefrontPageContent;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string | null;
  isDefault: boolean;
}

export const STOREFRONT_PAGE_META: Record<
  StorefrontPageSlug,
  { label: string; route: string; icon: string }
> = {
  about: { label: 'About Us', route: '/about', icon: '🌿' },
  delivery: { label: 'Delivery & Shipping', route: '/delivery', icon: '🚚' },
  returns: { label: 'Returns & Refunds', route: '/returns', icon: '↩️' },
  faq: { label: 'FAQ', route: '/faq', icon: '❓' },
  contact: { label: 'Contact Us', route: '/contact', icon: '💬' },
};

export const DEFAULT_STOREFRONT_PAGES: Record<StorefrontPageSlug, Omit<StorefrontPageRecord, 'updatedAt' | 'isDefault'>> = {
  about: {
    slug: 'about',
    title: 'A little less scrolling. A lot more living.',
    subtitle:
      'Unwind & Doodle creates playful, tactile coloring books, journals, and game books designed for calm, screen-free moments.',
    seoTitle: 'About Us — Unwind & Doodle',
    seoDescription: 'Discover the story and screen-free relaxation philosophy behind Unwind & Doodle.',
    content: {
      sections: [
        {
          heading: 'Why We Exist',
          body: 'Modern days are loud and endlessly connected. We started Unwind & Doodle to make it effortless to put your phone down, pick up a pen or colored pencil, and reconnect with quiet joy.\n\nWhether you are unwinding alone on a Sunday afternoon, hosting a cozy girls’ night in, or looking for a thoughtful gift, every piece we make is built to invite presence.',
        },
        {
          heading: 'Made With Intention',
          body: 'From ready-to-buy coloring books, guided journals, and playful game books to personalized keepsake editions, we care deeply about paper feel, thoughtful illustrations, and packaging that feels like a gift to yourself.',
        },
      ],
    },
  },
  delivery: {
    slug: 'delivery',
    title: 'Delivery & Production Timelines',
    subtitle:
      'Clear timelines for ready-to-buy orders and customized keepsakes so you always know when to expect your package.',
    seoTitle: 'Delivery & Shipping — Unwind & Doodle',
    seoDescription: 'Shipping schedules, location timelines, and customized order production lead times.',
    content: {
      highlights: [
        { label: 'Ready-to-Buy Dispatch', value: '1–2 business days' },
        { label: 'Customized Production', value: '3–5 business days before dispatch' },
        { label: 'Lagos & Abuja Delivery', value: '1–3 business days after dispatch' },
        { label: 'Other States', value: '3–6 business days after dispatch' },
      ],
      sections: [
        {
          heading: 'Regular (Ready-to-Buy) Orders',
          body: 'In-stock coloring books, journals, game books, coloring tools, and kits are packed and dispatched on our regular dispatch schedule once payment is confirmed.',
        },
        {
          heading: 'Customized Orders',
          body: 'Personalized and custom photo coloring books are illustrated and printed to order. Please allow production lead time in addition to delivery transit time for your location. If your order contains both ready-to-buy and customized items, we will ship them together once customization is complete unless arranged otherwise.',
        },
        {
          heading: 'Location-Based Delivery Fees',
          body: 'Exact delivery fees for your city or state are calculated automatically at checkout based on your selected delivery location. You will receive tracking updates via email as your order moves from confirmation to dispatch.',
        },
      ],
    },
  },
  returns: {
    slug: 'returns',
    title: 'Returns & Refunds Policy',
    subtitle:
      'We want you to love everything you receive from Unwind & Doodle. Here is how we handle damaged items, returns, and refunds.',
    seoTitle: 'Returns & Refunds — Unwind & Doodle',
    seoDescription: 'Learn about Unwind & Doodle return eligibility, damaged item replacements, and refunds.',
    content: {
      sections: [
        {
          heading: 'Damaged or Incorrect Items',
          body: 'If your order arrives damaged, defective, or missing an item, please reach out within 48 hours of delivery with your order number and a quick photo. We will arrange a replacement or refund promptly.',
        },
        {
          heading: 'Ready-to-Buy Returns',
          body: 'Unused, unopened ready-to-buy products in their original condition may be eligible for return or exchange within 7 days of delivery. Contact our support team with your order number to initiate a return.',
        },
        {
          heading: 'Customized Products',
          body: 'Because customized books are uniquely created from your photos or personalization details, they are non-refundable once production begins—except in the case of printing defects or transit damage.',
        },
        {
          heading: 'Refund Timelines',
          body: 'Approved refunds are processed back to your original payment method or designated bank account within 5–7 business days.',
        },
      ],
    },
  },
  faq: {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    subtitle: 'Quick answers about ordering, customization, delivery, and gifting.',
    seoTitle: 'FAQ — Unwind & Doodle',
    seoDescription: 'Answers to common questions about Unwind & Doodle products, customization, and delivery.',
    content: {
      sections: [],
      faqItems: [
        {
          question: 'How long does a customized coloring book take?',
          answer:
            'Customized books require production time for illustration and printing before dispatch. Check our Delivery page for current production and location transit timelines.',
        },
        {
          question: 'Do I need to customize a book, or can I buy ready-made ones?',
          answer:
            'Most of our collection—including Coloring Books, Journals, Game Books, Coloring Tools, and Kits—is ready to buy and ships right away without customization.',
        },
        {
          question: 'How do I track my order?',
          answer:
            'After completing checkout, you receive an order confirmation email with a direct link to your order status page, where you can follow progress from confirmation to delivery.',
        },
        {
          question: 'What payment methods do you accept?',
          answer:
            'We accept secure online payments via Paystack (Card, Bank Transfer, USSD) and any additional options enabled at checkout.',
        },
        {
          question: 'Can I send an order as a gift?',
          answer:
            'Yes! Simply enter the recipient’s delivery address at checkout and add a note in the Special Delivery Notes field if you have delivery instructions.',
        },
      ],
    },
  },
  contact: {
    slug: 'contact',
    title: 'Contact Us',
    subtitle: 'Have a question about an order, bulk gifting, or customization? We are happy to help.',
    seoTitle: 'Contact Us — Unwind & Doodle',
    seoDescription: 'Get in touch with the Unwind & Doodle support team.',
    content: {
      contactInfo: {
        email: 'hello@unwindanddoodle.com',
        whatsapp: '+234 000 000 0000',
        instagram: '@unwindanddoodle',
        hours: 'Monday – Saturday, 9:00 AM – 6:00 PM (WAT)',
        location: 'Lagos, Nigeria',
      },
      sections: [
        {
          heading: 'Order Support',
          body: 'For the fastest help with an existing order, please include your Order Number (e.g., ORD-...) when emailing or messaging us on WhatsApp.',
        },
        {
          heading: 'Bulk Orders, Events & Corporate Gifting',
          body: 'Planning a retreat, birthday party, girls’ night, or corporate wellness kit? Send us a message with your preferred quantity and event date and we will put together a tailored quote.',
        },
      ],
    },
  },
};
