'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { CatalogProductItem } from '@/services/catalog.service';

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

  const categories = [
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

  const reviews = [
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

  return (
    <div className="space-y-24 sm:space-y-36 pb-16">
      {/* 1. HERO SECTION (With signature logo corner blobs & doodle hearts) */}
      <section className="relative pt-8 sm:pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Organic corner blobs from logo */}
        <div className="absolute top-0 left-0 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-[#A7C2D4]/20 blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-[#D99BA3]/20 blur-3xl -z-10 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F8FA] border border-[#DCE7EE] text-xs font-heading font-semibold text-[#52657A]">
              <span className="text-[#D99BA3]">♡</span>
              <span>Mindful Coloring Books &amp; Custom Photo Keepsakes</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#243342] leading-[1.08]">
              Create something <br className="hidden sm:inline" />
              <span className="text-[#A7C2D4]">worth </span>
              <span className="text-[#D99BA3]">keeping.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#52657A] max-w-xl leading-relaxed">
              Coloring books, guided journals, and creative essentials thoughtfully designed to make space for imagination, quiet moments, and everyday relaxation.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link href="/products" className="btn-rose !py-3.5 !px-7 text-center">
                Shop the collection →
              </Link>
              <Link
                href="/products?category=coloring-books"
                className="btn-blue !py-3.5 !px-7 text-center"
              >
                Create your coloring book
              </Link>
            </div>

            {/* Trust points */}
            <div className="pt-6 border-t border-[#EDF3F7] grid grid-cols-3 gap-4 text-xs text-[#52657A]">
              <div>
                <span className="font-heading font-bold text-[#243342] block">Archival Paper</span>
                <span>Bleed-resistant 160gsm</span>
              </div>
              <div>
                <span className="font-heading font-bold text-[#243342] block">Personalized</span>
                <span>Made from your photos</span>
              </div>
              <div>
                <span className="font-heading font-bold text-[#243342] block">Nationwide</span>
                <span>Delivery across Nigeria</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Card with Brand Logo */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-white border-2 border-[#EDF3F7] shadow-lg p-6 sm:p-8 flex flex-col justify-between">
              {/* Background gradient from logo */}
              <div className="absolute top-0 left-0 w-32 h-32 rounded-br-full bg-[#A7C2D4]/25 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-32 h-32 rounded-tl-full bg-[#D99BA3]/25 pointer-events-none" />

              {/* Header inside card */}
              <div className="flex justify-between items-center relative z-10">
                <span className="font-heading font-bold text-xs text-[#52657A]">
                  <span className="text-[#A7C2D4]">unw</span><span className="text-[#D99BA3]">i</span><span className="text-[#A7C2D4]">nd</span> &amp; <span className="text-[#A7C2D4]">d</span><span className="text-[#D99BA3]">oo</span><span className="text-[#A7C2D4]">dle</span>
                </span>
                <span className="text-[11px] font-heading font-semibold text-[#D99BA3] bg-[#FBF0F2] px-2.5 py-1 rounded-full border border-[#F0DCE0]">
                  Mindful Edition
                </span>
              </div>

              {/* Logo display in center of hero card */}
              <div className="text-center space-y-4 my-auto py-6 relative z-10">
                <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-3xl bg-white border border-[#E2ECF2] shadow-md p-2 flex items-center justify-center hover:scale-105 transition-transform">
                  <img
                    src="/logo.png"
                    alt="Unwind and Doodle"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#243342]">
                    Unwind your mind.
                  </h3>
                  <p className="text-xs text-[#52657A] max-w-xs mx-auto">
                    Turn off the noise, pick up your colors, and enjoy meditative illustrations.
                  </p>
                </div>
              </div>

              {/* Bottom caption */}
              <div className="p-3.5 bg-[#F4F8FA] rounded-2xl border border-[#EDF3F7] text-left flex items-center justify-between relative z-10">
                <div>
                  <span className="text-xs font-heading font-bold text-[#243342] block">Custom Photo Books</span>
                  <span className="text-[11px] text-[#52657A]">Turn memories into coloring pages</span>
                </div>
                <Link
                  href="/products?category=coloring-books"
                  className="text-xs font-heading font-bold text-[#D99BA3] hover:text-[#C67D87]"
                >
                  Explore →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED PRODUCTS SECTION ("Favorites right now") */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-4 border-b border-[#EDF3F7]">
          <div>
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block mb-1">
              Curated Favorites
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#243342]">
              Favorites right now
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs sm:text-sm font-heading font-semibold text-[#D99BA3] hover:text-[#C67D87] transition-colors flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Shop all products</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-soft h-80 animate-pulse bg-[#F4F8FA]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#B33948] bg-[#FDF0F2] rounded-2xl max-w-md mx-auto">
            <p className="text-xs sm:text-sm font-medium">{error}</p>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-12 text-center bg-[#F4F8FA] rounded-2xl max-w-md mx-auto space-y-3">
            <h3 className="font-heading font-bold text-lg text-[#243342]">New editions coming shortly</h3>
            <p className="text-xs text-[#52657A]">
              We are currently preparing our new restock. Explore all items in our catalog.
            </p>
            <Link href="/products" className="btn-blue text-xs inline-block">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {featuredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                id={prod.id}
                name={prod.name}
                slug={prod.slug}
                price={prod.price}
                primaryImage={prod.primaryImage}
                isAvailable={prod.isAvailable}
                requiresCustomization={prod.requiresCustomization}
                categories={prod.categories}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-12 sm:hidden">
          <Link href="/products" className="btn-outline w-full text-xs">
            Shop all products →
          </Link>
        </div>
      </section>

      {/* 3. CUSTOM COLORING BOOK SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#243342] text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
          {/* Subtle logo blobs inside dark card */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#A7C2D4]/15 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#D99BA3]/15 blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
            {/* Left: Headline & Explanation */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#36495C] text-[11px] font-heading font-semibold tracking-wide uppercase text-[#EDF3F7]">
                <span className="text-[#D99BA3]">✨</span>
                <span>Personalized Keepsake Books</span>
              </div>

              <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-tight text-white">
                Turn your memories into <br />
                <span className="text-[#D99BA3]">coloring pages.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#A5B8C8] leading-relaxed">
                Upload your favorite photos from family celebrations, vacations, weddings, or cherished moments. Our artists transform them into bespoke line art bound into a personalized coloring book.
              </p>

              {/* 3-Step Visual Process */}
              <div className="grid grid-cols-3 gap-3 pt-4 pb-2 border-y border-[#36495C] text-xs">
                <div className="space-y-1">
                  <span className="text-[#A7C2D4] font-heading font-bold text-base block">01.</span>
                  <span className="font-heading font-bold text-white block">Your Photo</span>
                  <span className="text-[11px] text-[#8295A8] block">Upload your moments</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#D99BA3] font-heading font-bold text-base block">02.</span>
                  <span className="font-heading font-bold text-white block">Line Art</span>
                  <span className="text-[11px] text-[#8295A8] block">Drawn into coloring pages</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#A7C2D4] font-heading font-bold text-base block">03.</span>
                  <span className="font-heading font-bold text-white block">Bound Book</span>
                  <span className="text-[11px] text-[#8295A8] block">Delivered to your door</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/products?category=coloring-books"
                  className="btn-rose !py-3.5 !px-8 text-sm inline-flex items-center gap-2"
                >
                  <span>Create your coloring book</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {/* Right: Dual Process Cards */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1B2733] rounded-2xl p-6 flex flex-col justify-between space-y-8 border border-[#36495C]">
                  <span className="text-xs uppercase font-heading font-semibold tracking-wider text-[#A7C2D4]">
                    Input
                  </span>
                  <div className="text-center py-6">
                    <span className="text-4xl mb-2 block">📷</span>
                    <span className="font-heading font-bold text-sm text-white block">Favorite Photo</span>
                    <span className="text-[11px] text-[#8295A8]">Portraits, family, &amp; pets</span>
                  </div>
                  <span className="text-[10px] text-[#8295A8] text-center">Step 1 • Digital Upload</span>
                </div>

                <div className="bg-[#1B2733] rounded-2xl p-6 flex flex-col justify-between space-y-8 border border-[#36495C]">
                  <span className="text-xs uppercase font-heading font-semibold tracking-wider text-[#D99BA3]">
                    Output
                  </span>
                  <div className="text-center py-6">
                    <span className="text-4xl mb-2 block">📖</span>
                    <span className="font-heading font-bold text-sm text-white block">Printed Keepsake</span>
                    <span className="text-[11px] text-[#8295A8]">160gsm archival finish</span>
                  </div>
                  <span className="text-[10px] text-[#8295A8] text-center">Step 2 • Hand-Bound</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SHOP BY CATEGORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block">
            Explore Collections
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#243342]">
            Shop by category
          </h2>
          <p className="text-xs sm:text-sm text-[#52657A]">
            Discover thoughtfully curated formats for relaxation, journaling, and mindful drawing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className={`card-soft p-6 sm:p-7 flex flex-col justify-between h-64 group bg-white ${cat.borderColor} transition-all`}
            >
              <div className="space-y-2.5">
                <span className={`text-[10px] font-heading font-bold tracking-wider uppercase px-2.5 py-1 rounded-full inline-block ${cat.badgeColor}`}>
                  {cat.tag}
                </span>
                <h3 className="font-heading font-bold text-xl text-[#243342] group-hover:text-[#D99BA3] transition-colors leading-snug">
                  {cat.title}
                </h3>
                <p className="text-xs text-[#52657A] leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#EDF3F7] flex items-center justify-between text-xs font-heading font-semibold text-[#243342] group-hover:text-[#D99BA3]">
                <span>Browse collection</span>
                <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. BRAND / VALUE PROPOSITION */}
      <section id="about" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 py-8 sm:py-16 relative">
        <div className="flex items-center justify-center gap-3 text-2xl text-[#D99BA3]">
          <span>♡</span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block">
            Our Brand Philosophy
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-[#243342] tracking-tight leading-tight">
            Made for slow moments.
          </h2>
          <p className="text-base sm:text-lg text-[#52657A] leading-relaxed max-w-2xl mx-auto pt-2">
            We believe creativity doesn’t need a reason or an outcome. Sometimes you just need a quiet hour, a cup of tea, and something beautiful to make with.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/products"
            className="text-xs sm:text-sm font-heading font-semibold text-[#D99BA3] hover:text-[#C67D87] transition-colors inline-flex items-center gap-1.5"
          >
            <span>Explore our stationery range</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* 6. REVIEWS / SOCIAL PROOF */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#D99BA3] block">
            Customer Reflections
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#243342]">
            What people are saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {reviews.map((rev, i) => (
            <div
              key={i}
              className="card-soft p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white border border-[#EDF3F7]"
            >
              <div className="space-y-4">
                {/* Star rating in signature rose */}
                <div className="flex text-[#D99BA3] text-sm tracking-widest" aria-label="5 out of 5 stars">
                  ★★★★★
                </div>
                {/* Quote */}
                <p className="text-sm sm:text-base text-[#243342] italic leading-relaxed">
                  "{rev.quote}"
                </p>
              </div>

              {/* Author & Product */}
              <div className="pt-4 border-t border-[#EDF3F7] space-y-0.5">
                <span className="font-heading font-bold text-xs text-[#243342] block">
                  {rev.author}
                </span>
                <div className="flex items-center justify-between text-[11px] text-[#8295A8]">
                  <span>{rev.product}</span>
                  <span>{rev.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. NEWSLETTER SIGNUP */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F4F8FA] border-2 border-[#EDF3F7] rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block">
              The Mindful Letter
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold text-[#243342]">
              Stay in the loop.
            </h2>
            <p className="text-xs sm:text-sm text-[#52657A] leading-relaxed">
              New product editions, creative journaling prompts, and occasional quiet inspirations in your inbox. No spam.
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                required
                type="email"
                placeholder="Enter your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={newsletterStatus === 'loading'}
                className="form-input text-xs sm:text-sm flex-grow !py-3"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="btn-rose text-xs sm:text-sm !py-3 !px-6 whitespace-nowrap"
              >
                {newsletterStatus === 'loading' ? 'Joining...' : 'Subscribe'}
              </button>
            </div>

            {newsletterMsg && (
              <p
                className={`text-xs font-medium ${
                  newsletterStatus === 'success' ? 'text-[#1F7A4D]' : 'text-[#B33948]'
                }`}
              >
                {newsletterMsg}
              </p>
            )}
          </form>

          <p className="text-[11px] text-[#8295A8]">
            By subscribing you agree to receive updates from Unwind &amp; Doodle. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
