'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SelectOption {
  id: string;
  name: string;
}

export default function AdminCreateDiscountPage() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState<number | ''>(10);
  const [minOrder, setMinOrder] = useState<number | ''>('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [active, setActive] = useState(true);
  const [scope, setScope] = useState<'store_wide' | 'products' | 'categories'>('store_wide');

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [productsList, setProductsList] = useState<SelectOption[]>([]);
  const [categoriesList, setCategoriesList] = useState<SelectOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadLookups() {
      try {
        setLoadingLookups(true);
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/products?limit=100'),
          fetch('/api/categories'),
        ]);

        const prodJson = await prodRes.json();
        const catJson = await catRes.json();

        if (prodJson.success && Array.isArray(prodJson.data)) {
          setProductsList(prodJson.data.map((p: any) => ({ id: p.id, name: p.name })));
        } else if (Array.isArray(prodJson)) {
          setProductsList(prodJson.map((p: any) => ({ id: p.id, name: p.name })));
        }

        if (catJson.success && Array.isArray(catJson.data)) {
          setCategoriesList(catJson.data.map((c: any) => ({ id: c.id, name: c.name })));
        } else if (Array.isArray(catJson)) {
          setCategoriesList(catJson.map((c: any) => ({ id: c.id, name: c.name })));
        }
      } catch (err) {
        console.error('Failed to load products/categories for discount scope:', err);
      } finally {
        setLoadingLookups(false);
      }
    }
    loadLookups();
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Discount code is required.');
      return;
    }
    if (value === '' || Number(value) <= 0) {
      setErrorMessage('Discount value must be greater than 0.');
      return;
    }
    if (type === 'percentage' && Number(value) > 100) {
      setErrorMessage('Percentage discount cannot exceed 100%.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        minimum_order_amount: minOrder !== '' ? Number(minOrder) : null,
        usage_limit: usageLimit !== '' ? Number(usageLimit) : null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        active,
        scope,
        product_ids: scope === 'products' ? selectedProductIds : [],
        category_ids: scope === 'categories' ? selectedCategoryIds : [],
      };

      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create discount');
      }

      router.push('/admin/discounts');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating discount');
    } finally {
      setSubmitting(false);
    }
  };

  // Live preview computations
  const previewValue = type === 'percentage' ? `${value || 0}% off` : `₦${Number(value || 0).toLocaleString()} off`;
  const previewScope =
    scope === 'store_wide'
      ? 'Entire Store'
      : scope === 'products'
      ? `${selectedProductIds.length} Selected ${selectedProductIds.length === 1 ? 'Product' : 'Products'}`
      : `${selectedCategoryIds.length} Selected ${selectedCategoryIds.length === 1 ? 'Category' : 'Categories'}`;

  const previewMinOrder = minOrder ? `₦${Number(minOrder).toLocaleString()}` : 'None';
  const previewLimit = usageLimit ? `0 / ${usageLimit}` : 'Unlimited';
  const previewValidWindow =
    startsAt || expiresAt
      ? `${startsAt ? new Date(startsAt).toLocaleDateString() : 'Now'} → ${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'No Expiry'}`
      : 'Always Valid';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/discounts" className="text-xs font-semibold text-rose-500 hover:text-rose-600">
            ← Back to Discounts
          </Link>
          <h1 className="text-2xl font-bold font-heading text-slate-900 mt-1">Create New Discount</h1>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-base font-bold font-heading text-slate-900 border-b border-slate-100 pb-3">
              Coupon Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER20"
                  value={code}
                  onChange={handleCodeChange}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discount Value ({type === 'percentage' ? '%' : '₦'}) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={type === 'percentage' ? '100' : undefined}
                  step="any"
                  placeholder={type === 'percentage' ? '20' : '2000'}
                  value={value}
                  onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Order Amount (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 10000"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

              <div className="flex items-center gap-3 pt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  <span className="ml-2.5 text-xs font-semibold text-slate-700">Coupon Active</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
          </div>

          {/* Card 2: Merchandise Scope */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-base font-bold font-heading text-slate-900 border-b border-slate-100 pb-3">
              Discount Scope
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'store_wide', label: 'Entire Store' },
                { id: 'products', label: 'Specific Products' },
                { id: 'categories', label: 'Specific Categories' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setScope(sc.id as any)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                    scope === sc.id
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-2 ring-rose-500/10'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {/* Scope: Products */}
            {scope === 'products' && (
              <div className="pt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Select Eligible Products</label>
                {loadingLookups ? (
                  <div className="text-xs text-slate-400">Loading catalog products...</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    {productsList.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={() => toggleProductSelection(p.id)}
                          className="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="font-medium text-slate-800">{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scope: Categories */}
            {scope === 'categories' && (
              <div className="pt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Select Eligible Categories</label>
                {loadingLookups ? (
                  <div className="text-xs text-slate-400">Loading categories...</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    {categoriesList.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(c.id)}
                          onChange={() => toggleCategorySelection(c.id)}
                          className="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="font-medium text-slate-800">{c.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/discounts"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Save Discount'}
            </button>
          </div>
        </form>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <div className="sticky top-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">Live Preview</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                {active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black font-mono tracking-wider text-rose-300">
                {code || 'COUPONCODE'}
              </div>
              <div className="text-xl font-bold mt-1 text-white">{previewValue}</div>
            </div>

            <div className="space-y-2 pt-2 text-xs border-t border-slate-700/60 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Applies to:</span>
                <span className="font-semibold text-white truncate max-w-[140px] text-right">{previewScope}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Minimum order:</span>
                <span className="font-semibold text-white">{previewMinOrder}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Usage Limit:</span>
                <span className="font-semibold text-white">{previewLimit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valid Window:</span>
                <span className="font-semibold text-white text-[11px]">{previewValidWindow}</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 italic">
              Note: Discount calculations are strictly enforced authoritatively on the server during checkout.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
