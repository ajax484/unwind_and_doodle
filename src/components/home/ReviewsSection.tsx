'use client';

import React, { useEffect, useState } from 'react';
import { HOMEPAGE_REVIEWS } from '@/lib/homepage-data';
import TestimonialCard, { TestimonialAuthor } from '@/components/TestimonialCard';

export interface DisplayReview {
  id: string | number;
  quote: string;
  rating: number;
  author: TestimonialAuthor;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'UD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface RawReviewItem {
  id: string;
  body?: string | null;
  title?: string | null;
  rating: number;
  customerName?: string;
  isVerified?: boolean;
  productName?: string;
  source?: string | null;
}

export interface ReviewsSectionProps {
  initialReviews?: RawReviewItem[];
}

function buildFallbackReviews(count?: number): DisplayReview[] {
  const list = count !== undefined ? HOMEPAGE_REVIEWS.slice(0, count) : HOMEPAGE_REVIEWS;
  return list.map((rev, i) => ({
    id: `fallback-${i}`,
    quote: rev.quote,
    rating: rev.rating,
    author: {
      name: rev.author,
      initials: getInitials(rev.author),
      roleOrStatus: 'Verified Customer',
      productContext: rev.product,
      location: rev.location,
    },
  }));
}

function mapRawReviews(raw: RawReviewItem[]): DisplayReview[] {
  if (!raw.length) return buildFallbackReviews();
  const dbReviews: DisplayReview[] = raw.map((r) => ({
    id: r.id,
    quote: r.body || r.title || 'Wonderful relaxing experience!',
    rating: r.rating || 5,
    author: {
      name: r.customerName || 'Verified Customer',
      initials: getInitials(r.customerName || 'Verified Customer'),
      roleOrStatus: r.isVerified ? 'Verified Purchaser' : 'Verified Review',
      productContext: r.productName,
      location: r.source ? `via ${r.source}` : undefined,
    },
  }));
  if (dbReviews.length >= 3) {
    return dbReviews.slice(0, 6);
  }
  return [...dbReviews, ...buildFallbackReviews(3 - dbReviews.length)];
}

export default function ReviewsSection({ initialReviews }: ReviewsSectionProps = {}) {
  const hasInitial = initialReviews !== undefined;
  const [reviews, setReviews] = useState<DisplayReview[]>(() =>
    hasInitial ? mapRawReviews(initialReviews) : buildFallbackReviews()
  );

  useEffect(() => {
    if (hasInitial) return;
    let isMounted = true;

    async function loadReviews() {
      try {
        const res = await fetch('/api/reviews?limit=6');
        if (!res.ok) return;

        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          if (isMounted) setReviews(mapRawReviews(json.data));
        }
      } catch {
        // Retain initial curated testimonials on error
      }
    }

    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [hasInitial]);

  return (
    <section className="w-full bg-bg-subtle py-16 sm:py-24 lg:py-32 border-b border-border-default relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-brand-rose block">
            Customer Reflections
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary">
            What people are saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {reviews.map((rev) => (
            <TestimonialCard
              key={rev.id}
              quote={rev.quote}
              rating={rev.rating}
              author={rev.author}
              size="md"
              data-testid={`testimonial-card-${rev.id}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
