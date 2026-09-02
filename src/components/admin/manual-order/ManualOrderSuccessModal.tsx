'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface ManualOrderSuccessData {
  orderId: string;
  orderNumber: string;
  paymentRequestId: string;
  token: string;
  amount: number;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  paymentUrl: string;
  expiresAt: string;
}

interface ManualOrderSuccessModalProps {
  isOpen: boolean;
  data: ManualOrderSuccessData | null;
  onReset: () => void;
}

export function ManualOrderSuccessModal({ isOpen, data, onReset }: ManualOrderSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const formatCurrency = (amount: number | string | undefined | null) => {
    const num = Number(amount ?? 0);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(isNaN(num) ? 0 : num);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback if clipboard API fails
      const el = document.createElement('textarea');
      el.value = data.paymentUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-50 px-6 py-5 border-b border-emerald-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-emerald-500/20">
            ✓
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-slate-900">Payment Link Created</h3>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">
              Order {data.orderNumber} is created & stock is reserved for 24 hours.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Order Amount</span>
              <p className="text-2xl font-bold font-heading text-slate-900 mt-0.5">
                {formatCurrency(data.total ?? data.amount)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Order Reference</span>
              <p className="text-sm font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 mt-0.5">
                {data.orderNumber}
              </p>
            </div>
          </div>

          {/* Payment Link URL Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Customer Payment Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={data.paymentUrl}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#1E293B] hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Send this link to the customer over Instagram, WhatsApp, or email. No account required to pay.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href={data.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-heading font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 text-center transition-colors flex items-center justify-center gap-1.5"
            >
              🔗 Open Payment Page ↗
            </a>
            <Link
              href={`/admin/orders/${data.orderId}`}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-heading font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 text-center transition-colors flex items-center justify-center gap-1.5"
            >
              📦 View Order Details
            </Link>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onReset}
            className="px-5 py-2.5 rounded-xl text-xs font-heading font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors shadow-xs cursor-pointer"
          >
            + Create Another Order
          </button>
        </div>
      </div>
    </div>
  );
}
