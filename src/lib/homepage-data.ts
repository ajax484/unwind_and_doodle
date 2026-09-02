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
  location: string;
  product: string;
  rating: number;
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
    quote:
      'Turning our holiday family photos into a custom coloring book was the most heartwarming gift. The illustration quality and thick paper are absolute perfection.',
    author: 'Amina O.',
    location: 'Lagos, Nigeria',
    product: 'Custom Keepsake Coloring Book',
    rating: 5,
  },
  {
    quote:
      'This has genuinely become my evening ritual to unwind from busy work days. The binding stays flat, and the paper never bleeds through.',
    author: 'Tunde B.',
    location: 'Abuja, Nigeria',
    product: 'Mindful Floral Coloring Book',
    rating: 5,
  },
  {
    quote:
      'The aesthetic is so calm and soothing. It feels like an art piece on my table, and coloring each page brings so much peaceful focus.',
    author: 'Chidinma E.',
    location: 'Port Harcourt, Nigeria',
    product: 'Daily Reflection Journal',
    rating: 5,
  },
];
