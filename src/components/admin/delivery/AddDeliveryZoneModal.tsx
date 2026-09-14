'use client';

import React, { useState, useMemo } from 'react';
import {
  AdminLocationItem,
  AdminWarehouseListItem,
  AdminDeliveryZoneItem,
} from '@/types/admin-inventory';

interface AddDeliveryZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: AdminWarehouseListItem[];
  currentWarehouseId: string;
  existingZones: AdminDeliveryZoneItem[];
  allLocations: AdminLocationItem[];
  onSuccess: (zone: AdminDeliveryZoneItem) => void;
}

export default function AddDeliveryZoneModal({
  isOpen,
  onClose,
  warehouses,
  currentWarehouseId,
  existingZones,
  allLocations,
  onSuccess,
}: AddDeliveryZoneModalProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(currentWarehouseId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // New location manual input
  const [isCreatingNewLocation, setIsCreatingNewLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocState, setNewLocState] = useState('Lagos');
  const [newLocLga, setNewLocLga] = useState('');

  // Rate input
  const [price, setPrice] = useState<number | ''>('');
  const [active, setActive] = useState(true);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered existing locations matching search
  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allLocations.slice(0, 8);
    return allLocations
      .filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.state.toLowerCase().includes(q) ||
          (loc.lga && loc.lga.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allLocations, searchQuery]);

  // Check if selected location is already configured for the selected warehouse
  const alreadyConfiguredZone = useMemo(() => {
    if (!selectedLocationId) return null;
    return existingZones.find(
      (z) => z.locationId === selectedLocationId && z.warehouseId === selectedWarehouseId
    );
  }, [selectedLocationId, existingZones, selectedWarehouseId]);

  if (!isOpen) return null;

  const handleSelectExistingLocation = (loc: AdminLocationItem) => {
    setSelectedLocationId(loc.id);
    setSearchQuery(loc.name);
    setIsCreatingNewLocation(false);
    setError(null);

    // If already configured, pre-fill its existing rate
    const existing = existingZones.find(
      (z) => z.locationId === loc.id && z.warehouseId === selectedWarehouseId
    );
    if (existing) {
      setPrice(existing.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      setError('Please select a warehouse');
      return;
    }

    if (price === '' || Number(price) < 0) {
      setError('Please enter a valid delivery fee (₦0 or greater)');
      return;
    }

    if (!selectedLocationId && !isCreatingNewLocation) {
      setError('Please select an existing location or choose "Create new location"');
      return;
    }

    if (isCreatingNewLocation && (!newLocName.trim() || !newLocState.trim())) {
      setError('Location name and state are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        warehouse_id: selectedWarehouseId,
        location_id: isCreatingNewLocation ? undefined : selectedLocationId || undefined,
        name: isCreatingNewLocation ? newLocName.trim() : undefined,
        state: isCreatingNewLocation ? newLocState.trim() : undefined,
        lga: isCreatingNewLocation ? newLocLga.trim() || null : undefined,
        price: Number(price),
        active,
      };

      const res = await fetch('/api/admin/settings/delivery-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onSuccess(json.data);
        onClose();
      } else {
        throw new Error(json.error || 'Failed to create delivery zone');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating delivery zone');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-900">Add Delivery Zone</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect a customer delivery area to your warehouse and configure its shipping fee.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Warehouse Field */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">
              Fulfillment Warehouse <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-hidden focus:border-rose-400"
              required
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.state || 'Hub'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Location Selection / Search */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Delivery Location <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNewLocation(!isCreatingNewLocation);
                  setSelectedLocationId(null);
                  setError(null);
                }}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 underline"
              >
                {isCreatingNewLocation ? '← Choose existing location' : '+ Create new location'}
              </button>
            </div>

            {!isCreatingNewLocation ? (
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedLocationId(null);
                    }}
                    placeholder="Search an area, city, or LGA (e.g. Lekki, Ikeja, Wuse)..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-400"
                  />
                </div>

                {/* Suggestions List */}
                {!selectedLocationId && filteredLocations.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/60 p-1">
                    {filteredLocations.map((loc) => {
                      const isAlreadyAssigned = existingZones.some(
                        (z) => z.locationId === loc.id && z.warehouseId === selectedWarehouseId
                      );

                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelectExistingLocation(loc)}
                          className="w-full p-2 text-left rounded-xl hover:bg-white flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{loc.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {loc.state} {loc.lga ? `• ${loc.lga}` : ''}
                            </div>
                          </div>
                          {isAlreadyAssigned ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              Configured
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Available
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Conflict Notice if location already configured */}
                {alreadyConfiguredZone && (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>ℹ️</span> Already Configured
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      <strong>{alreadyConfiguredZone.locationName}</strong> is already served by this warehouse at{' '}
                      <strong>₦{alreadyConfiguredZone.price.toLocaleString()}</strong>.
                      Submitting will update its shipping fee instead of creating a duplicate.
                    </p>
                  </div>
                )}

                {/* Selected Location Pill */}
                {selectedLocationId && !alreadyConfiguredZone && (
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="font-bold text-rose-900">{searchQuery}</span>
                      <span className="text-[10px] text-rose-600 font-medium">Selected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocationId(null);
                        setSearchQuery('');
                      }}
                      className="text-rose-500 hover:text-rose-700 font-bold"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Create New Location Inline Form */
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    placeholder="e.g. Lekki Phase 1, Victoria Island, Wuse II"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLocState}
                      onChange={(e) => setNewLocState(e.target.value)}
                      placeholder="e.g. Lagos, Abuja"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">LGA / District (Optional)</label>
                    <input
                      type="text"
                      value={newLocLga}
                      onChange={(e) => setNewLocLga(e.target.value)}
                      placeholder="e.g. Eti-Osa, Ikeja"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Delivery Fee Input */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="font-semibold text-slate-700 block">
              Delivery Fee (NGN) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 font-bold text-slate-400 text-sm">₦</span>
              <input
                type="number"
                min="0"
                step="50"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2500"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-bold focus:outline-hidden focus:border-rose-400"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Fee charged to customers in this zone when dispatched from this warehouse. Enter 0 for free delivery.
            </p>
          </div>

          {/* 4. Active Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <div className="font-semibold text-slate-800">Zone Active Status</div>
              <div className="text-[10px] text-slate-400">Available during customer checkout</div>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 cursor-pointer"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || price === ''}
              className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold font-heading shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : alreadyConfiguredZone ? (
                'Update Delivery Fee'
              ) : (
                'Create Delivery Zone'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
