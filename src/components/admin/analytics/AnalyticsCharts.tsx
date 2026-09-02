'use client';

import React, { useState } from 'react';
import { SalesSeriesPoint, SalesBySourceItem, TopLocationItem } from '@/types/analytics';

interface TimeSeriesChartProps {
  data: SalesSeriesPoint[];
  loading?: boolean;
}

export function TimeSeriesChart({ data, loading = false }: TimeSeriesChartProps) {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    date: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateLabel = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="h-6 w-36 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-64 w-full bg-slate-50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const values = data.map((d) => (metric === 'revenue' ? d.revenue : d.orders));
  const maxValue = Math.max(...values, metric === 'revenue' ? 10000 : 5);
  const totalMetric = values.reduce((sum, v) => sum + v, 0);

  // SVG dimensions
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x =
      data.length <= 1
        ? width / 2
        : paddingX + (index / (data.length - 1)) * chartWidth;
    const val = metric === 'revenue' ? d.revenue : d.orders;
    const y = height - paddingY - (val / maxValue) * chartHeight;
    return { x, y, val, date: d.date };
  });

  const linePath =
    points.length === 0
      ? ''
      : points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  const areaPath =
    points.length === 0
      ? ''
      : `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold font-heading text-slate-900">
              Sales Trend Over Time
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
              {metric === 'revenue' ? formatCurrency(totalMetric) : `${totalMetric} orders`} total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Server-aggregated time series with consistent date boundaries
          </p>
        </div>

        {/* Metric Selector Toggle */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Revenue (₦)
          </button>
          <button
            type="button"
            onClick={() => setMetric('orders')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metric === 'orders'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Orders Count
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl">
          <span className="text-2xl mb-2">📉</span>
          <p className="text-xs font-semibold text-slate-600">No data points in this period</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Try expanding the date range filter above
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-56 sm:h-64 select-none overflow-visible"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingY + ratio * chartHeight;
              const lineVal = Math.round(maxValue * (1 - ratio));
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                    strokeDasharray={ratio === 1 ? '0' : '4 4'}
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#94A3B8"
                    fontFamily="inherit"
                  >
                    {metric === 'revenue'
                      ? lineVal >= 1000
                        ? `₦${Math.round(lineVal / 1000)}k`
                        : `₦${lineVal}`
                      : lineVal}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {points.length > 1 && (
              <path d={areaPath} fill="url(#chartGradient)" />
            )}

            {/* Line Path */}
            {points.length > 1 ? (
              <path
                d={linePath}
                fill="none"
                stroke="#F43F5E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : points.length === 1 ? (
              <circle cx={points[0].x} cy={points[0].y} r="5" fill="#F43F5E" />
            ) : null}

            {/* Interactive Data Points */}
            {points.map((p, idx) => (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({
                    index: idx,
                    date: p.date,
                    value: p.val,
                    x: p.x,
                    y: p.y,
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint?.index === idx ? 6 : 3.5}
                  fill={hoveredPoint?.index === idx ? '#E11D48' : '#FFFFFF'}
                  stroke="#F43F5E"
                  strokeWidth="2"
                  className="transition-all"
                />
              </g>
            ))}

            {/* X-axis Date Labels (Sampled to avoid crowding) */}
            {points.map((p, idx) => {
              // Show label if first, last, or evenly spaced
              const step = Math.ceil(points.length / 6);
              if (idx % step !== 0 && idx !== points.length - 1) return null;
              return (
                <text
                  key={idx}
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94A3B8"
                  fontFamily="inherit"
                >
                  {formatDateLabel(p.date)}
                </text>
              );
            })}
          </svg>

          {/* Hover Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-lg transform -translate-x-1/2 -translate-y-full mb-3 space-y-0.5 border border-slate-800"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100}%`,
              }}
            >
              <div className="text-[10px] text-slate-400">
                {formatDateLabel(hoveredPoint.date)}
              </div>
              <div className="font-bold text-rose-300">
                {metric === 'revenue'
                  ? formatCurrency(hoveredPoint.value)
                  : `${hoveredPoint.value} orders`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface HorizontalBarChartProps {
  title: string;
  items: { label: string; value: number; secondary?: string; percentage?: number }[];
  emptyMessage?: string;
}

export function HorizontalBarChart({
  title,
  items,
  emptyMessage = 'No data available',
}: HorizontalBarChartProps) {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
      <h3 className="text-sm font-bold font-heading text-slate-900">{title}</h3>

      {items.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-center text-xs text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3.5">
          {items.map((item, idx) => {
            const pct = item.percentage ?? Math.round((item.value / maxVal) * 100);
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate max-w-[60%]">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.secondary && (
                      <span className="text-[11px] text-slate-400">{item.secondary}</span>
                    )}
                    <span className="font-bold text-slate-900">
                      {new Intl.NumberFormat('en-US').format(item.value)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface StatusDistributionBarProps {
  statuses: { status: string; count: number; percentage: number }[];
}

export function StatusDistributionBar({ statuses }: StatusDistributionBarProps) {
  const STATUS_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
    received: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
    shipped: { bg: 'bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-500' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
    created: { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-400' },
    cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-400' },
    refunded: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
  };

  const totalCount = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold font-heading text-slate-900">Order Status Breakdown</h3>
        <span className="text-xs text-slate-400 font-semibold">{totalCount} total orders</span>
      </div>

      {statuses.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-xs text-slate-400">
          No orders in this period
        </div>
      ) : (
        <div className="space-y-4">
          {/* Multi-segment progress bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {statuses.map((s, idx) => {
              const color = STATUS_COLORS[s.status] || { bar: 'bg-slate-300' };
              return (
                <div
                  key={idx}
                  className={`h-full ${color.bar} transition-all duration-300`}
                  style={{ width: `${s.percentage}%` }}
                  title={`${s.status}: ${s.count} (${s.percentage}%)`}
                />
              );
            })}
          </div>

          {/* Status Pills Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {statuses.map((s, idx) => {
              const color = STATUS_COLORS[s.status] || {
                bg: 'bg-slate-50',
                text: 'text-slate-700',
              };
              return (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded-xl ${color.bg} flex items-center justify-between text-xs`}
                >
                  <span className={`capitalize font-semibold ${color.text}`}>{s.status}</span>
                  <span className="font-bold text-slate-900">
                    {s.count} <span className="text-[10px] text-slate-400 font-normal">({s.percentage}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
