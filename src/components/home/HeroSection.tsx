import React from 'react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="w-full bg-white relative pt-12 sm:pt-20 lg:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#EDF3F7] overflow-hidden">
      {/* Organic corner blobs from logo spanning full width */}
      <div className="absolute top-0 left-0 w-80 sm:w-[500px] h-80 sm:h-[500px] rounded-full bg-[#A7C2D4]/18 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-80 sm:w-[500px] h-80 sm:h-[500px] rounded-full bg-[#D99BA3]/18 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto relative z-10">
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
                <span className="text-[#A7C2D4]">unw</span>
                <span className="text-[#D99BA3]">i</span>
                <span className="text-[#A7C2D4]">nd</span> &amp; <span className="text-[#A7C2D4]">d</span>
                <span className="text-[#D99BA3]">oo</span>
                <span className="text-[#A7C2D4]">dle</span>
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
                <span className="text-xs font-heading font-bold text-[#243342] block">
                  Custom Photo Books
                </span>
                <span className="text-[11px] text-[#52657A]">
                  Turn memories into coloring pages
                </span>
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
    </div>
  </section>
  );
}
