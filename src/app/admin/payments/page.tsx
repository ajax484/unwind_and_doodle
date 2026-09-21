"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AdminPaymentListItem,
  AdminPaymentListResponse,
  AdminPaymentDetail,
} from "@/types/payment-management";
import Button from "@/components/Button";
import { Tabs, type TabItem } from "@/components/Tabs";
import TextInput from "@/components/TextInput";
import Select from "@/components/Select";
import AlertBanner from "@/components/AlertBanner";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import { Pagination } from "@/components/Pagination";

function PaymentsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query state
  const statusParam = searchParams.get("status") || "all";
  const providerParam = searchParams.get("provider") || "all";
  const searchParam = searchParams.get("search") || "";
  const sortParam = searchParams.get("sortBy") || "newest";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState<AdminPaymentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParam);

  // Detail Modal & Refund state
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<AdminPaymentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState<string>("");
  const [refundReasonInput, setRefundReasonInput] = useState<string>("");
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const updateFilters = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(newParams)) {
        if (v === undefined || v === "" || v === "all") {
          params.delete(k);
        } else {
          params.set(k, String(v));
        }
      }
      router.push(`/admin/payments?${params.toString()}`);
    },
    [router, searchParams]
  );

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusParam && statusParam !== "all") params.set("status", statusParam);
      if (providerParam && providerParam !== "all") params.set("provider", providerParam);
      if (searchParam) params.set("search", searchParam);
      if (sortParam) params.set("sortBy", sortParam);
      if (pageParam > 1) params.set("page", String(pageParam));
      params.set("limit", "25");

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch payment records");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading payments");
    } finally {
      setLoading(false);
    }
  }, [statusParam, providerParam, searchParam, sortParam, pageParam]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const loadPaymentDetail = async (id: string) => {
    try {
      setSelectedPaymentId(id);
      setLoadingDetail(true);
      setRefundError(null);
      const res = await fetch(`/api/admin/payments/${id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setPaymentDetail(json.data);
        setRefundAmountInput(String(json.data.remainingRefundable || json.data.amount));
      } else {
        throw new Error(json.error || "Failed to load payment detail");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching payment detail");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    router.push("/admin/payments");
  };

  const formatCurrency = (amount: number, currency = "NGN") => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const handleExecuteRefund = async () => {
    if (!paymentDetail) return;
    const amountVal = parseFloat(refundAmountInput);

    if (isNaN(amountVal) || amountVal <= 0) {
      setRefundError("Please enter a valid refund amount greater than 0");
      return;
    }

    if (amountVal > paymentDetail.remainingRefundable) {
      setRefundError(
        `Refund amount cannot exceed refundable balance (${formatCurrency(paymentDetail.remainingRefundable)})`
      );
      return;
    }

    try {
      setProcessingRefund(true);
      setRefundError(null);

      const res = await fetch(`/api/admin/payments/${paymentDetail.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountVal,
          reason: refundReasonInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess(
          `✓ ${json.data.message || "Refund executed successfully!"}`
        );
        setShowRefundModal(false);
        setRefundReasonInput("");
        await loadPaymentDetail(paymentDetail.id);
        await fetchPayments();
      } else {
        throw new Error(json.error || "Failed to execute refund");
      }
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : "Error executing refund");
    } finally {
      setProcessingRefund(false);
    }
  };

  // Status Tabs
  const statusTabs: TabItem[] = [
    { id: "all", label: "All Payments" },
    { id: "successful", label: "Successful" },
    { id: "pending", label: "Pending" },
    { id: "refunded", label: "Refunded" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary tracking-tight">
            Payments & Transactions
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Audit historical payments, gateway verifications, manual bank confirmations, and provider-aware refunds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={loading}
          >
            <span>🔄</span> Refresh
          </Button>
          <Link href="/admin/settings/payments">
            <Button variant="secondary" size="sm">
              <span>⚙️</span> Payment Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Global feedback alerts */}
      {actionSuccess && (
        <AlertBanner
          variant="success"
          size="md"
          title="Payment Action Complete"
          description={actionSuccess}
          dismissible
          onDismiss={() => setActionSuccess(null)}
        />
      )}

      {error && (
        <AlertBanner
          variant="danger"
          size="md"
          title="Payment Operation Failed"
          description={error}
          dismissible
          onDismiss={() => setError(null)}
        />
      )}

      {/* 2. Filters & Search Toolbar */}
      <div className="space-y-4">
        <Tabs
          tabs={statusTabs}
          activeTab={statusParam}
          onChange={(tabId) => updateFilters({ status: tabId, page: 1 })}
          style="underline"
        />

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-bg-surface p-4 rounded-2xl border border-border-default shadow-card">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="sm:col-span-6 flex gap-2">
            <TextInput
              placeholder="Search by Order #, Ref, Payment ID, Email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full"
              size="sm"
            />
            <Button variant="primary" size="sm" type="submit">
              Search
            </Button>
          </form>

          {/* Provider Filter */}
          <div className="sm:col-span-3">
            <Select
              value={providerParam}
              onChange={(e) => updateFilters({ provider: e.target.value, page: 1 })}
              options={[
                { value: "all", label: "All Payment Methods" },
                { value: "paystack", label: "Paystack" },
                { value: "flutterwave", label: "Flutterwave" },
                { value: "manual", label: "Bank Transfer (Manual)" },
              ]}
              size="sm"
            />
          </div>

          {/* Sort By */}
          <div className="sm:col-span-3">
            <Select
              value={sortParam}
              onChange={(e) => updateFilters({ sortBy: e.target.value, page: 1 })}
              options={[
                { value: "newest", label: "Sort: Newest First" },
                { value: "oldest", label: "Sort: Oldest First" },
                { value: "highest_amount", label: "Sort: Highest Amount" },
                { value: "lowest_amount", label: "Sort: Lowest Amount" },
              ]}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Payments Table View */}
      {loading ? (
        <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-card space-y-4">
          <Skeleton type="text" size="lg" className="w-1/3" />
          <Skeleton type="custom" className="w-full h-[220px]" />
        </div>
      ) : !data || data.payments.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="No payment records match your selected filters."
          primaryAction={{
            label: "Clear All Filters",
            onClick: handleClearFilters,
          }}
        />
      ) : (
        <div className="bg-bg-surface rounded-2xl border border-border-default shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-bg-subtle text-text-tertiary uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-text-secondary">
                {data.payments.map((p) => {
                  const isManual = p.provider === "manual";
                  const isRefunded = p.status === "refunded" || p.refundedAmount > 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-bg-subtle/60 transition-colors duration-150 cursor-pointer"
                      onClick={() => loadPaymentDetail(p.id)}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap text-text-primary font-medium">
                        {formatDate(p.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-action-primary hover:underline">
                        <Link
                          href={`/admin/orders/${p.orderId}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.orderNumber}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 max-w-[180px] truncate">
                        <div className="font-semibold text-text-primary truncate">
                          {p.customer.name}
                        </div>
                        <div className="text-[11px] text-text-tertiary truncate">
                          {p.customer.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-default font-medium text-text-primary text-[11px]">
                          <span>{isManual ? "🏦" : "💳"}</span>
                          {p.providerLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-text-primary text-sm font-heading">
                          {formatCurrency(p.amount, p.currency)}
                        </div>
                        {isRefunded && (
                          <div className="text-[10px] text-status-purple-base font-medium">
                            Refunded: {formatCurrency(p.refundedAmount, p.currency)}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <OrderStatusBadge status={p.status} type="payment" size="sm" />
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-text-tertiary max-w-[140px] truncate">
                        {p.providerReference || p.id.slice(0, 10)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadPaymentDetail(p.id);
                          }}
                        >
                          Details ➔
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {data.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-border-default bg-bg-subtle/40 flex items-center justify-between">
              <span className="text-xs text-text-tertiary">
                Showing {data.payments.length} of {data.pagination.total} payments
              </span>
              <Pagination
                currentPage={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onPageChange={(p) => updateFilters({ page: p })}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. Payment Details Drawer / Modal */}
      <Modal
        isOpen={Boolean(selectedPaymentId)}
        onClose={() => {
          setSelectedPaymentId(null);
          setPaymentDetail(null);
        }}
        size="lg"
        title="Payment Record Details"
        description={
          paymentDetail
            ? `Transaction for Order ${paymentDetail.orderNumber} via ${paymentDetail.providerLabel}`
            : "Loading payment..."
        }
        footer={
          <div className="flex items-center justify-between w-full pt-2">
            <div>
              {paymentDetail && (
                <Link
                  href={`/admin/orders/${paymentDetail.orderId}`}
                  className="text-xs font-semibold text-action-primary hover:underline"
                >
                  View Related Order #{paymentDetail.orderNumber} ↗
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setSelectedPaymentId(null);
                  setPaymentDetail(null);
                }}
              >
                Close
              </Button>

              {paymentDetail && paymentDetail.isRefundable && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowRefundModal(true)}
                  className="bg-status-purple-base hover:bg-status-purple-base/90 text-neutral-white shadow-none"
                >
                  <span>💸</span>{" "}
                  {paymentDetail.provider === "manual" ? "Record Manual Refund" : "Refund Payment"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {loadingDetail || !paymentDetail ? (
          <div className="p-6 space-y-4">
            <Skeleton type="text" size="lg" className="w-1/2" />
            <Skeleton type="custom" className="w-full h-[160px]" />
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-bg-subtle border border-border-default">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                  Status
                </span>
                <div className="mt-1">
                  <OrderStatusBadge status={paymentDetail.status} type="payment" size="sm" />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                  Method
                </span>
                <span className="text-text-primary font-semibold text-xs block mt-1">
                  {paymentDetail.providerLabel}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                  Amount
                </span>
                <span className="text-text-primary font-bold text-sm font-heading block mt-0.5">
                  {formatCurrency(paymentDetail.amount, paymentDetail.currency)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">
                  Refundable Balance
                </span>
                <span
                  className={`font-semibold text-xs block mt-1 ${
                    paymentDetail.remainingRefundable > 0 ? "text-status-success-text" : "text-text-tertiary"
                  }`}
                >
                  {formatCurrency(paymentDetail.remainingRefundable, paymentDetail.currency)}
                </span>
              </div>
            </div>

            {/* Transaction Metadata & Identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg-surface border border-border-default space-y-2">
                <h4 className="font-bold text-text-primary border-b border-border-default pb-2">
                  Transaction Info
                </h4>
                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Payment ID:</span>
                    <span className="font-mono text-[11px] text-text-primary">{paymentDetail.id}</span>
                  </div>
                  {paymentDetail.providerReference && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Provider Reference:</span>
                      <span className="font-mono text-[11px] text-text-primary font-bold">
                        {paymentDetail.providerReference}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Created:</span>
                    <span>{formatDate(paymentDetail.createdAt)}</span>
                  </div>
                  {paymentDetail.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Paid At:</span>
                      <span>{formatDate(paymentDetail.paidAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface border border-border-default space-y-2">
                <h4 className="font-bold text-text-primary border-b border-border-default pb-2">
                  Customer Information
                </h4>
                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Name:</span>
                    <span className="text-text-primary font-semibold">
                      {paymentDetail.customer.firstName} {paymentDetail.customer.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Email:</span>
                    <span className="text-action-primary">{paymentDetail.customer.email}</span>
                  </div>
                  {paymentDetail.customer.phone && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Phone:</span>
                      <span>{paymentDetail.customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Snapshotted Bank Details (if Bank Transfer) */}
            {paymentDetail.bankDetails && (
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-default space-y-2">
                <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                  Snapshotted Bank Transfer Instructions
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-text-tertiary block text-[10px]">Bank Name</span>
                    <span className="font-semibold text-text-primary">
                      {paymentDetail.bankDetails.bankName}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block text-[10px]">Account Name</span>
                    <span className="text-text-secondary">{paymentDetail.bankDetails.accountName}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block text-[10px]">Account Number</span>
                    <span className="font-mono font-bold text-text-primary">
                      {paymentDetail.bankDetails.accountNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Refund History Records */}
            {paymentDetail.refunds.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                  Refund History ({paymentDetail.refunds.length})
                </h4>
                <div className="border border-border-default rounded-xl overflow-hidden divide-y divide-border-default">
                  {paymentDetail.refunds.map((r) => (
                    <div key={r.id || r.refundId} className="p-3 bg-bg-surface flex items-center justify-between">
                      <div>
                        <div className="font-bold text-status-purple-base">
                          {formatCurrency(r.amount, paymentDetail.currency)}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {r.reason || "Refund issued"} &bull; <span className="font-mono">{r.refundId}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-text-tertiary">
                        <div>{formatDate(r.createdAt)}</div>
                        {r.actorEmail && <div>By: {r.actorEmail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Lifecycle Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                Payment Event Timeline
              </h4>
              <div className="relative pl-5 border-l-2 border-border-default space-y-4">
                {paymentDetail.timeline.map((event) => (
                  <div key={event.id} className="relative">
                    <div
                      className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-bg-surface ${
                        event.type === "verified"
                          ? "bg-status-success-accent"
                          : event.type === "refunded"
                          ? "bg-status-purple-base"
                          : "bg-action-primary"
                      }`}
                    />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-xs">{event.title}</span>
                      <span className="text-[10px] text-text-tertiary font-mono">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 5. Process Refund Confirmation Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => {
          if (!processingRefund) setShowRefundModal(false);
        }}
        size="md"
        title={
          paymentDetail?.provider === "manual"
            ? "Record Manual Bank Refund"
            : `Process Refund via ${paymentDetail?.providerLabel}`
        }
        description={
          paymentDetail?.provider === "manual"
            ? `Record an administrative refund for order ${paymentDetail?.orderNumber}. Use this after issuing funds to the customer outside the system.`
            : `Initiate an automated refund of ${formatCurrency(
                parseFloat(refundAmountInput) || 0
              )} back to the customer through ${paymentDetail?.providerLabel}.`
        }
        footer={
          <div className="flex items-center justify-end gap-3 pt-2 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setShowRefundModal(false)}
              disabled={processingRefund}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleExecuteRefund}
              loading={processingRefund}
              disabled={processingRefund}
              className="bg-status-purple-base hover:bg-status-purple-base/90 text-neutral-white shadow-none"
            >
              {processingRefund
                ? "Processing..."
                : paymentDetail?.provider === "manual"
                ? "Confirm Manual Refund"
                : `Refund ${formatCurrency(parseFloat(refundAmountInput) || 0)}`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {refundError && (
            <AlertBanner
              variant="danger"
              size="sm"
              title="Refund Error"
              description={refundError}
              dismissible
              onDismiss={() => setRefundError(null)}
            />
          )}

          {/* Refund Breakdown Card */}
          {paymentDetail && (
            <div className="p-3.5 bg-bg-subtle border border-border-default rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-text-tertiary">Total Paid:</span>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(paymentDetail.amount, paymentDetail.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-tertiary">Previously Refunded:</span>
                <span className="font-semibold text-status-purple-base">
                  {formatCurrency(paymentDetail.totalRefunded, paymentDetail.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-border-default pt-1.5 font-bold">
                <span className="text-text-primary">Available for Refund:</span>
                <span className="text-status-success-text">
                  {formatCurrency(paymentDetail.remainingRefundable, paymentDetail.currency)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              Refund Amount (₦)
            </label>
            <input
              type="number"
              value={refundAmountInput}
              onChange={(e) => setRefundAmountInput(e.target.value)}
              max={paymentDetail?.remainingRefundable}
              min={1}
              step="any"
              className="w-full px-3 py-2 text-xs rounded-xl border border-border-default bg-bg-surface text-text-primary focus:outline-none focus:border-action-primary"
            />
          </div>

          <TextInput
            label="Refund Reason / Audit Note"
            value={refundReasonInput}
            onChange={(e) => setRefundReasonInput(e.target.value)}
            placeholder="e.g. Customer cancelled, defective item, duplicate order"
            size="sm"
          />
        </div>
      </Modal>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-4">
          <Skeleton type="text" size="lg" className="w-1/4" />
          <Skeleton type="custom" className="w-full h-[300px]" />
        </div>
      }
    >
      <PaymentsListContent />
    </Suspense>
  );
}
