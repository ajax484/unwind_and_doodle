'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminDeliveryRateTemplateItem } from '@/types/admin-inventory';

interface DeliveryRateTemplatesManagerProps {
  onTemplatesChange?: () => void;
}

export default function DeliveryRateTemplatesManager({
  onTemplatesChange,
}: DeliveryRateTemplatesManagerProps) {
  const [templates, setTemplates] = useState<AdminDeliveryRateTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminDeliveryRateTemplateItem | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<AdminDeliveryRateTemplateItem | null>(null);

  // Form State (for both create and edit)
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/settings/delivery-rate-templates');
      const json = await res.json();
      if (res.ok && json.success) {
        setTemplates(json.data || []);
      } else {
        throw new Error(json.error || 'Failed to load rate templates');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && t.isActive) ||
        (statusFilter === 'inactive' && !t.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [templates, searchQuery, statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormName('');
    setFormAmount('');
    setFormDescription('');
    setFormActive(true);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (template: AdminDeliveryRateTemplateItem) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormAmount(template.amount);
    setFormDescription(template.description || '');
    setFormActive(template.isActive);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formAmount === '' || Number(formAmount) < 0) {
      alert('Please provide a valid template name and positive amount');
      return;
    }

    try {
      setSubmittingForm(true);
      const res = await fetch('/api/admin/settings/delivery-rate-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          amount: Number(formAmount),
          description: formDescription.trim() || null,
          currency: 'NGN',
          is_active: formActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowCreateModal(false);
        await fetchTemplates();
        onTemplatesChange?.();
        showNotification(`Created rate template "${json.data.name}"`);
      } else {
        throw new Error(json.error || 'Failed to create template');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating template');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !formName.trim() || formAmount === '' || Number(formAmount) < 0) {
      alert('Please provide a valid template name and positive amount');
      return;
    }

    try {
      setSubmittingForm(true);
      const res = await fetch(`/api/admin/settings/delivery-rate-templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          amount: Number(formAmount),
          description: formDescription.trim() || null,
          is_active: formActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setEditingTemplate(null);
        await fetchTemplates();
        onTemplatesChange?.();
        showNotification(`Updated rate template "${json.data.name}"`);
      } else {
        throw new Error(json.error || 'Failed to update template');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating template');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (template: AdminDeliveryRateTemplateItem) => {
    const nextActive = !template.isActive;
    try {
      const res = await fetch(`/api/admin/settings/delivery-rate-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, isActive: nextActive } : t))
        );
        onTemplatesChange?.();
        showNotification(`Template "${template.name}" is now ${nextActive ? 'active' : 'inactive'}`);
      } else {
        throw new Error(json.error || 'Failed to toggle status');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error toggling template status');
    }
  };

  // Delete Template
  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;
    try {
      setDeletingLoading(true);
      const res = await fetch(`/api/admin/settings/delivery-rate-templates/${deletingTemplate.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
        setDeletingTemplate(null);
        onTemplatesChange?.();
        showNotification(`Deleted template "${deletingTemplate.name}". Existing delivery rates preserved.`);
      } else {
        throw new Error(json.error || 'Failed to delete template');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting template');
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-lg text-slate-900 tracking-tight">
              Delivery Rate Templates
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              {templates.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Reusable delivery fees for quickly configuring locations across fulfillment hubs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer"
        >
          <span>+</span> New rate template
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchTemplates} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 sm:max-w-xs">
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-400 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Templates Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white rounded-3xl border border-slate-200/80 p-4" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-2xl mx-auto">
            🏷️
          </div>
          <h4 className="font-heading font-bold text-sm text-slate-800">
            {searchQuery ? 'No rate templates match your search' : 'No rate templates yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try clearing the search query to see all templates.'
              : 'Save commonly used delivery fees so you can configure multiple locations faster.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-2 inline-block px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs cursor-pointer"
            >
              + Create rate template
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-100">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3">Template Name</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏷️</span>
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-heading font-bold text-slate-900 text-sm">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                      {t.description || <span className="text-slate-300 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(t)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          t.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        {t.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTemplate(t)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
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

          {/* Mobile Cards View */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filteredTemplates.map((t) => (
              <div key={t.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">🏷️</span>
                      <h4 className="font-heading font-bold text-sm text-slate-900">{t.name}</h4>
                    </div>
                    {t.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(t)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                      t.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {t.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-heading font-bold text-slate-900 text-sm">
                    {formatCurrency(t.amount)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTemplate(t)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingTemplate) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={editingTemplate ? handleEditSubmit : handleCreateSubmit}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-900">
                {editingTemplate ? 'Edit Rate Template' : 'New Rate Template'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Mainland, Island, Outside Lagos"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Delivery Amount (₦) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={formAmount}
                    onChange={(e) =>
                      setFormAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="2000"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 font-bold focus:outline-hidden focus:border-rose-400 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Standard delivery fee for Lagos mainland locations"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-400 bg-white resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
                  />
                  <span className="font-semibold text-slate-700">
                    Active (available for bulk selection)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                }}
                disabled={submittingForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingForm}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submittingForm
                  ? 'Saving...'
                  : editingTemplate
                  ? 'Save Changes'
                  : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  Delete Rate Template?
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove &quot;{deletingTemplate.name}&quot;?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Existing delivery rates are protected:</p>
              <p>
                Deleting this template will <strong>not</strong> delete or modify any existing delivery rates or break checkout pricing calculations.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                disabled={deletingLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-heading shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deletingLoading ? 'Deleting...' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
