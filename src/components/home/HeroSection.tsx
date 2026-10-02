import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const LEFT_IMAGE_SRC = '/images/ChatGPT Image Oct 2, 2026, 03_42_13 PM.png';
const RIGHT_IMAGE_SRC = '/images/IMG_3364.JPG.jpeg';
const LEFT_IMAGE_ALT = 'Mindful coloring book showcase';
const RIGHT_IMAGE_ALT = 'Personalized creative keepsakes';

export interface HeroSectionProps {
  coloristCount?: number | string;
}

const DEFAULT_COLORIST_COUNT: number | string | undefined = undefined;

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="#E0A33A"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function SparkleIcon({ className, color = '#F0A8B8' }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  );
}

function RoseIcon({ className, color = '#F0A8B8' }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M32 14c-3-5-10-5-13-1-3 4-1 10 3 13 4 3 7 7 10 10 3-3 6-7 10-10 4-3 6-9 3-13-3-4-10-4-13 1z" />
      <path d="M27 19c2.5-3 7.5-3 10 0" />
      <path d="M29 23c1.5-1.5 4.5-1.5 6 0" />
      <path d="M32 36v18" />
      <path d="M32 42c-4-3-10-2-12 3" />
      <path d="M32 47c4-3 10-2 12 3" />
    </svg>
  );
}

