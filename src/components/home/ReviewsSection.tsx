import React from 'react';
import { HOMEPAGE_REVIEWS } from '@/lib/homepage-data';
import RatingStars from '@/components/RatingStars';

export default function ReviewsSection() {
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
        {HOMEPAGE_REVIEWS.map((rev, i) => (
          <div
            key={i}
            className="card-soft p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white border border-border-default"
          >
            <div className="space-y-4">
              {/* Star rating in signature rose */}
              <RatingStars rating={rev.rating} size="sm" />
              {/* Quote */}
              <p className="text-sm sm:text-base text-text-primary italic leading-relaxed">
                &ldquo;{rev.quote}&rdquo;
              </p>
            </div>

            {/* Author & Product */}
            <div className="pt-4 border-t border-border-default space-y-0.5">
              <span className="font-heading font-bold text-xs text-text-primary block">
                {rev.author}
              </span>
              <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                <span>{rev.product}</span>
                <span>{rev.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
}
