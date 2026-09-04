'use client';

import React, { useEffect, useState } from 'react';
import { CatalogProductItem } from '@/services/catalog.service';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import CustomKeepsakeSection from '@/components/home/CustomKeepsakeSection';
import CategoryGrid from '@/components/home/CategoryGrid';
import BrandPhilosophySection from '@/components/home/BrandPhilosophySection';
import ReviewsSection from '@/components/home/ReviewsSection';
import NewsletterSection from '@/components/home/NewsletterSection';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<CatalogProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/products?limit=4');
        if (!res.ok) throw new Error('Unable to load featured products');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setFeaturedProducts(json.data.slice(0, 4));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading catalog');
      } finally {
        setLoading(false);
      }
    }
    loadFeaturedProducts();
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO SECTION */}
      <HeroSection />

      {/* 2. FEATURED PRODUCTS SECTION */}
      <FeaturedProductsSection
        products={featuredProducts}
        loading={loading}
        error={error}
      />

      {/* 3. CUSTOM COLORING BOOK SHOWCASE */}
      <CustomKeepsakeSection />

      {/* 4. SHOP BY CATEGORY */}
      <CategoryGrid />

      {/* 5. BRAND / VALUE PROPOSITION */}
      <BrandPhilosophySection />

      {/* 6. REVIEWS / SOCIAL PROOF */}
      <ReviewsSection />

      {/* 7. NEWSLETTER SIGNUP */}
      <NewsletterSection />
    </div>
  );
}
