'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { OrderStatus } from '@/lib/supabase/types';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import { formatPrice, formatDate } from '@/lib/format-utils';
import { getPaymentProviderLabel } from '@/services/payment/provider.types';
import { BankTransferConfig } from '@/types/payment-settings';
import { trackPurchase } from '@/lib/meta-pixel';

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
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  addOnsTotal?: number;
  discountTotal: number;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  shippingAddress: ShippingAddress | null;
  customer: {
    firstName: string;
    email: string;
  };
  items: {
    id: string;
    productName: string;
    slug: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    primaryImage: string | null;
    productType?: 'physical' | 'custom' | 'bundle';
    bundleComponents?: {
      name: string;
      quantityPerBundle: number;
      totalQuantity: number;
    }[];
    customization?: {
      id?: string;
      notes: string | null;
      status: string;
      assets?: { id: string; assetUrl: string; fileType: string }[];
    } | null;
    themeCustomization?: {
      coverName: string | null;
      themes: { themeId: string | null; themeName: string; sortOrder: number }[];
    } | null;
    addons: {
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }[];
  payment: {
    id?: string;
    provider: string;
    status: string;
    reference: string | null;
    amount?: number;
    currency?: string;
    bankDetails?: BankTransferConfig | null;
  } | null;
  paymentAttempts?: Array<{
    id: string;
    provider: string;
    status: string;
    reference: string | null;
    amount: number;
    createdAt: string;
    bankDetails?: BankTransferConfig | null;
  }>;
  statusHistory: {
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }[];
}

