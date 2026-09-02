import React from 'react';
import Link from 'next/link';
import { HOMEPAGE_CATEGORIES } from '@/lib/homepage-data';

export default function CategoryGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-bold font-heading text-slate-800 tracking-tight">
          Explore Our Collections
        </h2>
        <p className="mt-3 text-slate-600 text-lg">
          Tools created to help you slow down, express yourself, and find peaceful moments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {HOMEPAGE_CATEGORIES.map((cat) => (
          <Link
            key={cat.title}
            href={cat.href}
            className={`group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md ${cat.borderColor} flex flex-col justify-between`}
          >
            <div>
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${cat.badgeColor} mb-4`}>
                {cat.tag}
              </span>
              <h3 className="text-xl font-bold font-heading text-slate-800 group-hover:text-pink-600 transition-colors">
                {cat.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {cat.description}
              </p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-pink-600 group-hover:translate-x-1 transition-transform">
              Shop Now <span className="ml-1">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
