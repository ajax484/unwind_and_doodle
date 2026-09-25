'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AdminLocationItem } from '@/types/admin-inventory';
import ComboBox from '@/components/ComboBox';
import { NIGERIAN_STATE_OPTIONS } from '@/lib/constants';

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<AdminLocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');

  // Add Location Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Location Modal State
  const [editingLocation, setEditingLocation] = useState<AdminLocationItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editState, setEditState] = useState('Lagos');
  const [editLga, setEditLga] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Location Confirmation Modal State
  const [deletingLocation, setDeletingLocation] = useState<AdminLocationItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/inventory/locations');
      const json = await res.json();

      if (res.ok && json.success) {
        setLocations(json.data || []);
      } else {
        throw new Error(json.error || 'Failed to fetch locations');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Unique list of states present in data for filtering
  const availableStateFilters = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((l) => {
      if (l.state) set.add(l.state);
    });
    return Array.from(set).sort();
  }, [locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        loc.name.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q) ||
        (loc.lga && loc.lga.toLowerCase().includes(q));

      const matchesState =
        selectedStateFilter === 'all' ||
        loc.state.toLowerCase() === selectedStateFilter.toLowerCase();

      return matchesSearch && matchesState;
    });
  }, [locations, searchQuery, selectedStateFilter]);

  // Handle Create Location
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !state.trim()) {
      setCreateError('Location name and state are required');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch('/api/admin/inventory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          state: state.trim(),
          lga: lga.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowAddModal(false);
        setName('');
        setLga('');
        showNotification(`Location "${json.data.name}" added successfully`);
        await fetchLocations();
      } else {
        throw new Error(json.error || 'Failed to create location');
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error creating location');
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (loc: AdminLocationItem) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditState(loc.state || 'Lagos');
    setEditLga(loc.lga || '');
    setEditError(null);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;

    if (!editName.trim() || !editState.trim()) {
      setEditError('Location name and state are required');
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);

      const res = await fetch(`/api/admin/inventory/locations/${editingLocation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          state: editState.trim(),
          lga: editLga.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setLocations((prev) =>
          prev.map((l) => (l.id === editingLocation.id ? json.data : l))
        );
        setEditingLocation(null);
        showNotification(`Location "${json.data.name}" updated successfully`);
      } else {
        throw new Error(json.error || 'Failed to update location');
      }
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error updating location');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (loc: AdminLocationItem) => {
    setDeletingLocation(loc);
    setDeleteError(null);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingLocation) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetch(`/api/admin/inventory/locations/${deletingLocation.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const deletedName = deletingLocation.name;
        setLocations((prev) => prev.filter((l) => l.id !== deletingLocation.id));
        setDeletingLocation(null);
        showNotification(`Location "${deletedName}" deleted successfully`);
      } else {
        throw new Error(json.error || 'Failed to delete location');
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting location');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/inventory" className="hover:text-slate-600">
              ← Inventory
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Delivery Locations</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Customer Delivery Locations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Geographical delivery zones, cities, and LGAs supported for customer storefront orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/settings/delivery"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>🚚</span>
            <span>Delivery Management Hub</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer"
          >
            <span>+</span> Add Location
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchLocations} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, state, or LGA..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-400"
            />
          </div>

          {/* State Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-hidden focus:border-rose-400 cursor-pointer"
            >
              <option value="all">All States ({locations.length})</option>
              {availableStateFilters.map((st) => (
                <option key={st} value={st}>
                  {st} ({locations.filter((l) => l.state === st).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 shrink-0 font-medium">
          Showing {filteredLocations.length} of {locations.length} locations
        </div>
      </div>

      {/* 3. Locations Table / Mobile Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              📍
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              {searchQuery || selectedStateFilter !== 'all'
                ? 'No locations match your filter'
                : 'No delivery locations created yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedStateFilter !== 'all'
                ? 'Try resetting the search query or clearing the state filter.'
                : 'Add your delivery cities, states, and LGAs to allow warehouse assignments and shipping rates.'}
            </p>
            {searchQuery || selectedStateFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStateFilter('all');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs cursor-pointer"
              >
                + Add First Location
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5 font-semibold">Location Name</th>
                    <th className="py-3.5 px-4 font-semibold">State</th>
                    <th className="py-3.5 px-4 font-semibold">LGA / District</th>
                    <th className="py-3.5 px-4 font-semibold">Created Date</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">📍</span>
                          <span>{loc.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                          {loc.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{loc.lga || '—'}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(loc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(loc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Location"
                          >
                            <span className="text-sm">✎</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(loc)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Location"
                          >
                            <span className="text-sm">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredLocations.map((loc) => (
                <div key={loc.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>📍</span>
                        <span>{loc.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {loc.state} {loc.lga ? `• ${loc.lga}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(loc.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(loc)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                    >
                      <span>✎</span> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(loc)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center gap-1"
                    >
                      <span>🗑️</span> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 4. Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateLocation}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">Add Delivery Location</h4>
              <p className="text-xs text-slate-500">
                Register a new city, region, or state zone for order deliveries.
              </p>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {createError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Location / Zone Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lagos Island / Victoria Island"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-400"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <ComboBox
                    label={<span className="font-semibold text-slate-700 block">State <span className="text-rose-500">*</span></span>}
                    value={state}
                    onChange={(val) => setState(typeof val === 'string' ? val : 'Lagos')}
                    options={NIGERIAN_STATE_OPTIONS}
                    allowCustom={true}
                    size="sm"
                    placeholder="Select state..."
                    searchPlaceholder="Search or type state (e.g. Lagos, Abuja, Interstate)..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">LGA (Optional)</label>
                  <input
                    type="text"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Eti-Osa"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={creating}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                {creating ? 'Creating...' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Edit Location Modal */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">Edit Delivery Location</h4>
              <p className="text-xs text-slate-500">
                Update geographic details for this delivery destination.
              </p>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {editError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Location / Zone Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Lagos Island / Victoria Island"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-400"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <ComboBox
                    label={<span className="font-semibold text-slate-700 block">State <span className="text-rose-500">*</span></span>}
                    value={editState}
                    onChange={(val) => setEditState(typeof val === 'string' ? val : 'Lagos')}
                    options={NIGERIAN_STATE_OPTIONS}
                    allowCustom={true}
                    size="sm"
                    placeholder="Select state..."
                    searchPlaceholder="Search or type state (e.g. Lagos, Abuja, Interstate)..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">LGA (Optional)</label>
                  <input
                    type="text"
                    value={editLga}
                    onChange={(e) => setEditLga(e.target.value)}
                    placeholder="e.g. Eti-Osa"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingLocation(null)}
                disabled={savingEdit}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit || !editName.trim()}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Delete Location Confirmation Modal */}
      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-red-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
              🗑️
            </div>

            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">
                Delete &quot;{deletingLocation.name}&quot;?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this delivery location?
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Warning</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Deleting this location will also remove any configured warehouse delivery rates and assignments linked to it. Existing completed orders will preserve historical shipping addresses.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingLocation(null)}
                disabled={deleting}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-heading disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
