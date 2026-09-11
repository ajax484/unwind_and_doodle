"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AdminOrderListItem,
  AdminOrderListResponse,
} from "@/types/admin-order";
import Button from "@/components/Button";
import { Tabs, type TabItem } from "@/components/Tabs";
import TextInput from "@/components/TextInput";
import Select from "@/components/Select";
import AlertBanner from "@/components/AlertBanner";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { Pagination } from "@/components/Pagination";

function OrdersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const statusParam = searchParams.get("status") || "";
  const paymentParam = searchParams.get("paymentStatus") || "";
  const searchParam = searchParams.get("search") || "";
  const sortParam = searchParams.get("sortBy") || "newest";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState<AdminOrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParam);

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
      router.push(`/admin/orders?${params.toString()}`);
    },
    [router, searchParams],
  );

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusParam) params.set("status", statusParam);
      if (paymentParam) params.set("paymentStatus", paymentParam);
      if (searchParam) params.set("search", searchParam);
      if (sortParam) params.set("sortBy", sortParam);
      if (pageParam > 1) params.set("page", String(pageParam));
      params.set("limit", "25");

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch orders");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading orders");
    } finally {
      setLoading(false);
    }
  }, [statusParam, paymentParam, searchParam, sortParam, pageParam]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    router.push("/admin/orders");
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

  const statusTabs: TabItem[] = [
    { id: "", label: "All Orders" },
    { id: "pending", label: "Pending Review" },
    { id: "confirmed", label: "Confirmed" },
    { id: "shipped", label: "Shipped" },
    { id: "received", label: "Received" },
    { id: "cancelled", label: "Cancelled" },
    { id: "refunded", label: "Refunded" },
  ];

  const orders = data?.orders || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  };
  const hasActiveFilters = Boolean(
    statusParam || paymentParam || searchParam || sortParam !== "newest",
  );

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
            Order Management
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary bg-bg-surface px-3 py-1.5 rounded-xl border border-border-default shadow-xs">
            Total:{" "}
            <strong className="text-text-primary">{pagination.total}</strong>{" "}
            orders
          </span>
          <Button
            href="/admin/orders/manual/new"
            variant="primary"
            size="sm"
          >
            + Create Manual Order
          </Button>
        </div>
      </div>

      {/* 2. Status Quick Tabs */}
      <Tabs
        tabs={statusTabs}
        activeTab={statusParam}
        onChange={(tabId: string) =>
          updateFilters({ status: tabId, page: 1 })
        }
        style="underline"
        size="sm"
        aria-label="Order status filters"
      />

      {/* 3. Search and Multi-Filter Controls */}
      <div className="p-4 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative sm:col-span-2 flex items-center"
          >
            <TextInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order #, customer name, email, phone..."
              size="md"
              leadingIcon={
                <span className="text-sm select-none" aria-hidden="true">
                  🔍
                </span>
              }
              className="pr-20"
              aria-label="Search orders"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg font-heading font-semibold"
            >
              Search
            </Button>
          </form>

          {/* Payment Status Dropdown */}
          <div>
            <Select
              value={paymentParam}
              onChange={(e) =>
                updateFilters({ paymentStatus: e.target.value, page: 1 })
              }
              size="md"
              aria-label="Filter by payment status"
              options={[
                { value: "", label: "All Payment Statuses" },
                { value: "successful", label: "Paid (Successful)" },
                { value: "pending", label: "Pending Payment" },
                { value: "failed", label: "Failed Payment" },
                { value: "refunded", label: "Refunded" },
              ]}
            />
          </div>

          {/* Sort Dropdown */}
          <div>
            <Select
              value={sortParam}
              onChange={(e) =>
                updateFilters({ sortBy: e.target.value, page: 1 })
              }
              size="md"
              aria-label="Sort orders"
              options={[
                { value: "newest", label: "Sort: Newest First" },
                { value: "oldest", label: "Sort: Oldest First" },
                { value: "highest_total", label: "Sort: Highest Total" },
                { value: "lowest_total", label: "Sort: Lowest Total" },
              ]}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-border-default text-xs">
            <span className="text-text-secondary">Filtered view active</span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-action-primary hover:text-action-primary-hover font-semibold cursor-pointer transition-colors"
            >
              Clear All Filters ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <AlertBanner
          variant="danger"
          size="sm"
          description={error}
          actionLabel="Retry"
          onAction={fetchOrders}
          role="alert"
        />
      )}

      {/* 4. Orders Data Presentation (Desktop Table + Mobile Cards) */}
      <div className="bg-bg-surface rounded-3xl border border-border-default shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} type="custom" className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 px-4">
            <EmptyState
              size="sm"
              title={
                hasActiveFilters
                  ? "No orders match your filters"
                  : "No orders found"
              }
              description={
                hasActiveFilters
                  ? "Try broadening your search term or adjusting the status/payment filter."
                  : "Customer orders will automatically appear in this operational management view."
              }
              primaryAction={
                hasActiveFilters
                  ? {
                      label: "Clear Filters",
                      onClick: handleClearFilters,
                      variant: "outline",
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-text-secondary">
                <thead className="bg-bg-subtle/80 text-[10px] font-bold uppercase tracking-wider text-text-tertiary border-b border-border-default">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Order</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Payment</th>
                    <th className="py-3.5 px-4 font-semibold">Items</th>
                    <th className="py-3.5 px-4 font-semibold">Total</th>
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-4 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {orders.map((order: AdminOrderListItem) => (
                    <tr
                      key={order.id}
                      className="hover:bg-bg-subtle/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-text-primary">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:text-action-primary transition-colors"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-text-primary">
                          {order.customer.name}
                        </div>
                        <div className="text-[11px] text-text-tertiary truncate max-w-[180px]">
                          {order.customer.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge
                          status={order.paymentStatus}
                          type="payment"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-text-secondary">
                        {order.itemCount}{" "}
                        {order.itemCount === 1 ? "item" : "items"}
                      </td>
                      <td className="py-3.5 px-4 font-heading font-bold text-text-primary">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-text-tertiary whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          href={`/admin/orders/${order.id}`}
                          variant="outline"
                          size="sm"
                          className="rounded-xl font-semibold shadow-2xs py-1 px-3 min-h-0 text-xs"
                        >
                          View →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-border-default p-3 space-y-3">
              {orders.map((order: AdminOrderListItem) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-bg-subtle/60 border border-border-default space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono font-bold text-xs text-action-primary"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="font-heading font-bold text-sm text-text-primary">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <OrderStatusBadge
                      status={order.paymentStatus}
                      type="payment"
                    />
                  </div>

                  <div className="text-xs text-text-secondary flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-text-primary">
                        {order.customer.name}
                      </div>
                      <div className="text-[11px] text-text-tertiary">
                        {order.customer.email}
                      </div>
                    </div>
                    <span className="text-[11px] text-text-tertiary">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border-default flex justify-end">
                    <Button
                      href={`/admin/orders/${order.id}`}
                      variant="outline"
                      size="sm"
                      className="w-full justify-center rounded-xl bg-bg-surface font-semibold text-text-primary shadow-2xs"
                    >
                      View Order Details →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 5. Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border-default bg-bg-subtle/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-text-secondary">
              Showing page{" "}
              <strong className="text-text-primary">{pagination.page}</strong>{" "}
              of{" "}
              <strong className="text-text-primary">
                {pagination.totalPages}
              </strong>{" "}
              ({pagination.total} total orders)
            </span>

            <Pagination
              size="sm"
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => updateFilters({ page: p })}
              showLabels
              aria-label="Admin orders table pagination"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-text-tertiary font-semibold">
          Loading orders...
        </div>
      }
    >
      <OrdersListContent />
    </Suspense>
  );
}
