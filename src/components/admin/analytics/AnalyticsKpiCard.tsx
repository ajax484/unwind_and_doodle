'use client';

import React from 'react';
import { AnalyticsMetricWithComparison } from '@/types/analytics';

interface AnalyticsKpiCardProps {
  title: string;
  value: number;
  format?: 'currency' | 'number' | 'percentage';
  comparison?: AnalyticsMetricWithComparison;
  icon?: string;
  tooltip?: string;
  subtitle?: string;
  loading?: boolean;
}

export default function AnalyticsKpiCard({
  title,
  value,
  format = 'number',
  comparison,
  icon,
  tooltip,
  subtitle,
  loading = false,
}: AnalyticsKpiCardProps) {
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(val);
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    return new Intl.NumberFormat('en-US').format(val);
  };

  const renderTrendBadge = () => {
    if (!comparison) return null;

    if (comparison.isNew) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          New
        </span>
      );
    }

    if (comparison.percentageChange === null || comparison.percentageChange === undefined) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
          —
        </span>
      );
    }

    const isPositive = comparison.percentageChange > 0;
    const isNeutral = comparison.percentageChange === 0;

    if (isNeutral) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
          0.0%
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isPositive
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}
      >
        <span>{isPositive ? '↑' : '↓'}</span>
        <span>{Math.abs(comparison.percentageChange)}%</span>
      </span>
    );
  };

  return (
    <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          {tooltip && (
            <span
              className="text-slate-300 hover:text-slate-500 text-xs cursor-help"
              title={tooltip}
            >
              ℹ️
            </span>
          )}
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-base shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 tracking-tight">
          {loading ? (
            <span className="inline-block w-24 h-8 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            formatValue(value)
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          {renderTrendBadge()}
          <span className="text-[11px] text-slate-400 truncate">
            {subtitle || 'vs previous period'}
          </span>
        </div>
      </div>
    </div>
  );
}
