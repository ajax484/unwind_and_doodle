import React from 'react';
import Link from 'next/link';
import { CustomKeepsakeCopy, DEFAULT_HOMEPAGE_CONFIG } from '@/types/homepage-settings';

export interface CustomKeepsakeSectionProps {
  copy?: Partial<CustomKeepsakeCopy>;
}

export default function CustomKeepsakeSection({ copy }: CustomKeepsakeSectionProps = {}) {
  const c = { ...DEFAULT_HOMEPAGE_CONFIG.copy.custom_keepsake, ...copy };
  return (
    <section className="w-full bg-neutral-charcoal text-white py-14 sm:py-20 lg:py-24 relative overflow-hidden">
      {/* Subtle logo blobs inside full-width dark section */}
      <div className="absolute top-0 right-0 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full bg-brand-blue/12 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full bg-brand-rose/12 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Headline & Explanation */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-footer-border text-[11px] font-heading font-semibold tracking-wide uppercase text-neutral-cream">
              <span className="text-brand-rose">✨</span>
              <span>{c.badge}</span>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white">
              {c.headlineLead} <br />
              <span className="text-brand-rose">{c.headlineAccent}</span>
            </h2>

            <p className="text-sm sm:text-base text-brand-blue leading-relaxed">
              {c.description}
            </p>

            {/* 3-Step Visual Process */}
            <div className="grid grid-cols-3 gap-3 pt-4 pb-2 border-y border-border-inverse text-xs">
              <div className="space-y-1">
                <span className="text-brand-blue font-heading font-bold text-base block">01.</span>
                <span className="font-heading font-bold text-white block">Your Photo</span>
                <span className="text-[11px] text-text-tertiary block">Upload your moments</span>
              </div>
              <div className="space-y-1">
                <span className="text-brand-rose font-heading font-bold text-base block">02.</span>
                <span className="font-heading font-bold text-white block">Line Art</span>
                <span className="text-[11px] text-text-tertiary block">Drawn into coloring pages</span>
              </div>
              <div className="space-y-1">
                <span className="text-brand-blue font-heading font-bold text-base block">03.</span>
                <span className="font-heading font-bold text-white block">Bound Book</span>
                <span className="text-[11px] text-text-tertiary block">Delivered to your door</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={c.ctaHref}
                className="btn-rose !py-3.5 !px-8 text-sm inline-flex items-center gap-2"
              >
                <span>{c.ctaLabel}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Right: Dual Process Cards */}
          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-charcoal/80 rounded-2xl p-6 flex flex-col justify-between space-y-8 border border-border-inverse">
                <span className="text-xs uppercase font-heading font-semibold tracking-wider text-brand-blue">
                  Input
                </span>
                <div className="text-center py-6">
                  <span className="text-4xl mb-2 block">📸</span>
                  <span className="font-heading font-bold text-sm text-white block">Favorite Photo</span>
                  <span className="text-[11px] text-text-tertiary">Portraits, family, &amp; pets</span>
                </div>
                <span className="text-[10px] text-text-tertiary text-center">Step 1 • Digital Upload</span>
              </div>

              <div className="bg-neutral-charcoal/80 rounded-2xl p-6 flex flex-col justify-between space-y-8 border border-border-inverse">
                <span className="text-xs uppercase font-heading font-semibold tracking-wider text-brand-rose">
                  Output
                </span>
                <div className="text-center py-6">
                  <span className="text-4xl mb-2 block">📖</span>
                  <span className="font-heading font-bold text-sm text-white block">Printed Keepsake</span>
                  <span className="text-[11px] text-text-tertiary">Quality bleed-resistant paper</span>
                </div>
                <span className="text-[10px] text-text-tertiary text-center">Step 2 • Hand-Bound</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
