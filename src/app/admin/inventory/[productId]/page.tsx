'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminProductInventoryDetail, AdminInventoryMovementItem } from '@/types/admin-inventory';

export default function AdminProductInventoryDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);

  const [data, setData] = useState<AdminProductInventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [adjustQty, setAdjustQty] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('Stock audit count');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/inventory/${productId}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
        if (json.data.warehouses.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(json.data.warehouses[0].warehouseId);
        }
      } else {
        throw new Error(json.error || 'Failed to fetch inventory details');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading inventory detail');
    } finally {
      setLoading(false);
    }
  }, [productId, selectedWarehouseId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleOpenAdjust = (whId?: string) => {
    if (whId) setSelectedWarehouseId(whId);
    setAdjustQty('');
    setAdjustReason('Stock audit count');
    setAdjustNote('');
    setAdjustError(null);
    setShowAdjustModal(true);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !selectedWarehouseId || adjustQty === '' || Number(adjustQty) === 0) {
      setAdjustError('Please select a warehouse and enter a non-zero adjustment quantity');
      return;
    }

    const targetWh = data.warehouses.find((w) => w.warehouseId === selectedWarehouseId);
    const curStock = targetWh ? targetWh.quantityOnHand : 0;
    const numQty = Number(adjustQty);

    if (curStock + numQty < 0) {
      setAdjustError(`Cannot reduce stock below 0. Current on hand is ${curStock}.`);
      return;
    }

    if (numQty < 0) {
      const confirmed = window.confirm(
        `Are you sure you want to deduct ${Math.abs(numQty)} units from "${targetWh?.warehouseName || 'warehouse'}"?`
      );
      if (!confirmed) return;
    }

    try {
      setAdjustSaving(true);
      setAdjustError(null);

      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: selectedWarehouseId,
          product_id: productId,
          adjustment_quantity: numQty,
          reason: adjustReason,
          note: adjustNote.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowAdjustModal(false);
        await fetchDetail();
      } else {
        throw new Error(json.error || 'Failed to adjust stock');
      }
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : 'Error executing adjustment');
    } finally {
      setAdjustSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMovementType = (type: string) => {
    switch (type) {
      case 'purchase':
        return { label: 'Stock Received (GRN)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'adjustment':
        return { label: 'Manual Adjustment', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'sale':
        return { label: 'Order Deduction', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'reservation':
        return { label: 'Order Hold', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'release':
        return { label: 'Hold Released', color: 'bg-slate-100 text-slate-600 border-slate-200' };
      case 'return':
        return { label: 'Customer Return', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: type, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-red-200 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-heading font-bold text-lg text-slate-800">Inventory Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/admin/inventory"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Inventory
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
            {data.primaryImage ? (
              <img
                src={data.primaryImage}
                alt={data.productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">🎨</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/admin/inventory" className="hover:text-slate-600">
                ← Inventory
              </Link>
              <span>/</span>
              <span className="font-mono text-slate-700">SKU: {data.sku || 'N/A'}</span>
            </div>
            <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
              {data.productName}
            </h2>
            <div className="text-xs text-slate-500">
              Selling Price: <strong className="text-slate-800">{formatCurrency(data.sellingPrice)}</strong> •
              Cost Price: <strong className="text-slate-800">{formatCurrency(data.costPrice)}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/admin/products/${data.productId}`}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            Edit Product
          </Link>
          <button
            type="button"
            onClick={() => handleOpenAdjust()}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs cursor-pointer"
          >
            Adjust Stock
          </button>
        </div>
      </div>

      {/* 2. Global Stock Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total On Hand</span>
          <div className="text-2xl font-bold font-heading text-slate-900">{data.totalStockOnHand}</div>
          <p className="text-[11px] text-slate-400">Physical units</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Reserved</span>
          <div className="text-2xl font-bold font-heading text-amber-600">{data.totalStockReserved}</div>
          <p className="text-[11px] text-slate-400">Active checkout holds</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Available to Sell</span>
          <div className="text-2xl font-bold font-heading text-emerald-600">{data.totalAvailableToSell}</div>
          <p className="text-[11px] text-slate-400">Ready for purchase</p>
        </div>
      </div>

      {/* 3. Multi-Warehouse Stock Distribution Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Warehouse Stock Distribution
            </h3>
            <p className="text-xs text-slate-500">
              Current inventory balances broken down by regional fulfillment hub.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAdjust()}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
          >
            + Adjust Warehouse Stock
          </button>
        </div>

        {data.warehouses.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No warehouses configured.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Stock on Hand</th>
                  <th className="py-3 px-4 text-center">Reserved</th>
                  <th className="py-3 px-4 text-center">Available</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.warehouses.map((wh) => (
                  <tr key={wh.warehouseId} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-800">{wh.warehouseName}</td>
                    <td className="py-3 px-4 text-slate-500">{wh.warehouseState || 'Main Hub'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">{wh.quantityOnHand}</td>
                    <td className="py-3 px-4 text-center text-amber-600">{wh.quantityReserved}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          wh.availableToSell > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {wh.availableToSell}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(wh.warehouseId)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer shadow-2xs"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Stock Movement History Timeline & Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-heading font-bold text-base text-slate-900">
            Stock Movement History ({data.movements.length})
          </h3>
          <p className="text-xs text-slate-500">
            Immutable audit log of all goods receipts, sales deductions, holds, and manual adjustments.
          </p>
        </div>

        {data.movements.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-1">
            <div className="text-2xl">📜</div>
            <div>No inventory movements recorded yet for this product.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Qty Change</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.movements.map((mov: AdminInventoryMovementItem) => {
                  const badge = formatMovementType(mov.movementType);
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(mov.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {mov.warehouseName}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            mov.quantity > 0
                              ? 'text-emerald-600'
                              : mov.quantity < 0
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {mov.note || (mov.referenceId ? `Ref: ${mov.referenceId}` : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleExecuteAdjustment}
            className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h4 className="font-heading font-bold text-base text-slate-900">
                Adjust Stock — {data.productName}
              </h4>
              <p className="text-xs text-slate-500">
                Apply positive or negative adjustments directly to warehouse records.
              </p>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {adjustError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select Warehouse</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  {data.warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName} (On Hand: {w.quantityOnHand})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Adjustment Quantity (+ to add, - to remove) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. +10 or -2"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Stock audit count">Stock audit count / Cycle count</option>
                  <option value="Damaged goods">Damaged / Defective goods</option>
                  <option value="Promotional sample">Promotional / Marketing sample</option>
                  <option value="Internal correction">Internal correction</option>
                  <option value="Loss or theft">Loss / Theft</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Notes / Reference (Optional)</label>
                <textarea
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Add specific details or audit reference..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                disabled={adjustSaving}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustSaving || adjustQty === '' || Number(adjustQty) === 0}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {adjustSaving ? 'Applying...' : 'Confirm Adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
