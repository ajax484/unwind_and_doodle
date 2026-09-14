'use client';

import React, { useState, useMemo, useEffect } from 'react';
import SmartLocationSelector from './SmartLocationSelector';
import {
  AdminLocationItem,
  AdminWarehouseListItem,
  AdminDeliveryZoneItem,
  AdminDeliveryRateTemplateItem,
  AdminEnrichedLocationItem,
  SmartConfigChoice,
  BulkDeliveryZoneResult,
  BulkDeliveryZoneResultItem,
} from '@/types/admin-inventory';

interface BulkDeliveryZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: AdminWarehouseListItem | null;
  warehouses?: AdminWarehouseListItem[];
  allLocations: AdminLocationItem[] | AdminEnrichedLocationItem[];
  existingZones: AdminDeliveryZoneItem[];
  templates?: AdminDeliveryRateTemplateItem[];
  onSuccess: (result: BulkDeliveryZoneResult) => void;
}

type Step = 'locations' | 'pricing' | 'review' | 'progress' | 'result';
type PricingMethod = 'same' | 'individual' | 'template';

const QUICK_RATE_SHORTCUTS = [1500, 2000, 2500, 3000, 5000];

export default function BulkDeliveryZonesModal({
  isOpen,
  onClose,
  warehouse,
  warehouses = [],
  allLocations,
  existingZones,
  templates = [],
  onSuccess,
}: BulkDeliveryZonesModalProps) {
  const [step, setStep] = useState<Step>('locations');

  // Step 1: Selection & Filters
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [localLocations, setLocalLocations] = useState<AdminEnrichedLocationItem[]>([]);

  // Reassignment tracking
  const [reassignedLocationIds, setReassignedLocationIds] = useState<string[]>([]);
  const handleToggleReassignment = (locationId: string, reassign: boolean) => {
    setReassignedLocationIds((prev) =>
      reassign ? [...new Set([...prev, locationId])] : prev.filter((id) => id !== locationId)
    );
  };

  // Synchronize or enrich incoming locations
  useEffect(() => {
    if (!allLocations) return;
    const enriched: AdminEnrichedLocationItem[] = (
      allLocations as Array<AdminLocationItem & Partial<AdminEnrichedLocationItem>>
    ).map((loc) => {
      if (loc.configurations && loc.statusForWarehouse) {
        return loc as AdminEnrichedLocationItem;
      }
      const matchZone = existingZones.find((z) => z.locationId === loc.id);
      const configs = matchZone
        ? [
            {
              warehouseId: matchZone.warehouseId,
              warehouseName: matchZone.warehouseName,
              price: matchZone.price,
              active: matchZone.active,
            },
          ]
        : [];
      const isHere = matchZone && matchZone.warehouseId === warehouse?.id;
      return {
        id: loc.id,
        name: loc.name,
        state: loc.state,
        lga: loc.lga,
        createdAt: loc.createdAt,
        configurations: configs,
        statusForWarehouse: isHere
          ? 'configured_here'
          : configs.length > 0
          ? 'configured_other'
          : 'not_configured',
        primaryConfig: configs[0] || null,
      };
    });
    setLocalLocations(enriched);
  }, [allLocations, existingZones, warehouse]);

  const handleLocationCreated = (newLoc: AdminEnrichedLocationItem) => {
    setLocalLocations((prev) => [newLoc, ...prev]);
  };

  // Smart Configuration Strategy
  const [smartConfigChoice, setSmartConfigChoice] = useState<SmartConfigChoice>('unconfigured_only');
  const [showSmartChoiceModal, setShowSmartChoiceModal] = useState(false);

  // Step 2: Pricing
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('same');
  const [uniformRate, setUniformRate] = useState<number | ''>(2000);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Per-location rates and template assignments in individual/group mode
  const [individualRates, setIndividualRates] = useState<Record<string, number | ''>>({});
  const [itemTemplateMap, setItemTemplateMap] = useState<Record<string, string | null>>({});

  // Group selection inside Step 2 table for batch template application
  const [groupCheckedIds, setGroupCheckedIds] = useState<string[]>([]);
  const [batchTemplateId, setBatchTemplateId] = useState<string>('');

  // Existing rate decision: 'keep' vs 'replace'
  const [existingRateDecisions, setExistingRateDecisions] = useState<Record<string, 'keep' | 'replace'>>({});

  // Execution & Results
  const [submitting, setSubmitting] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [resultData, setResultData] = useState<BulkDeliveryZoneResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active templates only for selection
  const activeTemplates = useMemo(() => {
    return templates.filter((t) => t.isActive);
  }, [templates]);

  // Set default selected template if available
  useEffect(() => {
    if (activeTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(activeTemplates[0].id);
      setBatchTemplateId(activeTemplates[0].id);
    }
  }, [activeTemplates, selectedTemplateId]);

  // Map of existing zones for this warehouse: locationId -> AdminDeliveryZoneItem
  const existingZoneMap = useMemo(() => {
    const map = new Map<string, AdminDeliveryZoneItem>();
    if (!warehouse) return map;
    for (const z of existingZones) {
      if (z.warehouseId === warehouse.id) {
        map.set(z.locationId, z);
      }
    }
    return map;
  }, [existingZones, warehouse]);

  // Selected locations detail array
  const selectedLocations = useMemo(() => {
    const map = new Map(localLocations.map((l) => [l.id, l]));
    return selectedLocationIds
      .map((id) => map.get(id))
      .filter((loc): loc is AdminEnrichedLocationItem => Boolean(loc));
  }, [localLocations, selectedLocationIds]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to resolve target price and template for a location
  const resolveLocationPricing = (locId: string) => {
    if (pricingMethod === 'same') {
      return {
        price: Number(uniformRate) || 0,
        templateId: null,
        templateName: null,
      };
    } else if (pricingMethod === 'template') {
      const tmpl = activeTemplates.find((t) => t.id === selectedTemplateId);
      return {
        price: tmpl ? tmpl.amount : 0,
        templateId: tmpl ? tmpl.id : null,
        templateName: tmpl ? tmpl.name : null,
      };
    } else {
      // Individual mode
      const tmplId = itemTemplateMap[locId];
      const tmpl = tmplId ? templates.find((t) => t.id === tmplId) : null;
      return {
        price: Number(individualRates[locId]) || 0,
        templateId: tmpl ? tmpl.id : null,
        templateName: tmpl ? tmpl.name : null,
      };
    }
  };

  // Review Breakdown: Categorize selected locations into NEW, UPDATE, and SKIPPED/UNCHANGED
  const reviewBreakdown = useMemo(() => {
    const newZones: Array<{
      location: AdminLocationItem;
      price: number;
      templateName: string | null;
    }> = [];

    const updateZones: Array<{
      location: AdminLocationItem;
      oldPrice: number;
      newPrice: number;
      templateName: string | null;
    }> = [];

    const skippedZones: Array<{
      location: AdminLocationItem;
      price: number;
      reason: string;
    }> = [];

    // Map template name -> count
    const templateCounts: Record<string, { count: number; amount: number }> = {};
    let customRateCount = 0;

    for (const loc of selectedLocations) {
      const { price, templateName } = resolveLocationPricing(loc.id);
      const existing = existingZoneMap.get(loc.id);
      const decision = existingRateDecisions[loc.id] ?? 'replace';

      if (!existing) {
        newZones.push({ location: loc, price, templateName });
        if (templateName) {
          templateCounts[templateName] = {
            count: (templateCounts[templateName]?.count || 0) + 1,
            amount: price,
          };
        } else {
          customRateCount++;
        }
      } else {
        if (smartConfigChoice === 'unconfigured_only' || decision === 'keep') {
          skippedZones.push({
            location: loc,
            price: existing.price,
            reason:
              smartConfigChoice === 'unconfigured_only'
                ? 'Preserved existing rate (unconfigured only mode)'
                : 'Preserved existing rate',
          });
        } else if (existing.price === price) {
          skippedZones.push({
            location: loc,
            price,
            reason: 'Rate unchanged',
          });
        } else {
          updateZones.push({
            location: loc,
            oldPrice: existing.price,
            newPrice: price,
            templateName,
          });
          if (templateName) {
            templateCounts[templateName] = {
              count: (templateCounts[templateName]?.count || 0) + 1,
              amount: price,
            };
          } else {
            customRateCount++;
          }
        }
      }
    }

    return {
      newZones,
      updateZones,
      skippedZones,
      templateCounts,
      customRateCount,
    };
  }, [
    selectedLocations,
    pricingMethod,
    uniformRate,
    selectedTemplateId,
    individualRates,
    itemTemplateMap,
    existingZoneMap,
    existingRateDecisions,
    smartConfigChoice,
    activeTemplates,
    templates,
  ]);

  if (!isOpen || !warehouse) return null;

  // Selection handlers
  const handleClearSelection = () => {
    setSelectedLocationIds([]);
  };

  const handleToggleLocation = (locId: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  };

  // Step Transitions
  const proceedToPricingStep = (choice?: SmartConfigChoice) => {
    const effectiveChoice = choice || smartConfigChoice;
    setError(null);

    const initialRates: Record<string, number | ''> = {};
    const initialDecisions: Record<string, 'keep' | 'replace'> = {};
    const defaultRate = activeTemplates.length > 0 ? activeTemplates[0].amount : uniformRate || 2000;

    for (const loc of selectedLocations) {
      const existing = existingZoneMap.get(loc.id);
      initialRates[loc.id] =
        individualRates[loc.id] !== undefined
          ? individualRates[loc.id]
          : existing
          ? existing.price
          : defaultRate;

      if (existing) {
        initialDecisions[loc.id] = effectiveChoice === 'replace_existing' ? 'replace' : 'keep';
      }
    }
    setIndividualRates(initialRates);
    setExistingRateDecisions(initialDecisions);
    setGroupCheckedIds([]);
    setStep('pricing');
  };

  const handleContinueToPricing = () => {
    if (selectedLocationIds.length === 0) {
      setError('Please select at least one delivery location');
      return;
    }
    setError(null);

    const configuredCount = selectedLocations.filter((l) => existingZoneMap.has(l.id)).length;
    const unconfiguredCount = selectedLocations.length - configuredCount;

    // If both configured and unconfigured are selected, prompt smart configuration policy
    if (configuredCount > 0 && unconfiguredCount > 0) {
      setShowSmartChoiceModal(true);
      return;
    }

    proceedToPricingStep();
  };

  const handleContinueToReview = () => {
    if (pricingMethod === 'same') {
      if (uniformRate === '' || Number(uniformRate) < 0) {
        setError('Please enter a valid uniform delivery fee (₦0 or greater)');
        return;
      }
    } else if (pricingMethod === 'template') {
      if (!selectedTemplateId) {
        setError('Please select a rate template');
        return;
      }
    } else {
      // Validate all individual rates
      for (const loc of selectedLocations) {
        const isExisting = existingZoneMap.has(loc.id);
        const decision = existingRateDecisions[loc.id];
        if (isExisting && decision === 'keep') continue;

        const rate = individualRates[loc.id];
        if (rate === '' || Number(rate) < 0) {
          setError(`Please specify a valid delivery fee for "${loc.name}" (₦0 or greater)`);
          return;
        }
      }
    }
    setError(null);
    setStep('review');
  };

  // Group Template Apply Handler
  const handleApplyBatchTemplate = () => {
    if (!batchTemplateId || groupCheckedIds.length === 0) return;
    const tmpl = templates.find((t) => t.id === batchTemplateId);
    if (!tmpl) return;

    setIndividualRates((prev) => {
      const next = { ...prev };
      for (const id of groupCheckedIds) {
        next[id] = tmpl.amount;
      }
      return next;
    });

    setItemTemplateMap((prev) => {
      const next = { ...prev };
      for (const id of groupCheckedIds) {
        next[id] = tmpl.id;
      }
      return next;
    });

    setGroupCheckedIds([]);
  };

  // Bulk existing rate decision toggles
  const handleSetAllExistingDecisions = (decision: 'keep' | 'replace') => {
    setExistingRateDecisions((prev) => {
      const next = { ...prev };
      for (const loc of selectedLocations) {
        if (existingZoneMap.has(loc.id)) {
          next[loc.id] = decision;
        }
      }
      return next;
    });
  };

  // Commit Execution
  const handleExecuteBulkSetup = async (retryItemIds?: string[]) => {
    const idsToProcess = retryItemIds || selectedLocationIds;

    const targetItems: Array<{
      location_id: string;
      price: number;
      template_id?: string;
    }> = [];

    for (const locId of idsToProcess) {
      const existing = existingZoneMap.get(locId);
      const decision = existingRateDecisions[locId];
      if (smartConfigChoice === 'unconfigured_only' && existing) {
        continue;
      }
      if (existing && decision === 'keep') {
        continue;
      }

      const { price, templateId } = resolveLocationPricing(locId);
      targetItems.push({
        location_id: locId,
        price,
        template_id: templateId || undefined,
      });
    }

    if (targetItems.length === 0) {
      alert('No new zones or rate changes to apply based on your configuration choice.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setStep('progress');
      setProgressCount(1);

      // Visual progress simulator
      const timer = setInterval(() => {
        setProgressCount((prev) => Math.min(prev + 1, targetItems.length));
      }, 150);

      const res = await fetch('/api/admin/settings/delivery-zones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouse.id,
          items: targetItems,
          include_existing: smartConfigChoice === 'replace_existing',
          active: true,
        }),
      });

      clearInterval(timer);
      const json = await res.json();

      if (res.ok && json.success) {
        setResultData(json.data);
        setStep('result');
      } else {
        throw new Error(json.error || 'Failed to complete bulk delivery zone setup');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error executing bulk setup');
      setStep('review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishAndClose = () => {
    if (resultData) {
      onSuccess(resultData);
    }
    onClose();
  };

  const existingSelectedCount = selectedLocations.filter((l) => existingZoneMap.has(l.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <h3 className="font-heading font-bold text-lg text-slate-900 tracking-tight">
                Bulk Add Delivery Zones
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hub: <strong>{warehouse.name}</strong> ({warehouse.state || 'National Hub'})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold disabled:opacity-40 p-1"
          >
            ✕
          </button>
        </div>

        {/* Wizard Steps Tracker */}
        {step !== 'result' && (
          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] font-bold font-heading text-slate-400">
            <div
              className={`flex items-center gap-1.5 ${
                step === 'locations' ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-rose-100 text-rose-700">
                1
              </span>
              <span>Locations</span>
            </div>
            <span>→</span>
            <div
              className={`flex items-center gap-1.5 ${
                step === 'pricing' ? 'text-rose-600' : step === 'review' ? 'text-slate-700' : ''
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-200 text-slate-700">
                2
              </span>
              <span>Pricing &amp; Templates</span>
            </div>
            <span>→</span>
            <div
              className={`flex items-center gap-1.5 ${
                step === 'review' || step === 'progress' ? 'text-rose-600' : ''
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-200 text-slate-700">
                3
              </span>
              <span>Review &amp; Confirm</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: SELECT LOCATIONS                                     */}
        {/* ============================================================ */}
        {step === 'locations' && (
          <div className="space-y-4 text-xs flex-1 overflow-y-auto">
            <SmartLocationSelector
              locations={localLocations}
              selectedLocationIds={selectedLocationIds}
              onToggleLocation={handleToggleLocation}
              onSelectAllMatching={(ids) => setSelectedLocationIds(ids)}
              onClearSelection={handleClearSelection}
              currentWarehouse={warehouse}
              warehouses={warehouses}
              onLocationCreated={handleLocationCreated}
              reassignedLocationIds={reassignedLocationIds}
              onToggleReassignment={handleToggleReassignment}
              showMapToggle={true}
            />

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {selectedLocationIds.length > 0 ? (
                  <strong className="text-slate-800">{selectedLocationIds.length}</strong>
                ) : (
                  '0'
                )}{' '}
                locations selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinueToPricing}
                  disabled={selectedLocationIds.length === 0}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold font-heading shadow-xs cursor-pointer disabled:opacity-40"
                >
                  Continue to Pricing →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: PRICING CONFIGURATION                                */}
        {/* ============================================================ */}
        {step === 'pricing' && (
          <div className="space-y-4 text-xs flex-1 overflow-y-auto">
            {/* Summary pill */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900">
                  {selectedLocations.length} locations selected
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Policy:{' '}
                  <strong className="text-slate-800">
                    {smartConfigChoice === 'unconfigured_only' &&
                      'Configure only unconfigured locations (existing rates untouched)'}
                    {smartConfigChoice === 'keep_existing' &&
                      'Keep existing rates (unconfigured receive new fee)'}
                    {smartConfigChoice === 'replace_existing' &&
                      'Replace all existing rates with new pricing'}
                  </strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedLocations.some((l) => existingZoneMap.has(l.id)) && (
                  <button
                    type="button"
                    onClick={() => setShowSmartChoiceModal(true)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Change policy
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep('locations')}
                  className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Edit locations
                </button>
              </div>
            </div>

            {/* Method choice: 3 options */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 block">Pricing Method</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPricingMethod('same')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    pricingMethod === 'same'
                      ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900">● Same rate for all</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Apply one manual fee to all {selectedLocations.length} zones
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingMethod('template')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    pricingMethod === 'template'
                      ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900">★ Use rate template</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Apply a saved pricing preset across all selected zones
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingMethod('individual')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    pricingMethod === 'individual'
                      ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900">○ Individual / Group</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Assign different templates or custom fees per location
                  </div>
                </button>
              </div>
            </div>

            {/* Option A: Uniform Manual Rate */}
            {pricingMethod === 'same' && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Delivery Fee (NGN) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 font-bold text-slate-400 text-sm">₦</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={uniformRate}
                      onChange={(e) =>
                        setUniformRate(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="2000"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-bold focus:outline-hidden focus:border-rose-400"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Quick rate shortcuts:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_RATE_SHORTCUTS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setUniformRate(amount)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          uniformRate === amount
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  This rate will be applied to all <strong>{selectedLocations.length} locations</strong>.
                </p>
              </div>
            )}

            {/* Option B: Use Rate Template */}
            {pricingMethod === 'template' && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {activeTemplates.length === 0 ? (
                  <div className="p-6 text-center space-y-2 bg-white rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-700">No active rate templates available.</p>
                    <p className="text-slate-500 text-[11px]">
                      Create reusable templates in the Rate Templates tab to quickly populate delivery fees.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPricingMethod('same')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                    >
                      Use manual rate instead
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700 block">
                        Select Rate Template <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-hidden focus:border-rose-400"
                      >
                        {activeTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {formatCurrency(t.amount)}
                            {t.description ? ` (${t.description})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected Template Preview */}
                    {(() => {
                      const tmpl = activeTemplates.find((t) => t.id === selectedTemplateId);
                      if (!tmpl) return null;
                      return (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              🏷️ {tmpl.name}
                            </span>
                            <span className="font-heading font-bold text-slate-900 text-sm">
                              {formatCurrency(tmpl.amount)} each
                            </span>
                          </div>
                          {tmpl.description && (
                            <p className="text-[11px] text-slate-500">{tmpl.description}</p>
                          )}
                          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Total locations: <strong>{selectedLocations.length}</strong></span>
                            <span>Estimated total: <strong>{formatCurrency(tmpl.amount * selectedLocations.length)}</strong></span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* Option C: Individual Rates & Group Assignment */}
            {pricingMethod === 'individual' && (
              <div className="space-y-3">
                {/* Group Batch Toolbar */}
                {activeTemplates.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Batch Assign Template</span>
                      <span className="text-[11px] text-slate-500">
                        {groupCheckedIds.length} checked
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={batchTemplateId}
                        onChange={(e) => setBatchTemplateId(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                      >
                        {activeTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {formatCurrency(t.amount)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleApplyBatchTemplate}
                        disabled={groupCheckedIds.length === 0}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        Apply to {groupCheckedIds.length} checked
                      </button>
                    </div>
                  </div>
                )}

                {/* Conflict Handling Toolbar for Existing Rates */}
                {existingSelectedCount > 0 && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-amber-900">
                        {existingSelectedCount} selected location{existingSelectedCount === 1 ? '' : 's'} already configured
                      </span>
                      <p className="text-[10px] text-amber-700">
                        Choose whether to preserve current rates or update them with new values.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetAllExistingDecisions('keep')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-[11px] font-semibold cursor-pointer"
                      >
                        Keep existing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllExistingDecisions('replace')}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Replace existing
                      </button>
                    </div>
                  </div>
                )}

                {/* Locations Table */}
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
                  {selectedLocations.map((loc) => {
                    const existing = existingZoneMap.get(loc.id);
                    const decision = existingRateDecisions[loc.id] || 'replace';
                    const isGroupChecked = groupCheckedIds.includes(loc.id);
                    const tmplId = itemTemplateMap[loc.id];
                    const assignedTmpl = tmplId ? templates.find((t) => t.id === tmplId) : null;
                    const priceVal = individualRates[loc.id] ?? 2000;

                    return (
                      <div
                        key={loc.id}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                          existing && decision === 'keep' ? 'bg-slate-50/60 opacity-80' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isGroupChecked}
                            onChange={() =>
                              setGroupCheckedIds((prev) =>
                                prev.includes(loc.id)
                                  ? prev.filter((id) => id !== loc.id)
                                  : [...prev, loc.id]
                              )
                            }
                            className="w-4 h-4 rounded text-rose-500 cursor-pointer"
                            title="Select for batch template assignment"
                          />
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{loc.name}</span>
                              {assignedTmpl && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                  {assignedTmpl.name}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {loc.state} {loc.lga ? `• ${loc.lga}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Existing zone decision or manual input */}
                        <div className="flex items-center gap-2">
                          {existing && (
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setExistingRateDecisions((prev) => ({
                                    ...prev,
                                    [loc.id]: 'keep',
                                  }))
                                }
                                className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                                  decision === 'keep'
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-500'
                                }`}
                              >
                                Keep ({formatCurrency(existing.price)})
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setExistingRateDecisions((prev) => ({
                                    ...prev,
                                    [loc.id]: 'replace',
                                  }))
                                }
                                className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                                  decision === 'replace'
                                    ? 'bg-rose-500 text-white shadow-2xs'
                                    : 'text-slate-500'
                                }`}
                              >
                                Replace
                              </button>
                            </div>
                          )}

                          {(!existing || decision === 'replace') && (
                            <div className="relative w-32">
                              <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">
                                ₦
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={priceVal}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Number(e.target.value);
                                  setIndividualRates((prev) => ({
                                    ...prev,
                                    [loc.id]: val,
                                  }));
                                  // Clear template tag on manual edit
                                  setItemTemplateMap((prev) => ({ ...prev, [loc.id]: null }));
                                }}
                                className="w-full pl-6 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('locations')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                ← Back to locations
              </button>
              <button
                type="button"
                onClick={handleContinueToReview}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold font-heading shadow-xs cursor-pointer"
              >
                Review configuration →
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: REVIEW & CONFIRMATION                                */}
        {/* ============================================================ */}
        {step === 'review' && (
          <div className="space-y-4 text-xs flex-1 overflow-y-auto">
            {/* Warehouse context header */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400">Target Warehouse</span>
                <div className="font-heading font-bold text-sm text-slate-900">
                  🏬 {warehouse.name} ({warehouse.state || 'Hub'})
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400">Selected Locations</span>
                <div className="font-bold text-slate-800">{selectedLocations.length} total</div>
              </div>
            </div>

            {/* Pricing Summary Breakdown */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 block text-xs">Pricing Breakdown:</span>

              {/* By Template */}
              {Object.entries(reviewBreakdown.templateCounts).map(([tmplName, info]) => (
                <div key={tmplName} className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🏷️</span>
                    <span>
                      <strong>{tmplName} template</strong>: {info.count} location{info.count === 1 ? '' : 's'} × {formatCurrency(info.amount)}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(info.count * info.amount)}
                  </span>
                </div>
              ))}

              {/* Custom manual rates */}
              {reviewBreakdown.customRateCount > 0 && (
                <div className="flex items-center justify-between text-slate-700">
                  <span>Custom / manual rates: {reviewBreakdown.customRateCount} locations</span>
                </div>
              )}

              {/* Existing rates unchanged */}
              {reviewBreakdown.skippedZones.length > 0 && (
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                  <span>Existing rates unchanged: {reviewBreakdown.skippedZones.length} locations</span>
                  <span className="italic text-[11px]">Preserved</span>
                </div>
              )}

              {reviewBreakdown.updateZones.length > 0 && (
                <div className="text-amber-800 text-[11px] font-semibold">
                  ⚠️ {reviewBreakdown.updateZones.length} existing rate{reviewBreakdown.updateZones.length === 1 ? '' : 's'} will be replaced.
                </div>
              )}
            </div>

            {/* Categorized Diff Sections */}
            <div className="space-y-3">
              {/* NEW ZONES */}
              {reviewBreakdown.newZones.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      NEW ZONES TO CREATE ({reviewBreakdown.newZones.length})
                    </span>
                  </div>
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 divide-y divide-emerald-100 max-h-36 overflow-y-auto">
                    {reviewBreakdown.newZones.map(({ location, price, templateName }) => (
                      <div
                        key={location.id}
                        className="px-3 py-1.5 flex items-center justify-between text-[11px]"
                      >
                        <span className="font-semibold text-slate-800">
                          {location.name} ({location.state})
                          {templateName && (
                            <span className="ml-1.5 text-[10px] text-rose-600 font-normal">
                              [{templateName}]
                            </span>
                          )}
                        </span>
                        <span className="font-heading font-bold text-emerald-700">
                          +{formatCurrency(price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UPDATES */}
              {reviewBreakdown.updateZones.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      EXISTING RATES TO UPDATE ({reviewBreakdown.updateZones.length})
                    </span>
                  </div>
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 divide-y divide-amber-100 max-h-36 overflow-y-auto">
                    {reviewBreakdown.updateZones.map(({ location, oldPrice, newPrice, templateName }) => (
                      <div
                        key={location.id}
                        className="px-3 py-1.5 flex items-center justify-between text-[11px]"
                      >
                        <span className="font-semibold text-slate-800">
                          {location.name} ({location.state})
                          {templateName && (
                            <span className="ml-1.5 text-[10px] text-rose-600 font-normal">
                              [{templateName}]
                            </span>
                          )}
                        </span>
                        <span className="font-heading font-bold text-amber-700">
                          {formatCurrency(oldPrice)} → {formatCurrency(newPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SKIPPED / PRESERVED */}
              {reviewBreakdown.skippedZones.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      PRESERVED / UNCHANGED ({reviewBreakdown.skippedZones.length})
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100 max-h-28 overflow-y-auto">
                    {reviewBreakdown.skippedZones.map(({ location, price, reason }) => (
                      <div
                        key={location.id}
                        className="px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500"
                      >
                        <span>
                          {location.name} ({location.state}) • <em className="text-[10px]">{reason}</em>
                        </span>
                        <span className="font-semibold">{formatCurrency(price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Confirmation Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('pricing')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={() => handleExecuteBulkSetup()}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold font-heading shadow-xs cursor-pointer disabled:opacity-40"
              >
                {(() => {
                  const created = reviewBreakdown.newZones.length;
                  const updated = reviewBreakdown.updateZones.length;
                  if (created > 0 && updated > 0) {
                    return `Create ${created} zones and update ${updated} rates`;
                  } else if (created > 0) {
                    return `Create ${created} delivery zone${created === 1 ? '' : 's'}`;
                  } else if (updated > 0) {
                    return `Update ${updated} delivery rate${updated === 1 ? '' : 's'}`;
                  } else {
                    return 'Apply Changes';
                  }
                })()}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 4: EXECUTION PROGRESS                                   */}
        {/* ============================================================ */}
        {step === 'progress' && (
          <div className="py-12 px-4 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl animate-spin">
              ⚡
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-bold text-base text-slate-900">
                Configuring delivery zones...
              </h4>
              <p className="text-xs text-slate-500">
                Processing batch assignments and delivery rates. Please do not close this modal.
              </p>
            </div>

            <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full transition-all duration-200 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((progressCount / Math.max(1, selectedLocationIds.length)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 5: RESULT & SUMMARY                                     */}
        {/* ============================================================ */}
        {step === 'result' && resultData && (
          <div className="space-y-4 text-xs flex-1 overflow-y-auto">
            {resultData.failed.length === 0 ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <div className="text-3xl">🎉</div>
                <h4 className="font-heading font-bold text-base text-emerald-900">
                  Delivery Zones Configured Successfully!
                </h4>
                <p className="text-xs text-emerald-700">
                  {resultData.created.length > 0 &&
                    `${resultData.created.length} new zones created. `}
                  {resultData.updated.length > 0 &&
                    `${resultData.updated.length} rates updated. `}
                  {resultData.skipped.length > 0 &&
                    `${resultData.skipped.length} existing zones preserved.`}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <span>⚠️</span>
                  <span>
                    Setup finished with {resultData.failed.length} issue{resultData.failed.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-xs text-amber-800">
                  Successfully processed {resultData.created.length + resultData.updated.length} zones. The following locations failed:
                </p>

                <div className="rounded-xl border border-red-200 bg-white p-2 divide-y divide-red-100 text-[11px] max-h-32 overflow-y-auto">
                  {resultData.failed.map((f) => (
                    <div key={f.locationId} className="py-1 flex items-center justify-between text-red-700">
                      <span>{f.locationName}</span>
                      <span className="font-semibold">{f.error || f.message || 'Error configuring zone'}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleExecuteBulkSetup(resultData.failed.map((f) => f.locationId))}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer"
                  >
                    Retry Failed Items
                  </button>
                </div>
              </div>
            )}

            {/* Quick summary metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Created</span>
                <span className="font-heading font-bold text-lg text-emerald-700">
                  {resultData.created.length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Updated</span>
                <span className="font-heading font-bold text-lg text-amber-700">
                  {resultData.updated.length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Preserved</span>
                <span className="font-heading font-bold text-lg text-slate-600">
                  {resultData.skipped.length}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold font-heading text-xs shadow-xs cursor-pointer"
              >
                Done &amp; View Zones
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SMART CONFIGURATION STRATEGY MODAL */}
      {showSmartChoiceModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-slate-900 text-base">
                Configure Selected Locations
              </h3>
              <p className="text-xs text-slate-600">
                You selected <strong className="text-slate-900">{selectedLocations.length} locations</strong>:
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                  {selectedLocations.length - selectedLocations.filter((l) => existingZoneMap.has(l.id)).length} unconfigured
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {selectedLocations.filter((l) => existingZoneMap.has(l.id)).length} already configured
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-700 block">
                What would you like to do?
              </label>

              {/* Option 1: Safest default */}
              <label
                className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  smartConfigChoice === 'unconfigured_only'
                    ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="smartConfigChoice"
                  checked={smartConfigChoice === 'unconfigured_only'}
                  onChange={() => setSmartConfigChoice('unconfigured_only')}
                  className="mt-0.5 text-rose-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>Configure only unconfigured locations</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                      Safest
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Creates zones only for unconfigured places. All existing delivery rates remain completely untouched.
                  </p>
                </div>
              </label>

              {/* Option 2: Keep existing rates */}
              <label
                className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  smartConfigChoice === 'keep_existing'
                    ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="smartConfigChoice"
                  checked={smartConfigChoice === 'keep_existing'}
                  onChange={() => setSmartConfigChoice('keep_existing')}
                  className="mt-0.5 text-rose-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs">Keep existing rates</div>
                  <p className="text-[11px] text-slate-500">
                    Assigns unconfigured locations to this warehouse, while preserving existing rates at their current fee.
                  </p>
                </div>
              </label>

              {/* Option 3: Replace existing rates */}
              <label
                className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  smartConfigChoice === 'replace_existing'
                    ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="smartConfigChoice"
                  checked={smartConfigChoice === 'replace_existing'}
                  onChange={() => setSmartConfigChoice('replace_existing')}
                  className="mt-0.5 text-rose-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs text-amber-900">
                    Replace existing rates
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Overwrites existing delivery fees for all {selectedLocations.length} selected locations with the new pricing.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSmartChoiceModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSmartChoiceModal(false);
                  proceedToPricingStep(smartConfigChoice);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer text-xs shadow-xs"
              >
                Continue to Pricing →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
