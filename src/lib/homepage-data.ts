export interface CategoryCardData {
  title: string;
  description: string;
  href: string;
  tag: string;
  badgeColor: string;
  borderColor: string;
}

export interface ReviewData {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

export interface FeatureData {
  icon: string;
  title: string;
  description: string;
}

export const HOMEPAGE_CATEGORIES: CategoryCardData[] = [
  {
    title: 'Coloring Books',
    description: 'Mindful illustrations on thick, bleed-resistant archival pages',
    href: '/products?category=coloring-books',
    tag: 'Mindful Art',
    badgeColor: 'bg-[#EBF3F8] text-[#4A7A99]',
    borderColor: 'hover:border-[#A7C2D4]',
  },
  {
    title: 'Guided Journals',
    description: 'Open layouts and gentle daily prompts for peaceful reflection',
    href: '/products?category=journals',
    tag: 'Reflection',
    badgeColor: 'bg-[#FBF0F2] text-[#9E4D58]',
    borderColor: 'hover:border-[#D99BA3]',
  },
  {
    title: 'Coloring Pencils & Pens',
    description: 'Soft artist-grade pigments and smooth fine liners',
    href: '/products?category=writing',
    tag: 'Creative Tools',
    badgeColor: 'bg-[#EBF3F8] text-[#4A7A99]',
    borderColor: 'hover:border-[#A7C2D4]',
  },
  {
    title: 'Curated Gift Sets',
    description: 'Thoughtful bundles with books, pencils, and custom keepsakes',
    href: '/products?category=gift-sets',
    tag: 'Gift Sets',
    badgeColor: 'bg-[#FBF0F2] text-[#9E4D58]',
    borderColor: 'hover:border-[#D99BA3]',
  },
];

export const HOMEPAGE_REVIEWS: ReviewData[] = [
  {
    quote: 'Unwind & Doodle coloring books have become my evening ritual. The paper quality is amazing and doesn’t bleed through at all.',
    author: 'Amina K.',
    role: 'Verified Buyer',
    rating: 5,
  },
  {
    quote: 'The guided journal helped me build a daily mindfulness habit. Beautiful minimalist designs with just the right prompts.',
    author: 'David O.',
    role: 'Verified Buyer',
    rating: 5,
  },
  {
    quote: 'Ordered the gift bundle for a friend and it came packaged so thoughtfully. The colored pencils are rich and vibrant.',
    author: 'Chidinma N.',
    role: 'Verified Buyer',
    rating: 5,
  },
];

export const HOMEPAGE_FEATURES: FeatureData[] = [
  {
    icon: '✨',
    title: 'Mindfully Crafted',
    description: 'Designed specifically to reduce stress and spark daily creativity.',
  },
  {
    icon: '🌿',
    title: 'Archival & Sustainable',
    description: 'Premium FSC-certified paper that feels substantial and resists bleed-through.',
  },
  {
    icon: '📦',
    title: 'Fast Nationwide Delivery',
    description: 'Carefully packed and delivered right to your doorstep across Nigeria.',
  },
];