export default function OrderStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = params?.orderNumber as string;
  const token = searchParams.get('token');

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Retry state
  const [selectedRetryMethod, setSelectedRetryMethod] = useState<'paystack' | 'flutterwave' | 'manual'>('paystack');
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function loadOrder() {
    if (!orderNumber) return;
    try {
      setLoading(true);
      setError(null);
      setRequiresVerification(false);

      const url = token
        ? `/api/orders/${orderNumber}?token=${encodeURIComponent(token)}`
        : `/api/orders/${orderNumber}`;

      const res = await fetch(url);
      const json = await res.json();

      if (res.status === 401 && json.requiresVerification) {
        setRequiresVerification(true);
        return;
      }

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Order not found');
      }

      setOrder(json.data);
      if (json.data.payment?.provider) {
        setSelectedRetryMethod(json.data.payment.provider as any);
      }

      // Track Purchase event with deduplication event_id
      if (
        (json.data.payment?.status === 'successful' || json.data.status !== 'created') &&
        typeof window !== 'undefined' &&
        !sessionStorage.getItem(`pixel_purchase_${json.data.orderNumber}`)
      ) {
        sessionStorage.setItem(`pixel_purchase_${json.data.orderNumber}`, '1');
        trackPurchase(
          {
            value: json.data.totalAmount,
            currency: json.data.currency || 'NGN',
            order_id: json.data.orderNumber,
            num_items: json.data.items?.length,
            content_ids: json.data.items?.map((item: { id: string; slug: string }) => item.slug || item.id),
          },
          json.data.orderNumber // Deduplication eventID
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [orderNumber, token]);

  const handleRetryPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumber) return;

    try {
      setRetryingPayment(true);
      setRetryError(null);

      const res = await fetch(`/api/orders/${orderNumber}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-order-token': token } : {}),
        },
        body: JSON.stringify({
          paymentMethod: selectedRetryMethod,
          token,
          callbackUrl: `${window.location.origin}/order/callback`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Failed to initialize payment retry');
      }

      const data = json.data;
      if (data.authorizationUrl) {
        // Redirect to gateway checkout
        window.location.href = data.authorizationUrl;
      } else {
        // Resumed or created manual bank transfer
        await loadOrder();
      }
    } catch (err: unknown) {
      setRetryError(err instanceof Error ? err.message : 'Error retrying payment');
    } finally {
      setRetryingPayment(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setVerifyError('Please enter a valid email address');
      return;
    }

    try {
      setVerifying(true);
      setVerifyError(null);

      const res = await fetch('/api/orders/access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          email: emailInput.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.token) {
        throw new Error(json.error || 'Order not found for this email address');
      }

      // Update URL with token and reload order
      router.replace(`/order/${orderNumber}?token=${encodeURIComponent(json.token)}`);
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-action-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-text-secondary font-medium text-sm">Loading your order details...</p>
      </div>
    );
  }

  if (requiresVerification) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="card-soft p-8 sm:p-10 text-center space-y-6 bg-white border border-border-default shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-bg-accent text-brand-rose flex items-center justify-center text-3xl mx-auto shadow-xs">
            🔒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-heading text-text-primary">
              Verify Order Access
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              To protect your privacy, please enter the email address used when placing order{' '}
              <strong className="text-text-primary">#{orderNumber}</strong>.
            </p>
          </div>

          {verifyError && (
            <div className="p-3 bg-status-danger-bg text-status-danger-accent text-xs rounded-xl border border-status-danger-accent/30">
              {verifyError}
            </div>
          )}

          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-4 py-3 rounded-2xl border border-border-input text-xs sm:text-sm text-text-primary focus:outline-hidden focus:border-border-accent text-center"
            />
            <button
              type="submit"
              disabled={verifying}
              className="btn-rose w-full text-xs sm:text-sm !py-3.5 block disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Access Order Details →'}
            </button>
          </form>

          <div className="pt-2 border-t border-border-default flex items-center justify-between text-xs text-text-tertiary">
            <Link href="/auth" className="hover:text-text-primary font-medium">
              Sign In to Account
            </Link>
            <Link href="/" className="hover:text-text-primary font-medium">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <span className="text-5xl">🔍</span>
        <h2 className="text-2xl font-bold font-heading text-text-primary">Order Not Found</h2>
        <p className="text-text-secondary text-sm">
          {error || `We couldn't locate an order with number "${orderNumber}".`}
        </p>
        <Link href="/" className="btn-rose text-xs !px-6 inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

  const shippingAddr: ShippingAddress =
    order.shippingAddress && typeof order.shippingAddress === 'object'
      ? (order.shippingAddress as ShippingAddress)
      : {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Celebration Header */}
      <div className="card-soft p-8 sm:p-10 text-center space-y-3 bg-gradient-to-tr from-bg-accent via-white to-bg-brand border-border-default shadow-xs">
        <div className="w-16 h-16 rounded-full bg-status-success-bg text-status-success-accent flex items-center justify-center text-3xl mx-auto shadow-xs">
          ✓
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold font-heading text-text-primary">
          Thank you for your order, {order.customer.firstName}!
        </h1>
        <p className="text-text-secondary text-xs sm:text-sm">
          Order Reference:{' '}
          <span className="font-mono font-bold text-text-primary">{order.orderNumber}</span>
          {' • '}
          {formatDate(order.createdAt, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Visual Status Timeline */}
      <OrderStatusTimeline status={order.status} history={order.statusHistory} />

      {/* 2-Column Summary: Items Breakdown & Delivery Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Itemized Receipt */}
        <div className="md:col-span-2 card-soft p-6 sm:p-8 bg-white border border-border-default shadow-xs space-y-6">
          <h3 className="font-heading font-bold text-lg text-text-primary">
            Items in Your Order
          </h3>

          <div className="space-y-4 divide-y divide-border-default">
            {order.items.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-2xl bg-bg-subtle overflow-hidden flex-shrink-0 border border-border-default flex items-center justify-center">
                  {item.primaryImage ? (
                    <img src={item.primaryImage} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🎨</span>
                  )}
                </div>

                <div className="flex-grow space-y-1">
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
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="pt-6 border-t border-border-default space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="font-semibold text-text-primary">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex items-center justify-between text-status-success-accent">
                <span>Discount</span>
                <span className="font-semibold">-{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-text-secondary">
              <span>Delivery Fee</span>
              <span className="font-semibold text-text-primary">{formatPrice(order.deliveryFee)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-text-primary pt-3 border-t border-border-default font-heading">
              <span>Total Paid</span>
              <span className="text-action-primary text-lg">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Right Col: Customer & Shipping Details */}
        <div className="card-soft p-6 sm:p-8 bg-white border border-border-default shadow-xs space-y-6">
          <div className="space-y-2">
            <h4 className="font-heading font-bold text-base text-text-primary flex items-center gap-2">
              <span>📍</span> Delivery Address
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              {shippingAddr.streetAddress || shippingAddr.addressLine1 || 'Address on file'}
              <br />
              {shippingAddr.city && `${shippingAddr.city}, `}
              {shippingAddr.state || ''}
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border-default">
            <h4 className="font-heading font-bold text-base text-text-primary flex items-center gap-2">
              <span>💳</span> Payment Status
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${
                  order.payment?.status === 'successful'
                    ? 'bg-status-success-bg text-status-success-text'
                    : order.payment?.status === 'failed'
                    ? 'bg-status-danger-bg text-status-danger-text'
                    : 'bg-status-warning-bg text-status-warning-text'
                }`}
              >
                {order.payment?.status === 'successful'
                  ? 'Payment Successful'
                  : order.payment?.status === 'failed'
                  ? 'Payment Unsuccessful'
                  : 'Awaiting Payment'}
              </span>
              <span className="text-[11px] text-text-tertiary">
                via {getPaymentProviderLabel(order.payment?.provider || 'paystack')}
              </span>
            </div>

            {/* Bank Transfer Instructions Snapshot */}
            {order.payment?.provider === 'manual' && order.payment?.bankDetails && order.payment.status === 'pending' && (
              <div className="p-3.5 bg-bg-subtle border border-border-default rounded-xl space-y-2 text-xs">
                <div className="font-heading font-bold text-xs text-text-primary flex items-center gap-1.5">
                  <span>🏦</span> Direct Bank Transfer Details
                </div>
                <div className="space-y-1 text-text-secondary text-[11px]">
                  <div>
                    <span className="font-semibold text-text-primary">Bank:</span> {order.payment.bankDetails.bankName}
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary">Account Name:</span> {order.payment.bankDetails.accountName}
                  </div>
                  <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-border-default">
                    <span className="font-mono font-bold text-text-primary">{order.payment.bankDetails.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(order.payment?.bankDetails?.accountNumber || '')}
                      className="text-[10px] text-action-primary hover:underline font-bold"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-[10px] text-text-tertiary pt-1">
                    Please use <span className="font-mono font-bold text-text-primary">{order.orderNumber}</span> as transfer reference.
                  </div>
                </div>
              </div>
            )}

            {/* Payment Recovery / Retry Section when payment is failed or order created */}
            {order.payment?.status === 'failed' && (
              <div className="p-3.5 bg-red-50/70 border border-red-200/80 rounded-xl space-y-3">
                <div className="space-y-1">
                  <h5 className="font-heading font-bold text-xs text-red-900 flex items-center gap-1.5">
                    <span>⚠️</span> Retry or Switch Payment Method
                  </h5>
                  <p className="text-[11px] text-red-700 leading-snug">
                    Your previous payment attempt was not completed. Choose a payment method to complete your order.
                  </p>
                </div>

                {retryError && (
                  <div className="p-2 text-[11px] bg-red-100 text-red-800 rounded-lg">
                    {retryError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['paystack', 'flutterwave', 'manual'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSelectedRetryMethod(method)}
                        className={`px-2 py-1.5 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                          selectedRetryMethod === method
                            ? 'border-brand-rose bg-white text-brand-rose shadow-2xs'
                            : 'border-border-default bg-white/60 text-text-secondary hover:bg-white'
                        }`}
                      >
                        {getPaymentProviderLabel(method)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={retryingPayment}
                  className="btn-rose w-full text-center text-xs !py-2.5 flex items-center justify-center gap-2 font-bold shadow-xs"
                >
                  {retryingPayment ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Initializing...</span>
                    </>
                  ) : (
                    <span>
                      Pay {formatPrice(order.totalAmount)} via {getPaymentProviderLabel(selectedRetryMethod)} →
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border-default space-y-3">
            <Link href="/products" className="btn-blue w-full text-center text-xs !py-3 block">
              Continue Shopping →
            </Link>
            <Link href="/auth" className="text-xs text-action-primary font-semibold text-center block hover:underline">
              Create / Sign In to Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
