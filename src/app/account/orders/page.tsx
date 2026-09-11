'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  totalItemCount: number;
  itemsPreview: {
    productId: string;
    productName: string;
    quantity: number;
    image: string | null;
  }[];
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState<string | null>(null);
  const [reorderMessage, setReorderMessage] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/account/orders');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setOrders(json.data || []);
          }
        }
      } catch {
        // Handled in UI
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  const handleReorder = async (orderNumber: string) => {
    try {
      setReordering(orderNumber);
      setReorderMessage(null);

      const res = await fetch('/api/account/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        window.dispatchEvent(new Event('cart-updated'));
        setReorderMessage({ id: orderNumber, text: json.data.message });
      } else {
        setReorderMessage({ id: orderNumber, text: json.error || 'Failed to reorder items' });
      }
    } catch (err: unknown) {
      setReorderMessage({
        id: orderNumber,
        text: err instanceof Error ? err.message : 'Reorder error',
      });
    } finally {
      setReordering(null);
    }
  };

  if (loading) {
    return (
      <div className="card-soft p-12 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-action-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-text-tertiary">Loading order history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-text-primary">
            Order History
          </h1>
          <p className="text-xs text-text-secondary">
            View and track your previous purchases or reorder your favorites.
          </p>
        </div>
        <Link href="/products" className="btn-blue text-xs !py-2.5 !px-4 self-start sm:self-auto">
          Shop New Books →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="card-soft p-12 text-center space-y-4 bg-white border border-border-default">
          <span className="text-4xl block">🎨</span>
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-base text-text-primary">
              No orders found
            </h3>
            <p className="text-xs text-text-secondary">
              You haven&apos;t placed any orders yet. Discover our collection of mindful art.
            </p>
          </div>
          <Link href="/products" className="btn-rose text-xs !px-6 inline-block">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="card-soft p-6 bg-white border border-border-default shadow-xs space-y-4 transition-all hover:border-border-brand"
            >
              {/* Order Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-default">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-text-primary">
                      #{order.orderNumber}
                    </span>
                    <span className="badge-stock badge-in-stock capitalize text-[11px]">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    Placed on{' '}
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-text-tertiary block">Total</span>
                  <span className="font-heading font-bold text-base text-text-primary">
                    ₦{order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items Preview */}
              <div className="flex items-center gap-3 overflow-x-auto py-1">
                {order.itemsPreview.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-bg-subtle p-2 rounded-xl border border-border-default flex-shrink-0"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white overflow-hidden border border-border-default flex items-center justify-center flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs">🎨</span>
                      )}
                    </div>
                    <div className="text-[11px] max-w-[120px] truncate">
                      <p className="font-semibold text-text-primary truncate">
                        {item.productName}
                      </p>
                      <p className="text-text-tertiary">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
                {order.totalItemCount > order.itemsPreview.length && (
                  <span className="text-[11px] text-text-tertiary pl-2">
                    +{order.totalItemCount - order.itemsPreview.length} more item(s)
                  </span>
                )}
              </div>

              {/* Reorder feedback message */}
              {reorderMessage && reorderMessage.id === order.orderNumber && (
                <div className="p-3 bg-bg-brand text-text-primary text-xs rounded-xl border border-border-brand flex items-center justify-between">
                  <span>{reorderMessage.text}</span>
                  <Link href="/cart" className="font-semibold text-action-primary hover:underline ml-2">
                    Open Cart →
                  </Link>
                </div>
              )}

              {/* Order Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleReorder(order.orderNumber)}
                  disabled={reordering === order.orderNumber}
                  className="px-4 py-2 rounded-xl border border-border-default hover:bg-bg-subtle text-xs font-semibold text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  {reordering === order.orderNumber ? 'Adding to Cart...' : '🔄 Reorder'}
                </button>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="btn-rose text-xs !py-2 !px-4"
                >
                  View Details &amp; Timeline →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
