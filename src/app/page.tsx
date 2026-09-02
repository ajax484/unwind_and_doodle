'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CatalogProductItem } from '@/services/catalog.service';
import CategoryGrid from '@/components/home/CategoryGrid';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import NewsletterSection from '@/components/home/NewsletterSection';
import ReviewsSection from '@/components/home/ReviewsSection';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<CatalogProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMsg, setNewsletterMsg] = useState('');

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

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    try {
      setNewsletterStatus('loading');
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNewsletterStatus('success');
        setNewsletterMsg(json.message || 'Thank you for joining our community!');
        setNewsletterEmail('');
      } else {
        setNewsletterStatus('error');
        setNewsletterMsg(json.error || 'Failed to subscribe. Please try again.');
      }
    } catch {
      setNewsletterStatus('error');
      setNewsletterMsg('Network error. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pink-50/60 via-slate-50/30 to-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <span className="inline-block text-xs font-semibold px-3.5 py-1.5 rounded-full bg-pink-100/80 text-pink-700 border border-pink-200/50">
              🌿 Mindful Coloring & Journaling
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading text-slate-900 tracking-tight leading-tight">
              Unwind your mind, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-500">
                one doodle at a time.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-sans max-w-2xl mx-auto">
              Premium coloring books, guided journals, and artist-grade tools designed to bring peace, mindfulness, and quiet joy to your day.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/products"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-lg shadow-pink-200 transition-all hover:shadow-xl hover:scale-[1.02]"
              >
                Shop Collection
              </Link>
              <Link
                href="/products?category=coloring-books"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-sm transition-all"
              >
                Explore Coloring Books
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid Section */}
      <CategoryGrid />

      {/* Featured Products Section */}
      <FeaturedProductsSection
        products={featuredProducts}
        loading={loading}
        error={error}
      />

      {/* Testimonials & Features Section */}
      <ReviewsSection />

      {/* Newsletter Section */}
      <NewsletterSection
        email={newsletterEmail}
        status={newsletterStatus}
        message={newsletterMsg}
        onEmailChange={setNewsletterEmail}
        onSubmit={handleNewsletterSubmit}
      />
    </div>
  );
}
