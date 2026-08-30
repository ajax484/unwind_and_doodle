'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminReviewDetail, AdminReviewImageItem } from '@/types/admin-review-customization';

export default function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = use(params);

  const [data, setData] = useState<AdminReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moderating, setModerating] = useState(false);
  const [modReason, setModReason] = useState('');
  const [modSuccess, setModSuccess] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/reviews/${reviewId}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch review');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading review');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleModerate = async (action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'APPROVE' : 'REJECT';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this customer review?`)) {
      return;
    }

    try {
      setModerating(true);
      setModSuccess(null);

      const res = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: modReason.trim() || undefined }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setModSuccess(
          action === 'approve'
            ? 'Review approved and published to storefront!'
            : 'Review rejected and hidden from storefront.'
        );
        setModReason('');
        await fetchDetail();
      } else {
        throw new Error(json.error || 'Failed to moderate review');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error moderating review');
    } finally {
      setModerating(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this customer image? It will be removed from the database and storage.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchDetail();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to delete image');
      }
    } catch {
      alert('Error deleting image');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center text-amber-400 text-lg">
        {'★'.repeat(rating)}
        <span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
        <span className="ml-2 text-sm font-bold text-slate-700">{rating} out of 5</span>
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-red-200 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-heading font-bold text-lg text-slate-800">Review Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/admin/reviews"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Reviews
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header & Linked Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/reviews" className="hover:text-slate-600">
              ← Reviews
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Review #{data.id.substring(0, 8)}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
              {data.title || 'Product Feedback'}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                data.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : data.status === 'pending'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {data.status.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Submitted on {new Date(data.createdAt).toLocaleString()}
            {data.publishedAt && (
              <span> • Published on {new Date(data.publishedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/reviews"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            All Reviews
          </Link>
        </div>
      </div>

      {modSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2">
          <span>✓</span> {modSuccess}
        </div>
      )}

      {/* 2. Linked Commerce Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Product Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
            Reviewed Product
          </span>
          <Link
            href={`/admin/products/${data.productId}`}
            className="font-bold text-slate-900 hover:text-rose-500 block text-sm"
          >
            {data.productName}
          </Link>
          <span className="text-[11px] text-slate-400 font-mono">ID: {data.productId.substring(0, 8)}</span>
        </div>

        {/* Customer Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
            Customer / Reviewer
          </span>
          <Link
            href={`/admin/customers/${data.customerId}`}
            className="font-bold text-slate-900 hover:text-rose-500 block text-sm"
          >
            {data.customerName}
          </Link>
          <span className="text-[11px] text-slate-400 block truncate">{data.customerEmail}</span>
        </div>

        {/* Order Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
            Verified Order
          </span>
          <Link
            href={`/admin/orders/${data.orderId}`}
            className="font-bold text-slate-900 hover:text-rose-500 block font-mono text-sm"
          >
            #{data.orderNumber}
          </Link>
          <span className="text-[11px] text-slate-400">Order Status: {data.orderStatus}</span>
        </div>
      </div>

      {/* 3. Review Content & Moderation Actions */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="space-y-3">
          <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
            Review Content
          </h3>

          <div>{renderStars(data.rating)}</div>

          {data.title && (
            <h4 className="text-lg font-bold font-heading text-slate-900">{data.title}</h4>
          )}

          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {data.body || 'No textual feedback provided.'}
          </p>
        </div>

        {/* Customer Images Gallery */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-bold text-sm text-slate-900">
              Attached Customer Photos ({data.images.length})
            </h4>
            <span className="text-xs text-slate-400">Verified customer uploads</span>
          </div>

          {data.images.length === 0 ? (
            <div className="py-4 text-xs text-slate-400">No photos attached to this review.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {data.images.map((img: AdminReviewImageItem) => (
                <div
                  key={img.id}
                  className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
                >
                  <img
                    src={img.url}
                    alt="Customer review photo"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-white/90 text-slate-800 text-[10px] font-semibold"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Moderation Controls */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <h4 className="font-heading font-bold text-sm text-slate-900">Moderation Decision</h4>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Moderation Reason / Internal Note (Optional)
            </label>
            <input
              type="text"
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              placeholder="e.g. Verified customer photo with high quality line art coloring."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleModerate('approve')}
              disabled={moderating}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs font-heading shadow-xs cursor-pointer disabled:opacity-50 transition-all ${
                data.status === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {data.status === 'approved' ? '✓ Approved & Live' : 'Approve & Publish Review'}
            </button>

            <button
              type="button"
              onClick={() => handleModerate('reject')}
              disabled={moderating}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs font-heading shadow-xs cursor-pointer disabled:opacity-50 transition-all ${
                data.status === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              {data.status === 'rejected' ? '✕ Rejected' : 'Reject & Hide Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
