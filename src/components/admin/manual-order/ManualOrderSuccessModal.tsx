'use client';

import React, { useState } from 'react';
import Button from '@/components/Button';

export interface ManualOrderSuccessData {
  orderId: string;
  orderNumber: string;
  paymentRequestId?: string;
  token?: string;
  amount: number;
  subtotal?: number;
  discountTotal?: number;
  shippingFee?: number;
  total?: number;
  paymentUrl?: string | null;
  expiresAt?: string | null;
  alreadyPaid?: boolean;
}

interface ManualOrderSuccessModalProps {
  isOpen: boolean;
  data: ManualOrderSuccessData | null;
  onReset?: () => void;
  onClose?: () => void;
}

export function ManualOrderSuccessModal({ isOpen, data, onReset, onClose }: ManualOrderSuccessModalProps) {
  const handleClose = onReset || onClose || (() => {});
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const isAlreadyPaid = Boolean(data.alreadyPaid || !data.paymentUrl);

  const formatCurrency = (amount: number | string | undefined | null) => {
    const num = Number(amount ?? 0);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(isNaN(num) ? 0 : num);
  };

  const handleCopyLink = async () => {
    if (!data.paymentUrl) return;
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
      <div className="bg-bg-surface rounded-3xl shadow-2xl border border-border-default w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-status-success-bg px-6 py-5 border-b border-status-success-accent/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-status-success-accent text-neutral-white flex items-center justify-center text-xl font-bold shadow-md shadow-status-success-accent/20">
            ✓
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-text-primary">
              {isAlreadyPaid ? 'Manual Order Confirmed' : 'Payment Link Created'}
            </h3>
            <p className="text-xs text-status-success-text font-medium mt-0.5">
              {isAlreadyPaid
                ? `Order ${data.orderNumber} is confirmed & payment recorded successfully.`
                : `Order ${data.orderNumber} is created & stock is reserved for 24 hours.`}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-bg-subtle border border-border-default flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Total Order Amount</span>
              <p className="text-2xl font-bold font-heading text-text-primary mt-0.5">
                {formatCurrency(data.total ?? data.amount)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-text-secondary">Order Reference</span>
              <p className="text-sm font-mono font-bold text-text-primary bg-bg-surface px-2.5 py-1 rounded-lg border border-border-default mt-0.5">
                {data.orderNumber}
              </p>
            </div>
          </div>

          {/* If already paid: show payment confirmation status card */}
          {isAlreadyPaid ? (
            <div className="p-4 rounded-2xl bg-status-success-bg/40 border border-status-success-accent/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Payment Status</span>
                <span className="text-xs font-bold text-status-success-text bg-status-success-bg px-2.5 py-0.5 rounded-full border border-status-success-accent/40">
                  ✓ Paid / Confirmed Offline
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Offline payment has been verified and recorded immediately. Inventory has been allocated and the order is ready for picking and fulfillment. No customer payment link is needed.
              </p>
            </div>
          ) : (
            /* Otherwise: Payment Link URL Box */
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary">Customer Payment Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={data.paymentUrl || ''}
                  aria-label="Customer Payment Link"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-bg-subtle border border-border-default rounded-xl text-text-primary focus:outline-hidden"
                />
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  variant={copied ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-xl font-heading font-bold whitespace-nowrap shadow-xs"
                >
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </Button>
              </div>
              <p className="text-[11px] text-text-tertiary">
                Send this link to the customer over Instagram, WhatsApp, or email. No account required to pay.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`grid ${isAlreadyPaid ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3 pt-2`}>
            {!isAlreadyPaid && data.paymentUrl && (
              <Button
                href={data.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="sm"
                className="w-full justify-center rounded-xl font-heading font-bold"
              >
                🔗 Open Payment Page ↗
              </Button>
            )}
            <Button
              href={`/admin/orders/${data.orderId}`}
              variant={isAlreadyPaid ? 'primary' : 'outline'}
              size="sm"
              className="w-full justify-center rounded-xl font-heading font-bold"
            >
              📦 View Order Details
            </Button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-bg-subtle border-t border-border-default flex items-center justify-end">
          <Button
            type="button"
            onClick={handleClose}
            variant={isAlreadyPaid ? 'outline' : 'primary'}
            size="sm"
            className="rounded-xl font-heading font-bold shadow-xs"
          >
            + Create Another Order
          </Button>
        </div>
      </div>
    </div>
  );
}
