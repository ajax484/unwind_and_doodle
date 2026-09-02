'use client';

import React, { useState } from 'react';
import { AnalyticsDateRangePreset } from '@/types/analytics';

interface AnalyticsDateRangeSelectorProps {
  currentPreset: AnalyticsDateRangePreset;
  customFrom?: string;
  customTo?: string;
  onSelect: (preset: AnalyticsDateRangePreset, from?: string, to?: string) => void;
  disabled?: boolean;
}

const PRESETS: { value: AnalyticsDateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

export default function AnalyticsDateRangeSelector({
  currentPreset,
  customFrom,
  customTo,
  onSelect,
  disabled = false,
}: AnalyticsDateRangeSelectorProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState(
    customFrom ? customFrom.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    customTo ? customTo.split('T')[0] : new Date().toISOString().split('T')[0]
  );

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as AnalyticsDateRangePreset;
    if (val === 'custom') {
      setShowCustomModal(true);
    } else {
      onSelect(val);
    }
  };

  const handleApplyCustom = () => {
    if (startDate && endDate) {
      const from = new Date(startDate + 'T00:00:00.000Z').toISOString();
      const to = new Date(endDate + 'T23:59:59.999Z').toISOString();
      onSelect('custom', from, to);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <div className="relative">
        <select
          value={currentPreset}
          onChange={handlePresetChange}
          disabled={disabled}
          className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer disabled:opacity-50"
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              📅 {p.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          ▼
        </span>
      </div>

      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-heading text-slate-900">Custom Date Range</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
