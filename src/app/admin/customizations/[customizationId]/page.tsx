'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  AdminCustomizationDetail,
  AdminCustomizationAssetItem,
} from '@/types/admin-review-customization';

export default function AdminCustomizationDetailPage({
  params,
}: {
  params: Promise<{ customizationId: string }>;
}) {
  const { customizationId } = use(params);

  const [data, setData] = useState<AdminCustomizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Upload/Set Processed File Modal
  const [activeAsset, setActiveAsset] = useState<AdminCustomizationAssetItem | null>(null);
  const [processedPathInput, setProcessedPathInput] = useState('');
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/customizations/${customizationId}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch customization details');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading customization');
    } finally {
      setLoading(false);
    }
  }, [customizationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStartProcessing = async () => {
    try {
      setActionLoading(true);
      setActionSuccess(null);

      const res = await fetch(`/api/admin/customizations/${customizationId}/start`, {
        method: 'POST',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('Customization moved to In-Processing state.');
        await fetchDetail();
      } else {
        throw new Error(json.error || 'Failed to start processing');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error starting processing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteCustomization = async () => {
    if (!data?.allAssetsProcessed) {
      alert('Cannot complete customization: All uploaded photos must have processed line-art files attached.');
      return;
    }

    if (!window.confirm('Are you sure you want to mark this custom coloring book artwork as COMPLETED?')) {
      return;
    }

    try {
      setActionLoading(true);
      setActionSuccess(null);

      const res = await fetch(`/api/admin/customizations/${customizationId}/complete`, {
        method: 'POST',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('Customization completed successfully! Order is ready for printing & fulfillment.');
        await fetchDetail();
      } else {
        throw new Error(json.error || 'Failed to complete customization');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error completing customization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenUploadModal = (asset: AdminCustomizationAssetItem) => {
    setActiveAsset(asset);
    setProcessedPathInput(asset.processedStoragePath || '');
    setAssetError(null);
  };

  const handleSaveProcessedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset || !processedPathInput.trim()) {
      setAssetError('Processed line-art storage path or URL is required');
      return;
    }

    try {
      setSavingAsset(true);
      setAssetError(null);

      const res = await fetch(
        `/api/admin/customizations/${customizationId}/assets/${activeAsset.id}/processed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            processedStoragePath: processedPathInput.trim(),
            mimeType: 'image/png',
          }),
        }
      );

      const json = await res.json();
      if (res.ok && json.success) {
        setActiveAsset(null);
        await fetchDetail();
      } else {
        throw new Error(json.error || 'Failed to attach processed asset');
      }
    } catch (err: unknown) {
      setAssetError(err instanceof Error ? err.message : 'Error saving processed file');
    } finally {
      setSavingAsset(false);
    }
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
        <h3 className="font-heading font-bold text-lg text-slate-800">Customization Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/admin/customizations"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Customization Queue
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/customizations" className="hover:text-slate-600">
              ← Customization Queue
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold font-mono">Order #{data.orderNumber}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
              {data.productName}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                data.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : data.status === 'processing'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {data.status.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Ordered on {new Date(data.orderCreatedAt).toLocaleString()} by{' '}
            <strong className="text-slate-800">{data.customerName}</strong> ({data.customerEmail})
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {data.status === 'pending' && (
            <button
              type="button"
              onClick={handleStartProcessing}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold font-heading shadow-xs cursor-pointer disabled:opacity-50"
            >
              Start Artwork Processing
            </button>
          )}

          <button
            type="button"
            onClick={handleCompleteCustomization}
            disabled={actionLoading || data.status === 'completed' || !data.allAssetsProcessed}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-heading shadow-xs transition-all ${
              data.status === 'completed'
                ? 'bg-emerald-600 text-white cursor-default'
                : data.allAssetsProcessed
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {data.status === 'completed' ? '✓ Artwork Completed' : 'Mark as Completed & Print Ready'}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2">
          <span>✓</span> {actionSuccess}
        </div>
      )}

      {/* 2. Order & Customer Context Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
            Order Reference
          </span>
          <Link
            href={`/admin/orders/${data.orderId}`}
            className="font-bold text-slate-900 hover:text-rose-500 block font-mono text-sm"
          >
            #{data.orderNumber}
          </Link>
          <span className="text-[11px] text-slate-400">Order Status: {data.orderStatus}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
            Customer Info
          </span>
          <Link
            href={`/admin/customers/${data.customerId}`}
            className="font-bold text-slate-900 hover:text-rose-500 block text-sm"
          >
            {data.customerName}
          </Link>
          <span className="text-[11px] text-slate-400">{data.customerPhone || 'No phone'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
            Artwork Progress
          </span>
          <div className="text-sm font-bold text-slate-800 pt-0.5">
            {data.assets.filter((a) => a.processedStoragePath).length} of {data.assets.length} Line Art Files Ready
          </div>
          <span
            className={`text-[11px] font-semibold ${
              data.allAssetsProcessed ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {data.allAssetsProcessed ? '✓ All files attached' : 'Awaiting line-art upload'}
          </span>
        </div>
      </div>

      {/* 3. Multi-Asset Processing Matrix */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Customer Photo Assets ({data.assets.length})
            </h3>
            <p className="text-xs text-slate-500">
              Download customer photos, convert them to coloring-book line art, and upload the processed files.
            </p>
          </div>
        </div>

        {data.assets.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No customer photo uploads attached to this custom order item.
          </div>
        ) : (
          <div className="space-y-6">
            {data.assets.map((asset: AdminCustomizationAssetItem, idx: number) => {
              const hasProcessed = Boolean(asset.processedStoragePath);

              return (
                <div
                  key={asset.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                >
                  {/* Left: Original Photo */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">
                        Page #{idx + 1}: Original Upload
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : ''}
                      </span>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-slate-200 aspect-4/3 flex items-center justify-center border border-slate-300">
                      {asset.originalUrl ? (
                        <img
                          src={asset.originalUrl}
                          alt={asset.originalFilename}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-3xl">📷</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 truncate max-w-[200px]" title={asset.originalFilename}>
                        {asset.originalFilename}
                      </span>
                      <a
                        href={asset.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-500 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>📥</span> Download
                      </a>
                    </div>
                  </div>

                  {/* Center: Conversion Flow Arrow */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center text-center space-y-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        hasProcessed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {hasProcessed ? '✓' : '→'}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        hasProcessed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {hasProcessed ? 'Line Art Ready' : 'Processing Needed'}
                    </span>
                  </div>

                  {/* Right: Processed Line-Art */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">
                        Coloring Line-Art Output
                      </span>
                      {hasProcessed && (
                        <span className="text-[10px] text-emerald-600 font-bold">
                          Attached
                        </span>
                      )}
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-white aspect-4/3 flex items-center justify-center border border-slate-200">
                      {asset.processedUrl ? (
                        <img
                          src={asset.processedUrl}
                          alt="Processed coloring line art"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-4 space-y-1 text-slate-400">
                          <span className="text-2xl block">🎨</span>
                          <span className="text-[11px] block">No line-art file attached yet</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {hasProcessed ? (
                        <a
                          href={asset.processedUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                        >
                          View Full Size
                        </a>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenUploadModal(asset)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors ${
                          hasProcessed
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-rose-500 hover:bg-rose-600 text-white'
                        }`}
                      >
                        {hasProcessed ? 'Replace Line Art' : '+ Upload Line Art'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Processed File Modal */}
      {activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProcessedAsset}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">
                Attach Processed Line Art
              </h4>
              <p className="text-xs text-slate-500">
                Provide the storage path or URL for the converted coloring-page line art for &quot;
                {activeAsset.originalFilename}&quot;.
              </p>
            </div>

            {assetError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {assetError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Processed Storage Path / URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={processedPathInput}
                  onChange={(e) => setProcessedPathInput(e.target.value)}
                  placeholder="e.g. customizations/processed/page-01-lineart.png"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-rose-400"
                  autoFocus
                  required
                />
              </div>

              <p className="text-[11px] text-slate-400">
                In automated pipelines, workers upload line-art directly to storage. Here, provide the relative storage path or public CDN asset URL.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveAsset(null)}
                disabled={savingAsset}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAsset || !processedPathInput.trim()}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {savingAsset ? 'Saving...' : 'Save Processed File'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
