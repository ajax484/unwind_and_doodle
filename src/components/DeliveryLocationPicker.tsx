'use client';

import React, { useMemo } from 'react';
import { Select } from '@/components/Select';
import ComboBox, { ComboBoxOption } from '@/components/ComboBox';
import { formatPrice } from '@/lib/format-utils';

export interface DeliveryLocationItem {
  id: string;
  name: string;
  state: string;
  lga?: string | null;
  deliveryFee: number;
  estimatedDays?: string | null;
}

export interface DeliveryLocationPickerChangePayload {
  locationId: string;
  location: DeliveryLocationItem | null;
  state: string;
  city: string;
  lga?: string;
  deliveryFee: number;
  estimatedDays?: string;
}

export interface DeliveryLocationPickerProps {
  /**
   * Available delivery locations fetched from API.
   */
  locations: DeliveryLocationItem[];

  /**
   * Currently selected location ID.
   */
  selectedLocationId: string;

  /**
   * Change callback firing when either State or Hub changes.
   */
  onChange: (payload: DeliveryLocationPickerChangePayload) => void;

  /**
   * Allows blank/unselected state (useful for Admin manual order payment link mode).
   * @default false
   */
  allowBlank?: boolean;

  /**
   * Custom label for the blank option when allowBlank is true.
   * @default 'Leave blank — Customer selects during checkout'
   */
  blankLabel?: string;

  /**
   * Display dynamic context summary pill below the dropdowns.
   * @default true
   */
  showSummary?: boolean;

  /**
   * Size variant for form controls ('sm' | 'md' | 'lg').
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Label for the State select control.
   * @default 'Delivery State'
   */
  stateLabel?: string;

  /**
   * Label for the Area / Hub select control.
   * @default 'Delivery Area / Hub'
   */
  hubLabel?: string;

  /**
   * Optional validation error message for State.
   */
  stateError?: string;

  /**
   * Optional validation error message for Hub / Location.
   */
  hubError?: string;

  /**
   * Disable the picker controls.
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional wrapper class name.
   */
  className?: string;

  /**
   * Test identifier.
   */
  'data-testid'?: string;
}

