import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function BrandPhilosophySection() {
  return (
    <section id="about" className="w-full bg-white py-16 sm:py-24 lg:py-32 border-b border-border-default relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
        {/* Side 1: Image with light gray border (2px thickness) */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-full max-w-sm sm:max-w-md aspect-square rounded-3xl overflow-hidden border-2 border-border-default shadow-xs bg-bg-default">
            <Image
              src="/images/brand-philosophy.png"
              alt="Mindful coloring illustration"
              width={512}
              height={512}
              className="w-full h-full object-cover object-center"
              priority={false}
            />
          </div>
        </div>

        {/* Side 2: Text slightly offset to the left */}
        <div className="space-y-6 text-left md:-translate-x-4 lg:-translate-x-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-subtle border border-border-input text-xs font-heading font-semibold text-text-secondary">
            <span className="text-brand-rose">♡</span>
            <span className="uppercase tracking-wider text-[11px] text-brand-blue">Our Brand Philosophy</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight leading-tight">
            Made for slow moments.
          </h2>

          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            We believe creativity doesn’t need a reason or an outcome. Sometimes you just need a quiet hour, a cup of tea, and something beautiful to make with.
          </p>

          <div className="pt-2">
            <Link
              href="/products"
              className="text-xs sm:text-sm font-heading font-semibold text-action-primary hover:text-action-primary-hover transition-colors inline-flex items-center gap-1.5 group"
            >
              <span>Explore our stationery range</span>
              <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}
