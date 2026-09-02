'use client';

import React, { useEffect, useState, use } from 'react';
import { PaymentRequestDetail } from '@/types/manual-order';

interface LocationOption {
  id: string;
  name: string;
  state?: string;
  lga?: string;
  deliveryFee?: number;
}

export default function CustomerPaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [detail, setDetail] = useState<PaymentRequestDetail | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable Customer Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // Update & Action States
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [feeChangeNotice, setFeeChangeNotice] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  // Fetch Payment Details and Locations
  const fetchPaymentDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const [payRes, locRes] = await Promise.all([
        fetch(`/api/pay/${token}`),
        fetch('/api/locations'),
      ]);

      const payJson = await payRes.json();
      if (!payRes.ok || !payJson.success) {
        throw new Error(payJson.error || 'Payment link unavailable. This link is invalid or no longer active.');
      }

      const detailData: PaymentRequestDetail = payJson.data;
      setDetail(detailData);

      // Pre-fill editable fields
      setFirstName(detailData.customer.firstName || '');
      setLastName(detailData.customer.lastName || '');
      setPhone(detailData.customer.phone || '');
      if (detailData.customer.locationId) {
        setSelectedLocationId(detailData.customer.locationId);
      }

      if (locRes.ok) {
        const locJson = await locRes.json();
        if (locJson.success && Array.isArray(locJson.data)) {
          setLocations(locJson.data);
          if (!detailData.customer.locationId && locJson.data.length > 0) {
            setSelectedLocationId(locJson.data[0].id);
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading payment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPaymentDetail();
    }
  }, [token]);

  // Handle Save Changes
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);
    setFeeChangeNotice(null);

    if (!detail) return;

    const previousFee = detail.pricing.shippingFee;

    try {
      setSaving(true);
      const res = await fetch(`/api/pay/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          locationId: selectedLocationId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update order details');
      }

      const updatedDetail: PaymentRequestDetail = json.data;
      setDetail(updatedDetail);
      setSaveSuccessMsg('Information updated successfully');

      // Check if delivery fee changed
      const newFee = updatedDetail.pricing.shippingFee;
      if (newFee !== previousFee) {
        setFeeChangeNotice(
          `Delivery fee updated: ${formatCurrency(previousFee)} → ${formatCurrency(newFee)}`
        );
      }
    } catch (err: unknown) {
      setSaveErrorMsg(
        err instanceof Error ? err.message : 'An error occurred while saving your details.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle Pay Now
  const handlePayNow = async () => {
    try {
      setPayLoading(true);
      const res = await fetch(`/api/pay/${token}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackUrl: `${window.location.origin}/order/callback`,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
      } else {
        alert(json.error || 'Failed to initialize payment transaction');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error processing payment');
    } finally {
      setPayLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatAddress = (addr: Record<string, unknown>) => {
    const parts = [
      addr.addressLine1 || addr.address_line_1,
      addr.addressLine2 || addr.address_line_2,
      addr.city,
      addr.state,
      addr.country,
      addr.postalCode || addr.postal_code,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No shipping address provided';
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3 bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full">
          <div className="w-10 h-10 rounded-full border-3 border-rose-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold tracking-wide text-slate-300">Retrieving payment details...</p>
        </div>
      </div>
    );
  }

  // 2. Invalid Link State
  if (error || !detail) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto">
            ⚠️
          </div>
          <h1 className="text-xl font-heading font-extrabold text-white">Payment Link Unavailable</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'This payment link is invalid or no longer available.'}
          </p>
        </div>
      </div>
    );
  }

  const isPending = detail.status === 'pending';
  const isPaid = detail.status === 'paid';
  const isExpired = detail.status === 'expired';
  const isCancelled = detail.status === 'cancelled';
  const storeName = detail.store?.name || 'Unwind & Doodle';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header / Store Branding */}
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛍️</span>
            <div>
              <h1 className="text-base font-heading font-black tracking-tight text-white uppercase">{storeName}</h1>
              <p className="text-[11px] text-slate-400">Order Checkout &amp; Payment Link</p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="text-xs font-mono font-bold bg-slate-800 text-rose-400 border border-slate-700 px-3 py-1 rounded-full">
              Order #{detail.orderNumber}
            </span>
          </div>
        </div>

        {/* Status Banners */}
        {isPaid && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 p-4 text-center space-y-1">
            <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
              <span>✅</span>
              <span>Payment Complete — Order #{detail.orderNumber} has already been paid.</span>
            </p>
            {detail.paymentReference && (
              <p className="text-[11px] text-emerald-500 font-mono">Reference: {detail.paymentReference}</p>
            )}
          </div>
        )}

        {isExpired && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 p-4 text-center">
            <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5">
              <span>⏰</span>
              <span>Payment Link Expired — Please contact the seller for a new payment link.</span>
            </p>
          </div>
        )}

        {isCancelled && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 p-4 text-center">
            <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5">
              <span>🚫</span>
              <span>Payment Request Cancelled — This payment request is no longer available.</span>
            </p>
          </div>
        )}

        {/* Feedback Notifications */}
        {saveSuccessMsg && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 p-3.5 px-6 text-xs font-bold text-emerald-400 flex items-center justify-between animate-fadeIn">
            <span>✓ {saveSuccessMsg}</span>
            <button type="button" onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300">
              ✕
            </button>
          </div>
        )}

        {feeChangeNotice && (
          <div className="bg-blue-500/15 border-b border-blue-500/30 p-3.5 px-6 text-xs font-bold text-blue-300 flex items-center justify-between animate-fadeIn">
            <span>🚚 {feeChangeNotice}</span>
            <button type="button" onClick={() => setFeeChangeNotice(null)} className="text-blue-300 hover:text-blue-200">
              ✕
            </button>
          </div>
        )}

        {saveErrorMsg && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 p-3.5 px-6 text-xs font-bold text-rose-400 flex items-center justify-between animate-fadeIn">
            <span>⚠️ {saveErrorMsg}</span>
            <button type="button" onClick={() => setSaveErrorMsg(null)} className="text-rose-400 hover:text-rose-300">
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Editable Customer Information & Delivery Location Section */}
          <form onSubmit={handleSaveChanges} className="bg-slate-850 rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">Your Information</h3>
                <p className="text-[11px] text-slate-400">Edit contact details &amp; delivery location</p>
              </div>
              <span className="text-[11px] text-slate-500">{detail.customer.email}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">First Name</label>
                <input
                  type="text"
                  disabled={!isPending}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-rose-500 disabled:opacity-50 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">Last Name</label>
                <input
                  type="text"
                  disabled={!isPending}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-rose-500 disabled:opacity-50 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  disabled={!isPending}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 801 234 5678"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-rose-500 disabled:opacity-50 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">Delivery Location</label>
                <select
                  disabled={!isPending}
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-hidden focus:border-rose-500 disabled:opacity-50 transition-all"
                >
                  <option value="">Select Delivery Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.state ? `(${loc.state})` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Changing delivery location automatically recalculates your delivery fee and order total.
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[11px] text-slate-400 block">Shipping Address Line</span>
                <span className="font-medium text-slate-300 text-[11px] leading-snug block">
                  {formatAddress(detail.customer.shippingAddress)}
                </span>
              </div>
            </div>

            {isPending && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Immutable Items Breakdown Table */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Items ({detail.items.length})</h3>

            <div className="bg-slate-850 rounded-2xl border border-slate-800/80 overflow-hidden divide-y divide-slate-800">
              {detail.items.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-white text-sm block">{item.productName}</span>
                      <span className="text-slate-400 text-[11px]">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                    <span className="font-extrabold text-white text-sm shrink-0">
                      {formatCurrency(item.total)}
                    </span>
                  </div>

                  {/* Bundle Component Snapshots */}
                  {item.bundleComponents && item.bundleComponents.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 pl-3 border-l-2 border-rose-500/50 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                        Includes Bundle Components:
                      </span>
                      {item.bundleComponents.map((c, idx) => (
                        <div key={idx} className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>• {c.productName} × {c.quantityPerBundle}</span>
                          <span className="font-semibold text-slate-300">({c.totalQuantity} total)</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Theme Customization Snapshot Display */}
                  {item.themeCustomization && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 pl-3 border-l-2 border-amber-500/50 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        Custom Coloring Book Details:
                      </span>
                      {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                        <div className="text-[11px] text-slate-300">
                          <span className="text-slate-400 font-medium">Themes:</span>{' '}
                          {item.themeCustomization.themes.map((t) => t.themeName).join(', ')}
                        </div>
                      )}
                      {item.themeCustomization.coverName && (
                        <div className="text-[11px] text-slate-300">
                          <span className="text-slate-400 font-medium">Cover name:</span>{' '}
                          <span className="font-bold text-white">{item.themeCustomization.coverName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown Summary */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-200">{formatCurrency(detail.pricing.subtotal)}</span>
            </div>

            {detail.pricing.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Discount {detail.pricing.discountCode ? `(${detail.pricing.discountCode})` : ''}</span>
                <span>-{formatCurrency(detail.pricing.discountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-400">
              <span>Delivery Fee</span>
              <span className="font-semibold text-slate-200">
                {detail.pricing.shippingFee > 0 ? formatCurrency(detail.pricing.shippingFee) : 'Free'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
              <span className="font-bold text-white">Total Amount Due</span>
              <span className="text-xl font-black text-rose-400">{formatCurrency(detail.pricing.total)}</span>
            </div>
          </div>

          {/* Payment Action CTA */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handlePayNow}
              disabled={!isPending || payLoading}
              className={`w-full py-4 rounded-2xl text-sm font-heading font-extrabold transition-all flex items-center justify-center gap-2 shadow-xl ${
                !isPending
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-700/50'
                  : payLoading
                  ? 'bg-rose-700 text-white cursor-wait opacity-80'
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white active:scale-[0.99] cursor-pointer'
              }`}
            >
              {payLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Paystack...</span>
                </>
              ) : isPaid ? (
                <span>✓ Payment Completed</span>
              ) : isExpired ? (
                <span>⏰ Link Expired</span>
              ) : isCancelled ? (
                <span>🚫 Link Cancelled</span>
              ) : (
                <span>🔒 Pay {formatCurrency(detail.pricing.total)}</span>
              )}
            </button>

            {isPending && detail.expiresAt && (
              <p className="text-[11px] text-slate-400 text-center font-medium">
                ⏱️ Payment link expires on <strong className="text-slate-300">{formatDateTime(detail.expiresAt)}</strong>
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
              <span>🔒 256-bit Encrypted Secure Payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
