'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';

interface OrderDetailResponse {
  orderNumber: string;
  status: any;
  subtotal: number;
  addOnsTotal?: number;
  discountTotal: number;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  shippingAddress: any;
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
    customization?: { notes: string | null; status: string } | null;
    addons: {
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }[];
  payment: {
    provider: string;
    status: string;
    reference: string | null;
  } | null;
  statusHistory: {
    status: any;
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [orderNumber, token]);

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
        <div className="w-12 h-12 rounded-full border-4 border-[#D99BA3] border-t-transparent animate-spin mx-auto" />
        <p className="text-slate-500 font-medium text-sm">Loading your order details...</p>
      </div>
    );
  }

  if (requiresVerification) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="card-soft p-8 sm:p-10 text-center space-y-6 bg-white border border-[#E2ECF2] shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#FBF0F2] text-[#D99BA3] flex items-center justify-center text-3xl mx-auto shadow-xs">
            🔒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-heading text-slate-800">
              Verify Order Access
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              To protect your privacy, please enter the email address used when placing order{' '}
              <strong className="text-slate-800">#{orderNumber}</strong>.
            </p>
          </div>

          {verifyError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
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
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#D99BA3] text-center"
            />
            <button
              type="submit"
              disabled={verifying}
              className="btn-pink w-full text-xs sm:text-sm !py-3.5 block disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Access Order Details →'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <Link href="/auth" className="hover:text-slate-600 font-medium">
              Sign In to Account
            </Link>
            <Link href="/" className="hover:text-slate-600 font-medium">
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
        <h2 className="text-2xl font-bold font-heading text-slate-800">Order Not Found</h2>
        <p className="text-slate-500 text-sm">
          {error || `We couldn't locate an order with number "${orderNumber}".`}
        </p>
        <Link href="/" className="btn-pink text-xs !px-6 inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

  const shippingAddr =
    order.shippingAddress && typeof order.shippingAddress === 'object'
      ? order.shippingAddress
      : {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Celebration Header */}
      <div className="card-soft p-8 sm:p-10 text-center space-y-3 bg-gradient-to-tr from-[#FBF0F2] via-white to-[#EBF3F8] border-[#E2ECF2] shadow-xs">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mx-auto shadow-xs">
          ✓
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold font-heading text-slate-900">
          Thank you for your order, {order.customer.firstName}!
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm">
          Order Reference:{' '}
          <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
          {' • '}
          {new Date(order.createdAt).toLocaleDateString(undefined, {
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
        <div className="md:col-span-2 card-soft p-6 sm:p-8 bg-white border border-[#E2ECF2] shadow-xs space-y-6">
          <h3 className="font-heading font-bold text-lg text-slate-800">
            Items in Your Order
          </h3>

          <div className="space-y-4 divide-y divide-slate-100">
            {order.items.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-2xl bg-[#F4F8FA] overflow-hidden flex-shrink-0 border border-[#EDF3F7] flex items-center justify-center">
                  {item.primaryImage ? (
                    <img src={item.primaryImage} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🎨</span>
                  )}
                </div>

                <div className="flex-grow space-y-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-heading font-bold text-sm text-slate-800">
                      {item.productName} (×{item.quantity})
                    </h4>
                    <span className="font-bold text-sm text-slate-900 font-heading">
                      ₦{item.totalPrice.toLocaleString()}
                    </span>
                  </div>

                  {item.customization && (
                    <span className="text-[11px] text-[#D99BA3] font-semibold block">
                      ✨ Custom photo &amp; dedication included
                    </span>
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
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="pt-6 border-t border-slate-100 space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">₦{order.subtotal.toLocaleString()}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-semibold">-₦{order.discountTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span className="font-semibold text-slate-800">₦{order.deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-100 font-heading">
              <span>Total Paid</span>
              <span className="text-[#D99BA3] text-lg">₦{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Right Col: Customer & Shipping Details */}
        <div className="card-soft p-6 sm:p-8 bg-white border border-[#E2ECF2] shadow-xs space-y-6">
          <div className="space-y-2">
            <h4 className="font-heading font-bold text-base text-slate-800 flex items-center gap-2">
              <span>📍</span> Delivery Address
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {shippingAddr.streetAddress || 'Address on file'}
              <br />
              {shippingAddr.city && `${shippingAddr.city}, `}
              {shippingAddr.state || ''}
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <h4 className="font-heading font-bold text-base text-slate-800 flex items-center gap-2">
              <span>💳</span> Payment Status
            </h4>
            <div className="flex items-center gap-2">
              <span className="badge-stock badge-in-stock capitalize text-xs">
                {order.payment?.status || 'Paid'}
              </span>
              <span className="text-[11px] text-slate-400">
                via {order.payment?.provider === 'paystack' ? 'Paystack' : (order.payment?.provider || 'Paystack')}
              </span>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-3">
            <Link href="/products" className="btn-blue w-full text-center text-xs !py-3 block">
              Continue Shopping →
            </Link>
            <Link href="/auth" className="text-xs text-[#4A7A99] font-semibold text-center block hover:underline">
              Create / Sign In to Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
