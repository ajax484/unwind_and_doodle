'use client';

import React, { useState, useEffect } from 'react';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

export interface PickedReviewSummary {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  authorName: string;
  productName?: string | null;
  productSlug?: string | null;
  verifiedBuyer: boolean;
}

export interface ReviewPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (review: PickedReviewSummary) => void;
}

export function ReviewPickerModal({ isOpen, onClose, onSelect }: ReviewPickerModalProps) {
  const [reviews, setReviews] = useState<PickedReviewSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    async function loadReviews() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          status: 'approved',
          limit: '30',
        });
        if (search.trim()) {
          params.set('search', search.trim());
        }
        const res = await fetch(`/api/admin/reviews?${params.toString()}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          const rawList = Array.isArray(json.data?.reviews)
            ? json.data.reviews
            : Array.isArray(json.data?.data)
            ? json.data.data
            : Array.isArray(json.data)
            ? json.data
            : [];

          const mapped: PickedReviewSummary[] = rawList.map((r: any) => ({
            id: r.id,
            rating: Number(r.rating ?? 5),
            title: r.title || null,
            body: r.body || '',
            authorName:
              r.customerName ||
              r.customer_name ||
              r.author_name ||
              `${r.customer?.first_name || ''} ${r.customer?.last_name || ''}`.trim() ||
              'Verified Customer',
            productName: r.productName || r.product_name || r.product?.name || null,
            productSlug: r.productSlug || r.product_slug || r.product?.slug || null,
            verifiedBuyer: r.isVerified ?? r.is_verified ?? true,
          }));
          setReviews(mapped);
        }
      } catch (err) {
        console.error('Failed to load approved reviews', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(loadReviews, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-bg-surface rounded-2xl border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <h3 className="text-sm font-bold font-heading text-text-primary">
            Pick Approved Customer Review
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-subtle"
          >
            ✕
          </button>
        </div>

        <div className="p-3 border-b border-border-default/60">
          <TextInput
            placeholder="Search reviews by text, customer, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-xs text-text-tertiary">
              No approved reviews found. You can also enter a quote manually in the inspector.
            </div>
          ) : (
            reviews.map((rev) => (
              <button
                key={rev.id}
                type="button"
                onClick={() => {
                  onSelect(rev);
                  onClose();
                }}
                className="w-full text-left p-3.5 rounded-xl border border-border-default hover:border-brand-rose bg-bg-surface hover:bg-bg-subtle/40 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-500 text-xs tracking-wider">
                    {'★'.repeat(Math.max(1, Math.min(5, Math.round(rev.rating))))}
                    {'☆'.repeat(5 - Math.max(1, Math.min(5, Math.round(rev.rating))))}
                  </span>
                  {rev.productName && (
                    <span className="text-[11px] font-semibold text-brand-rose truncate max-w-[200px]">
                      {rev.productName}
                    </span>
                  )}
                </div>
                {rev.title && (
                  <div className="text-xs font-bold text-text-primary">{rev.title}</div>
                )}
                {rev.body && (
                  <p className="text-xs text-text-secondary line-clamp-2 italic">
                    &ldquo;{rev.body}&rdquo;
                  </p>
                )}
                <div className="text-[11px] text-text-tertiary flex items-center gap-2">
                  <span className="font-semibold text-text-secondary">— {rev.authorName}</span>
                  {rev.verifiedBuyer && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      Verified
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border-default flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
