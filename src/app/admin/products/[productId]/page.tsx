'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdminProductDetail,
  AdminProductCategoryItem,
  AdminProductListItem,
  AdminProductAddonDetail,
} from '@/types/admin-product';
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

export default function AdminProductEditPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [productType, setProductType] = useState<'physical' | 'custom' | 'bundle'>('physical');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [requiresCustomization, setRequiresCustomization] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<{ id?: string; storage_path: string; alt_text: string | null; sort_order: number }[]>([]);

  // Categories
  const [availableCategories, setAvailableCategories] = useState<AdminProductCategoryItem[]>([]);
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Add-ons Subsystem
  const [catalogProducts, setCatalogProducts] = useState<AdminProductListItem[]>([]);
  const [showAddAddonModal, setShowAddAddonModal] = useState(false);
  const [selectedAddonProdId, setSelectedAddonProdId] = useState('');
  const [addonPriceOverride, setAddonPriceOverride] = useState<number | ''>('');
  const [addonMinQty, setAddonMinQty] = useState(1);
  const [addonMaxQty, setAddonMaxQty] = useState(5);
  const [addonSaving, setAddonSaving] = useState(false);

  // Themes Subsystem
  const [supportsThemeCustomization, setSupportsThemeCustomization] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<{ id: string; name: string; slug: string; is_active?: boolean; isActive?: boolean }[]>([]);
  const [assignedThemeIds, setAssignedThemeIds] = useState<string[]>([]);
  const [showNewThemeModal, setShowNewThemeModal] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeSlug, setNewThemeSlug] = useState('');
  const [isThemeSlugEdited, setIsThemeSlugEdited] = useState(false);
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);

  const openNewThemeModal = () => {
    setNewThemeName('');
    setNewThemeSlug('');
    setIsThemeSlugEdited(false);
    setNewThemeDescription('');
    setShowNewThemeModal(true);
  };

  // Uploading Image
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/products/${productId}`);
      const json = await res.json();

      if (res.ok && json.success) {
        const p: AdminProductDetail = json.data;
        setProduct(p);
        setName(p.name);
        setSlug(p.slug);
        setDescription(p.description || '');
        setSku(p.sku || '');
        setProductType(p.product_type);
        setSellingPrice(p.selling_price);
        setCostPrice(p.cost_price || 0);
        setStatus(p.status);
        setRequiresCustomization(p.requires_customization);
        setSupportsThemeCustomization(p.supports_theme_customization || false);
        setSelectedCategoryIds(p.categories.map((c) => c.id));
        setImages(p.images || []);
      } else {
        throw new Error(json.error || 'Failed to fetch product');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const [catsRes, prodsRes, themesRes, prodThemesRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/products?limit=100'),
        fetch('/api/admin/themes'),
        fetch(`/api/admin/products/${productId}/themes`),
      ]);
      const catsJson = await catsRes.json();
      const prodsJson = await prodsRes.json();
      const themesJson = await themesRes.json();
      const prodThemesJson = await prodThemesRes.json();

      if (catsRes.ok && catsJson.success) {
        setAvailableCategories(catsJson.data || catsJson.categories || []);
      }
      if (prodsRes.ok && prodsJson.success) {
        setCatalogProducts(prodsJson.data.products || prodsJson.data || []);
      }
      if (themesRes.ok && themesJson.success) {
        setAvailableThemes(themesJson.themes || themesJson.data || []);
      }
      if (prodThemesRes.ok && prodThemesJson.success && Array.isArray(prodThemesJson.themes)) {
        setAssignedThemeIds(prodThemesJson.themes.map((t: { id: string }) => t.id));
      }
    } catch {
      // Non-blocking
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
    fetchAuxiliaryData();
  }, [fetchProduct, fetchAuxiliaryData]);

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
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
            alt_text: json.data.altText || name,
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

  const handleThemeToggle = async (themeId: string) => {
    const updatedIds = assignedThemeIds.includes(themeId)
      ? assignedThemeIds.filter((id) => id !== themeId)
      : [...assignedThemeIds, themeId];

    setAssignedThemeIds(updatedIds);

    try {
      await fetch(`/api/admin/products/${productId}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeIds: updatedIds }),
      });
    } catch {
      alert('Error updating assigned product themes');
    }
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
        const updatedAssigned = [...assignedThemeIds, json.theme.id];
        setAssignedThemeIds(updatedAssigned);

        await fetch(`/api/admin/products/${productId}/themes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeIds: updatedAssigned }),
        });

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

  const handleSaveChanges = async (overrideStatus?: 'draft' | 'published' | 'archived') => {
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        sku: sku.trim() || null,
        product_type: productType,
        selling_price: Number(sellingPrice),
        cost_price: Number(costPrice) || 0,
        status: overrideStatus || status,
        requires_customization: requiresCustomization,
        supports_theme_customization: supportsThemeCustomization,
        category_ids: selectedCategoryIds,
        images: images.map((img, idx) => ({
          storage_path: img.storage_path,
          alt_text: img.alt_text || null,
          sort_order: idx,
        })),
      };

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Product saved successfully!');
        if (overrideStatus) setStatus(overrideStatus);
        await fetchProduct();
      } else {
        throw new Error(json.error || 'Failed to update product');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  // Add-on Management handlers
  const handleAddAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddonProdId) return;

    try {
      setAddonSaving(true);
      setError(null);

      const res = await fetch(`/api/admin/products/${productId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addon_product_id: selectedAddonProdId,
          price_override: addonPriceOverride === '' ? null : Number(addonPriceOverride),
          min_quantity: Number(addonMinQty) || 1,
          max_quantity: Number(addonMaxQty) || 5,
          active: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowAddAddonModal(false);
        setSelectedAddonProdId('');
        setAddonPriceOverride('');
        await fetchProduct();
      } else {
        throw new Error(json.error || 'Failed to link add-on');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding add-on');
    } finally {
      setAddonSaving(false);
    }
  };

  const handleToggleAddonActive = async (addon: AdminProductAddonDetail) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/addons/${addon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !addon.active }),
      });
      if (res.ok) {
        await fetchProduct();
      }
    } catch {
      alert('Error updating add-on status');
    }
  };

  const handleRemoveAddon = async (addonId: string) => {
    if (!confirm('Are you sure you want to remove this add-on from the product?')) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}/addons/${addonId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchProduct();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to remove add-on');
      }
    } catch {
      alert('Error removing add-on');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !product) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-red-200 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-heading font-bold text-lg text-slate-800">Product Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/admin/products"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Products
        </Link>
      </div>
    );
  }

  if (!product) return null;

  const grossProfit = Math.max(0, sellingPrice - costPrice);
  const marginPct = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0;

  // Filter available add-on options (exclude self and already linked)
  const existingAddonProdIds = product.addons.map((a) => a.addonProductId);
  const selectableAddonProds = catalogProducts.filter(
    (p) => p.id !== productId && !existingAddonProdIds.includes(p.id)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/products" className="hover:text-slate-600">
              ← Products
            </Link>
            <span>/</span>
            <span className="font-mono font-bold text-slate-700">/{product.slug}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
              {product.name}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status === 'draft'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            Preview in Storefront ↗
          </Link>

          {status === 'draft' ? (
            <button
              type="button"
              onClick={() => handleSaveChanges('published')}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Publish Product
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSaveChanges('draft')}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Unpublish (Draft)
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveChanges()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* 2. Organized Sections */}
      <div className="space-y-6">
        {/* Section 1: General Details */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
            General Information
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Product Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="w-full pl-24 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">SKU</label>
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-rose-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Classification</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as 'physical' | 'custom')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
                >
                  <option value="physical">Physical Item (Ready to Print &amp; Ship)</option>
                  <option value="custom">Custom Keepsake (Personalized Drawing / Custom Name)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Lifecycle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
                >
                  <option value="draft">Draft (Hidden from Storefront)</option>
                  <option value="published">Published (Available for Purchase)</option>
                  <option value="archived">Archived (Retired)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-800 block">
                  Requires Custom Photo Uploads &amp; Personalization
                </span>
                <span className="text-slate-400 text-[11px]">
                  Enables upload dropzones on the customer product details page.
                </span>
              </div>
              <input
                type="checkbox"
                checked={requiresCustomization}
                onChange={(e) => setRequiresCustomization(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-800 block">
                  Supports Customizable Coloring Book Content Themes
                </span>
                <span className="text-slate-400 text-[11px]">
                  Enables customer 1–3 theme selection and cover name personalization on the storefront.
                </span>
              </div>
              <input
                type="checkbox"
                checked={supportsThemeCustomization}
                onChange={(e) => setSupportsThemeCustomization(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing & Profit Margins */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
            Pricing &amp; Margins
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Selling Price (NGN)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-slate-400">₦</span>
                <input
                  type="number"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-rose-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Cost Price (NGN)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-slate-400">₦</span>
                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-rose-400"
                />
              </div>
              <span className="text-[10px] text-slate-400">Internal bookkeeping</span>
            </div>

            <div className="space-y-1 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Gross Margin</span>
              <div className="font-heading font-bold text-base text-emerald-700">
                {formatCurrency(grossProfit)}{' '}
                <span className="text-xs font-normal text-emerald-600">({marginPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Categories */}
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
        </div>

        {/* Section 4: Coloring Book Content Themes */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <span>🎨</span> Content Themes ({assignedThemeIds.length} Assigned)
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
                const isAssigned = assignedThemeIds.includes(theme.id);
                const isActive = theme.is_active ?? theme.isActive ?? true;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleThemeToggle(theme.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isAssigned
                        ? 'bg-[#FBF0F2] text-[#D99BA3] border border-[#D99BA3]/30 shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                  >
                    <span>{isAssigned ? '✓' : '+'}</span>
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

        {/* Section 4: Product Images */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-heading font-bold text-base text-slate-900">
              Media &amp; Gallery ({images.length})
            </h3>
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
              <p className="text-xs text-slate-500">No images uploaded for this product.</p>
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
                    alt={img.alt_text || name}
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

        {/* Section 5: Add-ons Configuration Subsystem */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">
                Configured Add-ons ({product.addons.length})
              </h3>
              <p className="text-xs text-slate-500">
                Products that customers can add to their cart alongside this book (e.g. pencils, gel pens).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAddonModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              + Link Add-on
            </button>
          </div>

          {product.addons.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No add-ons currently attached to this product.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {product.addons.map((addon) => (
                <div key={addon.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {addon.primaryImage ? (
                        <img src={addon.primaryImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>✏️</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{addon.addonName}</div>
                      <div className="text-[11px] text-slate-400">
                        Qty limits: {addon.minQuantity} – {addon.maxQuantity} • Base price: {formatCurrency(addon.addonOriginalPrice)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-heading font-bold text-slate-900 block">
                        {formatCurrency(addon.effectivePrice)}
                      </span>
                      {addon.priceOverride !== null && (
                        <span className="text-[10px] text-rose-500 font-semibold">Price Override</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleAddonActive(addon)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold cursor-pointer ${
                        addon.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {addon.active ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveAddon(addon.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Read-Only Inventory Summary */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900">
                Warehouse Stock Distribution (Read-Only)
              </h3>
              <p className="text-xs text-slate-500">
                Current stock levels across warehouses. Full inventory adjustments take place in Phase 6D.
              </p>
            </div>
            <Link
              href="/admin/inventory"
              className="text-xs font-semibold text-rose-500 hover:text-rose-600"
            >
              Manage Inventory →
            </Link>
          </div>

          {product.inventory.length === 0 ? (
            <div className="py-4 text-xs text-slate-400">No warehouse stock records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Warehouse</th>
                    <th className="py-2.5 px-3">On Hand</th>
                    <th className="py-2.5 px-3">Reserved</th>
                    <th className="py-2.5 px-3">Available to Sell</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.inventory.map((inv) => (
                    <tr key={inv.warehouseId}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {inv.warehouseName} ({inv.warehouseCode || 'Main'})
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{inv.quantityOnHand}</td>
                      <td className="py-2.5 px-3 text-amber-600">{inv.quantityReserved}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">
                        {inv.availableToSell}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Add-on Modal */}
      {showAddAddonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleAddAddon}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <h4 className="font-heading font-bold text-base text-slate-900">
              Link Catalog Product as Add-on
            </h4>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select Product</label>
                <select
                  value={selectedAddonProdId}
                  onChange={(e) => setSelectedAddonProdId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  <option value="">Choose an add-on product...</option>
                  {selectableAddonProds.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.selling_price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Price Override (NGN, optional)</label>
                <input
                  type="number"
                  min="0"
                  value={addonPriceOverride}
                  onChange={(e) => setAddonPriceOverride(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Leave empty to use catalog price"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={addonMinQty}
                    onChange={(e) => setAddonMinQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Max Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={addonMaxQty}
                    onChange={(e) => setAddonMaxQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddAddonModal(false)}
                disabled={addonSaving}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addonSaving || !selectedAddonProdId}
                className="px-4 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {addonSaving ? 'Linking...' : 'Link Add-on'}
              </button>
            </div>
          </form>
        </div>
      )}

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
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold"
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
                  {themeSaving ? 'Creating...' : 'Create & Assign Theme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
