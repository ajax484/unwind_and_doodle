import React from 'react';
import { HOMEPAGE_REVIEWS, HOMEPAGE_FEATURES } from '@/lib/homepage-data';

export default function ReviewsSection() {
  return (
    <>
      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-pink-600">
            Community Stories
          </span>
          <h2 className="text-3xl font-bold font-heading text-slate-800 tracking-tight mt-1">
            Loved by Mindful Creators
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOMEPAGE_REVIEWS.map((review, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex text-amber-400 text-sm">
                  {Array.from({ length: review.rating }).map((_, r) => (
                    <span key={r}>★</span>
                  ))}
                </div>
                <p className="text-slate-600 text-sm italic leading-relaxed">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="font-heading font-bold text-slate-800 text-sm">
                  {review.author}
                </p>
                <span className="text-xs text-slate-400">{review.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Values / Features */}
      <section className="bg-white py-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {HOMEPAGE_FEATURES.map((feature, idx) => (
              <div key={idx} className="space-y-3 p-4">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="font-heading font-bold text-slate-800 text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
