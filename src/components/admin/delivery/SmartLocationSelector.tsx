'use client';

import React, { useState, useMemo } from 'react';
import {
  AdminEnrichedLocationItem,
  AdminWarehouseListItem,
  LocationStatusFilter,
  LocationConfigurationInfo,
} from '@/types/admin-inventory';

interface SmartLocationSelectorProps {
  locations: AdminEnrichedLocationItem[];
  selectedLocationIds: string[];
  onToggleLocation: (locationId: string) => void;
  onSelectAllMatching: (locationIds: string[]) => void;
  onClearSelection: () => void;
  currentWarehouse: AdminWarehouseListItem | null;
  warehouses?: AdminWarehouseListItem[];
  onLocationCreated?: (newLocation: AdminEnrichedLocationItem) => void;
  reassignedLocationIds?: string[];
  onToggleReassignment?: (locationId: string, reassign: boolean) => void;
  showMapToggle?: boolean;
  className?: string;
}

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

export default function SmartLocationSelector({
  locations,
  selectedLocationIds,
  onToggleLocation,
  onSelectAllMatching,
  onClearSelection,
  currentWarehouse,
  warehouses = [],
  onLocationCreated,
  reassignedLocationIds = [],
  onToggleReassignment,
  showMapToggle = true,
  className = '',
}: SmartLocationSelectorProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocationStatusFilter>('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');

  // Inspection Drawer
  const [inspectingLocation, setInspectingLocation] = useState<AdminEnrichedLocationItem | null>(null);

  // Inline Location Creation Modal State
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocState, setNewLocState] = useState(currentWarehouse?.state || 'Lagos');
  const [newLocLga, setNewLocLga] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Map view toggle
  const [showMap, setShowMap] = useState(false);

  // Format currency utility
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Reassignment modal or banner confirmation state
  const [pendingReassignLoc, setPendingReassignLoc] = useState<AdminEnrichedLocationItem | null>(null);

  // Calculate counts for fast status filter chips
  const counts = useMemo(() => {
    let unconfigured = 0;
    let configuredHere = 0;
    let configuredOther = 0;

    for (const loc of locations) {
      if (loc.statusForWarehouse === 'not_configured') {
        unconfigured++;
      } else if (
        loc.statusForWarehouse === 'configured_here' ||
        loc.statusForWarehouse === 'configured_multiple'
      ) {
        configuredHere++;
      } else if (loc.statusForWarehouse === 'configured_other') {
        configuredOther++;
      }
    }

    return {
      all: locations.length,
      unconfigured,
      configuredHere,
      configuredOther,
    };
  }, [locations]);

  // Filter locations based on search query, status chip, and warehouse filter
  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return locations.filter((loc) => {
      // 1. Search query match
      if (q) {
        const matchesName = loc.name.toLowerCase().includes(q);
        const matchesState = loc.state.toLowerCase().includes(q);
        const matchesLga = Boolean(loc.lga && loc.lga.toLowerCase().includes(q));
        if (!matchesName && !matchesState && !matchesLga) {
          return false;
        }
      }

      // 2. Status filter match
      if (statusFilter === 'not_configured') {
        if (loc.statusForWarehouse !== 'not_configured') return false;
      } else if (statusFilter === 'configured_here') {
        if (
          loc.statusForWarehouse !== 'configured_here' &&
          loc.statusForWarehouse !== 'configured_multiple'
        ) {
          return false;
        }
      } else if (statusFilter === 'configured_other') {
        if (loc.statusForWarehouse !== 'configured_other') return false;
      }

      // 3. Warehouse dropdown filter
      if (selectedWarehouseFilter !== 'all') {
        const hasWh = loc.configurations.some((c) => c.warehouseId === selectedWarehouseFilter);
        if (!hasWh) return false;
      }

      return true;
    });
  }, [locations, searchQuery, statusFilter, selectedWarehouseFilter]);

  // Handle location checkbox toggle with cross-warehouse reassignment check
  const handleCheckboxClick = (loc: AdminEnrichedLocationItem) => {
    const isSelected = selectedLocationIds.includes(loc.id);

    if (!isSelected) {
      // If user is selecting a location currently served by another warehouse
      if (
        loc.statusForWarehouse === 'configured_other' &&
        currentWarehouse &&
        !reassignedLocationIds.includes(loc.id)
      ) {
        setPendingReassignLoc(loc);
        return;
      }
    }

    onToggleLocation(loc.id);
  };

  // Confirm reassignment from prompt
  const confirmReassignment = (loc: AdminEnrichedLocationItem) => {
    if (onToggleReassignment) {
      onToggleReassignment(loc.id, true);
    }
    if (!selectedLocationIds.includes(loc.id)) {
      onToggleLocation(loc.id);
    }
    setPendingReassignLoc(null);
  };

  // Keep existing assignment (select without reassigning or cancel)
  const keepExistingAssignment = (loc: AdminEnrichedLocationItem) => {
    if (onToggleReassignment) {
      onToggleReassignment(loc.id, false);
    }
    // Select anyway without reassigning flag
    if (!selectedLocationIds.includes(loc.id)) {
      onToggleLocation(loc.id);
    }
    setPendingReassignLoc(null);
  };

  // Handle select visible / matching
  const visibleIds = useMemo(() => filteredLocations.map((l) => l.id), [filteredLocations]);
  const allVisibleSelected = useMemo(() => {
    return visibleIds.length > 0 && visibleIds.every((id) => selectedLocationIds.includes(id));
  }, [visibleIds, selectedLocationIds]);

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      // Unselect only the visible ones
      const remaining = selectedLocationIds.filter((id) => !visibleIds.includes(id));
      onSelectAllMatching(remaining);
    } else {
      // Add all visible IDs
      const combined = Array.from(new Set([...selectedLocationIds, ...visibleIds]));
      onSelectAllMatching(combined);
    }
  };

  // Open inline location creation
  const handleOpenCreateModal = () => {
    setNewLocName(searchQuery.trim());
    setNewLocState(currentWarehouse?.state || 'Lagos');
    setNewLocLga('');
    setCreateError(null);
    setIsCreatingLocation(true);
  };

  // Submit new location inline
  const handleCreateLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) {
      setCreateError('Location name is required');
      return;
    }
    if (!newLocState.trim()) {
      setCreateError('State is required');
      return;
    }

    // Duplicate check: case-insensitive match on name and state
    const existingMatch = locations.find(
      (l) =>
        l.name.toLowerCase().trim() === newLocName.toLowerCase().trim() &&
        l.state.toLowerCase().trim() === newLocState.toLowerCase().trim()
    );

    if (existingMatch) {
      setCreateError(
        `Location "${existingMatch.name}" in ${existingMatch.state} already exists. Select it from the list instead.`
      );
      return;
    }

    try {
      setCreatingLoading(true);
      setCreateError(null);

      const res = await fetch('/api/admin/inventory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocName.trim(),
          state: newLocState.trim(),
          lga: newLocLga.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create location');
      }

      const created = json.data;
      const newEnrichedItem: AdminEnrichedLocationItem = {
        id: created.id,
        name: created.name,
        state: created.state,
        lga: created.lga,
        createdAt: created.createdAt,
        configurations: [],
        statusForWarehouse: 'not_configured',
        primaryConfig: null,
      };

      if (onLocationCreated) {
        onLocationCreated(newEnrichedItem);
      }

      // Automatically select newly created location
      if (!selectedLocationIds.includes(created.id)) {
        onToggleLocation(created.id);
      }

      setIsCreatingLocation(false);
      setSearchQuery('');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error creating location');
    } finally {
      setCreatingLoading(false);
    }
  };

  return (
    <div className={`space-y-3.5 text-xs ${className}`}>
      {/* 1. SEARCH & FAST ACTION BAR */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Prominent Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search delivery locations by name, state, or LGA..."
              className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-400 bg-white shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-bold p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Warehouse Dropdown (if multiple warehouses available) */}
          {warehouses.length > 1 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs focus:outline-hidden focus:border-rose-400"
              >
                <option value="all">All warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Map toggle */}
          {showMapToggle && (
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className={`px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                showMap
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🗺️</span>
              <span>{showMap ? 'Hide Map' : 'Map View'}</span>
            </button>
          )}
        </div>

        {/* 2. FAST STATUS FILTER CHIPS */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* All */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({counts.all})
          </button>

          {/* Not configured (THE PRIMARY FAST PATH) */}
          <button
            type="button"
            onClick={() => setStatusFilter('not_configured')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              statusFilter === 'not_configured'
                ? 'bg-amber-500 text-white ring-2 ring-amber-200 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100/70'
            }`}
          >
            <span>⚡ Not configured</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === 'not_configured' ? 'bg-amber-600 text-white' : 'bg-amber-200/80 text-amber-900'
              }`}
            >
              {counts.unconfigured}
            </span>
          </button>

          {/* Configured for this warehouse */}
          <button
            type="button"
            onClick={() => setStatusFilter('configured_here')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'configured_here'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/70'
            }`}
          >
            Configured here ({counts.configuredHere})
          </button>

          {/* Configured for another warehouse */}
          {counts.configuredOther > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('configured_other')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === 'configured_other'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200/80 hover:bg-indigo-100/70'
              }`}
            >
              Other warehouses ({counts.configuredOther})
            </button>
          )}

          {/* Quick Create Button Shortcut */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="ml-auto text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer py-1"
          >
            <span>+ Add location</span>
          </button>
        </div>
      </div>

      {/* 3. MULTI-SELECTION HEADER & CONTROLS */}
      <div className="flex items-center justify-between px-1 text-slate-500">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            disabled={visibleIds.length === 0}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
          >
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={handleToggleSelectAll}
              disabled={visibleIds.length === 0}
              className="w-3.5 h-3.5 rounded text-rose-500 cursor-pointer"
            />
            <span>
              {allVisibleSelected
                ? `Deselect all visible (${visibleIds.length})`
                : `Select all visible (${visibleIds.length})`}
            </span>
          </button>

          {selectedLocationIds.length > 0 && (
            <>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Clear
              </button>
            </>
          )}
        </div>

        <div className="text-xs">
          <span className="text-slate-400">Selected: </span>
          <strong className="text-rose-600 font-bold">{selectedLocationIds.length}</strong>
          <span className="text-slate-400"> of {locations.length}</span>
        </div>
      </div>

      {/* 4. OPTIONAL RESILIENT MAP VIEW */}
      {showMap && (
        <div className="p-3 bg-slate-900 rounded-2xl text-white space-y-2 border border-slate-800">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300">Spatial Overview ({filteredLocations.length} locations)</span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Here
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Other
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Not configured
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> Selected
              </span>
            </div>
          </div>
          {/* Resilient visual map representation */}
          <div className="h-36 w-full rounded-xl bg-slate-950 border border-slate-800/80 p-2 overflow-hidden relative flex flex-wrap items-center justify-center gap-1.5 overflow-y-auto">
            {filteredLocations.slice(0, 36).map((loc) => {
              const isSelected = selectedLocationIds.includes(loc.id);
              let pinBg = 'bg-slate-700 text-slate-300';
              if (isSelected) {
                pinBg = 'bg-rose-500 text-white ring-2 ring-rose-300 font-bold';
              } else if (
                loc.statusForWarehouse === 'configured_here' ||
                loc.statusForWarehouse === 'configured_multiple'
              ) {
                pinBg = 'bg-emerald-600 text-white';
              } else if (loc.statusForWarehouse === 'configured_other') {
                pinBg = 'bg-indigo-600 text-white';
              }

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleCheckboxClick(loc)}
                  className={`px-2 py-0.5 rounded-md text-[10px] transition-transform hover:scale-105 cursor-pointer ${pinBg}`}
                  title={`${loc.name} (${loc.state}) - Click to toggle`}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. LOCATIONS LIST */}
      <div className="space-y-1.5">
        {filteredLocations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <p className="font-semibold text-slate-700">No delivery locations found matching your filter.</p>
            {searchQuery && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>+ Add &ldquo;{searchQuery}&rdquo; as a delivery location</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white p-1">
            {filteredLocations.map((loc) => {
              const isSelected = selectedLocationIds.includes(loc.id);
              const isReassigned = reassignedLocationIds.includes(loc.id);

              return (
                <div
                  key={loc.id}
                  className={`p-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-rose-50/70 border border-rose-100' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Left: Checkbox + Location Info */}
                  <label className="flex items-start gap-3 flex-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCheckboxClick(loc)}
                      className="mt-0.5 w-4 h-4 rounded text-rose-500 cursor-pointer focus:ring-rose-400"
                    />

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{loc.name}</span>

                        {/* Status Badges */}
                        {loc.statusForWarehouse === 'not_configured' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                            ○ Not configured
                          </span>
                        )}

                        {(loc.statusForWarehouse === 'configured_here' ||
                          loc.statusForWarehouse === 'configured_multiple') && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>
                              {currentWarehouse?.name || 'Configured'} ·{' '}
                              {loc.primaryConfig ? formatCurrency(loc.primaryConfig.price) : 'Configured'}
                            </span>
                          </span>
                        )}

                        {loc.statusForWarehouse === 'configured_other' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span>
                              {loc.primaryConfig?.warehouseName || 'Other warehouse'} ·{' '}
                              {loc.primaryConfig ? formatCurrency(loc.primaryConfig.price) : 'Configured'}
                            </span>
                          </span>
                        )}

                        {isReassigned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                            ⚡ Reassigning to {currentWarehouse?.name}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>
                          {loc.state}
                          {loc.lga ? ` • ${loc.lga}` : ''}
                        </span>
                        {loc.configurations.length > 1 && (
                          <span className="text-slate-500 font-medium">
                            ({loc.configurations.length} warehouses serving)
                          </span>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Right: Inspect Details Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectingLocation(loc);
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer font-medium whitespace-nowrap"
                    title="View location configuration details"
                  >
                    Details ℹ
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. CROSS-WAREHOUSE REASSIGNMENT MODAL GUARDRAIL */}
      {pendingReassignLoc && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-600 font-heading font-bold text-sm">
                <span>⚠️</span>
                <span>Already Configured for Another Warehouse</span>
              </div>
              <p className="text-xs text-slate-600">
                <strong className="text-slate-900">{pendingReassignLoc.name}</strong> is currently served by{' '}
                <strong className="text-slate-900">
                  {pendingReassignLoc.primaryConfig?.warehouseName || 'another warehouse'}
                </strong>{' '}
                at{' '}
                <strong className="text-slate-900">
                  {pendingReassignLoc.primaryConfig ? formatCurrency(pendingReassignLoc.primaryConfig.price) : 'existing rate'}
                </strong>
                .
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <p className="font-semibold text-slate-900">How would you like to handle this location?</p>
              <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-1">
                <li>
                  <strong>Reassign to this warehouse:</strong> Adds{' '}
                  {currentWarehouse?.name || 'current warehouse'} as an active fulfillment zone with its configured fee.
                </li>
                <li>
                  <strong>Keep existing assignment:</strong> Retains existing warehouse fulfillment as primary.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingReassignLoc(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => keepExistingAssignment(pendingReassignLoc)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
              >
                Keep Existing
              </button>
              <button
                type="button"
                onClick={() => confirmReassignment(pendingReassignLoc)}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-xs"
              >
                Reassign to this warehouse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. INLINE LOCATION CREATION DIALOG */}
      {isCreatingLocation && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-sm">Add Delivery Location</h3>
                <p className="text-[11px] text-slate-500">Create a new delivery destination for your organization</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingLocation(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateLocationSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Location Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Lekki Phase 1, Maryland Mall, Ikeja GRA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newLocState}
                    onChange={(e) => setNewLocState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-rose-400"
                  >
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">LGA (Optional)</label>
                  <input
                    type="text"
                    value={newLocLga}
                    onChange={(e) => setNewLocLga(e.target.value)}
                    placeholder="e.g. Eti-Osa, Ikeja"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingLocation(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLoading}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {creatingLoading ? 'Creating...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. LOCATION DETAILS SLIDE-OVER / DRAWER */}
      {inspectingLocation && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white h-full max-w-sm w-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 text-base">{inspectingLocation.name}</h3>
                  <p className="text-xs text-slate-500">
                    {inspectingLocation.state}
                    {inspectingLocation.lga ? ` • ${inspectingLocation.lga}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingLocation(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</span>
                <div className="font-bold text-slate-800 text-xs">
                  {inspectingLocation.statusForWarehouse === 'not_configured' && '○ Not configured for delivery'}
                  {inspectingLocation.statusForWarehouse === 'configured_here' && (
                    <span className="text-emerald-700">● Configured for {currentWarehouse?.name}</span>
                  )}
                  {inspectingLocation.statusForWarehouse === 'configured_other' && (
                    <span className="text-indigo-700">● Configured for other warehouse</span>
                  )}
                  {inspectingLocation.statusForWarehouse === 'configured_multiple' && (
                    <span className="text-violet-700">● Configured across multiple warehouses</span>
                  )}
                </div>
              </div>

              {/* Warehouse Configurations */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700">Warehouse Configurations</span>
                {inspectingLocation.configurations.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl text-center">
                    No delivery rates configured yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inspectingLocation.configurations.map((c: LocationConfigurationInfo) => (
                      <div
                        key={c.warehouseId}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          c.warehouseId === currentWarehouse?.id
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{c.warehouseName}</span>
                          <span className="text-rose-600">{formatCurrency(c.price)}</span>
                        </div>
                        {c.templateName && (
                          <div className="text-[10px] text-slate-500">Template: {c.templateName}</div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          Status: {c.active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setInspectingLocation(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCheckboxClick(inspectingLocation);
                  setInspectingLocation(null);
                }}
                className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                  selectedLocationIds.includes(inspectingLocation.id)
                    ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {selectedLocationIds.includes(inspectingLocation.id) ? 'Deselect' : 'Select Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
