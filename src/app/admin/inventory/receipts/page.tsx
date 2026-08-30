'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminStockReceiptListItem } from '@/types/admin-inventory';

export default function StockReceiptsListPage() {
  const [receipts, setReceipts] = useState<AdminStockReceiptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/inventory/receipts');
      const json = await res.json();

      if (res.ok && json.success) {
        setReceipts(json.data || []);
      } else {
        throw new Error(json.error || 'Failed to fetch receipts');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading stock receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/inventory" className="hover:text-slate-600">
              ← Inventory
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">Goods Receipts</span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Stock Receipts (GRN)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Historical records of inbound inventory received into warehouses from printing and manufacturing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory/receipts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer"
          >
            <span>+</span> Receive Stock
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchReceipts} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 2. Receipts Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              📥
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              No stock receipts recorded yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Record your first inbound batch of coloring books or pencil sets to update warehouse stock.
            </p>
            <Link
              href="/admin/inventory/receipts/new"
              className="inline-block mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold font-heading shadow-xs"
            >
              + Create Goods Receipt
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Reference</th>
                    <th className="py-3.5 px-4 font-semibold">Warehouse</th>
                    <th className="py-3.5 px-4 font-semibold">Received Date</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Line Items</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Units Received</th>
                    <th className="py-3.5 px-4 font-semibold">Total Cost</th>
                    <th className="py-3.5 px-4 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {r.reference || '—'}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {r.warehouseName}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(r.receivedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-700">
                        {r.totalItemsCount}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        +{r.totalUnitsReceived}
                      </td>

                      <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                        {formatCurrency(r.totalReceiptCost)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {r.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {receipts.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{r.reference}</span>
                    <span className="font-semibold text-emerald-600">+{r.totalUnitsReceived} units</span>
                  </div>

                  <div className="text-slate-600">
                    Warehouse: <strong>{r.warehouseName}</strong> •{' '}
                    {new Date(r.receivedAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="font-bold text-slate-900">{formatCurrency(r.totalReceiptCost)}</span>
                    <span className="text-slate-400 text-[11px]">{r.totalItemsCount} item(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
