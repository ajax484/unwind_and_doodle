'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import ReviewModal from '@/components/ReviewModal';
import { OrderStatus } from '@/lib/supabase/types';
import { formatPrice, formatDate } from '@/lib/format-utils';

interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  primaryImage: string | null;
  hasReviewed: boolean;
  canReview: boolean;
  customization?: {
    status: string;
    notes?: string | null;
    assets?: { id: string; assetUrl: string; fileType: string }[];
  } | null;
  themeCustomization?: {
    coverName: string | null;
    themes: { themeId: string | null; themeName: string; sortOrder: number }[];
  } | null;
  bundleComponents?: {
    name: string;
    quantityPerBundle: number;
    totalQuantity: number;
  }[];
  addons: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

interface ShippingAddress {
  addressLine1?: string;
  addressLine2?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface OrderDetailResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  shippingAddress: ShippingAddress | null;
  customer: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string | null;
  };
  items: OrderItemDetail[];
  payment: {
    provider: string;
    status: string;
    reference: string | null;
  } | null;
  statusHistory: {
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }[];
}

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderResult, setReorderResult] = useState<string | null>(null);

  // Review modal state
  const [reviewItem, setReviewItem] = useState<{ productId: string; productName: string } | null>(null);

  const loadOrder = async () => {
    if (!orderNumber) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/account/orders/${orderNumber}`);
      if (!res.ok) {
        throw new Error('Order not found or unauthorized');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setOrder(json.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderNumber]);

  const handleReorder = async () => {
    if (!order) return;
    try {
      setReordering(true);
      setReorderResult(null);

      const res = await fetch('/api/account/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: order.orderNumber }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        window.dispatchEvent(new Event('cart-updated'));
        setReorderResult(json.data.message);
      } else {
        setReorderResult(json.error || 'Failed to reorder items');
      }
    } catch (err: unknown) {
      setReorderResult(err instanceof Error ? err.message : 'Reorder error');
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="card-soft p-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-action-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-text-secondary font-medium">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card-soft p-12 text-center space-y-4 bg-white border border-border-default">
        <span className="text-4xl block">🔍</span>
        <h3 className="font-heading font-bold text-lg text-text-primary">
          Order Not Found
        </h3>
        <p className="text-xs text-text-secondary">{error || "We couldn't locate this order in your account."}</p>
        <Link href="/account/orders" className="btn-rose text-xs !px-6 inline-block">
          Return to Orders
        </Link>
      </div>
    );
  }

  const shippingAddr =
    order.shippingAddress && typeof order.shippingAddress === 'object'
      ? order.shippingAddress
      : {};

  return (
    <div className="space-y-8">
      {/* Top Bar with Back Link and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/account/orders"
            className="text-xs text-action-primary font-semibold hover:underline flex items-center gap-1"
          >
            ← Back to All Orders
          </Link>
          <h1 className="text-2xl font-bold font-heading text-text-primary flex items-center gap-3">
            <span>Order #{order.orderNumber}</span>
            <span className="badge-stock badge-in-stock capitalize text-xs">
              {order.status}
            </span>
          </h1>
          <p className="text-xs text-text-tertiary">
            Placed on{' '}
            {formatDate(order.createdAt, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={handleReorder}
          disabled={reordering}
          className="btn-rose text-xs !py-2.5 !px-5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          {reordering ? 'Adding to Cart...' : '🔄 Reorder Items'}
        </button>
      </div>

      {reorderResult && (
        <div className="p-4 bg-bg-brand text-text-primary text-xs rounded-2xl border border-border-brand flex items-center justify-between">
          <span>{reorderResult}</span>
          <Link href="/cart" className="font-semibold text-action-primary hover:underline ml-3">
            Go to Cart →
          </Link>
        </div>
      )}

      {/* Visual Status Timeline */}
      <OrderStatusTimeline status={order.status} history={order.statusHistory} />

      {/* Main Order Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Itemized Receipt */}
        <div className="md:col-span-2 card-soft p-6 sm:p-8 bg-white border border-border-default shadow-xs space-y-6">
          <h3 className="font-heading font-bold text-base text-text-primary">
            Items in Your Order
          </h3>

          <div className="space-y-4 divide-y divide-border-default">
            {order.items.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-2xl bg-bg-subtle overflow-hidden flex-shrink-0 border border-border-default flex items-center justify-center">
                  {item.primaryImage ? (
                    <img
                      src={item.primaryImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🎨</span>
                  )}
                </div>

                <div className="flex-grow space-y-1.5">
                  <div className="flex items-start justify-between">
                    <h4 className="font-heading font-bold text-sm text-text-primary">
                      {item.productName} (×{item.quantity})
                    </h4>
                    <span className="font-bold text-sm text-text-primary font-heading">
                      {formatPrice(item.totalPrice)}
                    </span>
                  </div>

                  {/* Coloring Book Theme Customization */}
                  {item.themeCustomization && (
                    <div className="text-xs text-text-primary bg-bg-accent p-3 rounded-2xl border border-border-accent/20 space-y-1.5 my-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-brand-rose flex items-center gap-1.5">
                          <span>🎨</span> Coloring Book Customization
                        </span>
                        {item.themeCustomization.coverName && (
                          <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-white text-brand-rose border border-border-accent/30">
                            Cover: {item.themeCustomization.coverName}
                          </span>
                        )}
                      </div>

                      {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                        <div className="text-[11px] text-text-secondary">
                          <span className="font-semibold text-text-primary">Themes:</span>{' '}
                          {item.themeCustomization.themes.map((t) => t.themeName).join(' · ')}
                        </div>
                      )}

                      {item.themeCustomization.coverName && (
                        <div className="text-[11px] text-text-secondary">
                          <span className="font-semibold text-text-primary">Personalized Name:</span>{' '}
                          <span className="font-medium text-text-primary">"{item.themeCustomization.coverName}"</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photo & Dedication Customization */}
                  {item.customization && (
                    <div className="text-xs text-text-primary bg-bg-accent p-3 rounded-2xl border border-border-accent/30 space-y-1.5 my-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-brand-rose flex items-center gap-1.5">
                          <span>✨</span> Custom Keepsake Artwork
                        </span>
                        <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full bg-bg-accent text-brand-rose">
                          {item.customization.status}
                        </span>
                      </div>

                      {item.customization.notes && (
                        <p className="text-[11px] text-text-secondary italic bg-white/80 p-2 rounded-xl border border-border-default">
                          "{item.customization.notes}"
                        </p>
                      )}

                      {item.customization.assets && item.customization.assets.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {item.customization.assets.map((asset, idx) => (
                            <a
                              key={asset.id || idx}
                              href={asset.assetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="group w-12 h-12 rounded-xl overflow-hidden bg-white border border-border-default flex-shrink-0 shadow-2xs relative"
                              title={`View Photo #${idx + 1}`}
                            >
                              <img
                                src={asset.assetUrl}
                                alt={`Custom Photo ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                          ))}
                          <span className="text-[11px] text-text-secondary font-medium ml-1">
                            ({item.customization.assets.length} photo{item.customization.assets.length === 1 ? '' : 's'} attached)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {item.bundleComponents && item.bundleComponents.length > 0 && (
                    <div className="text-[11px] text-purple-900 bg-purple-50/70 p-2.5 rounded-xl border border-purple-100/80 space-y-1 my-1">
                      <div className="font-heading font-bold text-[10px] uppercase tracking-wider text-purple-800 flex items-center justify-between">
                        <span>📦 Bundle Includes</span>
                        <span>{item.bundleComponents.length} component products</span>
                      </div>
                      <div className="space-y-0.5 pt-1 border-t border-purple-100">
                        {item.bundleComponents.map((comp, idx) => (
                          <div key={idx} className="flex justify-between items-center text-purple-900">
                            <span>• {comp.name}</span>
                            <span className="font-bold">
                              {comp.quantityPerBundle} per bundle ({comp.totalQuantity} total)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[11px] text-text-secondary space-y-0.5 pt-1">
                      {item.addons.map((a, i) => (
                        <div key={i}>
                          + {a.name} (×{a.quantity}) — {formatPrice(a.totalPrice)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review Action */}
                  <div className="pt-2">
                    {item.canReview ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewItem({
                            productId: item.productId,
                            productName: item.productName,
                          })
                        }
                        className="text-xs text-action-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        ⭐ Leave a Product Review
                      </button>
                    ) : item.hasReviewed ? (
                      <span className="text-[11px] text-status-success-accent font-medium flex items-center gap-1">
                        ✓ Review Submitted
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="pt-6 border-t border-border-default space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="font-semibold text-text-primary">
                {formatPrice(order.subtotal)}
              </span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex items-center justify-between text-status-success-accent">
                <span>Discount</span>
                <span className="font-semibold">-{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-text-secondary">
              <span>Delivery Fee</span>
              <span className="font-semibold text-text-primary">
                {formatPrice(order.deliveryFee)}
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-text-primary pt-3 border-t border-border-default font-heading">
              <span>Total Paid</span>
              <span className="text-action-primary text-lg">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Summary */}
        <div className="card-soft p-6 sm:p-8 bg-white border border-border-default shadow-xs space-y-6">
          <div className="space-y-2">
            <h4 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
              <span>📍</span> Delivery Address
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              <strong>{order.customer.firstName} {order.customer.lastName || ''}</strong>
              <br />
              {shippingAddr.streetAddress || shippingAddr.addressLine1 || 'Address on file'}
              <br />
              {shippingAddr.city && `${shippingAddr.city}, `}
              {shippingAddr.state || ''}
              {order.customer.phone && (
                <>
                  <br />
                  <span className="text-text-tertiary">Phone: {order.customer.phone}</span>
                </>
              )}
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-border-default">
            <h4 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
              <span>💳</span> Payment Info
            </h4>
            <div className="flex items-center gap-2">
              <span className="badge-stock badge-in-stock capitalize text-xs">
                {order.payment?.status || 'Paid'}
              </span>
              <span className="text-[11px] text-text-tertiary">
                via {order.payment?.provider || 'Paystack'}
              </span>
            </div>
            {order.payment?.reference && (
              <p className="text-[10px] font-mono text-text-tertiary truncate">
                Ref: {order.payment.reference}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewItem && (
        <ReviewModal
          orderId={order.id}
          productId={reviewItem.productId}
          productName={reviewItem.productName}
          isOpen={true}
          onClose={() => setReviewItem(null)}
          onSuccess={() => {
            setReviewItem(null);
            loadOrder();
          }}
        />
      )}
    </div>
  );
}
