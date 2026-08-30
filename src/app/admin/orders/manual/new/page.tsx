'use client';

import React from 'react';
import Link from 'next/link';
import { ManualOrderForm } from '@/components/admin/manual-order/ManualOrderForm';

export default function CreateManualOrderPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/admin/orders" className="hover:text-slate-800 transition-colors">
          Orders
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">Create Manual Order</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 tracking-tight">
            Create Manual Order
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create an order for a customer and send them a payment link.
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="px-4 py-2 rounded-xl text-xs font-heading font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto"
        >
          ← Back to Orders
        </Link>
      </div>

      {/* Manual Order Form */}
      <ManualOrderForm />
    </div>
  );
}
