import React from 'react';
import Link from 'next/link';

export default function BrandPhilosophySection() {
  return (
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
  );
}