export default function HeroSection({ coloristCount }: HeroSectionProps = {}) {
  const count = coloristCount ?? DEFAULT_COLORIST_COUNT;
  const socialProofText = count
    ? `Loved by ${typeof count === 'number' ? count.toLocaleString() : count} colorists`
    : 'Loved by colorists';

  return (
    <section className="w-full bg-white relative min-h-screen flex justify-center items-center py-16 sm:py-20 lg:py-0 border-b border-border-default overflow-hidden">
      {/* ─── Top-Left Circular Image Container (Desktop / Tablet floating corner) ─── */}
      <div className="hidden lg:block absolute -top-12 -left-12 xl:-top-16 xl:-left-16 w-80 h-80 xl:w-[480px] xl:h-[480px] pointer-events-none z-0">
        <div className="hero-float-left pointer-events-auto w-full h-full rounded-full p-3 sm:p-4 bg-brand-rose/15 border-4 sm:border-8 border-brand-rose/25 shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-brand-rose/40 bg-bg-subtle aspect-square relative">
            <Image
              src={LEFT_IMAGE_SRC}
              alt={LEFT_IMAGE_ALT}
              fill
              priority
              sizes="(min-width: 1280px) 480px, (min-width: 1024px) 320px, 100vw"
              className="object-cover scale-105 transition-transform duration-700 hover:scale-110"
            />
          </div>
        </div>
      </div>

      {/* ─── Bottom-Right Circular Image Container (Desktop / Tablet floating corner) ─── */}
      <div className="hidden lg:block absolute -bottom-12 -right-12 xl:-bottom-16 xl:-right-16 w-80 h-80 xl:w-[480px] xl:h-[480px] pointer-events-none z-0">
        <div className="hero-float-right pointer-events-auto w-full h-full rounded-full p-3 sm:p-4 bg-brand-blue/15 border-4 sm:border-8 border-brand-blue/25 shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-brand-blue/40 bg-bg-subtle aspect-square relative">
            <Image
              src={RIGHT_IMAGE_SRC}
              alt={RIGHT_IMAGE_ALT}
              fill
              priority
              sizes="(min-width: 1280px) 480px, (min-width: 1024px) 320px, 100vw"
              className="object-cover scale-105 transition-transform duration-700 hover:scale-110"
            />
          </div>
        </div>
      </div>

      {/* ─── Decorative Floating Stars and Line-Art Roses ─── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Sparkle 1: Top-Left empty space */}
        <div className="hero-sparkle-1 absolute top-12 sm:top-16 left-[8%] sm:left-[22%]">
          <SparkleIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#F0A8B8" />
        </div>

        {/* Sparkle 2: Top-Right empty space */}
        <div className="hero-sparkle-2 absolute top-16 sm:top-20 right-[8%] sm:right-[20%]">
          <SparkleIcon className="w-6 h-6 sm:w-7 sm:h-7" color="#A7C2D4" />
        </div>

        {/* Sparkle 3: Mid-Left */}
        <div className="hero-sparkle-3 absolute top-[62%] left-[10%] sm:left-[14%] hidden sm:block">
          <SparkleIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#A7C2D4" />
        </div>

        {/* Sparkle 4: Bottom-Right */}
        <div className="hero-sparkle-4 absolute bottom-20 sm:bottom-28 right-[12%] sm:right-[18%] hidden sm:block">
          <SparkleIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#F0A8B8" />
        </div>

        {/* Sparkle 5: Bottom-Left */}
        <div className="hero-sparkle-5 absolute bottom-14 left-[24%] hidden md:block">
          <SparkleIcon className="w-4 h-4" color="#F0A8B8" />
        </div>

        {/* Rose 1: Upper Mid-Left */}
        <div className="hero-rose-1 absolute top-28 left-[6%] sm:left-[12%] hidden sm:block">
          <RoseIcon className="w-11 h-11 sm:w-14 sm:h-14 -rotate-12" color="#F0A8B8" />
        </div>

        {/* Rose 2: Upper Mid-Right */}
        <div className="hero-rose-2 absolute top-28 right-[6%] sm:right-[14%] hidden sm:block">
          <RoseIcon className="w-12 h-12 sm:w-16 sm:h-16 rotate-12" color="#F0A8B8" />
        </div>

        {/* Rose 3: Lower-Left */}
        <div className="hero-rose-3 absolute bottom-28 left-[16%] hidden lg:block">
          <RoseIcon className="w-10 h-10 -rotate-6" color="#F0A8B8" />
        </div>
      </div>

      {/* ─── Centered Main Content Container ─── */}
      <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6 sm:space-y-8 px-4 sm:px-6">
        {/* Larger Bluish Radial Glow Halo (Outer Star Glow) */}
        <div
          className="hero-halo-blue absolute top-1/2 left-1/2 w-[1200px] max-w-[150vw] h-[800px] pointer-events-none -z-20 blur-[30px]"
          style={{
            background: 'radial-gradient(closest-side, rgba(167, 194, 212, 0.45), rgba(167, 194, 212, 0) 70%)',
          }}
          aria-hidden="true"
        />

        {/* Soft Pinkish Radial Glow Halo (Inner Star Glow) */}
        <div
          className="hero-halo-pink absolute top-1/2 left-1/2 w-[900px] max-w-[130vw] h-[600px] pointer-events-none -z-10 blur-[20px]"
          style={{
            background: 'radial-gradient(closest-side, rgba(244, 201, 211, 0.55), rgba(244, 201, 211, 0) 70%)',
          }}
          aria-hidden="true"
        />

        {/* Display Headline */}
        <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-[1.08]">
          Create something <br className="hidden sm:inline" />
          <span className="text-brand-blue">worth </span>
          <span className="text-brand-rose relative inline-block">
            keeping.
            <svg
              aria-hidden="true"
              className="hero-squiggle absolute left-0 -bottom-3 sm:-bottom-4 w-full h-[18px] sm:h-[22px] overflow-visible pointer-events-none"
              viewBox="0 0 120 24"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M 4 14 Q 28 6, 52 13 C 62 17, 72 17, 74 11 C 75 5, 63 4, 61 11 C 59 18, 70 20, 80 14 Q 98 7, 116 13"
                fill="none"
                stroke="#F0A8B8"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                className="hero-squiggle-path"
              />
            </svg>
          </span>
        </h1>

        {/* Subtitle Copy */}
        <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
          Coloring books, guided journals, and creative essentials thoughtfully designed to make space for imagination, quiet moments, and everyday relaxation.
        </p>

        {/* Mobile / Tablet Responsive Circular Image Showcases (Visible on < lg screens) */}
        <div className="flex lg:hidden justify-center items-center gap-4 sm:gap-6 py-2">
          <div className="hero-float-left w-36 h-36 sm:w-48 sm:h-48 rounded-full p-2 bg-brand-rose/15 border-2 border-brand-rose/30 shadow-md">
            <div className="w-full h-full rounded-full overflow-hidden border border-brand-rose/40 aspect-square relative">
              <Image
                src={LEFT_IMAGE_SRC}
                alt={LEFT_IMAGE_ALT}
                fill
                priority
                sizes="(min-width: 640px) 192px, 144px"
                className="object-cover"
              />
            </div>
          </div>
          <div className="hero-float-right w-36 h-36 sm:w-48 sm:h-48 rounded-full p-2 bg-brand-blue/15 border-2 border-brand-blue/30 shadow-md">
            <div className="w-full h-full rounded-full overflow-hidden border border-brand-blue/40 aspect-square relative">
              <Image
                src={RIGHT_IMAGE_SRC}
                alt={RIGHT_IMAGE_ALT}
                fill
                priority
                sizes="(min-width: 640px) 192px, 144px"
                className="object-cover"
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
            className="btn-outline !py-3.5 !px-7 text-center hover:border-brand-blue hover:text-brand-blue-deep transition-all"
          >
            Create your coloring book
          </Link>
        </div>

        {/* ─── "Loved by Colorists" Social Proof ─── */}
        <div
          className="hero-social-proof flex items-center justify-center gap-2 pt-6 text-[15px] font-medium text-[#3F4A5A]"
          aria-label="Rated 5 out of 5"
        >
          <div className="flex items-center gap-1" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <StarIcon key={i} className="w-4 h-4" />
            ))}
          </div>
          <span>{socialProofText}</span>
        </div>
      </div>
    </section>
  );
}
