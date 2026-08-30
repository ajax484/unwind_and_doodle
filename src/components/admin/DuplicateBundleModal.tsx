'use client';

import React, { useState, useEffect } from 'react';

interface DuplicateBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; slug: string; sku: string }) => Promise<void>;
  initialName?: string;
  initialSku?: string;
}

export function DuplicateBundleModal({
  isOpen,
  onClose,
  onConfirm,
  initialName = '',
  initialSku = '',
}: DuplicateBundleModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const baseName = initialName ? `${initialName} (Copy)` : 'New Bundle Copy';
      setName(baseName);
      setSlug(
        baseName
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
      );
      setSku(initialSku ? `${initialSku}-COPY` : '');
      setError(null);
    }
  }, [isOpen, initialName, initialSku]);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bundle name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onConfirm({
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error duplicating bundle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-heading font-bold text-slate-800">Duplicate Bundle</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a new draft bundle based on this bundle&apos;s components.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* New Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              New Bundle Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder="Creative Starter Bundle (Copy)"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* New Slug */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">New Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="creative-starter-bundle-copy"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* New SKU */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">New SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="CSB-001-COPY (Auto-generated if empty)"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98]"
            >
              {submitting ? 'Duplicating...' : 'Confirm Duplicate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
