'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminProductCategoryItem } from '@/types/admin-product';
import { generateAutoSku } from '@/lib/sku-helpers';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

interface ImageUploadItem {
  storage_path: string;
  alt_text: string;
  sort_order: number;
}

export default function NewProductPage() {
  const router = useRouter();

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [productType, setProductType] = useState<'physical' | 'custom'>('physical');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [requiresCustomization, setRequiresCustomization] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<ImageUploadItem[]>([]);

  // Categories & Modal
  const [availableCategories, setAvailableCategories] = useState<AdminProductCategoryItem[]>([]);
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Themes & Modal
  const [supportsThemeCustomization, setSupportsThemeCustomization] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<{ id: string; name: string; slug: string; is_active?: boolean; isActive?: boolean }[]>([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [showNewThemeModal, setShowNewThemeModal] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeSlug, setNewThemeSlug] = useState('');
  const [isThemeSlugEdited, setIsThemeSlugEdited] = useState(false);
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  const fetchAuxiliaryData = async () => {
    try {
      const [catsRes, themesRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/themes'),
      ]);
      const catsJson = await catsRes.json();
      const themesJson = await themesRes.json();

      if (catsRes.ok && catsJson.success) {
        setAvailableCategories(catsJson.data || catsJson.categories || []);
      }
      if (themesRes.ok && themesJson.success) {
        setAvailableThemes(themesJson.themes || themesJson.data || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
  };

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleThemeToggle = (themeId: string) => {
    setSelectedThemeIds((prev) =>
      prev.includes(themeId) ? prev.filter((id) => id !== themeId) : [...prev, themeId]
    );
  };

  const openNewThemeModal = () => {
    setNewThemeName('');
    setNewThemeSlug('');
    setIsThemeSlugEdited(false);
    setNewThemeDescription('');
    setShowNewThemeModal(true);
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) return;

    try {
      setThemeSaving(true);
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newThemeName.trim(),
          slug: newThemeSlug.trim() || undefined,
          description: newThemeDescription.trim() || null,
          isActive: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.theme) {
        setAvailableThemes((prev) => [...prev, json.theme]);
        setSelectedThemeIds((prev) => [...prev, json.theme.id]);
        setNewThemeName('');
        setNewThemeSlug('');
        setNewThemeDescription('');
        setShowNewThemeModal(false);
      } else {
        alert(json.error || 'Failed to create theme');
      }
    } catch {
      alert('Error creating theme');
    } finally {
      setThemeSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAvailableCategories((prev) => [...prev, json.data]);
        setSelectedCategoryIds((prev) => [...prev, json.data.id]);
        setNewCatName('');
        setShowNewCatModal(false);
      } else {
        alert(json.error || 'Failed to create category');
      }
    } catch {
      alert('Error creating category');
    }
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
      if (res.ok && json.success) {
        setImages((prev) => [
          ...prev,
          {
            storage_path: json.data.storagePath,
            alt_text: json.data.altText || name || 'Product image',
            sort_order: prev.length,
          },
        ]);
      } else {
        throw new Error(json.error || 'Image upload failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((img, idx) => ({ ...img, sort_order: idx }))
    );
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    if (sellingPrice === '' || Number(sellingPrice) < 0) {
      setError('A valid selling price is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        sku: sku.trim() || null,
        product_type: productType,
        selling_price: Number(sellingPrice),
        cost_price: Number(costPrice) || 0,
        requires_customization: requiresCustomization,
        supports_theme_customization: supportsThemeCustomization,
        status,
        category_ids: selectedCategoryIds,
        images,
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (selectedThemeIds.length > 0) {
          await fetch(`/api/admin/products/${json.data.id}/themes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ themeIds: selectedThemeIds }),
          });
        }
        router.push(`/admin/products/${json.data.id}`);
      } else {
        throw new Error(json.error || 'Failed to create product');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/products" className="hover:text-slate-600">
              ← Products
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">New Product</span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Add New Product
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('published')}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Publishing...' : 'Publish Product'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* 2. Main Form Grid */}
      <div className="space-y-6">
        {/* Section 1: General Info */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
            General Information
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Product Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Joyous Safari Coloring Book"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-hidden focus:border-rose-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">URL Slug</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 text-xs font-mono">/products/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="joyous-safari-coloring-book"
                    className="w-full pl-24 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">SKU (Stock Keeping Unit)</label>
                  <button
                    type="button"
                    onClick={() => setSku(generateAutoSku(name, productType))}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-1"
                  >
                    <span>⚡</span> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. BK-SAFARI-01"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your coloring book or product in detail..."
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Product Classification</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as 'physical' | 'custom')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
              >
                <option value="physical">Physical Item (Ready to Print &amp; Ship)</option>
                <option value="custom">Custom Keepsake (Personalized Drawing / Custom Name)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Pricing */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
            Pricing &amp; Cost
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Selling Price (NGN) <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-slate-400">₦</span>
                <input
                  type="number"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="15000"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-rose-400"
                />
              </div>
              <span className="text-[11px] text-slate-400">Customer checkout price</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Cost Price (NGN)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-slate-400">₦</span>
                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="5000"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-rose-400"
                />
              </div>
              <span className="text-[11px] text-slate-400">Internal bookkeeping (never shown to customers)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Customization Settings */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Custom Keepsake Settings
              </h3>
              <p className="text-xs text-slate-500">
                Enable if this coloring book requires custom photo uploads and personalization instructions.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={requiresCustomization}
                onChange={(e) => setRequiresCustomization(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500" />
            </label>
          </div>
        </div>

        {/* Section 4: Categories */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-heading font-bold text-base text-slate-900">Categories</h3>
            <button
              type="button"
              onClick={() => setShowNewCatModal(true)}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600"
            >
              + Create Category
            </button>
          </div>

          <div className="space-y-2">
            {availableCategories.length === 0 ? (
              <div className="text-xs text-slate-400">No categories created yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryToggle(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Coloring Book Content Themes */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <span>🎨</span> Content Themes ({selectedThemeIds.length} Selected)
              </h3>
              <p className="text-xs text-slate-500">
                Select which content themes are available for customers to choose when customizing this coloring book.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewThemeModal}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
            >
              + Create New Theme
            </button>
          </div>

          <div className="pt-1 pb-3 flex items-center justify-between border-b border-slate-100">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-800 text-xs block">
                Enable Customizable Themes on Storefront
              </span>
              <span className="text-slate-400 text-[11px]">
                Enables customer 1–3 theme selection and cover name personalization for this book.
              </span>
            </div>
            <input
              type="checkbox"
              checked={supportsThemeCustomization}
              onChange={(e) => setSupportsThemeCustomization(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500"
            />
          </div>

          {!supportsThemeCustomization ? (
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-xs text-amber-800 flex items-center justify-between">
              <span>Theme customization is currently disabled for this product. Enable the toggle above to activate theme picker for customers.</span>
              <button
                type="button"
                onClick={() => setSupportsThemeCustomization(true)}
                className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors ml-3 shrink-0 cursor-pointer"
              >
                Enable Now
              </button>
            </div>
          ) : availableThemes.length === 0 ? (
            <div className="py-6 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
              <p className="text-xs text-slate-500">No themes created in your organization yet.</p>
              <button
                type="button"
                onClick={openNewThemeModal}
                className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
              >
                + Create your first theme
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {availableThemes.map((theme) => {
                const isSelected = selectedThemeIds.includes(theme.id);
                const isActive = theme.is_active ?? theme.isActive ?? true;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleThemeToggle(theme.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#FBF0F2] text-[#D99BA3] border border-[#D99BA3]/30 shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{theme.name}</span>
                    {!isActive && (
                      <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-normal">
                        Inactive
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 6: Image Gallery */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-heading font-bold text-base text-slate-900">Product Images</h3>
            <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer shadow-xs">
              {uploadingImage ? 'Uploading...' : '+ Upload Image'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          </div>

          {images.length === 0 ? (
            <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
              <div className="text-3xl text-slate-300">📷</div>
              <p className="text-xs text-slate-500">
                Upload product covers and interior illustration previews (JPG, PNG, WEBP).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex items-center justify-center"
                >
                  <img
                    src={img.storage_path}
                    alt={img.alt_text}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold shadow-xs">
                      Cover Image
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {showNewCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <h4 className="font-heading font-bold text-base text-slate-900">Create New Category</h4>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Coloring Books, Pencils, Gifts"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNewCatModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create New Theme Modal */}
      {showNewThemeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <span>🎨</span> Create New Content Theme
              </h3>
              <button
                type="button"
                onClick={() => setShowNewThemeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTheme} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Theme Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mystical Celestial"
                  value={newThemeName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewThemeName(val);
                    if (!isThemeSlugEdited) {
                      setNewThemeSlug(slugify(val));
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Slug</label>
                <input
                  type="text"
                  placeholder="e.g. mystical-celestial"
                  value={newThemeSlug}
                  onChange={(e) => {
                    setIsThemeSlugEdited(true);
                    setNewThemeSlug(slugify(e.target.value));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short description of artwork theme..."
                  value={newThemeDescription}
                  onChange={(e) => setNewThemeDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewThemeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={themeSaving || !newThemeName.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {themeSaving ? 'Creating...' : 'Create & Select Theme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
