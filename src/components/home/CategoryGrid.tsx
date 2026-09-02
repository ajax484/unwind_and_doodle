import React from 'react';
import Link from 'next/link';
import { HOMEPAGE_CATEGORIES } from '@/lib/homepage-data';

export default function CategoryGrid() {
  return (
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
        {HOMEPAGE_CATEGORIES.map((cat) => (
          <Link
            key={cat.title}
            href={cat.href}
            className={`card-soft p-6 sm:p-7 flex flex-col justify-between h-64 group bg-white ${cat.borderColor} transition-all`}
          >
            <div className="space-y-2.5">
              <span
                className={`text-[10px] font-heading font-bold tracking-wider uppercase px-2.5 py-1 rounded-full inline-block ${cat.badgeColor}`}
              >
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
  );
}
