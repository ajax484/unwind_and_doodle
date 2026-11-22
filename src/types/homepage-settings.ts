import { z } from 'zod';

export const HOMEPAGE_SECTION_KEYS = [
  'hero',
  'categories',
  'featured_products',
  'custom_keepsake',
  'brand_philosophy',
  'reviews',
  'newsletter',
] as const;

export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

export const HomepageSectionKeySchema = z.enum(HOMEPAGE_SECTION_KEYS);

export const HomepageSectionItemSchema = z.object({
  key: HomepageSectionKeySchema,
  enabled: z.boolean().default(true),
});

export const HeroCopySchema = z.object({
  headlineLead: z.string().trim().min(1).max(120),
  headlineBlue: z.string().trim().max(80),
  headlineRose: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(1).max(400),
  primaryCtaLabel: z.string().trim().min(1).max(80),
  primaryCtaHref: z.string().trim().min(1).max(200),
  secondaryCtaLabel: z.string().trim().min(1).max(80),
  secondaryCtaHref: z.string().trim().min(1).max(200),
  socialProofLabel: z.string().trim().max(120),
});

export const CategoriesCopySchema = z.object({
  badge: z.string().trim().max(80),
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(300),
});

export const FeaturedProductsCopySchema = z.object({
  eyebrow: z.string().trim().max(80),
  title: z.string().trim().min(1).max(120),
  ctaLabel: z.string().trim().min(1).max(80),
});

export const CustomKeepsakeCopySchema = z.object({
  badge: z.string().trim().max(80),
  headlineLead: z.string().trim().min(1).max(120),
  headlineAccent: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  ctaLabel: z.string().trim().min(1).max(80),
  ctaHref: z.string().trim().min(1).max(200),
});

export const BrandPhilosophyCopySchema = z.object({
  badge: z.string().trim().max(80),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(600),
  ctaLabel: z.string().trim().min(1).max(80),
  ctaHref: z.string().trim().min(1).max(200),
});

export const ReviewsCopySchema = z.object({
  eyebrow: z.string().trim().max(80),
  title: z.string().trim().min(1).max(120),
});

export const NewsletterCopySchema = z.object({
  eyebrow: z.string().trim().max(80),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400),
  buttonLabel: z.string().trim().min(1).max(60),
});

export const HomepageConfigSchema = z.object({
  sections: z
    .array(HomepageSectionItemSchema)
    .min(1)
    .refine(
      (items) => {
        const keys = items.map((i) => i.key);
        return new Set(keys).size === keys.length;
      },
      { message: 'Duplicate homepage section keys are not allowed' }
    ),
  copy: z.object({
    hero: HeroCopySchema,
    categories: CategoriesCopySchema,
    featured_products: FeaturedProductsCopySchema,
    custom_keepsake: CustomKeepsakeCopySchema,
    brand_philosophy: BrandPhilosophyCopySchema,
    reviews: ReviewsCopySchema,
    newsletter: NewsletterCopySchema,
  }),
});

export type HomepageSectionItem = z.infer<typeof HomepageSectionItemSchema>;
export type HeroCopy = z.infer<typeof HeroCopySchema>;
export type CategoriesCopy = z.infer<typeof CategoriesCopySchema>;
export type FeaturedProductsCopy = z.infer<typeof FeaturedProductsCopySchema>;
export type CustomKeepsakeCopy = z.infer<typeof CustomKeepsakeCopySchema>;
export type BrandPhilosophyCopy = z.infer<typeof BrandPhilosophyCopySchema>;
export type ReviewsCopy = z.infer<typeof ReviewsCopySchema>;
export type NewsletterCopy = z.infer<typeof NewsletterCopySchema>;
export type HomepageConfig = z.infer<typeof HomepageConfigSchema>;

export interface HomepageSettingsRecord {
  config: HomepageConfig;
  updatedAt: string | null;
  isDefault: boolean;
}

export const HOMEPAGE_SECTION_LABELS: Record<HomepageSectionKey, { label: string; icon: string }> = {
  hero: { label: 'Hero Introduction', icon: '✨' },
  categories: { label: 'Category Tiles', icon: '📚' },
  featured_products: { label: 'Featured Products', icon: '⭐' },
  custom_keepsake: { label: 'Custom Keepsake Books', icon: '🎨' },
  brand_philosophy: { label: 'Brand Philosophy', icon: '🌿' },
  reviews: { label: 'Customer Reviews', icon: '💬' },
  newsletter: { label: 'Newsletter Signup', icon: '✉️' },
};

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  sections: [
    { key: 'hero', enabled: true },
    { key: 'categories', enabled: true },
    { key: 'featured_products', enabled: true },
    { key: 'custom_keepsake', enabled: true },
    { key: 'brand_philosophy', enabled: true },
    { key: 'reviews', enabled: true },
    { key: 'newsletter', enabled: true },
  ],
  copy: {
    hero: {
      headlineLead: 'A little less scrolling.',
      headlineBlue: 'A lot more ',
      headlineRose: 'living.',
      subtitle:
        'Playful coloring books, guided journals, and game books thoughtfully designed for calm, screen-free moments and everyday joy.',
      primaryCtaLabel: 'Shop the collection',
      primaryCtaHref: '/products',
      secondaryCtaLabel: 'Explore coloring books',
      secondaryCtaHref: '/products?category=coloring-books',
      socialProofLabel: 'Loved by colorists',
    },
    categories: {
      badge: 'Explore Collections',
      title: 'Shop by category',
      subtitle:
        'Discover ready-to-buy coloring books, journals, game books, coloring tools, curated kits, and custom keepsakes.',
    },
    featured_products: {
      eyebrow: 'Ready to Unwind',
      title: 'Favorites right now',
      ctaLabel: 'Shop all products',
    },
    custom_keepsake: {
      badge: 'Personalized Keepsake Books',
      headlineLead: 'Turn your memories into',
      headlineAccent: 'coloring pages.',
      description:
        'Upload your favorite photos from family celebrations, vacations, weddings, or cherished moments. Our artists transform them into bespoke line art bound into a personalized coloring book.',
      ctaLabel: 'Create your coloring book',
      ctaHref: '/products?category=customized-books',
    },
    brand_philosophy: {
      badge: 'Our Brand Philosophy',
      title: 'Made for slow moments.',
      body: 'We believe creativity doesn’t need a reason or an outcome. Sometimes you just need a quiet hour, a cup of tea, and something beautiful to make with.',
      ctaLabel: 'Read our story',
      ctaHref: '/about',
    },
    reviews: {
      eyebrow: 'Customer Reflections',
      title: 'What people are saying',
    },
    newsletter: {
      eyebrow: 'The Mindful Letter',
      title: 'Stay in the loop.',
      description:
        'New product editions, creative journaling prompts, and occasional quiet inspirations in your inbox. No spam.',
      buttonLabel: 'Subscribe',
    },
  },
};

/**
 * Ensures all canonical sections exist in the returned section list while preserving saved ordering & visibility.
 */
export function normalizeHomepageConfig(raw: unknown): HomepageConfig {
  const parsed = HomepageConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_HOMEPAGE_CONFIG;
  }

  const seen = new Set(parsed.data.sections.map((s) => s.key));
  const missing = HOMEPAGE_SECTION_KEYS.filter((k) => !seen.has(k)).map((key) => ({
    key,
    enabled: true,
  }));

  return {
    sections: [...parsed.data.sections, ...missing],
    copy: parsed.data.copy,
  };
}
