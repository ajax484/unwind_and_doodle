'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLocationItem } from '@/types/admin-inventory';

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<AdminLocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Location Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
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
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Customer Delivery Locations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Geographical delivery zones, cities, and LGAs supported for customer storefront orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory/warehouses"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            Warehouses
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

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchLocations} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 2. Locations Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              📍
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              No delivery locations created yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your delivery cities, states, and LGAs to allow warehouse assignments and shipping rates.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-heading shadow-xs cursor-pointer"
            >
              + Add First Location
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Location Name</th>
                  <th className="py-3.5 px-4 font-semibold">State</th>
                  <th className="py-3.5 px-4 font-semibold">LGA / District</th>
                  <th className="py-3.5 px-4 font-semibold">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{loc.name}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{loc.state}</td>
                    <td className="py-3.5 px-4 text-slate-500">{loc.lga || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(loc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">LGA (Optional)</label>
                  <input
                    type="text"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Eti-Osa"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={creating}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {creating ? 'Creating...' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
