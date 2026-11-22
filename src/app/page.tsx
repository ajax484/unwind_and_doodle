import React from 'react';
import { unstable_cache } from 'next/cache';
import { getPublishedCatalog, CatalogProductItem } from '@/services/catalog.service';
import { getStoreReviews } from '@/services/review.service';
import { getHomepageSettings } from '@/services/homepage-settings.service';
import { DEFAULT_HOMEPAGE_CONFIG, HomepageConfig, HomepageSectionKey } from '@/types/homepage-settings';
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
  homepageConfig: HomepageConfig;
  productsError: string | null;
}

const getHomepageData = unstable_cache(
  async (): Promise<HomepageData> => {
    const supabase = getServiceSupabaseClient();

    const [
      featuredResult,
      fallbackCatalogResult,
      categoriesResult,
      reviewsResult,
      homepageSettingsResult,
    ] = await Promise.allSettled([
      getPublishedCatalog(supabase, { featuredOnly: true, sort: 'featured' }),
      getPublishedCatalog(supabase, { sort: 'featured', limit: 4 }),
      supabase
        .from('categories')
        .select('id, name, slug, description, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      getStoreReviews(supabase, 6),
      getHomepageSettings(supabase),
    ]);

    const explicitlyFeatured =
      featuredResult.status === 'fulfilled' ? featuredResult.value : [];
    const fallbackProducts =
      fallbackCatalogResult.status === 'fulfilled' ? fallbackCatalogResult.value : [];

    const featuredProducts =
      explicitlyFeatured.length > 0 ? explicitlyFeatured : fallbackProducts;
    const productsError =
      featuredResult.status === 'rejected' && fallbackCatalogResult.status === 'rejected'
        ? featuredResult.reason instanceof Error
          ? featuredResult.reason.message
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

    const homepageConfig: HomepageConfig =
      homepageSettingsResult.status === 'fulfilled'
        ? homepageSettingsResult.value.config
        : DEFAULT_HOMEPAGE_CONFIG;

    return {
      featuredProducts,
      categories,
      reviews,
      homepageConfig,
      productsError,
    };
  },
  ['homepage-data'],
  { revalidate: 60, tags: ['homepage-data', 'catalog', 'categories'] }
);

export default async function HomePage() {
  let data: HomepageData = {
    featuredProducts: [],
    categories: [],
    reviews: [],
    homepageConfig: DEFAULT_HOMEPAGE_CONFIG,
    productsError: null,
  };

  try {
    data = await getHomepageData();
  } catch (err: unknown) {
    data.productsError = err instanceof Error ? err.message : 'Error loading catalog';
  }

  const { copy, sections } = data.homepageConfig;

  const renderSection = (key: HomepageSectionKey) => {
    switch (key) {
      case 'hero':
        return <HeroSection key="hero" copy={copy.hero} />;
      case 'categories':
        return (
          <CategoryGrid
            key="categories"
            initialCategories={data.categories}
            copy={copy.categories}
          />
        );
      case 'featured_products':
        return (
          <FeaturedProductsSection
            key="featured_products"
            products={data.featuredProducts}
            loading={false}
            error={data.productsError}
            copy={copy.featured_products}
          />
        );
      case 'custom_keepsake':
        return <CustomKeepsakeSection key="custom_keepsake" copy={copy.custom_keepsake} />;
      case 'brand_philosophy':
        return <BrandPhilosophySection key="brand_philosophy" copy={copy.brand_philosophy} />;
      case 'reviews':
        return (
          <ReviewsSection
            key="reviews"
            initialReviews={data.reviews}
            copy={copy.reviews}
          />
        );
      case 'newsletter':
        return <NewsletterSection key="newsletter" copy={copy.newsletter} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex flex-col">
      {sections.filter((s) => s.enabled).map((s) => renderSection(s.key))}
    </div>
  );
}
