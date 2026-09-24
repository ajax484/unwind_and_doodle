import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop All Products | Mindful Coloring Books, Custom Journals & Art Kits',
  description:
    'Explore our collection of stress-relieving coloring books, personalized custom journals, writing supplies, and mindful gift sets.',
  openGraph: {
    title: 'Shop All Products | Unwind & Doodle',
    description:
      'Explore our collection of stress-relieving coloring books, personalized custom journals, writing supplies, and mindful gift sets.',
    type: 'website',
  },
  alternates: {
    canonical: '/products',
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
