'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BundleComponentBuilder, SelectedComponentItem } from '@/components/admin/BundleComponentBuilder';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export default function CreateBundlePage() {
  const router = useRouter();

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>(0);
  const [costPrice, setCostPrice] = useState<number | ''>(0);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [imagePath, setImagePath] = useState('');
  const [images, setImages] = useState<{ storage_path: string; sort_order: number }[]>([]);

  // Components
  const [components, setComponents] = useState<SelectedComponentItem[]>([]);

  // Categories & UI States
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/admin/categories');
        const json = await res.json();
        if (res.ok && json.success) {
          setCategories(json.data || []);
        }
      } catch {
        // Non-blocking
      }
    }
    fetchCategories();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Auto-generate slug from name if slug wasn't manually edited
    const autoSlug = newName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
    setSlug(autoSlug);
  };

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

    // Validations
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
      setLoading(true);
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        sku: sku.trim() || null,
        product_type: 'bundle',
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

      const res = await fetch('/api/admin/products/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        router.push(`/admin/products/bundles/${json.data.id}`);
      } else {
        throw new Error(json.error || 'Failed to create bundle product.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating bundle.');
    } finally {
      setLoading(false);
    }
  };

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
            <span>New Bundle</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Create Product Bundle
          </h1>
        </div>

        <Link
          href="/admin/products/bundles"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
        >
          Back to Bundles
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-heading font-bold text-slate-800">
              Basic Information
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              Product Type: Bundle
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
                onChange={handleNameChange}
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
                placeholder="Auto-generated if left blank (e.g. CSB-001)"
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
                placeholder="10000"
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
                placeholder="7500"
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

              {/* Direct Path Input Fallback */}
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

        {/* Component Builder Section */}
        <BundleComponentBuilder
          components={components}
          onChangeComponents={handleComponentsChange}
          bundleSellingPrice={Number(sellingPrice) || 0}
        />

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href="/admin/products/bundles"
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            {loading ? 'Creating Bundle...' : 'Create Bundle'}
          </button>
        </div>
      </form>
    </div>
  );
}
