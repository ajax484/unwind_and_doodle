'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminCategory } from '@/types/admin-product';
import { slugify } from '@/lib/slug-helpers';

function CategoriesManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'products_desc' | 'newest'>('name_asc');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/categories');
      const json = await res.json();
      if (res.ok && json.success) {
        setCategories(json.data || []);
      } else {
        throw new Error(json.error || 'Failed to fetch categories');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle Search & Sort
  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'products_desc') return (b.product_count || 0) - (a.product_count || 0);
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return result;
  }, [categories, searchTerm, sortBy]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setAutoSlug(true);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || '');
    setAutoSlug(false);
    setFormError(null);
  };

  // Name change handler for auto-slugging
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (autoSlug) {
      setFormSlug(slugify(val));
    }
  };

  // Submit Create Category
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Category name is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() ? slugify(formSlug.trim()) : undefined,
        description: formDescription.trim() || null,
      };

      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create category');
      }

      setIsCreateModalOpen(false);
      await fetchCategories();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating category');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Category
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!formName.trim()) {
      setFormError('Category name is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() ? slugify(formSlug.trim()) : undefined,
        description: formDescription.trim() || null,
      };

      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update category');
      }

      setEditingCategory(null);
      await fetchCategories();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error updating category');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Delete Category
  const handleDeleteSubmit = async () => {
    if (!deletingCategory) return;

    try {
      setDeleteSubmitting(true);
      setDeleteError(null);

      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete category');
      }

      setDeletingCategory(null);
      await fetchCategories();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting category');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            <Link href="/admin/products" className="hover:text-text-primary transition-colors">
              Catalog
            </Link>
            <span>/</span>
            <span className="text-brand-rose">Categories</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">
            Category Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Organize products into curated collections, edit storefront URLs, and manage category descriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="px-4 py-2 rounded-xl border border-border-default bg-white hover:bg-bg-subtle text-xs font-heading font-semibold text-text-secondary hover:text-text-primary transition-all shadow-2xs"
          >
            ← Back to Products
          </Link>
          <button
            onClick={openCreateModal}
            className="btn-rose text-xs font-heading font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span>
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-soft p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-border-default">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories by name, slug, description..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border-default bg-bg-subtle/50 focus:bg-white focus:outline-none focus:border-brand-rose transition-colors"
          />
          <span className="absolute left-3 top-2.5 text-text-secondary text-xs" aria-hidden="true">
            🔍
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <label className="text-xs text-text-secondary font-medium whitespace-nowrap">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-border-default rounded-xl px-3 py-2 bg-white text-text-primary focus:outline-none focus:border-brand-rose"
          >
            <option value="name_asc">Name (A → Z)</option>
            <option value="name_desc">Name (Z → A)</option>
            <option value="products_desc">Most Products</option>
            <option value="newest">Recently Added</option>
          </select>
          <span className="text-xs text-text-secondary bg-bg-subtle px-2.5 py-1.5 rounded-lg border border-border-default whitespace-nowrap">
            {filteredAndSortedCategories.length} {filteredAndSortedCategories.length === 1 ? 'category' : 'categories'}
          </span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-status-danger-bg text-status-danger-text border border-status-danger-border flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium">{error}</span>
          <button onClick={fetchCategories} className="text-xs font-bold underline ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Categories Table */}
      <div className="card-soft overflow-hidden bg-white border border-border-default shadow-xs rounded-2xl">
        {loading ? (
          <div className="divide-y divide-border-default">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                <div className="space-y-2 w-1/3">
                  <div className="h-4 bg-bg-subtle rounded w-3/4" />
                  <div className="h-3 bg-bg-subtle rounded w-1/2" />
                </div>
                <div className="h-4 bg-bg-subtle rounded w-16" />
                <div className="h-4 bg-bg-subtle rounded w-24" />
                <div className="h-8 bg-bg-subtle rounded w-20" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedCategories.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="text-3xl">🏷️</div>
            <h3 className="font-heading font-bold text-base text-text-primary">
              {searchTerm ? 'No categories matched your search' : 'No categories created yet'}
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              {searchTerm
                ? 'Try adjusting your search query or clear the filter to see all categories.'
                : 'Create categories to organize your coloring books, journals, and art supplies.'}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs font-heading font-semibold text-brand-rose hover:underline"
              >
                Clear search
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="btn-rose text-xs font-heading font-semibold px-4 py-2 rounded-xl mt-2"
              >
                + Create Your First Category
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-bg-subtle/50 text-[11px] font-heading font-bold uppercase tracking-wider text-text-secondary">
                  <th className="py-3 px-4 sm:px-6">Category Name</th>
                  <th className="py-3 px-4">Slug / Storefront URL</th>
                  <th className="py-3 px-4 hidden md:table-cell">Description</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-xs">
                {filteredAndSortedCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="hover:bg-bg-subtle/30 transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-brand-rose-subtle text-brand-rose flex items-center justify-center font-bold text-sm shrink-0">
                          🏷️
                        </span>
                        <div>
                          <span className="font-heading font-bold text-text-primary text-sm block">
                            {category.name}
                          </span>
                          <span className="text-[10px] text-text-secondary font-mono md:hidden">
                            /products?category={category.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/products?category=${encodeURIComponent(category.slug)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-text-secondary hover:text-brand-rose transition-colors group-hover:underline"
                        title="View category page on storefront"
                      >
                        <span>{category.slug}</span>
                        <span className="text-[10px] opacity-70">↗</span>
                      </Link>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 hidden md:table-cell max-w-xs">
                      {category.description ? (
                        <p className="text-text-secondary text-xs truncate" title={category.description}>
                          {category.description}
                        </p>
                      ) : (
                        <span className="text-text-secondary/50 italic text-[11px]">No description</span>
                      )}
                    </td>

                    {/* Products Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-heading font-semibold text-[11px] ${
                          (category.product_count || 0) > 0
                            ? 'bg-brand-blue-subtle text-brand-blue'
                            : 'bg-bg-subtle text-text-secondary'
                        }`}
                      >
                        {category.product_count || 0}{' '}
                        {(category.product_count || 0) === 1 ? 'product' : 'products'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4 hidden lg:table-cell text-text-secondary text-[11px]">
                      {new Date(category.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(category)}
                          className="px-2.5 py-1.5 rounded-lg border border-border-default bg-white hover:bg-bg-subtle text-text-primary text-[11px] font-heading font-semibold transition-colors shadow-2xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCategory(category);
                            setDeleteError(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-status-danger-border bg-white hover:bg-status-danger-bg text-status-danger-text text-[11px] font-heading font-semibold transition-colors shadow-2xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================== CREATE CATEGORY MODAL ===================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-default space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <h3 className="font-heading font-bold text-lg text-text-primary">Add New Category</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-status-danger-bg text-status-danger-text text-xs rounded-xl border border-status-danger-border">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-heading font-bold text-text-primary mb-1">
                  Category Name <span className="text-status-danger-text">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coloring Books, Guided Journals"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border-default focus:border-brand-rose focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-heading font-bold text-text-primary">
                    URL Slug
                  </label>
                  <label className="text-[11px] text-text-secondary flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSlug}
                      onChange={(e) => {
                        setAutoSlug(e.target.checked);
                        if (e.target.checked) setFormSlug(slugify(formName));
                      }}
                      className="rounded text-brand-rose focus:ring-brand-rose"
                    />
                    <span>Auto-sync with name</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="e.g. coloring-books"
                  value={formSlug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setFormSlug(e.target.value);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-border-default focus:border-brand-rose focus:outline-none bg-bg-subtle/30"
                />
                <p className="text-[10px] text-text-secondary mt-1">
                  Storefront URL: <code className="text-brand-rose">/products?category={formSlug || '...'}</code>
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-heading font-bold text-text-primary mb-1">
                  Description <span className="text-text-secondary font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe this category collection (shown on storefront cards and SEO)..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border-default focus:border-brand-rose focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-heading font-semibold rounded-xl border border-border-default text-text-secondary hover:bg-bg-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-rose text-xs font-heading font-semibold px-5 py-2 rounded-xl flex items-center gap-1.5"
                >
                  {formSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT CATEGORY MODAL ===================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-default space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <h3 className="font-heading font-bold text-lg text-text-primary">Edit Category</h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-status-danger-bg text-status-danger-text text-xs rounded-xl border border-status-danger-border">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-heading font-bold text-text-primary mb-1">
                  Category Name <span className="text-status-danger-text">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border-default focus:border-brand-rose focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-heading font-bold text-text-primary">
                    URL Slug
                  </label>
                  <label className="text-[11px] text-text-secondary flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSlug}
                      onChange={(e) => {
                        setAutoSlug(e.target.checked);
                        if (e.target.checked) setFormSlug(slugify(formName));
                      }}
                      className="rounded text-brand-rose focus:ring-brand-rose"
                    />
                    <span>Auto-sync with name</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setFormSlug(e.target.value);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-border-default focus:border-brand-rose focus:outline-none bg-bg-subtle/30"
                />
                <p className="text-[10px] text-text-secondary mt-1">
                  Storefront URL: <code className="text-brand-rose">/products?category={formSlug}</code>
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-heading font-bold text-text-primary mb-1">
                  Description <span className="text-text-secondary font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe this category collection..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border-default focus:border-brand-rose focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-heading font-semibold rounded-xl border border-border-default text-text-secondary hover:bg-bg-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-rose text-xs font-heading font-semibold px-5 py-2 rounded-xl flex items-center gap-1.5"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-default space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-status-danger-bg text-status-danger-text flex items-center justify-center text-lg shrink-0">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-lg text-text-primary">
                  Delete Category &ldquo;{deletingCategory.name}&rdquo;?
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Are you sure you want to delete this category? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Impact Warning Box */}
            <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-default space-y-2 text-xs">
              <div className="flex items-center justify-between font-medium text-text-primary">
                <span>Associated Products:</span>
                <span className="font-bold font-heading text-brand-blue">
                  {deletingCategory.product_count || 0}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Deleting this category will <strong className="text-text-primary">detach</strong> it from any assigned products.
                The products themselves will <strong className="text-text-primary">not</strong> be deleted.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-status-danger-bg text-status-danger-text text-xs rounded-xl border border-status-danger-border">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-xs font-heading font-semibold rounded-xl border border-border-default text-text-secondary hover:bg-bg-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-xs font-heading font-semibold rounded-xl bg-status-danger-bg text-status-danger-text border border-status-danger-border hover:bg-status-danger-text hover:text-white transition-colors"
              >
                {deleteSubmitting ? 'Deleting...' : 'Yes, Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-text-secondary text-xs">
          Loading categories...
        </div>
      }
    >
      <CategoriesManagementContent />
    </Suspense>
  );
}
