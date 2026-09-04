'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import ReviewModal from '@/components/ReviewModal';
import { OrderStatus } from '@/lib/supabase/types';

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
        <div className="w-12 h-12 rounded-full border-4 border-[#D99BA3] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card-soft p-12 text-center space-y-4 bg-white border border-[#E2ECF2]">
        <span className="text-4xl block">🔍</span>
        <h3 className="font-heading font-bold text-lg text-slate-800">
          Order Not Found
        </h3>
        <p className="text-xs text-slate-500">{error || "We couldn't locate this order in your account."}</p>
        <Link href="/account/orders" className="btn-pink text-xs !px-6 inline-block">
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
            className="text-xs text-[#4A7A99] font-semibold hover:underline flex items-center gap-1"
          >
            ← Back to All Orders
          </Link>
          <h1 className="text-2xl font-bold font-heading text-slate-800 flex items-center gap-3">
            <span>Order #{order.orderNumber}</span>
            <span className="badge-stock badge-in-stock capitalize text-xs">
              {order.status}
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString(undefined, {
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
          className="btn-pink text-xs !py-2.5 !px-5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          {reordering ? 'Adding to Cart...' : '🔄 Reorder Items'}
        </button>
      </div>

      {reorderResult && (
        <div className="p-4 bg-[#EBF3F8] text-[#243342] text-xs rounded-2xl border border-[#CBDDE8] flex items-center justify-between">
          <span>{reorderResult}</span>
          <Link href="/cart" className="font-semibold text-[#D99BA3] hover:underline ml-3">
            Go to Cart →
          </Link>
        </div>
      )}

      {/* Visual Status Timeline */}
      <OrderStatusTimeline status={order.status} history={order.statusHistory} />

      {/* Main Order Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Itemized Receipt */}
        <div className="md:col-span-2 card-soft p-6 sm:p-8 bg-white border border-[#E2ECF2] shadow-xs space-y-6">
          <h3 className="font-heading font-bold text-base text-slate-800">
            Items in Your Order
          </h3>

          <div className="space-y-4 divide-y divide-slate-100">
            {order.items.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-2xl bg-[#F4F8FA] overflow-hidden flex-shrink-0 border border-[#EDF3F7] flex items-center justify-center">
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
                    <h4 className="font-heading font-bold text-sm text-slate-800">
                      {item.productName} (×{item.quantity})
                    </h4>
                    <span className="font-bold text-sm text-slate-900 font-heading">
                      ₦{item.totalPrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Coloring Book Theme Customization */}
                  {item.themeCustomization && (
                    <div className="text-xs text-[#243342] bg-[#FBF0F2] p-3 rounded-2xl border border-[#D99BA3]/20 space-y-1.5 my-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-[#D99BA3] flex items-center gap-1.5">
                          <span>🎨</span> Coloring Book Customization
                        </span>
                        {item.themeCustomization.coverName && (
                          <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-white text-[#D99BA3] border border-[#D99BA3]/30">
                            Cover: {item.themeCustomization.coverName}
                          </span>
                        )}
                      </div>

                      {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                        <div className="text-[11px] text-[#52657A]">
                          <span className="font-semibold text-[#243342]">Themes:</span>{' '}
                          {item.themeCustomization.themes.map((t) => t.themeName).join(' · ')}
                        </div>
                      )}

                      {item.themeCustomization.coverName && (
                        <div className="text-[11px] text-[#52657A]">
                          <span className="font-semibold text-[#243342]">Personalized Name:</span>{' '}
                          <span className="font-medium text-slate-800">"{item.themeCustomization.coverName}"</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photo & Dedication Customization */}
                  {item.customization && (
                    <div className="text-xs text-[#243342] bg-rose-50/60 p-3 rounded-2xl border border-rose-100 space-y-1.5 my-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-rose-700 flex items-center gap-1.5">
                          <span>✨</span> Custom Keepsake Artwork
                        </span>
                        <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          {item.customization.status}
                        </span>
                      </div>

                      {item.customization.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-white/80 p-2 rounded-xl border border-rose-100/60">
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
                              className="group w-12 h-12 rounded-xl overflow-hidden bg-white border border-rose-200/80 flex-shrink-0 shadow-2xs relative"
                              title={`View Photo #${idx + 1}`}
                            >
                              <img
                                src={asset.assetUrl}
                                alt={`Custom Photo ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                          ))}
                          <span className="text-[11px] text-slate-500 font-medium ml-1">
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
                    <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                      {item.addons.map((a, i) => (
                        <div key={i}>
                          + {a.name} (×{a.quantity}) — ₦{a.totalPrice.toLocaleString()}
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
                        className="text-xs text-[#D99BA3] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        ⭐ Leave a Product Review
                      </button>
                    ) : item.hasReviewed ? (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        ✓ Review Submitted
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="pt-6 border-t border-slate-100 space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">
                ₦{order.subtotal.toLocaleString()}
              </span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-semibold">-₦{order.discountTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span className="font-semibold text-slate-800">
                ₦{order.deliveryFee.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-100 font-heading">
              <span>Total Paid</span>
              <span className="text-[#D99BA3] text-lg">
                ₦{order.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Summary */}
        <div className="card-soft p-6 sm:p-8 bg-white border border-[#E2ECF2] shadow-xs space-y-6">
          <div className="space-y-2">
            <h4 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
              <span>📍</span> Delivery Address
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>{order.customer.firstName} {order.customer.lastName || ''}</strong>
              <br />
              {shippingAddr.streetAddress || shippingAddr.addressLine1 || 'Address on file'}
              <br />
              {shippingAddr.city && `${shippingAddr.city}, `}
              {shippingAddr.state || ''}
              {order.customer.phone && (
                <>
                  <br />
                  <span className="text-slate-400">Phone: {order.customer.phone}</span>
                </>
              )}
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <h4 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
              <span>💳</span> Payment Info
            </h4>
            <div className="flex items-center gap-2">
              <span className="badge-stock badge-in-stock capitalize text-xs">
                {order.payment?.status || 'Paid'}
              </span>
              <span className="text-[11px] text-slate-400">
                via {order.payment?.provider || 'Paystack'}
              </span>
            </div>
            {order.payment?.reference && (
              <p className="text-[10px] font-mono text-slate-400 truncate">
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
