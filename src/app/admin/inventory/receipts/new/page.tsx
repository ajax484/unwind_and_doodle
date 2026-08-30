'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminWarehouseListItem } from '@/types/admin-inventory';
import { AdminProductListItem } from '@/types/admin-product';
import { generateAutoGrnReference } from '@/lib/sku-helpers';

interface ReceiptLineDraft {
  productId: string;
  quantity: number | '';
  costPrice: number | '';
}

export default function NewStockReceiptPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<AdminWarehouseListItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<AdminProductListItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [reference, setReference] = useState(() => generateAutoGrnReference());
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<ReceiptLineDraft[]>([
    { productId: '', quantity: '', costPrice: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        fetch('/api/admin/inventory/warehouses'),
        fetch('/api/admin/products?limit=100'),
      ]);
      const whJson = await whRes.json();
      const prodJson = await prodRes.json();

      if (whRes.ok && whJson.success) {
        const whList: AdminWarehouseListItem[] = whJson.data || [];
        setWarehouses(whList);
        if (whList.length > 0) {
          setSelectedWarehouseId(whList[0].id);
        }
      }

      if (prodRes.ok && prodJson.success) {
        setCatalogProducts(prodJson.data.products || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = catalogProducts.find((p) => p.id === prodId);
    setLines((prev) =>
      prev.map((line, idx) =>
        idx === index
          ? {
              ...line,
              productId: prodId,
              costPrice: prod ? prod.cost_price || 0 : '',
            }
          : line
      )
    );
  };

  const handleLineChange = (
    index: number,
    field: 'quantity' | 'costPrice',
    value: number | ''
  ) => {
    setLines((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, [field]: value } : line))
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, { productId: '', quantity: '', costPrice: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const calculateTotals = () => {
    let totalUnits = 0;
    let totalCost = 0;

    for (const l of lines) {
      const q = typeof l.quantity === 'number' ? l.quantity : 0;
      const c = typeof l.costPrice === 'number' ? l.costPrice : 0;
      totalUnits += q;
      totalCost += q * c;
    }

    return { totalUnits, totalCost };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWarehouseId) {
      setError('Please select a destination warehouse');
      return;
    }

    if (!reference.trim()) {
      setError('Receipt reference/GRN is required (e.g. GRN-2026-001)');
      return;
    }

    // Validate line items
    const validItems = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.productId) {
        setError(`Please select a product for line #${i + 1}`);
        return;
      }
      if (l.quantity === '' || Number(l.quantity) <= 0) {
        setError(`Please enter a valid positive quantity for line #${i + 1}`);
        return;
      }
      validItems.push({
        product_id: l.productId,
        quantity: Number(l.quantity),
        cost_price: Number(l.costPrice) || 0,
      });
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/api/admin/inventory/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: selectedWarehouseId,
          reference: reference.trim(),
          notes: notes.trim() || null,
          received_at: new Date(receivedAt).toISOString(),
          items: validItems,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        router.push('/admin/inventory/receipts');
      } else {
        throw new Error(json.error || 'Failed to create stock receipt');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error finalizing stock receipt');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { totalUnits, totalCost } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/inventory" className="hover:text-slate-600">
              ← Inventory
            </Link>
            <span>/</span>
            <Link href="/admin/inventory/receipts" className="hover:text-slate-600">
              Receipts
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">New Stock Receipt</span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Receive Inbound Stock (GRN)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory/receipts"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-heading shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Receiving Stock...' : 'Finalize & Receive Stock'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* 2. Receipt Header Info */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
          Receipt Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Destination Warehouse <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800"
              required
            >
              <option value="">Select Warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.state ? `(${w.state})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 block">
                Reference / GRN # <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setReference(generateAutoGrnReference())}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-1"
              >
                <span>⚡</span> Auto-Generate
              </button>
            </div>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. GRN-20260830-1234"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono focus:outline-hidden focus:border-rose-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">Date Received</label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
            />
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-700 block">Notes / Supplier Details</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Print batch #5 from Lagos Printing Press, delivered via dispatch."
            rows={2}
            className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800"
          />
        </div>
      </div>

      {/* 3. Dynamic Line Items Builder */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-heading font-bold text-base text-slate-900">Received Products</h3>
          <button
            type="button"
            onClick={handleAddLine}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
          >
            + Add Another Item
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const lineTotal =
              (typeof line.quantity === 'number' ? line.quantity : 0) *
              (typeof line.costPrice === 'number' ? line.costPrice : 0);

            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs"
              >
                {/* Product Dropdown */}
                <div className="sm:col-span-5 space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Product Item #{idx + 1}
                  </label>
                  <select
                    value={line.productId}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                    required
                  >
                    <option value="">Select a catalog product...</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) =>
                      handleLineChange(
                        idx,
                        'quantity',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white"
                    required
                  />
                </div>

                {/* Unit Cost */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700 block">Unit Cost (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={line.costPrice}
                    onChange={(e) =>
                      handleLineChange(
                        idx,
                        'costPrice',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="3500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white"
                  />
                </div>

                {/* Line Total */}
                <div className="sm:col-span-2 pb-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total</span>
                  <span className="font-heading font-bold text-slate-800">
                    {formatCurrency(lineTotal)}
                  </span>
                </div>

                {/* Remove button */}
                <div className="sm:col-span-1 pb-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={lines.length === 1}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                    title="Remove line"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Receipt Totals Summary */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleAddLine}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            + Add Another Product
          </button>

          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-slate-400 text-xs block">Total Units</span>
              <span className="font-heading font-bold text-base text-slate-800">
                +{totalUnits} units
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Total Batch Cost</span>
              <span className="font-heading font-bold text-lg text-emerald-700">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
