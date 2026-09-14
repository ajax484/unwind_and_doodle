'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  AdminWarehouseListItem,
  AdminLocationItem,
  AdminDeliveryZoneItem,
  AdminDeliveryRateTemplateItem,
  AdminEnrichedLocationItem,
  BulkDeliveryZoneResult,
} from '@/types/admin-inventory';
import DeliveryZoneMap from '@/components/admin/delivery/DeliveryZoneMap';
import AddDeliveryZoneModal from '@/components/admin/delivery/AddDeliveryZoneModal';
import BulkDeliveryZonesModal from '@/components/admin/delivery/BulkDeliveryZonesModal';
import DeliveryRateTemplatesManager from '@/components/admin/delivery/DeliveryRateTemplatesManager';

export default function DeliveryManagementPage() {
  const [warehouses, setWarehouses] = useState<AdminWarehouseListItem[]>([]);
  const [allLocations, setAllLocations] = useState<AdminEnrichedLocationItem[]>([]);
  const [templates, setTemplates] = useState<AdminDeliveryRateTemplateItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'zones' | 'templates'>('zones');

  const [zones, setZones] = useState<AdminDeliveryZoneItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<AdminLocationItem[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [mobileView, setMobileView] = useState<'table' | 'map'>('table');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Inline Price Editing State
  const [inlineEditingZoneId, setInlineEditingZoneId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<number | ''>('');
  const [savingInline, setSavingInline] = useState(false);

  // Edit Modal State
  const [editingZone, setEditingZone] = useState<AdminDeliveryZoneItem | null>(null);
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [deletingZone, setDeletingZone] = useState<AdminDeliveryZoneItem | null>(null);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);

  // Fetch Rate Templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings/delivery-rate-templates');
      const json = await res.json();
      if (res.ok && json.success) {
        setTemplates(json.data || []);
      }
    } catch {
      // Non-blocking template prefetch error
    }
  }, []);

  // 1. Fetch Warehouses and All Locations
  const fetchInitialData = useCallback(async () => {
    try {
      setLoadingWarehouses(true);
      setError(null);

      const [whRes, locsRes, tmplRes] = await Promise.all([
        fetch('/api/admin/inventory/warehouses'),
        fetch(`/api/admin/inventory/locations?enriched=true${selectedWarehouseId ? `&warehouseId=${selectedWarehouseId}` : ''}`),
        fetch('/api/admin/settings/delivery-rate-templates'),
      ]);

      const whJson = await whRes.json();
      const locsJson = await locsRes.json();
      const tmplJson = await tmplRes.json();

      if (whRes.ok && whJson.success) {
        const whs: AdminWarehouseListItem[] = whJson.data || [];
        setWarehouses(whs);
        if (whs.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(whs[0].id);
        }
      } else {
        throw new Error(whJson.error || 'Failed to fetch warehouses');
      }

      if (locsRes.ok && locsJson.success) {
        setAllLocations(locsJson.data || []);
      }

      if (tmplRes.ok && tmplJson.success) {
        setTemplates(tmplJson.data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading delivery settings');
    } finally {
      setLoadingWarehouses(false);
    }
  }, [selectedWarehouseId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Fetch Delivery Zones for Selected Warehouse
  const fetchWarehouseZones = useCallback(async (whId: string) => {
    if (!whId) return;
    try {
      setLoadingZones(true);
      setError(null);

      const [zonesRes, locsRes] = await Promise.all([
        fetch(`/api/admin/settings/delivery-zones?warehouseId=${whId}`),
        fetch(`/api/admin/inventory/locations?enriched=true&warehouseId=${whId}`),
      ]);
      const json = await zonesRes.json();
      const locsJson = await locsRes.json();

      if (zonesRes.ok && json.success) {
        setZones(json.data?.zones || []);
        setAvailableLocations(json.data?.availableLocations || []);
      } else {
        throw new Error(json.error || 'Failed to fetch delivery zones');
      }

      if (locsRes.ok && locsJson.success) {
        setAllLocations(locsJson.data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading delivery zones');
    } finally {
      setLoadingZones(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchWarehouseZones(selectedWarehouseId);
    }
  }, [selectedWarehouseId, fetchWarehouseZones]);

  // Active warehouse object
  const activeWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId) || null;
  }, [warehouses, selectedWarehouseId]);

  // Filtered delivery zones
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        z.locationName.toLowerCase().includes(q) ||
        z.locationState.toLowerCase().includes(q) ||
        (z.locationLga && z.locationLga.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && z.active) ||
        (statusFilter === 'inactive' && !z.active);

      return matchesSearch && matchesStatus;
    });
  }, [zones, searchQuery, statusFilter]);

  // Summary statistics for active warehouse
  const stats = useMemo(() => {
    if (zones.length === 0) {
      return { count: 0, minPrice: 0, maxPrice: 0, activeCount: 0 };
    }
    const prices = zones.map((z) => z.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const activeCount = zones.filter((z) => z.active).length;
    return {
      count: zones.length,
      minPrice,
      maxPrice,
      activeCount,
    };
  }, [zones]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Inline Price Edit Handlers
  const handleStartInlineEdit = (zone: AdminDeliveryZoneItem) => {
    setInlineEditingZoneId(zone.id);
    setInlinePrice(zone.price);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingZoneId(null);
    setInlinePrice('');
  };

  const handleSaveInlinePrice = async (zone: AdminDeliveryZoneItem) => {
    if (inlinePrice === '' || Number(inlinePrice) < 0) {
      alert('Please enter a valid price (₦0 or greater)');
      return;
    }

    try {
      setSavingInline(true);
      const res = await fetch('/api/admin/settings/delivery-zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: zone.warehouseId,
          location_id: zone.locationId,
          price: Number(inlinePrice),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setZones((prev) =>
          prev.map((z) =>
            z.id === zone.id ? { ...z, price: Number(inlinePrice) } : z
          )
        );
        setInlineEditingZoneId(null);
        showSuccessNotification(`Updated fee for ${zone.locationName} to ${formatCurrency(Number(inlinePrice))}`);
      } else {
        throw new Error(json.error || 'Failed to update rate');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating rate');
    } finally {
      setSavingInline(false);
    }
  };

  // Toggle Active Status
  const handleToggleZoneActive = async (zone: AdminDeliveryZoneItem) => {
    const nextActive = !zone.active;
    try {
      const res = await fetch('/api/admin/settings/delivery-zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: zone.warehouseId,
          location_id: zone.locationId,
          active: nextActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setZones((prev) =>
          prev.map((z) => (z.id === zone.id ? { ...z, active: nextActive } : z))
        );
        showSuccessNotification(
          `${zone.locationName} is now ${nextActive ? 'active' : 'inactive'}`
        );
      } else {
        throw new Error(json.error || 'Failed to update status');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (zone: AdminDeliveryZoneItem) => {
    setEditingZone(zone);
    setEditPrice(zone.price);
    setEditActive(zone.active);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone || editPrice === '' || Number(editPrice) < 0) return;

    try {
      setSavingEdit(true);
      const res = await fetch('/api/admin/settings/delivery-zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: editingZone.warehouseId,
          location_id: editingZone.locationId,
          price: Number(editPrice),
          active: editActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setZones((prev) =>
          prev.map((z) =>
            z.id === editingZone.id
              ? { ...z, price: Number(editPrice), active: editActive }
              : z
          )
        );
        setEditingZone(null);
        showSuccessNotification(`Updated delivery zone: ${editingZone.locationName}`);
      } else {
        throw new Error(json.error || 'Failed to update delivery zone');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating delivery zone');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Zone Handler
  const handleConfirmDeleteZone = async () => {
    if (!deletingZone) return;

    try {
      setConfirmDeleteLoading(true);
      const res = await fetch(
        `/api/admin/settings/delivery-zones?warehouseId=${deletingZone.warehouseId}&locationId=${deletingZone.locationId}`,
        { method: 'DELETE' }
      );

      const json = await res.json();
      if (res.ok && json.success) {
        setZones((prev) => prev.filter((z) => z.id !== deletingZone.id));
        setAvailableLocations((prev) => [
          ...prev,
          {
            id: deletingZone.locationId,
            name: deletingZone.locationName,
            state: deletingZone.locationState,
            lga: deletingZone.locationLga,
            createdAt: deletingZone.createdAt,
          },
        ]);
        showSuccessNotification(
          `Removed "${deletingZone.locationName}" from ${deletingZone.warehouseName}. Underlying location preserved.`
        );
        setDeletingZone(null);
      } else {
        throw new Error(json.error || 'Failed to delete delivery zone');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting delivery zone');
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  const showSuccessNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/inventory" className="hover:text-slate-600">
              ← Inventory
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Delivery Management</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Delivery Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage fulfillment hubs, delivery zones, and shipping rates in one unified flow.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/settings/locations"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            All Locations
          </Link>
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            disabled={!activeWarehouse || allLocations.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-40 cursor-pointer"
          >
            + Add multiple
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={!activeWarehouse}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer disabled:opacity-40"
          >
            <span>+</span> Add Delivery Zone
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
            className="text-emerald-600 hover:text-emerald-800 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={fetchInitialData}
            className="underline font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('zones')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-heading transition-all cursor-pointer ${
            activeTab === 'zones'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Delivery Zones
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-heading transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Rate Templates {templates.length > 0 && `(${templates.length})`}
        </button>
      </div>

      {activeTab === 'templates' ? (
        <DeliveryRateTemplatesManager onTemplatesChange={fetchTemplates} />
      ) : (
        <>
          {/* 2. Warehouses Selector Grid / Carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">
                Warehouses ({warehouses.length})
              </h2>
          <Link
            href="/admin/inventory/warehouses"
            className="text-[11px] font-bold text-rose-500 hover:text-rose-600"
          >
            Configure Hubs →
          </Link>
        </div>

        {loadingWarehouses ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white rounded-3xl border border-slate-200/80 animate-pulse p-4" />
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
            <div className="text-3xl">🏬</div>
            <h3 className="font-heading font-bold text-sm text-slate-800">
              No warehouses configured yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You need at least one active warehouse to configure delivery zones and fulfill customer orders.
            </p>
            <Link
              href="/admin/inventory/warehouses"
              className="inline-block px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-heading shadow-xs"
            >
              + Create First Warehouse
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {warehouses.map((wh) => {
              const isSelected = wh.id === selectedWarehouseId;
              return (
                <button
                  key={wh.id}
                  type="button"
                  onClick={() => {
                    setSelectedWarehouseId(wh.id);
                    setSelectedZoneId(null);
                  }}
                  className={`p-4 rounded-3xl text-left border transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-200/60 shadow-md'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🏬</span>
                        <h4 className="font-heading font-bold text-sm text-slate-900">
                          {wh.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {wh.state || 'National Hub'} {wh.lga ? `• ${wh.lga}` : ''}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        wh.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {wh.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {isSelected && stats ? `${stats.count} zones configured` : 'Select warehouse'}
                    </span>
                    {isSelected && stats && stats.count > 0 ? (
                      <span className="font-heading font-bold text-slate-800">
                        {formatCurrency(stats.minPrice)} – {formatCurrency(stats.maxPrice)}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-semibold text-[11px]">
                        {isSelected ? 'Active Context ✓' : 'Manage delivery →'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Dedicated Warehouse Delivery Management View */}
      {activeWarehouse && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-6">
          {/* View Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-slate-900 tracking-tight">
                  {activeWarehouse.name} Delivery Zones
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                  {zones.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Customer checkout orders for these locations will be routed to this warehouse.
              </p>
            </div>

            {/* Mobile View Toggle */}
            <div className="flex sm:hidden items-center p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setMobileView('table')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  mobileView === 'table' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => setMobileView('map')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  mobileView === 'map' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Map View
              </button>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-60">
                <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search delivery zones..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* 4. Split Screen: Map Visualizer (Left) + Delivery Zones List (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Map Column (Hidden on mobile if user toggled to list) */}
            <div
              className={`lg:col-span-5 h-[380px] lg:h-[480px] ${
                mobileView === 'table' ? 'hidden sm:block' : 'block'
              }`}
            >
              <DeliveryZoneMap
                warehouse={activeWarehouse}
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={(zone) => setSelectedZoneId(zone.id)}
                onEditZone={handleOpenEditModal}
                className="h-full w-full"
              />
            </div>

            {/* Delivery Zones List Column (Hidden on mobile if user toggled to map) */}
            <div
              className={`lg:col-span-7 space-y-3 ${
                mobileView === 'map' ? 'hidden sm:block' : 'block'
              }`}
            >
              {loadingZones ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 bg-slate-50 rounded-2xl" />
                  ))}
                </div>
              ) : filteredZones.length === 0 ? (
                <div className="py-16 text-center space-y-3 border border-dashed border-slate-200 rounded-3xl p-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                    📍
                  </div>
                  <h4 className="font-heading font-bold text-sm text-slate-800">
                    {searchQuery ? 'No zones match your search' : 'No delivery zones configured for this warehouse'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery
                      ? 'Try clearing the search query or adding a new location.'
                      : 'Configure the cities, LGAs, and neighborhoods this hub delivers to, along with their fees.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-heading shadow-xs cursor-pointer"
                  >
                    + Add Delivery Zone
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
                  <div className="bg-slate-50/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="w-5/12">Location / Area</span>
                    <span className="w-3/12">Delivery Fee</span>
                    <span className="w-2/12 text-center">Status</span>
                    <span className="w-2/12 text-right">Actions</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                    {filteredZones.map((zone) => {
                      const isInlineEditing = inlineEditingZoneId === zone.id;
                      const isSelected = selectedZoneId === zone.id;

                      return (
                        <div
                          key={zone.id}
                          onClick={() => setSelectedZoneId(zone.id)}
                          className={`px-4 py-3 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-rose-50/40'
                              : 'hover:bg-slate-50/60'
                          }`}
                        >
                          {/* Location Info */}
                          <div className="w-5/12 space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>📍</span>
                              <span>{zone.locationName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 pl-5">
                              {zone.locationState} {zone.locationLga ? `• ${zone.locationLga}` : ''}
                            </div>
                          </div>

                          {/* Fee (Normal vs Inline Editing) */}
                          <div className="w-3/12" onClick={(e) => e.stopPropagation()}>
                            {isInlineEditing ? (
                              <div className="flex items-center gap-1">
                                <div className="relative flex-1">
                                  <span className="absolute left-2 top-1 text-[11px] font-bold text-slate-400">₦</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={inlinePrice}
                                    onChange={(e) =>
                                      setInlinePrice(e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    className="w-full pl-5 pr-1.5 py-1 text-xs font-bold rounded-lg border border-rose-300 focus:outline-hidden bg-white"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlinePrice(zone);
                                      if (e.key === 'Escape') handleCancelInlineEdit();
                                    }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlinePrice(zone)}
                                  disabled={savingInline}
                                  className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer text-xs"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelInlineEdit}
                                  className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer text-xs"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleStartInlineEdit(zone)}
                                className="group inline-flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100/80 transition-colors"
                                title="Click to edit fee inline"
                              >
                                <span className="font-heading font-bold text-slate-900">
                                  {formatCurrency(zone.price)}
                                </span>
                                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  ✎
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Status Toggle */}
                          <div
                            className="w-2/12 flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleZoneActive(zone)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                zone.active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {zone.active ? 'Active' : 'Inactive'}
                            </button>
                          </div>

                          {/* Actions */}
                          <div
                            className="w-2/12 flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(zone)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Edit fee / status"
                            >
                              ⚙️
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingZone(zone)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove zone from warehouse"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Add Delivery Zone Modal */}
      {showAddModal && (
        <AddDeliveryZoneModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          warehouses={warehouses}
          currentWarehouseId={selectedWarehouseId}
          existingZones={zones}
          allLocations={allLocations}
          onSuccess={(newZone) => {
            fetchWarehouseZones(selectedWarehouseId);
            showSuccessNotification(`Added "${newZone.locationName}" to ${newZone.warehouseName}`);
          }}
        />
      )}

      {/* Bulk Setup Modal */}
      {showBulkModal && (
        <BulkDeliveryZonesModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          warehouse={activeWarehouse}
          warehouses={warehouses}
          allLocations={allLocations}
          existingZones={zones}
          templates={templates}
          onSuccess={(result) => {
            fetchWarehouseZones(selectedWarehouseId);
            const createdCount = result.created?.length || 0;
            const updatedCount = result.updated?.length || 0;
            if (createdCount > 0 && updatedCount > 0) {
              showSuccessNotification(`Configured ${createdCount} new zones and updated ${updatedCount} rates`);
            } else if (createdCount > 0) {
              showSuccessNotification(`Configured ${createdCount} new delivery zones`);
            } else if (updatedCount > 0) {
              showSuccessNotification(`Updated ${updatedCount} delivery rates`);
            } else {
              showSuccessNotification('Delivery zones updated successfully');
            }
          }}
        />
      )}

      {/* Quick Edit Modal */}
      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditModal}
            className="bg-white max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">
                Edit Delivery Fee
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingZone.locationName} ({editingZone.locationState})
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Delivery Fee (NGN)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-bold text-slate-400">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <div className="font-semibold text-slate-800">Active in Checkout</div>
                  <div className="text-[10px] text-slate-400">Offered to customers</div>
                </div>
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                disabled={savingEdit}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit || editPrice === ''}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {savingEdit ? 'Saving...' : 'Save Fee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="font-heading font-bold text-base text-slate-900">
                Remove Delivery Zone?
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <strong>{deletingZone.locationName}</strong> from{' '}
                <strong>{deletingZone.warehouseName}</strong>? Customer orders for this location will no longer be fulfilled by this hub.
              </p>
              <p className="text-[11px] text-slate-400 italic">
                (The underlying location record, customer addresses, and other warehouses remain intact.)
              </p>
            </div>

            <div className="flex gap-2.5 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeletingZone(null)}
                disabled={confirmDeleteLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteZone}
                disabled={confirmDeleteLoading}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {confirmDeleteLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
