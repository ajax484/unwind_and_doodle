'use client';

import React from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import Button from '@/components/Button';
import { ManualOrderForm } from '@/components/admin/manual-order/ManualOrderForm';

export default function CreateManualOrderPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        size="sm"
        showHome={false}
        items={[
          { label: 'Orders', href: '/admin/orders' },
          { label: 'Create Manual Order', isCurrent: true },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary tracking-tight">
            Create Manual Order
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Create an order for a customer and send them a payment link.
          </p>
        </div>
        <Button
          href="/admin/orders"
          variant="outline"
          size="sm"
          className="rounded-xl font-heading font-bold shadow-xs self-start sm:self-auto"
        >
          ← Back to Orders
        </Button>
      </div>

      {/* Manual Order Form */}
      <ManualOrderForm />
    </div>
  );
}
