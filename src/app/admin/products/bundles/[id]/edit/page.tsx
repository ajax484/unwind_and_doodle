'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BundleComponentBuilder, SelectedComponentItem } from '@/components/admin/BundleComponentBuilder';
import { AdminBundleDetail } from '@/types/admin-bundle';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export default function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bundleId = resolvedParams.id;
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>(0);
  const [costPrice, setCostPrice] = useState<number | ''>(0);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<{ storage_path: string; sort_order: number }[]>([]);
  const [imagePath, setImagePath] = useState('');
  const [components, setComponents] = useState<SelectedComponentItem[]>([]);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBundleData = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError(null);

      const [bundleRes, catRes] = await Promise.all([
        fetch(`/api/admin/products/bundles/${bundleId}`),
        fetch('/api/admin/categories'),
      ]);

      const bundleJson = await bundleRes.json();
      const catJson = await catRes.json();

      if (catRes.ok && catJson.success) {
        setCategories(catJson.data || []);
      }

      if (bundleRes.ok && bundleJson.success && bundleJson.data) {
        const b: AdminBundleDetail = bundleJson.data;
        setName(b.name);
        setSlug(b.slug);
        setDescription(b.description || '');
        setSku(b.sku || '');
        setSellingPrice(b.selling_price);
        setCostPrice(b.cost_price);
        setStatus(b.status);
        setSelectedCategoryIds(b.categories.map((c) => c.id));
        setImages(b.images.map((img) => ({ storage_path: img.storage_path, sort_order: img.sort_order })));

        setComponents(
          b.components.map((c) => ({
            component_product_id: c.componentProductId,
            name: c.name,
            sku: c.sku,
            selling_price: c.sellingPrice,
            cost_price: c.costPrice || 0,
            primaryImage: c.primaryImage,
            product_type: c.productType as 'physical' | 'custom' | 'bundle',
            quantity: c.quantity,
          }))
        );
      } else {
        throw new Error(bundleJson.error || 'Failed to fetch bundle product');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading bundle');
    } finally {
      setInitialLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    fetchBundleData();
  }, [fetchBundleData]);

  const handleComponentsChange = (newComponents: SelectedComponentItem[]) => {
    setComponents(newComponents);
    const calculatedCost = newComponents.reduce(
      (sum, c) => sum + Number(c.cost_price || 0) * Number(c.quantity || 1),
      0
    );
    setCostPrice(calculatedCost);
  };

  const handleAddImage = () => {
    if (!imagePath.trim()) return;
    setImages([...images, { storage_path: imagePath.trim(), sort_order: images.length }]);
    setImagePath('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/products/upload-image', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      const uploadedPath = json.data?.storagePath || json.storagePath || json.data?.url || json.url;
      if (res.ok && json.success && uploadedPath) {
        setImages((prev) => [
          ...prev,
          { storage_path: uploadedPath, sort_order: prev.length },
        ]);
      } else {
        throw new Error(json.error || 'Failed to upload image');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Bundle name is required.');
      return;
    }
    if (sellingPrice === '' || sellingPrice < 0) {
      setError('Selling price must be greater than or equal to 0.');
      return;
    }
    if (costPrice === '' || costPrice < 0) {
      setError('Cost price must be greater than or equal to 0.');
      return;
    }
    if (components.length === 0) {
      setError('A bundle must contain at least one component product.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        sku: sku.trim() || null,
        selling_price: Number(sellingPrice),
        cost_price: Number(costPrice),
        status,
        category_ids: selectedCategoryIds,
        images,
        components: components.map((c) => ({
          component_product_id: c.component_product_id,
          quantity: c.quantity,
        })),
      };

      const res = await fetch(`/api/admin/products/bundles/${bundleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        router.push(`/admin/products/bundles/${bundleId}`);
      } else {
        throw new Error(json.error || 'Failed to update bundle product.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating bundle.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <div className="w-10 h-10 rounded-full border-2 border-rose-600 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading bundle data for editing...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/products/bundles" className="hover:text-rose-600 transition-colors">
              Bundles
            </Link>
            <span>/</span>
            <Link href={`/admin/products/bundles/${bundleId}`} className="hover:text-rose-600 transition-colors">
              {name || 'Detail'}
            </Link>
            <span>/</span>
            <span>Edit</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Edit Bundle
          </h1>
        </div>

        <Link
          href={`/admin/products/bundles/${bundleId}`}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-heading font-bold text-slate-800">
              Basic Information
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              Product Type: Bundle (Read-only)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">
                Bundle Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Creative Starter Bundle"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="creative-starter-bundle"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* SKU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">SKU Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="CSB-001"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Selling Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Selling Price (₦) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Cost Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Cost Price (₦) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <span className="text-[11px] text-slate-500 block">
                💡 Auto-calculated sum of component cost prices (₦{(Number(costPrice) || 0).toLocaleString()})
              </span>
            </div>

            {/* Status */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Status</label>
              <div className="flex items-center gap-4">
                {(['draft', 'published', 'archived'] as const).map((st) => (
                  <label
                    key={st}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      status === st
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={st}
                      checked={status === st}
                      onChange={() => setStatus(st)}
                      className="accent-rose-600"
                    />
                    <span className="capitalize">{st}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what customers get in this bundle..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Categories</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== cat.id));
                          } else {
                            setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Images */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Product Images</label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden group"
                  >
                    <img src={img.storage_path} alt="Bundle" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center opacity-90 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-rose-600 transition-colors">
                  {uploadingImage ? (
                    <span className="text-xs animate-spin">⚙️</span>
                  ) : (
                    <>
                      <span className="text-lg">📷</span>
                      <span className="text-[10px] font-semibold mt-0.5">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  placeholder="Or enter image URL / storage path..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Add Path
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Component Builder */}
        <BundleComponentBuilder
          components={components}
          onChangeComponents={handleComponentsChange}
          bundleSellingPrice={Number(sellingPrice) || 0}
        />

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href={`/admin/products/bundles/${bundleId}`}
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            {saving ? 'Saving Changes...' : 'Save Bundle Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
