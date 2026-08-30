'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminOrderDetail } from '@/types/admin-order';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  // Modal form inputs
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('GIG Logistics');
  const [cancelReason, setCancelReason] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const fetchOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setOrder(json.data);
      } else {
        throw new Error(json.error || 'Failed to load order details');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleRevalidatePayment = async (targetPaymentId?: string) => {
    try {
      setRevalidating(true);
      setError(null);
      setActionSuccess(null);

      const res = await fetch('/api/admin/payments/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: targetPaymentId,
          orderId: orderId,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.data?.verified) {
          setActionSuccess('✓ Payment revalidated and confirmed with gateway! Order updated.');
        } else if (json.data?.status === 'failed') {
          setError('Gateway confirmed this transaction failed.');
        } else {
          setActionSuccess('ℹ️ Payment recheck completed: Still awaiting completion at gateway.');
        }
        await fetchOrderDetail();
      } else {
        throw new Error(json.error || 'Failed to revalidate payment');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment revalidation failed');
    } finally {
      setRevalidating(false);
    }
  };

  const handleTransition = async (targetStatus: string, payload: Record<string, unknown> = {}) => {
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          ...payload,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess(`Order successfully transitioned to ${targetStatus}!`);
        setShowConfirmModal(false);
        setShowShipModal(false);
        setShowCancelModal(false);
        await fetchOrderDetail();
      } else {
        throw new Error(json.error || `Failed to transition order to ${targetStatus}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: refundReason.trim() || 'Admin initiated full refund',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('Full refund processed successfully via Paystack!');
        setShowRefundModal(false);
        await fetchOrderDetail();
      } else {
        throw new Error(json.error || 'Failed to process refund');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refund processing failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !order) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-red-200 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-heading font-bold text-lg text-slate-800">Order Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/admin/orders"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const currentStatus = order.status;
  const isPending = currentStatus === 'pending';
  const isConfirmed = currentStatus === 'confirmed';
  const isShipped = currentStatus === 'shipped';
  const isReceived = currentStatus === 'received';
  const isCancelled = currentStatus === 'cancelled';
  const isRefunded = currentStatus === 'refunded';

  const isEligibleForCancellation = ['created', 'pending', 'confirmed', 'shipped'].includes(currentStatus);
  const isEligibleForRefund = !isRefunded && currentStatus !== 'created';

  return (
    <div className="space-y-8">
      {/* 1. Top Breadcrumb & Actions Bar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/admin/orders" className="hover:text-slate-600 transition-colors">
            ← Back to Orders
          </Link>
          <span>/</span>
          <span className="font-mono text-slate-600 font-bold">{order.orderNumber}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-bold font-heading text-slate-900 font-mono tracking-tight">
                {order.orderNumber}
              </h2>
              <OrderStatusBadge status={order.status} />
              <OrderStatusBadge
                status={order.paymentStatus || 'pending'}
                type="payment"
              />
            </div>
            <p className="text-xs text-slate-500">
              Placed on <strong className="text-slate-700">{formatDate(order.createdAt)}</strong> • Warehouse: {order.warehouse.name || 'Main Hub'}
            </p>
          </div>

          {/* Action Buttons based on state machine */}
          <div className="flex flex-wrap items-center gap-2.5">
            {((order.paymentStatus || 'pending') === 'pending' || order.status === 'created') && (
              <button
                type="button"
                onClick={() => handleRevalidatePayment()}
                disabled={revalidating || actionLoading}
                className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold font-heading shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {revalidating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    Revalidating...
                  </>
                ) : (
                  <>
                    <span>🔄</span> Revalidate Payment
                  </>
                )}
              </button>
            )}

            {isPending && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                ✓ Confirm Order
              </button>
            )}

            {isConfirmed && (
              <button
                type="button"
                onClick={() => setShowShipModal(true)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                🚚 Mark as Shipped
              </button>
            )}

            {isShipped && (
              <button
                type="button"
                onClick={() => handleTransition('received')}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-heading shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                📦 Mark as Received
              </button>
            )}

            {isEligibleForCancellation && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}

            {isEligibleForRefund && (
              <button
                type="button"
                onClick={() => setShowRefundModal(true)}
                disabled={actionLoading}
                className="px-3.5 py-2.5 rounded-xl border border-purple-200 hover:bg-purple-50 text-purple-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Refund Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2">
          <span>✓</span> {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* 2. Main Order Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Order Items & Customizations & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Order Items ({order.items.length})
            </h3>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-heading font-bold text-sm text-slate-800">
                        {item.productName}
                      </div>
                      {item.sku && (
                        <div className="font-mono text-[11px] text-slate-400">
                          SKU: {item.sku}
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-heading font-bold text-sm text-slate-900">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Add-ons list if present */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="pl-4 border-l-2 border-slate-200 space-y-1.5 bg-slate-50/50 p-2.5 rounded-r-xl text-xs">
                      <span className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider block">
                        Included Add-ons:
                      </span>
                      {item.addons.map((addon) => (
                        <div key={addon.id} className="flex items-center justify-between text-slate-700">
                          <span>
                            + {addon.addonName} (×{addon.quantity})
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(addon.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customization Details if present */}
                  {item.customization && (
                    <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rose-800 flex items-center gap-1.5">
                          <span>🎨</span> Custom Keepsake Drawing
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          {item.customization.status}
                        </span>
                      </div>

                      {item.customization.notes && (
                        <div className="text-slate-700 bg-white p-2.5 rounded-xl border border-rose-100/60">
                          <strong className="text-slate-900 block text-[11px]">Customer Note:</strong>
                          {item.customization.notes}
                        </div>
                      )}

                      {item.customization.assets && item.customization.assets.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-600 block">
                            Uploaded Photos ({item.customization.assets.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {item.customization.assets.map((asset, idx) => (
                              <a
                                key={asset.id}
                                href={asset.assetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 text-xs font-semibold shadow-2xs transition-colors"
                              >
                                <span>📷</span> Photo #{idx + 1} ↗
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.discountTotal) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied</span>
                  <span>-{formatCurrency(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-heading font-bold text-base text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="text-rose-500">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Order Lifecycle Timeline */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Order Timeline &amp; Status History
            </h3>

            {order.statusHistory.length === 0 ? (
              <div className="text-xs text-slate-400">No status transitions recorded yet.</div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {order.statusHistory.map((hist) => (
                  <div key={hist.id} className="relative space-y-1">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white ring-2 ring-slate-100" />
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={hist.status} />
                      <span className="text-[11px] text-slate-400">{formatDate(hist.createdAt)}</span>
                    </div>
                    {hist.note && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {hist.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Customer, Shipping & Payment Cards */}
        <div className="space-y-6">
          {/* Customer Information Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Customer Information
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Name</span>
                <span className="text-slate-800 font-semibold text-sm">
                  {order.customer.firstName || order.customer.lastName
                    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                    : 'Guest Customer'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email</span>
                <a
                  href={`mailto:${order.customer.email}`}
                  className="text-rose-500 hover:underline font-semibold break-all"
                >
                  {order.customer.email}
                </a>
              </div>

              {order.customer.phone && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone</span>
                  <a href={`tel:${order.customer.phone}`} className="text-slate-800 font-semibold">
                    {order.customer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Information Snapshot Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Delivery Address Snapshot
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">
                {order.shippingAddress.streetAddress || 'Address on file'}
              </div>
              <div>
                {order.shippingAddress.city && `${order.shippingAddress.city}, `}
                {order.shippingAddress.state}
              </div>
              {order.shippingAddress.postalCode && (
                <div className="text-slate-400">Postal Code: {order.shippingAddress.postalCode}</div>
              )}
              <div className="pt-2 text-[11px] text-slate-400">
                Destination State: <strong className="text-slate-700">{order.location.name}</strong>
              </div>
            </div>
          </div>

          {/* Payment Information Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Payment Record
            </h3>
            {order.payments.length === 0 ? (
              <div className="text-xs text-slate-400">No payment records found.</div>
            ) : (
              <div className="space-y-2 text-xs">
                {order.payments.map((p) => (
                  <div key={p.id} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
                        {p.provider}
                      </span>
                      <OrderStatusBadge status={p.status} type="payment" />
                    </div>
                    <div className="font-heading font-bold text-slate-900 text-sm">
                      {formatCurrency(p.amount)}
                    </div>
                    {p.providerReference && (
                      <div className="font-mono text-[10px] text-slate-400 break-all">
                        Ref: {p.providerReference}
                      </div>
                    )}
                    {p.paidAt && (
                      <div className="text-[11px] text-slate-500">
                        Paid on: {formatDate(p.paidAt)}
                      </div>
                    )}
                    {p.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleRevalidatePayment(p.id)}
                        disabled={revalidating || actionLoading}
                        className="w-full mt-2 py-1.5 px-3 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        {revalidating ? (
                          <>
                            <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                            Checking Gateway...
                          </>
                        ) : (
                          <>
                            <span>🔄</span> Revalidate with Gateway
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Confirm Order Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-heading font-bold text-lg text-slate-900">Confirm This Order?</h4>
              <p className="text-xs text-slate-500">
                This will move the order from <strong>Pending</strong> to <strong>Confirmed</strong>, signifying that items and customization specifications have been verified.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTransition('confirmed', { note: 'Order confirmed by administrator' })}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Confirming...' : 'Yes, Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Ship Order Modal */}
      {showShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto">
              🚚
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-heading font-bold text-lg text-slate-900">Ship Order</h4>
              <p className="text-xs text-slate-500">
                Enter delivery tracking details for <strong>{order.orderNumber}</strong>.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Courier / Carrier</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. GIG Logistics, DHL, Dispatch"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Tracking Number / Waybill</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. GIG-LAG-982319"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowShipModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleTransition('shipped', {
                    trackingNumber: trackingNumber.trim() || undefined,
                    carrier: carrier.trim() || undefined,
                    note: `Shipped via ${carrier.trim()} (Tracking: ${trackingNumber.trim() || 'N/A'})`,
                  })
                }
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Confirm Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-heading font-bold text-lg text-slate-900">Cancel Order?</h4>
              <p className="text-xs text-slate-500">
                This will cancel order <strong>{order.orderNumber}</strong> and release any active inventory holds.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Cancellation Reason</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (e.g. Customer request, Out of stock)"
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => handleTransition('cancelled', { note: cancelReason.trim() || 'Cancelled by administrator' })}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Refund Order Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl mx-auto">
              💸
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-heading font-bold text-lg text-slate-900">Process Full Refund</h4>
              <p className="text-xs text-slate-500">
                Refund full payment of <strong className="text-purple-700 font-bold">{formatCurrency(order.totalAmount)}</strong> back to the customer via Paystack.
              </p>
            </div>

            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1">
              <div className="font-semibold">⚠️ Irreversible Transaction</div>
              <p className="text-[11px] text-purple-700">
                Paystack will credit the customer&apos;s original bank account/card directly.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Internal Refund Note</label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Defective print, Customer returned item"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRefund}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Refunding...' : `Refund ${formatCurrency(order.totalAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
