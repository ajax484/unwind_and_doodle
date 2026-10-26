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

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<DisplayReview[]>(() =>
    HOMEPAGE_REVIEWS.map((rev, i) => ({
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
    }))
  );

  useEffect(() => {
    let isMounted = true;

    async function loadReviews() {
      try {
        const res = await fetch('/api/reviews?limit=6');
        if (!res.ok) return;

        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const dbReviews: DisplayReview[] = json.data.map((r: {
            id: string;
            body?: string | null;
            title?: string | null;
            rating: number;
            customerName?: string;
            isVerified?: boolean;
            productName?: string;
            source?: string | null;
          }) => ({
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
            if (isMounted) setReviews(dbReviews.slice(0, 6));
          } else {
            const fallbackSupplements = HOMEPAGE_REVIEWS.slice(0, 3 - dbReviews.length).map(
              (rev, i) => ({
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
              })
            );
            if (isMounted) setReviews([...dbReviews, ...fallbackSupplements]);
          }
        }
      } catch {
        // Retain initial curated testimonials on error
      }
    }

    loadReviews();
    return () => {
      isMounted = false;
    };
  }, []);

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
