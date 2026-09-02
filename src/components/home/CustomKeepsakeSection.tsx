import React from 'react';
import Link from 'next/link';

export default function CustomKeepsakeSection() {
  return (
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
                  <span className="text-4xl mb-2 block">📸</span>
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
  );
}
