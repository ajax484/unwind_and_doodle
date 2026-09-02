import React from "react";
import { OrderStatus } from "@/lib/supabase/types";

interface OrderStatusTimelineProps {
  status: OrderStatus;
  history?: {
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }[];
}

const STEPS = [
  {
    key: "created",
    label: "Order Placed",
    icon: "📝",
    description: "Order created",
  },
  {
    key: "pending",
    label: "Payment Confirmed",
    icon: "💳",
    description: "Payment verified",
  },
  {
    key: "confirmed",
    label: "Processing",
    icon: "📦",
    description: "Packing & preparing",
  },
  {
    key: "shipped",
    label: "On The Way",
    icon: "🚚",
    description: "Dispatched to courier",
  },
  {
    key: "received",
    label: "Delivered",
    icon: "🎉",
    description: "Delivered to customer",
  },
];

const STATUS_RANK: Record<OrderStatus, number> = {
  created: 1,
  pending: 2,
  confirmed: 3,
  shipped: 4,
  received: 5,
  cancelled: -1,
  refunded: -2,
};

export default function OrderStatusTimeline({
  status,
  history,
}: OrderStatusTimelineProps) {
  const currentRank = STATUS_RANK[status] ?? 1;
  const isCancelled = status === "cancelled";
  const isRefunded = status === "refunded";

  if (isCancelled || isRefunded) {
    return (
      <div
        className={`rounded-2xl border p-5 ${
          isCancelled
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isCancelled ? "❌" : "🔄"}</span>

          <div>
            <h4 className="font-heading text-lg font-bold">
              {isCancelled ? "Order Cancelled" : "Order Refunded"}
            </h4>

            <p className="text-sm opacity-90">
              {isCancelled
                ? "This order has been cancelled."
                : "A refund has been issued for this order."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentRank - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="font-heading text-lg font-bold text-slate-800">
        Order Status Timeline
      </h3>

      {/* Progress */}
      <div className="relative">
        {/* Track */}
        <div className="absolute left-5 right-5 top-5 h-1 -translate-y-1/2 bg-slate-100">
          <div
            className="h-full bg-linear-to-r from-pink-400 to-sky-400 transition-all duration-500"
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative z-10 flex items-start justify-between">
          {STEPS.map((step, idx) => {
            const stepRank = idx + 1;
            const isCompleted = currentRank >= stepRank;
            const isCurrent = currentRank === stepRank;

            return (
              <div
                key={step.key}
                className="flex min-w-0 flex-col items-center"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isCurrent
                      ? "scale-110 bg-pink-500 text-white ring-4 ring-pink-100 shadow-md"
                      : isCompleted
                        ? "bg-sky-400 text-white shadow-sm"
                        : "border-2 border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {step.icon}
                </div>

                <span
                  className={`mt-2 hidden text-center text-xs font-heading font-semibold sm:block ${
                    isCurrent
                      ? "text-pink-600"
                      : isCompleted
                        ? "text-slate-800"
                        : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Log */}
      {history && history.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Activity Log
          </span>

          <div className="space-y-2">
            {history.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between text-xs text-slate-600"
              >
                <div>
                  <span className="font-semibold capitalize text-slate-800">
                    {item.status.replace("_", " ")}
                  </span>

                  {item.note && (
                    <span className="text-slate-500"> — {item.note}</span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
