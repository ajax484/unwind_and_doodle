'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminReviewListItem, AdminReviewSummaryKPIs } from '@/types/admin-review-customization';
import { toast } from 'sonner';

export default function AdminReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [reviews, setReviews] = useState<AdminReviewListItem[]>([]);
  const [summary, setSummary] = useState<AdminReviewSummaryKPIs>({
    totalReviews: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    averageRating: 5.0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [ratingFilter, setRatingFilter] = useState(searchParams.get('rating') || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (page > 1) params.set('page', page.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setReviews(json.data.reviews || []);
        setSummary(json.data.summary);
        setPagination(json.data.pagination);
      } else {
        throw new Error(json.error || 'Failed to fetch reviews');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading reviews');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, ratingFilter, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const updateUrl = useCallback(
    (newSearch: string, newStatus: string, newRating: string, newPage: number) => {
      startTransition(() => {
        const params = new URLSearchParams();
        if (newSearch) params.set('search', newSearch);
        if (newStatus !== 'all') params.set('status', newStatus);
        if (newRating !== 'all') params.set('rating', newRating);
        if (newPage > 1) params.set('page', newPage.toString());

        router.replace(`/admin/reviews?${params.toString()}`);
      });
    },
    [router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
    updateUrl(val, statusFilter, ratingFilter, 1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
    updateUrl(searchTerm, val, ratingFilter, 1);
  };

  const handleRatingChange = (val: string) => {
    setRatingFilter(val);
    setPage(1);
    updateUrl(searchTerm, statusFilter, val, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(searchTerm, statusFilter, ratingFilter, newPage);
  };

  const handleModerateQuick = async (
    reviewId: string,
    action: 'approve' | 'reject',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      setModeratingId(reviewId);
      const res = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast.success(action === 'approve' ? 'Review approved successfully' : 'Review rejected');
        await fetchReviews();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to moderate review');
      }
    } catch {
      toast.error('Error updating review status');
    } finally {
      setModeratingId(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center text-amber-400 text-xs">
        {'★'.repeat(rating)}
        <span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - rating))}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Customer Reviews Moderation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review customer feedback, approve verified ratings for the storefront, and remove inappropriate content.
          </p>
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Total Reviews
          </span>
          <div className="text-2xl font-bold font-heading text-slate-900">
            {summary.totalReviews}
          </div>
          <p className="text-[11px] text-slate-400">All submissions</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Pending Moderation
          </span>
          <div className="text-2xl font-bold font-heading text-amber-600">
            {summary.pendingCount}
          </div>
          <p className="text-[11px] text-slate-400">Awaiting admin review</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Approved & Live
          </span>
          <div className="text-2xl font-bold font-heading text-emerald-600">
            {summary.approvedCount}
          </div>
          <p className="text-[11px] text-slate-400">Visible on storefront</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Rejected
          </span>
          <div className="text-2xl font-bold font-heading text-rose-600">
            {summary.rejectedCount}
          </div>
          <p className="text-[11px] text-slate-400">Removed from store</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Average Rating
          </span>
          <div className="text-2xl font-bold font-heading text-amber-500 flex items-center gap-1">
            <span>★</span> {summary.averageRating}
          </div>
          <p className="text-[11px] text-slate-400">Overall store score</p>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search customer, product, review..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize cursor-pointer transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Rating */}
          <select
            value={ratingFilter}
            onChange={(e) => handleRatingChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="all">Rating: All</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★</option>
            <option value="3">3 Stars ★★★</option>
            <option value="2">2 Stars ★★</option>
            <option value="1">1 Star ★</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchReviews} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 4. Reviews Table & Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              ⭐
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">No reviews found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || ratingFilter !== 'all'
                ? 'Try adjusting your search criteria or filter selections.'
                : 'Customer reviews will appear here once submitted after order deliveries.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Product</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Rating & Review</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Submitted</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/products/${r.productId}`}
                          className="font-semibold text-slate-900 hover:text-rose-500 block truncate max-w-xs"
                        >
                          {r.productName}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Order #{r.orderNumber}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/customers/${r.customerId}`}
                          className="font-semibold text-slate-800 hover:text-rose-500 block"
                        >
                          {r.customerName}
                        </Link>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {r.customerEmail}
                        </span>
                      </td>

                      {/* Rating & Review */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="flex items-center gap-1.5 mb-1">
                          {renderStars(r.rating)}
                          {r.imagesCount > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md font-medium">
                              📷 {r.imagesCount} photo{r.imagesCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {r.title && <div className="font-bold text-slate-900 mb-0.5">{r.title}</div>}
                        <p className="text-slate-600 line-clamp-2 text-[11px]">{r.body || '—'}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleModerateQuick(r.id, 'approve', e)}
                                disabled={moderatingId === r.id}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs cursor-pointer shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleModerateQuick(r.id, 'reject', e)}
                                disabled={moderatingId === r.id}
                                className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs cursor-pointer shadow-2xs"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <Link
                            href={`/admin/reviews/${r.id}`}
                            className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer shadow-2xs"
                          >
                            Details →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-100 p-3 space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-xs">{r.productName}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : r.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {renderStars(r.rating)}
                    <span className="text-slate-400">• {r.customerName}</span>
                  </div>

                  {r.title && <div className="font-bold text-slate-800">{r.title}</div>}
                  {r.body && <p className="text-slate-600 line-clamp-2">{r.body}</p>}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 text-[10px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          onClick={(e) => handleModerateQuick(r.id, 'approve', e)}
                          className="text-emerald-600 font-bold"
                        >
                          Approve
                        </button>
                      )}
                      <Link href={`/admin/reviews/${r.id}`} className="text-rose-500 font-bold">
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} reviews
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <span className="font-semibold text-slate-800">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
