'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AdminDeliveryRateItem,
  AdminWarehouseListItem,
  AdminLocationItem,
} from '@/types/admin-inventory';

export default function DeliveryRatesSettingsPage() {
  const [rates, setRates] = useState<AdminDeliveryRateItem[]>([]);
  const [warehouses, setWarehouses] = useState<AdminWarehouseListItem[]>([]);
  const [locations, setLocations] = useState<AdminLocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set / Edit Rate Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ratesRes, whRes, locsRes] = await Promise.all([
        fetch('/api/admin/settings/delivery-rates'),
        fetch('/api/admin/inventory/warehouses'),
        fetch('/api/admin/inventory/locations'),
      ]);

      const ratesJson = await ratesRes.json();
      const whJson = await whRes.json();
      const locsJson = await locsRes.json();

      if (ratesRes.ok && ratesJson.success) setRates(ratesJson.data || []);
      if (whRes.ok && whJson.success) {
        const whs: AdminWarehouseListItem[] = whJson.data || [];
        setWarehouses(whs);
        if (whs.length > 0 && !selectedWarehouseId) setSelectedWarehouseId(whs[0].id);
      }
      if (locsRes.ok && locsJson.success) {
        const locs: AdminLocationItem[] = locsJson.data || [];
        setLocations(locs);
        if (locs.length > 0 && !selectedLocationId) setSelectedLocationId(locs[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading delivery settings');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouseId, selectedLocationId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleOpenSetRate = (rate?: AdminDeliveryRateItem) => {
    if (rate) {
      setSelectedWarehouseId(rate.warehouseId);
      setSelectedLocationId(rate.locationId);
      setPrice(rate.price);
    } else {
      if (warehouses.length > 0) setSelectedWarehouseId(warehouses[0].id);
      if (locations.length > 0) setSelectedLocationId(locations[0].id);
      setPrice('');
    }
    setSaveError(null);
    setShowModal(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId || !selectedLocationId || price === '' || Number(price) < 0) {
      setSaveError('Please select a warehouse, location, and valid delivery price (₦0 or more)');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const res = await fetch('/api/admin/settings/delivery-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: selectedWarehouseId,
          location_id: selectedLocationId,
          price: Number(price),
          active: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowModal(false);
        await fetchAll();
      } else {
        throw new Error(json.error || 'Failed to save delivery rate');
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error saving delivery rate');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
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
            <span className="text-slate-700 font-bold">Delivery Rates</span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Delivery Rates Matrix
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure shipping fees applied during checkout when dispatching from warehouses to customer locations.
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
            onClick={() => handleOpenSetRate()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer"
          >
            <span>+</span> Set Delivery Rate
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchAll} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 2. Rates Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : rates.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              🚚
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              No delivery rates configured
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Set up delivery prices between your fulfillment warehouses and serving customer locations.
            </p>
            <button
              type="button"
              onClick={() => handleOpenSetRate()}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-heading shadow-xs cursor-pointer"
            >
              + Set First Delivery Rate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Origin Warehouse</th>
                  <th className="py-3.5 px-4 font-semibold">Delivery Location</th>
                  <th className="py-3.5 px-4 font-semibold">State</th>
                  <th className="py-3.5 px-4 font-semibold">Shipping Price</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {rate.warehouseName}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {rate.locationName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">{rate.locationState}</td>

                    <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                      {formatCurrency(rate.price)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenSetRate(rate)}
                        className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer shadow-2xs"
                      >
                        Edit Rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Set Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveRate}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">
                Configure Delivery Rate
              </h4>
              <p className="text-xs text-slate-500">
                Set the shipping fee from a specific warehouse to a customer delivery zone.
              </p>
            </div>

            {saveError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {saveError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Origin Warehouse</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.state ? `(${w.state})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Destination Location</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Shipping Price (NGN)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-semibold text-slate-400">₦</span>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="2500"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || price === ''}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {saving ? 'Saving...' : 'Save Rate'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