export default function DeliveryLocationPicker({
  locations,
  selectedLocationId,
  onChange,
  allowBlank = false,
  blankLabel = 'Leave blank — Customer selects during checkout',
  showSummary = true,
  size = 'md',
  stateLabel = 'Delivery State *',
  hubLabel = 'Delivery Area / Hub *',
  stateError,
  hubError,
  disabled = false,
  className = '',
  'data-testid': testId = 'delivery-location-picker',
}: DeliveryLocationPickerProps) {
  // 1. Group locations by State
  const { statesList, locationsByState, selectedLocation } = useMemo(() => {
    const map = new Map<string, DeliveryLocationItem[]>();

    for (const loc of locations) {
      const stateName = loc.state?.trim() || 'Other';
      if (!map.has(stateName)) {
        map.set(stateName, []);
      }
      map.get(stateName)!.push(loc);
    }

    // Sort locations within each state alphabetically by name
    for (const [, locs] of map.entries()) {
      locs.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Sort states with Lagos, Abuja, and Interstate prioritized first if present, then alphabetical
    const states = Array.from(map.keys()).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower.includes('lagos')) return -1;
      if (bLower.includes('lagos')) return 1;
      if (aLower.includes('abuja') || aLower.includes('fct')) return -1;
      if (bLower.includes('abuja') || bLower.includes('fct')) return 1;
      if (aLower.includes('interstate')) return -1;
      if (bLower.includes('interstate')) return 1;
      return a.localeCompare(b);
    });

    const activeSelected = locations.find((l) => l.id === selectedLocationId) || null;

    return {
      statesList: states,
      locationsByState: map,
      selectedLocation: activeSelected,
    };
  }, [locations, selectedLocationId]);

  // Determine current active state
  const currentState = useMemo(() => {
    if (selectedLocation) {
      return selectedLocation.state?.trim() || '';
    }
    if (allowBlank && !selectedLocationId) {
      return '';
    }
    return statesList[0] || '';
  }, [selectedLocation, selectedLocationId, allowBlank, statesList]);

  // Hubs available under the current active state
  const availableHubs = useMemo(() => {
    if (!currentState) return [];
    return locationsByState.get(currentState) || [];
  }, [currentState, locationsByState]);

  // Handle State Change
  const handleStateSelect = (val: string | number | null) => {
    const newState = typeof val === 'string' ? val : '';

    if (!newState) {
      onChange({
        locationId: '',
        location: null,
        state: '',
        city: '',
        lga: '',
        deliveryFee: 0,
        estimatedDays: '',
      });
      return;
    }

    const hubsInNewState = locationsByState.get(newState) || [];
    const firstHub = hubsInNewState[0] || null;

    if (firstHub) {
      onChange({
        locationId: firstHub.id,
        location: firstHub,
        state: firstHub.state,
        city: firstHub.name,
        lga: firstHub.lga || undefined,
        deliveryFee: firstHub.deliveryFee,
        estimatedDays: firstHub.estimatedDays || '2-4 business days',
      });
    } else {
      onChange({
        locationId: '',
        location: null,
        state: newState,
        city: '',
        lga: '',
        deliveryFee: 0,
        estimatedDays: '',
      });
    }
  };

  // Handle Hub Change
  const handleHubChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocationId = e.target.value;

    if (!newLocationId) {
      onChange({
        locationId: '',
        location: null,
        state: currentState,
        city: '',
        lga: '',
        deliveryFee: 0,
        estimatedDays: '',
      });
      return;
    }

    const hub = locations.find((l) => l.id === newLocationId) || null;
    if (hub) {
      onChange({
        locationId: hub.id,
        location: hub,
        state: hub.state,
        city: hub.name,
        lga: hub.lga || undefined,
        deliveryFee: hub.deliveryFee,
        estimatedDays: hub.estimatedDays || '2-4 business days',
      });
    }
  };

  // State Options for ComboBox
  const stateOptions: ComboBoxOption[] = useMemo(() => {
    const opts: ComboBoxOption[] = [];
    if (allowBlank) {
      opts.push({ value: '', label: blankLabel });
    }
    for (const stateName of statesList) {
      const count = locationsByState.get(stateName)?.length || 0;
      opts.push({
        value: stateName,
        label: stateName,
        description: `${count} ${count === 1 ? 'hub' : 'hubs'} available`,
      });
    }
    return opts;
  }, [allowBlank, blankLabel, statesList, locationsByState]);

  // Hub Options for Select
  const hubOptions = useMemo(() => {
    const opts = [];
    if (allowBlank) {
      opts.push({ value: '', label: blankLabel });
    }
    for (const hub of availableHubs) {
      const feeFormatted = formatPrice(hub.deliveryFee);
      const eta = hub.estimatedDays || '2-4 business days';
      opts.push({
        value: hub.id,
        label: `${hub.name} (+${feeFormatted} • ${eta})`,
      });
    }
    return opts;
  }, [allowBlank, blankLabel, availableHubs]);

  return (
    <div className={`space-y-3.5 ${className}`} data-testid={testId}>
      {/* 2-Tier Cascading Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Tier 1: State Selection */}
        <div>
          <ComboBox
            label={stateLabel}
            value={currentState}
            onChange={handleStateSelect}
            options={stateOptions}
            placeholder="Select delivery state..."
            searchPlaceholder="Search states (e.g. Lagos, Abuja, Interstate)..."
            size={size}
            disabled={disabled || locations.length === 0}
            errorMessage={stateError}
            data-testid={`${testId}-state-select`}
          />
        </div>

        {/* Tier 2: Area / Hub Selection */}
        <div>
          <Select
            label={hubLabel}
            value={selectedLocationId}
            onChange={handleHubChange}
            options={hubOptions}
            size={size}
            disabled={disabled || !currentState || availableHubs.length === 0}
            errorMessage={hubError}
            data-testid={`${testId}-hub-select`}
          />
        </div>
      </div>

      {/* Delivery Context Summary Pill */}
      {showSummary && selectedLocation && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 p-3 bg-brand-sand-subtle/40 dark:bg-bg-subtle/60 border border-border-default rounded-xl text-xs animate-in fade-in duration-200"
          data-testid={`${testId}-summary-pill`}
        >
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="text-base shrink-0">📍</span>
            <span>
              Delivering to <strong className="text-text-primary">{selectedLocation.name}</strong>,{' '}
              <strong className="text-text-primary">{selectedLocation.state}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-heading font-bold text-action-primary text-xs bg-bg-surface px-2.5 py-0.5 rounded-full border border-border-default shadow-2xs">
              {formatPrice(selectedLocation.deliveryFee)}
            </span>
            <span className="text-[11px] text-text-tertiary bg-bg-surface px-2 py-0.5 rounded-full border border-border-default">
              ⏱️ {selectedLocation.estimatedDays || '2-4 business days'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
