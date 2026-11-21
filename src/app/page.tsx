import React from 'react';
import { unstable_cache } from 'next/cache';
import { getPublishedCatalog, CatalogProductItem } from '@/services/catalog.service';
import { getStoreReviews } from '@/services/review.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import CustomKeepsakeSection from '@/components/home/CustomKeepsakeSection';
import CategoryGrid, { DynamicCategory } from '@/components/home/CategoryGrid';
import BrandPhilosophySection from '@/components/home/BrandPhilosophySection';
import ReviewsSection, { RawReviewItem } from '@/components/home/ReviewsSection';
import NewsletterSection from '@/components/home/NewsletterSection';

export const revalidate = 60;

interface HomepageData {
  featuredProducts: CatalogProductItem[];
  categories: DynamicCategory[];
  reviews: RawReviewItem[];
  productsError: string | null;
}

const getHomepageData = unstable_cache(
  async (): Promise<HomepageData> => {
    const supabase = getServiceSupabaseClient();

    const [productsResult, categoriesResult, reviewsResult] = await Promise.allSettled([
      getPublishedCatalog(supabase, { sort: 'price-desc' }),
      supabase
        .from('categories')
        .select('id, name, slug, description')
        .order('name', { ascending: true }),
      getStoreReviews(supabase, 6),
    ]);

    const featuredProducts =
      productsResult.status === 'fulfilled' ? productsResult.value.slice(0, 4) : [];
    const productsError =
      productsResult.status === 'rejected'
        ? productsResult.reason instanceof Error
          ? productsResult.reason.message
          : 'Error loading catalog'
        : null;

    const categories: DynamicCategory[] =
      categoriesResult.status === 'fulfilled' && !categoriesResult.value.error
        ? (categoriesResult.value.data || [])
        : [];

    const reviews: RawReviewItem[] =
      reviewsResult.status === 'fulfilled' && Array.isArray(reviewsResult.value)
        ? reviewsResult.value
        : [];

    return {
      featuredProducts,
      categories,
      reviews,
      productsError,
    };
  },
  ['homepage-data'],
  { revalidate: 60 }
);

export default async function HomePage() {
  let data: HomepageData = {
    featuredProducts: [],
    categories: [],
    reviews: [],
    productsError: null,
  };

  try {
    data = await getHomepageData();
  } catch (err: unknown) {
    data.productsError = err instanceof Error ? err.message : 'Error loading catalog';
  }

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <HeroSection />

      {/* 2. FEATURED PRODUCTS SECTION */}
      <FeaturedProductsSection
        products={data.featuredProducts}
        loading={false}
        error={data.productsError}
      />

      {/* 3. CUSTOM COLORING BOOK SHOWCASE */}
      <CustomKeepsakeSection />

      {/* 4. SHOP BY CATEGORY */}
      <CategoryGrid initialCategories={data.categories} />

      {/* 5. BRAND / VALUE PROPOSITION */}
      <BrandPhilosophySection />

      {/* 6. REVIEWS / SOCIAL PROOF */}
      <ReviewsSection initialReviews={data.reviews} />

      {/* 7. NEWSLETTER SIGNUP */}
      <NewsletterSection />
    </div>
  );
}
