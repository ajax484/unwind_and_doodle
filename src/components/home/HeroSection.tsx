import React from 'react';
import Link from 'next/link';

const LEFT_VIDEO_URL = 'https://pexeuungdxbvcqtktwww.supabase.co/storage/v1/object/public/videos/VIDEO-2026-09-25-11-30-09.mp4';
const RIGHT_VIDEO_URL = 'https://pexeuungdxbvcqtktwww.supabase.co/storage/v1/object/public/videos/VIDEO-2026-09-25-11-36-19.mp4';

export default function HeroSection() {
  return (
    <section className="w-full bg-white relative pt-12 sm:pt-20 lg:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-border-default overflow-hidden">
      {/* Top-Left Circular Video Container (Desktop / Tablet floating corner) */}
      <div className="hidden lg:block absolute -top-12 -left-12 xl:-top-16 xl:-left-16 w-80 h-80 xl:w-[480px] xl:h-[480px] pointer-events-none z-0">
        <div className="w-full h-full rounded-full p-3 sm:p-4 bg-brand-rose/15 border-4 sm:border-8 border-brand-rose/25 shadow-xl transition-transform duration-700 hover:scale-105">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-brand-rose/40 bg-bg-subtle aspect-square relative">
            <video
              src={LEFT_VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover scale-105"
            />
          </div>
        </div>
      </div>

      {/* Bottom-Right Circular Video Container (Desktop / Tablet floating corner) */}
      <div className="hidden lg:block absolute -bottom-12 -right-12 xl:-bottom-16 xl:-right-16 w-80 h-80 xl:w-[480px] xl:h-[480px] pointer-events-none z-0">
        <div className="w-full h-full rounded-full p-3 sm:p-4 bg-brand-blue/15 border-4 sm:border-8 border-brand-blue/25 shadow-xl transition-transform duration-700 hover:scale-105">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-brand-blue/40 bg-bg-subtle aspect-square relative">
            <video
              src={RIGHT_VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover scale-105"
            />
          </div>
        </div>
      </div>

      {/* Centered Main Content Container */}
      <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6 sm:space-y-8">
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-subtle border border-border-input text-xs font-heading font-semibold text-text-secondary shadow-xs">
          <span className="text-brand-rose">♡</span>
          <span>Mindful Coloring Books &amp; Custom Photo Keepsakes</span>
        </div>

        {/* Display Headline */}
        <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-[1.08]">
          Create something <br className="hidden sm:inline" />
          <span className="text-brand-blue">worth </span>
          <span className="text-brand-rose">keeping.</span>
        </h1>

        {/* Subtitle Copy */}
        <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
          Coloring books, guided journals, and creative essentials thoughtfully designed to make space for imagination, quiet moments, and everyday relaxation.
        </p>

        {/* Mobile / Tablet Responsive Circular Video Showcases (Visible on < lg screens) */}
        <div className="flex lg:hidden justify-center items-center gap-4 sm:gap-6 py-2">
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full p-2 bg-brand-rose/15 border-2 border-brand-rose/30 shadow-md">
            <div className="w-full h-full rounded-full overflow-hidden border border-brand-rose/40 aspect-square">
              <video
                src={LEFT_VIDEO_URL}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full p-2 bg-brand-blue/15 border-2 border-brand-blue/30 shadow-md">
            <div className="w-full h-full rounded-full overflow-hidden border border-brand-blue/40 aspect-square">
              <video
                src={RIGHT_VIDEO_URL}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* CTA Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 pt-2">
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

        {/* Trust Points Row */}
        <div className="pt-8 border-t border-border-default grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-text-secondary max-w-3xl mx-auto">
          <div className="space-y-0.5">
            <span className="font-heading font-bold text-text-primary text-sm block">Archival Paper</span>
            <span>Bleed-resistant 160gsm</span>
          </div>
          <div className="space-y-0.5">
            <span className="font-heading font-bold text-text-primary text-sm block">Personalized</span>
            <span>Made from your photos</span>
          </div>
          <div className="space-y-0.5">
            <span className="font-heading font-bold text-text-primary text-sm block">Nationwide</span>
            <span>Delivery across Nigeria</span>
          </div>
        </div>
      </div>
    </section>
  );
}
