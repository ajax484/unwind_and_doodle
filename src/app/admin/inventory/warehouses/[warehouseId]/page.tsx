'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminLocationItem, AdminDeliveryRateItem } from '@/types/admin-inventory';

interface WarehouseDetailState {
  warehouse: {
    id: string;
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    state: string | null;
    lga: string | null;
    active: boolean;
    createdAt: string;
  };
  assignedLocations: AdminLocationItem[];
  deliveryRates: AdminDeliveryRateItem[];
}

export default function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = use(params);

  const [data, setData] = useState<WarehouseDetailState | null>(null);
  const [allLocations, setAllLocations] = useState<AdminLocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [active, setActive] = useState(true);

  // Location Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLocIdsToAssign, setSelectedLocIdsToAssign] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const fetchWarehouse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [whRes, locsRes] = await Promise.all([
        fetch(`/api/admin/inventory/warehouses/${warehouseId}`),
        fetch('/api/admin/inventory/locations'),
      ]);

      const whJson = await whRes.json();
      const locsJson = await locsRes.json();

      if (whRes.ok && whJson.success) {
        const whData: WarehouseDetailState = whJson.data;
        setData(whData);
        setName(whData.warehouse.name);
        setAddressLine1(whData.warehouse.addressLine1 || '');
        setAddressLine2(whData.warehouse.addressLine2 || '');
        setState(whData.warehouse.state || '');
        setLga(whData.warehouse.lga || '');
        setActive(whData.warehouse.active);
      } else {
        throw new Error(whJson.error || 'Failed to fetch warehouse');
      }

      if (locsRes.ok && locsJson.success) {
        setAllLocations(locsJson.data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading warehouse');
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchWarehouse();
  }, [fetchWarehouse]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Warehouse name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/admin/inventory/warehouses/${warehouseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address_line_1: addressLine1.trim() || null,
          address_line_2: addressLine2.trim() || null,
          state: state.trim() || null,
          lga: lga.trim() || null,
          active,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Warehouse information updated successfully!');
        await fetchWarehouse();
      } else {
        throw new Error(json.error || 'Failed to update warehouse');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating warehouse');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignLocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLocIdsToAssign.length === 0) return;

    try {
      setAssigning(true);
      setError(null);

      const res = await fetch(`/api/admin/inventory/warehouses/${warehouseId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationIds: selectedLocIdsToAssign }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowAssignModal(false);
        setSelectedLocIdsToAssign([]);
        await fetchWarehouse();
      } else {
        throw new Error(json.error || 'Failed to assign locations');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error assigning locations');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignLocation = async (locationId: string, locationName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to unassign "${locationName}" from this warehouse?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/admin/inventory/warehouses/${warehouseId}/locations?locationId=${locationId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        await fetchWarehouse();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to unassign location');
      }
    } catch {
      alert('Error unassigning location');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-red-200 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-heading font-bold text-lg text-slate-800">Warehouse Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/admin/inventory/warehouses"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Warehouses
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const assignedLocationIdSet = new Set(data.assignedLocations.map((l) => l.id));
  const unassignedLocations = allLocations.filter((l) => !assignedLocationIdSet.has(l.id));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/inventory/warehouses" className="hover:text-slate-600">
              ← Warehouses
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">{data.warehouse.name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
              {data.warehouse.name}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {active ? 'ACTIVE' : 'DEACTIVATED'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/inventory/warehouses"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            All Warehouses
          </Link>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs cursor-pointer disabled:opacity-50"
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

      {/* 2. Warehouse Info Form */}
      <form
        onSubmit={handleSaveChanges}
        className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
      >
        <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
          Warehouse Details
        </h3>

        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Warehouse Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-rose-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Lagos"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">LGA / District</label>
              <input
                type="text"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                placeholder="e.g. Ikeja"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Street Address Line 1</label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Street Address Line 2</label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block">Active Status</span>
              <span className="text-slate-400 text-[11px]">
                When active, this warehouse can fulfill customer checkout orders in its assigned zones.
              </span>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500"
            />
          </div>
        </div>
      </form>

      {/* 3. Assigned Locations Manager */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Assigned Delivery Locations ({data.assignedLocations.length})
            </h3>
            <p className="text-xs text-slate-500">
              Customer orders placed for these delivery locations will be routed to this warehouse.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
          >
            + Assign Locations
          </button>
        </div>

        {data.assignedLocations.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No delivery locations currently assigned to this warehouse.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.assignedLocations.map((loc) => (
              <div
                key={loc.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800">{loc.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {loc.state} {loc.lga ? `• ${loc.lga}` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUnassignLocation(loc.id, loc.name)}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="Unassign location"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Linked Delivery Rates Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Configured Delivery Rates ({data.deliveryRates.length})
            </h3>
            <p className="text-xs text-slate-500">
              Shipping prices for dispatching orders from this warehouse to assigned customer locations.
            </p>
          </div>
          <Link
            href="/admin/settings/delivery"
            className="text-xs font-semibold text-rose-500 hover:text-rose-600"
          >
            Manage Delivery Rates →
          </Link>
        </div>

        {data.deliveryRates.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No delivery rates configured yet for this warehouse.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Location</th>
                  <th className="py-2.5 px-4 font-semibold">State</th>
                  <th className="py-2.5 px-4 font-semibold">Delivery Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.deliveryRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{rate.locationName}</td>
                    <td className="py-2.5 px-4 text-slate-500">{rate.locationState}</td>
                    <td className="py-2.5 px-4 font-heading font-bold text-slate-900">
                      {formatCurrency(rate.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Locations Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleAssignLocations}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">
                Assign Locations to {data.warehouse.name}
              </h4>
              <p className="text-xs text-slate-500">
                Select delivery locations served by this fulfillment hub.
              </p>
            </div>

            {unassignedLocations.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                All created delivery locations are already assigned to this warehouse.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                {unassignedLocations.map((loc) => {
                  const isChecked = selectedLocIdsToAssign.includes(loc.id);
                  return (
                    <label
                      key={loc.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-rose-50/60 border-rose-200 text-rose-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div>{loc.name}</div>
                        <div className="text-[10px] text-slate-400">{loc.state}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setSelectedLocIdsToAssign((prev) =>
                            prev.includes(loc.id)
                              ? prev.filter((id) => id !== loc.id)
                              : [...prev, loc.id]
                          )
                        }
                        className="w-4 h-4 rounded text-rose-500"
                      />
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                disabled={assigning}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning || selectedLocIdsToAssign.length === 0}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {assigning ? 'Assigning...' : `Assign (${selectedLocIdsToAssign.length})`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
