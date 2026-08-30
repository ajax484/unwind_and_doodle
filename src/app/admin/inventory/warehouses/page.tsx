'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminWarehouseListItem } from '@/types/admin-inventory';

export default function WarehousesListPage() {
  const [warehouses, setWarehouses] = useState<AdminWarehouseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Warehouse Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/inventory/warehouses');
      const json = await res.json();

      if (res.ok && json.success) {
        setWarehouses(json.data || []);
      } else {
        throw new Error(json.error || 'Failed to fetch warehouses');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading warehouses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setCreateError('Warehouse name is required');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch('/api/admin/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address_line_1: addressLine1.trim() || null,
          address_line_2: addressLine2.trim() || null,
          state: state.trim() || null,
          lga: lga.trim() || null,
          active: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowAddModal(false);
        setName('');
        setAddressLine1('');
        setAddressLine2('');
        setLga('');
        await fetchWarehouses();
      } else {
        throw new Error(json.error || 'Failed to create warehouse');
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error creating warehouse');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (warehouse: AdminWarehouseListItem) => {
    const nextActive = !warehouse.active;
    if (!nextActive) {
      const confirmed = window.confirm(
        `Are you sure you want to deactivate "${warehouse.name}"? It will no longer fulfill checkout orders.`
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/admin/inventory/warehouses/${warehouse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });

      if (res.ok) {
        await fetchWarehouses();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to update warehouse status');
      }
    } catch {
      alert('Error updating warehouse status');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/inventory" className="hover:text-slate-600">
              ← Inventory
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Warehouses</span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Fulfillment Warehouses
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage regional dispatch centers, assigned delivery locations, and shipping rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings/delivery"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            Delivery Rates Matrix
          </Link>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer"
          >
            <span>+</span> Add Warehouse
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchWarehouses} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 2. Warehouses Grid & Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              🏬
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              No warehouses created yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your primary distribution hub to start tracking localized stock and delivery zones.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-heading shadow-xs"
            >
              + Add First Warehouse
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/admin/inventory/warehouses/${wh.id}`}
                      className="font-heading font-bold text-base text-slate-900 hover:text-rose-500 transition-colors"
                    >
                      {wh.name}
                    </Link>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        wh.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {wh.active ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {wh.addressLine1 ? `${wh.addressLine1}, ` : ''}
                    {wh.lga ? `${wh.lga}, ` : ''}
                    {wh.state || 'Nigeria'}
                  </p>

                  <div className="text-[11px] text-slate-400">
                    Serves <strong className="text-slate-700">{wh.assignedLocationsCount}</strong> assigned delivery location(s)
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(wh)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      wh.active
                        ? 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {wh.active ? 'Deactivate' : 'Activate'}
                  </button>

                  <Link
                    href={`/admin/inventory/warehouses/${wh.id}`}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs"
                  >
                    Manage Locations →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateWarehouse}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">Add New Warehouse</h4>
              <p className="text-xs text-slate-500">
                Register a new fulfillment center or regional inventory holding hub.
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
                  Warehouse Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lagos Mainland Central Hub"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">LGA / District</label>
                  <input
                    type="text"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Ikeja"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Street Address Line 1</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 14 Commercial Avenue"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Suite 2B, Industrial Estate"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
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
                {creating ? 'Creating...' : 'Create Warehouse'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
