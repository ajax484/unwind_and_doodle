'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DiscountDetail {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minimum_order_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  status: 'Active' | 'Inactive' | 'Scheduled' | 'Expired' | 'Exhausted';
  created_at: string;
  updated_at: string;
  products: Array<{ id: string; name: string; selling_price: number }>;
  categories: Array<{ id: string; name: string }>;
  product_ids: string[];
  category_ids: string[];
}

export default function AdminDiscountDetailPage({ params }: { params: Promise<{ discountId: string }> }) {
  const { discountId } = use(params);
  const router = useRouter();

  const [discount, setDiscount] = useState<DiscountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit form state
  const [code, setCode] = useState('');
  const [value, setValue] = useState<number | ''>('');
  const [minOrder, setMinOrder] = useState<number | ''>('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [active, setActive] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/discounts/${discountId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load discount details');
      }

      const d: DiscountDetail = json.data;
      setDiscount(d);
      setCode(d.code);
      setValue(d.value);
      setMinOrder(d.minimum_order_amount ?? '');
      setUsageLimit(d.usage_limit ?? '');
      setStartsAt(d.starts_at ? new Date(d.starts_at).toISOString().slice(0, 16) : '');
      setExpiresAt(d.expires_at ? new Date(d.expires_at).toISOString().slice(0, 16) : '');
      setActive(d.active);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading discount');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [discountId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const payload = {
        code: code.trim().toUpperCase(),
        value: Number(value),
        minimum_order_amount: minOrder !== '' ? Number(minOrder) : null,
        usage_limit: usageLimit !== '' ? Number(usageLimit) : null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        active,
      };

      const res = await fetch(`/api/admin/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update discount');
      }

      setIsEditing(false);
      fetchDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update discount');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!discount) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !discount.active }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update active status');
      }
      fetchDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!discount) return;
    const isHard = discount.usage_count === 0;
    const msg = isHard
      ? `Are you sure you want to delete discount code ${discount.code}?`
      : `Discount ${discount.code} has ${discount.usage_count} redemptions. It will be soft-disabled to preserve order history. Continue?`;

    if (!confirm(msg)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/discounts/${discountId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete discount');
      }
      router.push('/admin/discounts');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete discount');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading discount details...</div>;
  }

  if (error || !discount) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Link href="/admin/discounts" className="text-xs font-semibold text-rose-500 hover:text-rose-600">
          ← Back to Discounts
        </Link>
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error || 'Discount not found'}
        </div>
      </div>
    );
  }

  const getStatusBadge = (st: DiscountDetail['status']) => {
    switch (st) {
      case 'Active':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>;
      case 'Inactive':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Inactive</span>;
      case 'Scheduled':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Scheduled</span>;
      case 'Expired':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">Expired</span>;
      case 'Exhausted':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">Exhausted</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin/discounts" className="text-xs font-semibold text-rose-500 hover:text-rose-600">
            ← Back to Discounts
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-black font-mono tracking-wider text-slate-900">{discount.code}</h1>
            {getStatusBadge(discount.status)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleToggleActive}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              discount.active
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            {discount.active ? 'Disable Coupon' : 'Enable Coupon'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Coupon'}
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Edit Form Drawer / Card */}
      {isEditing && (
        <form onSubmit={handleUpdate} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold font-heading text-slate-900 border-b border-slate-100 pb-2">
            Edit Discount Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Value ({discount.type === 'percentage' ? '%' : '₦'})
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Order Amount (₦)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Usage Limit</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited if left empty"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-xs hover:bg-rose-600 cursor-pointer"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Coupon Parameters</h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Discount Type</span>
              <span className="font-semibold text-slate-900 capitalize">
                {discount.type === 'percentage' ? 'Percentage (%)' : discount.type === 'fixed' ? 'Fixed Amount (₦)' : discount.type}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Discount Value</span>
              <span className="font-bold text-slate-900">
                {discount.type === 'percentage' ? `${discount.value}%` : `₦${Number(discount.value).toLocaleString()}`}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Minimum Order Amount</span>
              <span className="font-semibold text-slate-900">
                {discount.minimum_order_amount ? `₦${Number(discount.minimum_order_amount).toLocaleString()}` : 'None'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Usage Redemptions</span>
              <span className="font-bold text-slate-900">
                {discount.usage_count} / {discount.usage_limit !== null ? discount.usage_limit : 'Unlimited'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Starts At</span>
              <span className="font-medium text-slate-700">
                {discount.starts_at ? new Date(discount.starts_at).toLocaleString() : 'Immediate'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Expires At</span>
              <span className="font-medium text-slate-700">
                {discount.expires_at ? new Date(discount.expires_at).toLocaleString() : 'No Expiry'}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Created / Updated</span>
              <span className="font-medium text-slate-500 text-[11px]">
                {new Date(discount.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Merchandise Scope & Target Listing */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Targeting &amp; Scope</h2>

          {discount.products.length === 0 && discount.categories.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600">
              <strong>Store-wide Discount</strong>: This coupon applies to all eligible products in the catalog.
            </div>
          ) : (
            <div className="space-y-4">
              {discount.products.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2">Targeted Products ({discount.products.length})</h3>
                  <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-40 overflow-y-auto">
                    {discount.products.map((p) => (
                      <li key={p.id} className="p-2 text-xs flex justify-between">
                        <span className="font-medium text-slate-800">{p.name}</span>
                        <span className="text-slate-400">₦{Number(p.selling_price).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {discount.categories.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2">Targeted Categories ({discount.categories.length})</h3>
                  <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-40 overflow-y-auto">
                    {discount.categories.map((c) => (
                      <li key={c.id} className="p-2 text-xs font-medium text-slate-800">
                        {c.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
