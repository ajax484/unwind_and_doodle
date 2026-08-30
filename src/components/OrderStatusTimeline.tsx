import React from 'react';
import { OrderStatus } from '@/lib/supabase/types';

interface OrderStatusTimelineProps {
  status: OrderStatus;
  history?: {
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }[];
}

const STEPS = [
  { key: 'created', label: 'Order Placed', icon: '📝', description: 'Order created' },
  { key: 'pending', label: 'Payment Confirmed', icon: '💳', description: 'Payment verified' },
  { key: 'confirmed', label: 'Processing', icon: '📦', description: 'Packing & preparing' },
  { key: 'shipped', label: 'On The Way', icon: '🚚', description: 'Dispatched to courier' },
  { key: 'received', label: 'Delivered', icon: '🎉', description: 'Delivered to customer' },
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

export default function OrderStatusTimeline({ status, history }: OrderStatusTimelineProps) {
  const currentRank = STATUS_RANK[status] || 1;
  const isCancelled = status === 'cancelled';
  const isRefunded = status === 'refunded';

  if (isCancelled || isRefunded) {
    return (
      <div
        className={`p-5 rounded-2xl border ${
          isCancelled ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isCancelled ? '❌' : '🔄'}</span>
          <div>
            <h4 className="font-heading font-bold text-lg">
              {isCancelled ? 'Order Cancelled' : 'Order Refunded'}
            </h4>
            <p className="text-sm opacity-90">
              {isCancelled
                ? 'This order has been cancelled.'
                : 'A refund has been issued for this order.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
      <h3 className="font-heading font-bold text-lg text-slate-800">
        Order Status Timeline
      </h3>

      {/* Progress Bar */}
      <div className="relative flex items-center justify-between">
        {/* Track Line */}
        <div className="absolute top-1/2 left-4 right-4 h-1 -translate-y-1/2 bg-slate-100 z-0">
          <div
            className="h-full bg-gradient-to-r from-pink-400 to-sky-400 transition-all duration-500"
            style={{
              width: `${Math.max(0, Math.min(100, ((currentRank - 1) / (STEPS.length - 1)) * 100))}%`,
            }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const stepRank = idx + 1;
          const isCompleted = currentRank >= stepRank;
          const isCurrent = currentRank === stepRank;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCurrent
                    ? 'bg-pink-500 text-white ring-4 ring-pink-100 shadow-md scale-110'
                    : isCompleted
                    ? 'bg-sky-400 text-white shadow-sm'
                    : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`text-xs mt-2 font-heading font-semibold text-center hidden sm:block ${
                  isCurrent ? 'text-pink-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status History Logs if available */}
      {history && history.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Activity Log
          </span>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="text-xs flex items-start justify-between text-slate-600">
                <div>
                  <span className="font-semibold capitalize text-slate-800">
                    {h.status.replace('_', ' ')}
                  </span>
                  {h.note && <span className="text-slate-500"> — {h.note}</span>}
                </div>
                <span className="text-slate-400 text-[11px]">
                  {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
