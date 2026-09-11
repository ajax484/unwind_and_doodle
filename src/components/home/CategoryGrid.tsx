import React from 'react';
import Link from 'next/link';
import { HOMEPAGE_CATEGORIES } from '@/lib/homepage-data';

export default function CategoryGrid() {
  return (
    <section className="w-full bg-gradient-to-b from-brand-rose-subtle via-bg-accent to-brand-rose-light py-16 sm:py-24 lg:py-32 border-b border-brand-rose/25 relative overflow-hidden">
      {/* Soft decorative background blobs spanning full width */}
      <div className="absolute top-0 right-0 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full bg-brand-rose/22 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full bg-brand-blue/18 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-brand-rose/35 text-xs font-heading font-semibold text-text-accent shadow-2xs">
              <span>♡</span>
              <span className="uppercase tracking-wider text-[11px]">Explore Collections</span>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight">
              Shop by category
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
              Discover thoughtfully curated formats for relaxation, journaling, and mindful drawing.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOMEPAGE_CATEGORIES.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className="card-soft p-6 sm:p-7 flex flex-col justify-between h-64 group bg-white border border-brand-rose/25 hover:border-brand-rose hover:shadow-lg hover:shadow-brand-rose/15 transition-all duration-300"
              >
                <div className="space-y-2.5">
                  <span
                    className={`text-[10px] font-heading font-bold tracking-wider uppercase px-2.5 py-1 rounded-full inline-block ${cat.badgeColor}`}
                  >
                    {cat.tag}
                  </span>
                  <h3 className="font-heading font-bold text-xl text-text-primary group-hover:text-action-primary transition-colors leading-snug">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border-default flex items-center justify-between text-xs font-heading font-semibold text-action-primary group-hover:text-action-primary-hover transition-colors">
                  <span>Browse collection</span>
                  <span className="group-hover:translate-x-1.5 transition-transform" aria-hidden="true">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
  );
}
