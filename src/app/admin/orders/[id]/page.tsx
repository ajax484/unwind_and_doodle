"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminOrderDetail } from "@/types/admin-order";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import TextInput from "@/components/TextInput";
import Textarea from "@/components/Textarea";
import AlertBanner from "@/components/AlertBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import Skeleton from "@/components/Skeleton";

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

  // Manual payment confirmation state
  const [manualPaymentToConfirm, setManualPaymentToConfirm] = useState<{
    id: string;
    amount: number;
    providerReference?: string | null;
    bankDetails?: {
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
    } | null;
  } | null>(null);
  const [confirmingManualPayment, setConfirmingManualPayment] = useState(false);
  const [manualPaymentNote, setManualPaymentNote] = useState("");

  // Modal form inputs
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("GIG Logistics");
  const [cancelReason, setCancelReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [timelineFilter, setTimelineFilter] = useState<"all" | "status" | "audit">("all");

  const fetchOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setOrder(json.data);
      } else {
        throw new Error(json.error || "Failed to load order details");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading order");
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

      const res = await fetch("/api/admin/payments/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: targetPaymentId,
          orderId: orderId,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.data?.verified) {
          setActionSuccess(
            "✓ Payment revalidated and confirmed with gateway! Order updated.",
          );
        } else if (json.data?.status === "failed") {
          setError("Gateway confirmed this transaction failed.");
        } else {
          setActionSuccess(
            "ℹ️ Payment recheck completed: Still awaiting completion at gateway.",
          );
        }
        await fetchOrderDetail();
      } else {
        throw new Error(json.error || "Failed to revalidate payment");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Payment revalidation failed",
      );
    } finally {
      setRevalidating(false);
    }
  };

  const handleConfirmManualPayment = async () => {
    if (!manualPaymentToConfirm) return;

    try {
      setConfirmingManualPayment(true);
      setError(null);
      setActionSuccess(null);

      const res = await fetch("/api/admin/payments/manual/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: manualPaymentToConfirm.id,
          orderId: orderId,
          note: manualPaymentNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess(
          json.data?.alreadyProcessed
            ? "Payment was already confirmed previously."
            : "✓ Bank transfer payment confirmed successfully! Order fulfilled and moved to processing."
        );
        setManualPaymentToConfirm(null);
        setManualPaymentNote("");
        await fetchOrderDetail();
      } else {
        throw new Error(json.error || "Failed to confirm bank transfer");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error confirming bank transfer");
    } finally {
      setConfirmingManualPayment(false);
    }
  };

  const handleTransition = async (
    targetStatus: string,
    payload: Record<string, unknown> = {},
  ) => {
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(
          json.error || `Failed to transition order to ${targetStatus}`,
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status transition failed");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: refundReason.trim() || "Admin initiated full refund",
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess("Full refund processed successfully via Paystack!");
        setShowRefundModal(false);
        await fetchOrderDetail();
      } else {
        throw new Error(json.error || "Failed to process refund");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refund processing failed");
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !order) {
    return (
      <div className="space-y-6 p-4 sm:p-6" data-testid="order-detail-skeleton">
        <div className="flex flex-col gap-2">
          <Skeleton type="text" size="sm" className="w-36 h-4" />
          <Skeleton type="custom" className="h-24 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton type="custom" className="h-96 w-full rounded-2xl" />
            <Skeleton type="custom" className="h-48 w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton type="custom" className="h-44 w-full rounded-2xl" />
            <Skeleton type="custom" className="h-44 w-full rounded-2xl" />
            <Skeleton type="custom" className="h-56 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-8 rounded-2xl bg-bg-surface border border-status-danger-accent/30 text-center space-y-4 shadow-card max-w-lg mx-auto my-12">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-heading font-bold text-lg text-text-primary">
          Order Not Found
        </h3>
        <p className="text-xs text-text-secondary">{error}</p>
        <Button
          href="/admin/orders"
          variant="primary"
          size="sm"
        >
          ← Return to Orders
        </Button>
      </div>
    );
  }

  if (!order) return null;

  const currentStatus = order.status;
  const isPending = currentStatus === "pending";
  const isConfirmed = currentStatus === "confirmed";
  const isShipped = currentStatus === "shipped";
  const isEligibleForCancellation = [
    "created",
    "pending",
    "confirmed",
    "shipped",
  ].includes(currentStatus);
  const isEligibleForRefund =
    currentStatus !== "refunded" && currentStatus !== "created";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Top Breadcrumb & Actions Bar */}
      <div className="space-y-4">
        <Breadcrumbs
          size="md"
          showHome={false}
          items={[
            { label: "Orders", href: "/admin/orders" },
            { label: order.orderNumber, isCurrent: true },
          ]}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bg-surface p-5 sm:p-6 rounded-2xl border border-border-default shadow-card">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-text-primary font-mono tracking-tight">
                {order.orderNumber}
              </h2>
              <OrderStatusBadge status={order.status} />
              <OrderStatusBadge
                status={order.paymentStatus || "pending"}
                type="payment"
              />
            </div>
            <p className="text-xs text-text-secondary">
              Placed on{" "}
              <strong className="text-text-primary">
                {formatDate(order.createdAt)}
              </strong>{" "}
              • Warehouse: {order.warehouse.name || "Main Hub"}
            </p>
          </div>

          {/* Action Buttons based on state machine */}
          <div className="flex flex-wrap items-center gap-2.5">
            {((order.paymentStatus || "pending") === "pending" ||
              order.status === "created") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRevalidatePayment()}
                disabled={revalidating || actionLoading}
                loading={revalidating}
              >
                <span>🔄</span> Revalidate Payment
              </Button>
            )}

            {isPending && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowConfirmModal(true)}
                disabled={actionLoading}
              >
                ✓ Confirm Order
              </Button>
            )}

            {isConfirmed && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowShipModal(true)}
                disabled={actionLoading}
              >
                🚚 Mark as Shipped
              </Button>
            )}

            {isShipped && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTransition("received")}
                disabled={actionLoading}
              >
                📦 Mark as Received
              </Button>
            )}

            {isEligibleForCancellation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
              >
                Cancel Order
              </Button>
            )}

            {isEligibleForRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefundModal(true)}
                disabled={actionLoading}
              >
                Refund Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      {actionSuccess && (
        <AlertBanner
          variant="success"
          size="sm"
          title={actionSuccess}
        />
      )}

      {error && (
        <AlertBanner
          variant="danger"
          size="sm"
          title={error}
        />
      )}

      {/* 2. Main Order Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Order Items & Customizations & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-default shadow-card space-y-4">
            <h3 className="font-heading font-bold text-base text-text-primary border-b border-border-default pb-3">
              Order Items ({order.items.length})
            </h3>

            <div className="divide-y divide-border-default">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
                        <span>{item.productName}</span>
                        {(item.productType === "bundle" ||
                          (item.bundleComponents &&
                            item.bundleComponents.length > 0)) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                            📦 Bundle Set
                          </span>
                        )}
                      </div>
                      {item.sku && (
                        <div className="font-mono text-[11px] text-text-tertiary">
                          SKU: {item.sku}
                        </div>
                      )}
                      <div className="text-xs text-text-secondary">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-heading font-bold text-sm text-text-primary">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Bundle Components List if present */}
                  {item.bundleComponents &&
                    item.bundleComponents.length > 0 && (
                      <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 space-y-1.5 text-xs text-purple-900">
                        <div className="flex items-center justify-between text-purple-900 font-heading font-bold text-[11px] uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <span>📦</span> Included Bundle Components
                          </span>
                          <span className="text-[10px] text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full font-semibold">
                            {item.bundleComponents.length} component products
                          </span>
                        </div>
                        <div className="space-y-1 pt-1.5 border-t border-purple-100 text-purple-900">
                          {item.bundleComponents.map((comp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between"
                            >
                              <span>• {comp.name}</span>
                              <span className="font-semibold font-mono text-[11px]">
                                {comp.quantityPerBundle} / bundle (
                                {comp.totalQuantity} total)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Add-ons list if present */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="pl-4 border-l-2 border-border-default space-y-1.5 bg-bg-subtle/50 p-2.5 rounded-r-xl text-xs">
                      <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider block">
                        Included Add-ons:
                      </span>
                      {item.addons.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between text-text-secondary"
                        >
                          <span>
                            + {addon.addonName} (×{addon.quantity})
                          </span>
                          <span className="font-semibold text-text-primary">
                            {formatCurrency(addon.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coloring Book Theme Customization */}
                  {item.themeCustomization && (
                    <div className="p-3.5 bg-status-amber-bg rounded-xl border border-status-amber-accent/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-status-amber-text flex items-center gap-1.5 font-heading">
                          <span>🎨</span> Coloring Book Themes &amp; Cover
                        </span>
                        {item.themeCustomization.coverName && (
                          <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Cover: {item.themeCustomization.coverName}
                          </span>
                        )}
                      </div>

                      {item.themeCustomization.themes &&
                        item.themeCustomization.themes.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-status-amber-accent/20">
                            <span className="text-[10px] font-heading font-bold text-status-amber-text uppercase tracking-wider block">
                              Selected Themes (
                              {item.themeCustomization.themes.length}/3):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.themeCustomization.themes.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-bg-surface border border-status-amber-accent/30 text-text-primary font-medium text-xs shadow-2xs"
                                >
                                  <span>✨</span> {t.themeName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {item.themeCustomization.coverName && (
                        <div className="text-text-secondary bg-bg-surface/90 p-2.5 rounded-xl border border-status-amber-accent/20 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-text-secondary">
                            Personalized Cover Name:
                          </span>
                          <span className="font-heading font-bold text-text-primary text-xs">
                            &quot;{item.themeCustomization.coverName}&quot;
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photo & Dedication Customization Details */}
                  {item.customization && (
                    <div className="p-3.5 bg-brand-rose-subtle rounded-xl border border-border-accent/40 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-accent flex items-center gap-1.5 font-heading">
                          <span>✨</span> Custom Keepsake Artwork
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-rose-light text-text-accent">
                          {item.customization.status}
                        </span>
                      </div>

                      {item.customization.notes && (
                        <div className="text-text-secondary bg-bg-surface p-2.5 rounded-xl border border-border-accent/20">
                          <strong className="text-text-primary block text-[11px]">
                            Customer Dedication / Note:
                          </strong>
                          <p className="italic mt-0.5">
                            &quot;{item.customization.notes}&quot;
                          </p>
                        </div>
                      )}

                      {item.customization.assets &&
                        item.customization.assets.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-text-secondary block">
                              Uploaded Reference Photos (
                              {item.customization.assets.length}):
                            </span>
                            <div className="flex flex-wrap gap-2.5">
                              {item.customization.assets.map((asset, idx) => (
                                <a
                                  key={asset.id}
                                  href={asset.assetUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group relative inline-flex items-center gap-2 p-1.5 rounded-xl bg-bg-surface border border-border-default text-text-secondary hover:text-action-primary hover:border-border-accent text-xs font-semibold shadow-2xs transition-all"
                                >
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-subtle flex-shrink-0 border border-border-default">
                                    <img
                                      src={asset.assetUrl}
                                      alt={`Custom Photo ${idx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                  <span className="pr-1.5">
                                    Photo #{idx + 1} ↗
                                  </span>
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
            <div className="pt-4 border-t border-border-default space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.discountTotal) > 0 && (
                <div className="flex justify-between text-status-green-text">
                  <span>Discount Applied</span>
                  <span>-{formatCurrency(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <span>Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-heading font-bold text-base text-text-primary pt-2 border-t border-border-default">
                <span>Total Amount</span>
                <span className="text-action-primary">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Lifecycle Timeline & Audit Trail */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-default shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-text-primary">
                  Status History &amp; Audit Trail
                </h3>
                <span className="text-xs bg-bg-subtle text-text-secondary px-2 py-0.5 rounded-full border border-border-default font-medium">
                  {((order.statusHistory?.length || 0) + (order.auditLogs?.length || 0))}
                </span>
              </div>

              {/* Segmented Filter Control */}
              <div className="inline-flex rounded-lg bg-bg-subtle p-1 border border-border-default text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTimelineFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timelineFilter === "all"
                      ? "bg-bg-surface text-text-primary font-semibold shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  All ({((order.statusHistory?.length || 0) + (order.auditLogs?.length || 0))})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter("status")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timelineFilter === "status"
                      ? "bg-bg-surface text-text-primary font-semibold shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Status ({order.statusHistory?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter("audit")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timelineFilter === "audit"
                      ? "bg-bg-surface text-text-primary font-semibold shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Audit ({order.auditLogs?.length || 0})
                </button>
              </div>
            </div>

            {(() => {
              type TimelineItem =
                | {
                    type: "status";
                    id: string;
                    status: typeof order.status;
                    previousStatus: typeof order.status | null;
                    note: string | null;
                    createdBy: string | null;
                    createdAt: string;
                  }
                | {
                    type: "audit";
                    id: string;
                    userId: string | null;
                    action: string;
                    oldValues: Record<string, unknown> | null;
                    newValues: Record<string, unknown> | null;
                    createdAt: string;
                  };

              const allItems: TimelineItem[] = [
                ...(order.statusHistory || []).map((h) => ({
                  ...h,
                  type: "status" as const,
                })),
                ...(order.auditLogs || []).map((a) => ({
                  type: "audit" as const,
                  id: a.id,
                  userId: a.userId,
                  action: a.action,
                  oldValues: a.oldValues as Record<string, unknown> | null,
                  newValues: a.newValues as Record<string, unknown> | null,
                  createdAt: a.createdAt,
                })),
              ].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );

              const visibleItems = allItems.filter((item) => {
                if (timelineFilter === "status") return item.type === "status";
                if (timelineFilter === "audit") return item.type === "audit";
                return true;
              });

              if (visibleItems.length === 0) {
                return (
                  <p className="text-xs text-text-tertiary py-4 text-center">
                    No timeline records found for this filter.
                  </p>
                );
              }

              return (
                <div className="relative space-y-6 pt-2">
                  {/* Timeline line */}
                  <div className="absolute left-1.25 top-3 bottom-3 w-0.5 bg-border-default" />

                  {visibleItems.map((item) => {
                    if (item.type === "status") {
                      return (
                        <div key={`status-${item.id}`} className="relative flex gap-4">
                          {/* Timeline dot */}
                          <div className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full bg-action-primary border-2 border-bg-surface ring-2 ring-border-default" />

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <OrderStatusBadge status={item.status} size="sm" />
                              {item.previousStatus && (
                                <span className="text-[11px] text-text-tertiary">
                                  from <span className="capitalize font-medium text-text-secondary">{item.previousStatus}</span>
                                </span>
                              )}
                              <span className="text-[11px] text-text-tertiary ml-auto">
                                {formatDate(item.createdAt)}
                              </span>
                            </div>

                            {item.note && (
                              <div className="text-xs text-text-secondary bg-bg-subtle p-2.5 rounded-xl border border-border-default">
                                {item.note}
                              </div>
                            )}

                            {item.createdBy && (
                              <div className="text-[10px] text-text-tertiary">
                                Changed by: <code className="text-text-secondary font-mono">{item.createdBy.slice(0, 8)}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Audit entry
                    const operation =
                      (item.newValues?.operation as string) ||
                      (item.newValues?.action as string) ||
                      item.action;

                    return (
                      <div key={`audit-${item.id}`} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full bg-status-purple-base border-2 border-bg-surface ring-2 ring-border-default" />

                        {/* Content */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-purple-50 text-status-purple-base border border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/40">
                              Audit: {operation.replace(/^[a-z_]+\./, "")}
                            </span>
                            <span className="text-[11px] text-text-tertiary ml-auto">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>

                          {item.newValues && typeof item.newValues === "object" && (
                            <div className="text-xs text-text-secondary bg-bg-subtle p-2.5 rounded-xl border border-border-default space-y-1">
                              {Boolean(item.newValues.note) && (
                                <p className="font-medium text-text-primary">
                                  {String(item.newValues.note)}
                                </p>
                              )}
                              {Boolean(item.oldValues?.status && item.newValues?.status) && (
                                <p className="text-[11px] text-text-secondary">
                                  Status: <span className="font-medium text-text-primary">{String(item.oldValues?.status)}</span> &rarr; <span className="font-medium text-text-primary">{String(item.newValues?.status)}</span>
                                </p>
                              )}
                              {Boolean(item.newValues.provider) && (
                                <p className="text-[11px] text-text-secondary">
                                  Provider: <span className="font-medium text-text-primary">{String(item.newValues.provider)}</span> ({String(item.newValues.reference || "")})
                                </p>
                              )}
                            </div>
                          )}

                          {item.userId && (
                            <div className="text-[10px] text-text-tertiary">
                              Actor ID: <code className="text-text-secondary font-mono">{item.userId.slice(0, 8)}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Col: Customer, Shipping & Payment Cards */}
        <div className="space-y-6">
          {/* Customer Information Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-default shadow-card space-y-3">
            <h3 className="font-heading font-bold text-base text-text-primary border-b border-border-default pb-3">
              Customer Information
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                  Name
                </span>
                <span className="text-text-primary font-semibold text-sm">
                  {order.customer.firstName || order.customer.lastName
                    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                    : "Guest Customer"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                  Email
                </span>
                <a
                  href={`mailto:${order.customer.email}`}
                  className="text-action-primary hover:underline font-semibold break-all"
                >
                  {order.customer.email}
                </a>
              </div>

              {order.customer.phone && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                    Phone
                  </span>
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="text-text-primary font-semibold hover:underline"
                  >
                    {order.customer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Information Snapshot Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-default shadow-card space-y-3">
            <h3 className="font-heading font-bold text-base text-text-primary border-b border-border-default pb-3">
              Delivery Address Snapshot
            </h3>
            <div className="space-y-1.5 text-xs text-text-secondary">
              <div className="font-semibold text-text-primary">
                {order.shippingAddress.streetAddress || "Address on file"}
              </div>
              <div>
                {order.shippingAddress.city &&
                  `${order.shippingAddress.city}, `}
                {order.shippingAddress.state}
              </div>
              {order.shippingAddress.postalCode && (
                <div className="text-text-tertiary">
                  Postal Code: {order.shippingAddress.postalCode}
                </div>
              )}
              <div className="pt-2 text-[11px] text-text-tertiary">
                Destination State:{" "}
                <strong className="text-text-primary">
                  {order.location.name}
                </strong>
              </div>
            </div>
          </div>

          {/* Payment Information Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-default shadow-card space-y-3">
            <h3 className="font-heading font-bold text-base text-text-primary border-b border-border-default pb-3">
              Payment Record
            </h3>
            {order.payments.length === 0 ? (
              <div className="text-xs text-text-tertiary">
                No payment records found.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {order.payments.map((p) => {
                  const meta =
                    p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata)
                      ? (p.metadata as Record<string, unknown>)
                      : {};
                  const bankDetails = meta.bank_details as
                    | { bankName?: string; accountName?: string; accountNumber?: string }
                    | undefined;
                  const isManual = p.provider === "manual";

                  return (
                    <div
                      key={p.id}
                      className="space-y-1.5 p-3 rounded-xl bg-bg-subtle border border-border-default"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-text-secondary">
                          {isManual ? "Bank Transfer (Manual)" : p.provider}
                        </span>
                        <OrderStatusBadge status={p.status} type="payment" size="sm" />
                      </div>
                      <div className="font-heading font-bold text-text-primary text-sm">
                        {formatCurrency(p.amount)}
                      </div>
                      {p.providerReference && (
                        <div className="font-mono text-[10px] text-text-tertiary break-all">
                          Ref: {p.providerReference}
                        </div>
                      )}
                      {p.paidAt && (
                        <div className="text-[11px] text-text-tertiary">
                          Paid on: {formatDate(p.paidAt)}
                        </div>
                      )}

                      {/* Snapshotted bank details for manual payments */}
                      {isManual && bankDetails && (
                        <div className="mt-2 p-2 bg-bg-surface border border-border-default rounded-lg text-[11px] space-y-0.5">
                          <div className="font-semibold text-text-primary">
                            {bankDetails.bankName || "Bank Transfer"}
                          </div>
                          <div className="text-text-secondary">
                            {bankDetails.accountName}
                          </div>
                          <div className="font-mono text-text-tertiary">
                            {bankDetails.accountNumber}
                          </div>
                        </div>
                      )}

                      {/* Action buttons based on payment method */}
                      {p.status === "pending" && (
                        isManual ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setManualPaymentToConfirm({
                                id: p.id,
                                amount: p.amount,
                                providerReference: p.providerReference,
                                bankDetails: bankDetails || null,
                              });
                              setManualPaymentNote("");
                            }}
                            disabled={confirmingManualPayment || actionLoading}
                            className="w-full mt-2 bg-action-primary text-text-inverse hover:bg-action-primary/90"
                          >
                            <span>✅</span> Confirm Bank Transfer
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevalidatePayment(p.id)}
                            disabled={revalidating || actionLoading}
                            loading={revalidating}
                            className="w-full mt-2 border-status-warning-accent/40 bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg/80"
                          >
                            <span>🔄</span> Revalidate with Gateway
                          </Button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Confirm Order Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        size="md"
        title="Confirm This Order?"
        description="This will move the order from Pending to Confirmed, signifying that items and customization specifications have been verified."
        footer={
          <div className="flex items-center justify-end gap-3 pt-2 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setShowConfirmModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() =>
                handleTransition("confirmed", {
                  note: "Order confirmed by administrator",
                })
              }
              loading={actionLoading}
              disabled={actionLoading}
              className="bg-action-secondary text-text-inverse hover:bg-action-secondary-hover"
            >
              Yes, Confirm Order
            </Button>
          </div>
        }
      >
        <div className="w-12 h-12 rounded-2xl bg-action-secondary-bg text-action-secondary-text flex items-center justify-center text-2xl mx-auto">
          ✓
        </div>
      </Modal>

      {/* 4. Ship Order Modal */}
      <Modal
        isOpen={showShipModal}
        onClose={() => setShowShipModal(false)}
        size="md"
        title="Ship Order"
        description={`Enter delivery tracking details for ${order.orderNumber}.`}
        footer={
          <div className="flex items-center justify-end gap-3 pt-2 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setShowShipModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() =>
                handleTransition("shipped", {
                  trackingNumber: trackingNumber.trim() || undefined,
                  carrier: carrier.trim() || undefined,
                  note: `Shipped via ${carrier.trim()} (Tracking: ${trackingNumber.trim() || "N/A"})`,
                })
              }
              loading={actionLoading}
              disabled={actionLoading}
              className="bg-status-indigo-accent text-neutral-white hover:bg-status-indigo-accent/90"
            >
              Confirm Shipment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-status-indigo-bg text-status-indigo-text flex items-center justify-center text-2xl mx-auto">
            🚚
          </div>
          <div className="space-y-3">
            <TextInput
              label="Courier / Carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. GIG Logistics, DHL, Dispatch"
              size="sm"
            />
            <TextInput
              label="Tracking Number / Waybill"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. GIG-LAG-982319"
              size="sm"
            />
          </div>
        </div>
      </Modal>

      {/* 5. Cancel Order Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        size="md"
        title="Cancel Order?"
        description={`This will cancel order ${order.orderNumber} and release any active inventory holds.`}
        footer={
          <div className="flex items-center justify-end gap-3 pt-2 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setShowCancelModal(false)}
              disabled={actionLoading}
            >
              Keep Order
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={() =>
                handleTransition("cancelled", {
                  note: cancelReason.trim() || "Cancelled by administrator",
                })
              }
              loading={actionLoading}
              disabled={actionLoading}
              className="bg-status-danger-accent hover:bg-status-danger-accent/90 shadow-none text-neutral-white"
            >
              Confirm Cancellation
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-status-danger-bg text-status-danger-text flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>
          <Textarea
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (e.g. Customer request, Out of stock)"
            rows={3}
            size="sm"
          />
        </div>
      </Modal>

      {/* 6. Refund Order Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        size="md"
        title="Process Full Refund"
        description={`Refund full payment of ${formatCurrency(order.totalAmount)} back to the customer via Paystack.`}
        footer={
          <div className="flex items-center justify-end gap-3 pt-2 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setShowRefundModal(false)}
              disabled={actionLoading}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleRefund}
              loading={actionLoading}
              disabled={actionLoading}
              className="bg-status-purple-base hover:bg-status-purple-base/90 shadow-none text-neutral-white"
            >
              {actionLoading
                ? "Refunding..."
                : `Refund ${formatCurrency(order.totalAmount)}`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-status-purple-base flex items-center justify-center text-2xl mx-auto">
            💸
          </div>
          <AlertBanner
            variant="warning"
            size="sm"
            title="Irreversible Transaction"
            description="Paystack will credit the customer's original bank account/card directly."
          />
          <TextInput
            label="Internal Refund Note"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="e.g. Defective print, Customer returned item"
            size="sm"
          />
        </div>
      </Modal>

      {/* 7. Confirm Bank Transfer Modal */}
      <Modal
        isOpen={Boolean(manualPaymentToConfirm)}
        onClose={() => {
          if (!confirmingManualPayment) {
            setManualPaymentToConfirm(null);
          }
        }}
        size="md"
        title="Confirm Bank Transfer?"
        description={`You are confirming that ${manualPaymentToConfirm ? formatCurrency(manualPaymentToConfirm.amount) : ""} has been received for order ${order.orderNumber}. This will mark the payment as successful and begin order processing.`}
        footer={
          <div className="flex items-center justify-end gap-3 pt-2 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setManualPaymentToConfirm(null)}
              disabled={confirmingManualPayment}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleConfirmManualPayment}
              loading={confirmingManualPayment}
              disabled={confirmingManualPayment}
              className="bg-action-primary text-text-inverse hover:bg-action-primary/90"
            >
              Yes, Confirm Payment
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="w-12 h-12 rounded-2xl bg-status-success-bg text-status-success-text flex items-center justify-center text-2xl mx-auto">
            🏦
          </div>

          <div className="p-3.5 bg-bg-subtle border border-border-default rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-tertiary">Order Number</span>
              <span className="font-semibold text-text-primary font-mono">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-tertiary">Amount Expected</span>
              <span className="font-bold text-text-primary text-sm">
                {manualPaymentToConfirm ? formatCurrency(manualPaymentToConfirm.amount) : ""}
              </span>
            </div>
            {manualPaymentToConfirm?.providerReference && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-tertiary">Payment Reference</span>
                <span className="font-mono text-text-secondary text-[11px]">
                  {manualPaymentToConfirm.providerReference}
                </span>
              </div>
            )}
          </div>

          {manualPaymentToConfirm?.bankDetails && (
            <div className="p-3 bg-bg-surface border border-border-default rounded-xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Snapshotted Bank Details
              </div>
              <div className="text-text-primary font-semibold">
                {manualPaymentToConfirm.bankDetails.bankName}
              </div>
              <div className="text-text-secondary">
                {manualPaymentToConfirm.bankDetails.accountName} &bull;{" "}
                <span className="font-mono">{manualPaymentToConfirm.bankDetails.accountNumber}</span>
              </div>
            </div>
          )}

          <TextInput
            label="Internal Audit Note (Optional)"
            value={manualPaymentNote}
            onChange={(e) => setManualPaymentNote(e.target.value)}
            placeholder="e.g. Verified transfer via Zenith corporate bank account"
            size="sm"
          />
        </div>
      </Modal>
    </div>
  );
}

