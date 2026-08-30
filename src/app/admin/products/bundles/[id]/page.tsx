'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminBundleDetail } from '@/types/admin-bundle';
import { DuplicateBundleModal } from '@/components/admin/DuplicateBundleModal';

export default function ViewBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bundleId = resolvedParams.id;
  const router = useRouter();

  const [bundle, setBundle] = useState<AdminBundleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  const fetchBundle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/products/bundles/${bundleId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setBundle(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch bundle product');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading bundle details');
    } font: {
      setLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    fetchBundle();
  }, [fetchBundle]);

  const handleConfirmDuplicate = async (formData: { name: string; slug: string; sku: string }) => {
    setActionLoading(true);
    const res = await fetch(`/api/admin/products/bundles/${bundleId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    setActionLoading(false);

    if (res.ok && json.success && json.data) {
      router.push(`/admin/products/bundles/${json.data.id}`);
    } else {
      throw new Error(json.error || 'Failed to duplicate bundle');
    }
  };

  const handleDeactivate = async () => {
    if (!bundle) return;
    const targetStatus = bundle.status === 'archived' ? 'draft' : 'archived';
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/products/bundles/${bundleId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchBundle();
      } else {
        alert(json.error || 'Failed to update bundle status');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <div className="w-10 h-10 rounded-full border-2 border-rose-600 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading bundle details...</p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold text-center">
          <p>{error || 'Bundle product not found'}</p>
          <Link
            href="/admin/products/bundles"
            className="inline-block mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
          >
            Back to Bundles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/products/bundles" className="hover:text-rose-600 transition-colors">
              Bundles
            </Link>
            <span>/</span>
            <span>{bundle.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              {bundle.name}
            </h1>
            <span
              className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                bundle.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : bundle.status === 'draft'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {bundle.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/admin/products/bundles/${bundle.id}/edit`}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            Edit Bundle
          </Link>

          <button
            type="button"
            onClick={() => setDuplicateModalOpen(true)}
            disabled={actionLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
          >
            Duplicate
          </button>

          <button
            type="button"
            onClick={handleDeactivate}
            disabled={actionLoading}
            className={`px-4 py-2 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 ${
              bundle.status === 'archived'
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            {bundle.status === 'archived' ? 'Activate' : 'Deactivate'}
          </button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Overview Details */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            Bundle Overview
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">SKU</span>
              <span className="font-mono font-bold text-slate-800">{bundle.sku || '—'}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Selling Price</span>
              <span className="font-bold text-slate-900 text-sm">
                ₦{bundle.selling_price.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Cost Price</span>
              <span className="font-bold text-slate-800 text-sm">
                ₦{bundle.cost_price.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Product Type</span>
              <span className="font-bold text-purple-700 capitalize">{bundle.product_type}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Created Date</span>
              <span className="font-semibold text-slate-700">
                {new Date(bundle.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Last Updated</span>
              <span className="font-semibold text-slate-700">
                {new Date(bundle.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {bundle.description && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400 block font-medium mb-1">Description</span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {bundle.description}
              </p>
            </div>
          )}

          {bundle.categories.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Categories:</span>
              <div className="flex flex-wrap gap-1">
                {bundle.categories.map((c) => (
                  <span
                    key={c.id}
                    className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Images */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-4">
            Product Images
          </h3>

          {bundle.images.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <span className="text-4xl mb-2">📷</span>
              <span className="text-xs">No images uploaded</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {bundle.images.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden"
                >
                  <img
                    src={img.storage_path}
                    alt={bundle.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Components Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-heading font-bold text-slate-800">
            Bundle Components ({bundle.components.length})
          </h3>
          <span className="text-xs font-medium text-slate-500">
            Physical &amp; custom items included in this bundle
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Component Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Individual Price</th>
                <th className="py-3 px-4 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {bundle.components.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {c.primaryImage ? (
                          <img
                            src={c.primaryImage}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base">🎨</span>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400 capitalize">
                          {c.productType} product
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {c.sku || '—'}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">
                    {c.quantity}×
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">
                    ₦{c.sellingPrice.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    ₦{c.totalPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Summary Card */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
          Pricing Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium">Component Total Value</div>
            <div className="text-xl font-bold text-white mt-1">
              ₦{bundle.pricingSummary.componentsValue.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium">Bundle Price</div>
            <div className="text-xl font-bold text-rose-400 mt-1">
              ₦{bundle.pricingSummary.bundlePrice.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium">Customer Savings</div>
            <div
              className={`text-xl font-bold mt-1 ${
                bundle.pricingSummary.customerSavings >= 0
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              ₦{bundle.pricingSummary.customerSavings.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Modal */}
      <DuplicateBundleModal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        onConfirm={handleConfirmDuplicate}
        initialName={bundle.name}
        initialSku={bundle.sku || ''}
      />
    </div>
  );
}
