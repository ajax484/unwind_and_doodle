'use client';

import React, { useEffect, useState, use } from 'react';
import { PaymentRequestDetail } from '@/types/manual-order';
import DeliveryLocationPicker from '@/components/DeliveryLocationPicker';
import { toast } from 'sonner';

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
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Lagos');
  const [state, setState] = useState('Lagos');

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
      setEmail(detailData.customer.email || '');
      setFirstName(detailData.customer.firstName || '');
      setLastName(detailData.customer.lastName || '');
      setPhone(detailData.customer.phone || '');
      if (detailData.customer.locationId) {
        setSelectedLocationId(detailData.customer.locationId);
      }

      const rawAddr = (detailData.customer.shippingAddress as Record<string, unknown>) || {};
      const rawStreet = String(rawAddr.address_line1 || rawAddr.addressLine1 || '');
      const isPlaceholder =
        rawStreet.toLowerCase().includes('to be provided') ||
        rawStreet.toLowerCase().includes('pending customer') ||
        rawStreet.toLowerCase().includes('address on file');
      setAddressLine1(isPlaceholder ? '' : rawStreet);
      setAddressLine2(String(rawAddr.address_line2 || rawAddr.addressLine2 || ''));
      setCity(String(rawAddr.city || 'Lagos'));
      setState(String(rawAddr.state || 'Lagos'));

      if (locRes.ok) {
        const locJson = await locRes.json();
        if (locJson.success && Array.isArray(locJson.data)) {
          setLocations(locJson.data);
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

  // Check if form has unsaved modifications
  const hasUnsavedChanges = () => {
    if (!detail) return false;
    const curEmail = email.trim().toLowerCase();
    const origEmail = (detail.customer.email || '').trim().toLowerCase();
    const curFirstName = firstName.trim();
    const origFirstName = (detail.customer.firstName || '').trim();
    const curLastName = lastName.trim();
    const origLastName = (detail.customer.lastName || '').trim();
    const curPhone = phone.trim();
    const origPhone = (detail.customer.phone || '').trim();
    const curLocationId = selectedLocationId;
    const origLocationId = detail.customer.locationId || '';
    const rawAddr = (detail.customer.shippingAddress as Record<string, unknown>) || {};
    const origStreet = String(rawAddr.address_line1 || rawAddr.addressLine1 || '');
    const isPlaceholder =
      origStreet.toLowerCase().includes('to be provided') ||
      origStreet.toLowerCase().includes('pending customer') ||
      origStreet.toLowerCase().includes('address on file');
    const origCleanStreet = isPlaceholder ? '' : origStreet;
    const origLine2 = String(rawAddr.address_line2 || rawAddr.addressLine2 || '');

    return (
      curEmail !== origEmail ||
      curFirstName !== origFirstName ||
      curLastName !== origLastName ||
      curPhone !== origPhone ||
      curLocationId !== origLocationId ||
      addressLine1.trim() !== origCleanStreet.trim() ||
      addressLine2.trim() !== origLine2.trim()
    );
  };

  // Core execution to save customer changes
  const executeSaveChanges = async (): Promise<PaymentRequestDetail> => {
    if (!detail) {
      throw new Error('Payment details not available');
    }

    const previousFee = detail.pricing.shippingFee;
    setSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);
    setFeeChangeNotice(null);

    try {
      const res = await fetch(`/api/pay/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          locationId: selectedLocationId || undefined,
          shippingAddress: {
            addressLine1: addressLine1.trim() || undefined,
            addressLine2: addressLine2.trim() || undefined,
            city: city.trim() || 'Lagos',
            state: state.trim() || 'Lagos',
            country: 'Nigeria',
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update order details');
      }

      const updatedDetail: PaymentRequestDetail = json.data;
      setDetail(updatedDetail);
      if (updatedDetail.customer?.email) {
        setEmail(updatedDetail.customer.email);
      }
      setSaveSuccessMsg('Information updated successfully');

      // Check if delivery fee changed
      const newFee = updatedDetail.pricing.shippingFee;
      if (newFee !== previousFee) {
        setFeeChangeNotice(
          `Delivery fee updated: ${formatCurrency(previousFee)} → ${formatCurrency(newFee)}`
        );
      }

      return updatedDetail;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving your details.';
      setSaveErrorMsg(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Changes (manual form submission)
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await executeSaveChanges();
    } catch {
      // Error message is set within executeSaveChanges
    }
  };

  // Handle Pay Now
  const handlePayNow = async () => {
    try {
      setPayLoading(true);
      setSaveErrorMsg(null);

      // Ensure compulsory fields are provided before payment
      if (!selectedLocationId) {
        toast.error('Please select your delivery location before proceeding to payment.');
        setPayLoading(false);
        return;
      }

      if (!addressLine1.trim()) {
        toast.error('Please enter your street address before proceeding to payment.');
        setPayLoading(false);
        return;
      }

      // If customer updated info without clicking "Save changes", auto-save first
      if (hasUnsavedChanges()) {
        try {
          await executeSaveChanges();
        } catch (saveErr: unknown) {
          const msg = saveErr instanceof Error ? saveErr.message : 'Failed to save updated information.';
          toast.error(msg);
          setPayLoading(false);
          return;
        }
      }

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
        toast.error(json.error || 'Failed to initialize payment transaction');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error processing payment');
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-medium block">Email Address (for receipt)</label>
                  {email.includes('+') && (
                    <span className="text-[10px] text-amber-400/90 font-mono">
                      Placeholder alias — update with your personal email
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  disabled={!isPending}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-rose-500 disabled:opacity-50 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <DeliveryLocationPicker
                  locations={locations as any}
                  selectedLocationId={selectedLocationId}
                  disabled={!isPending}
                  allowBlank={true}
                  blankLabel="Select Delivery Location"
                  onChange={(payload) => {
                    setSelectedLocationId(payload.locationId);
                    if (payload.state) setState(payload.state);
                    if (payload.city) setCity(payload.city);
                  }}
                  size="sm"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Changing delivery location automatically recalculates your delivery fee and order total upon saving or paying.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">
                  Street Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  disabled={!isPending}
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-rose-500 disabled:opacity-50 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">
                  Apartment, Suite, Unit (Optional)
                </label>
                <input
                  type="text"
                  disabled={!isPending}
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Flat 4B"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-rose-500 disabled:opacity-50 transition-all"
                />
              </div>
            </div>

            {isPending && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || payLoading}
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

          {/* Direct Bank Transfer Details for Manual Payments */}
          {detail.paymentMethod === 'manual' && isPending && detail.bankDetails && (
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-heading font-bold text-white flex items-center gap-1.5">
                  <span>🏦</span> Direct Bank Transfer Instructions
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
                  Awaiting Transfer
                </span>
              </div>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Name:</span>
                  <strong className="text-white">{detail.bankDetails.bankName || 'Guaranty Trust Bank'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Name:</span>
                  <strong className="text-white">{detail.bankDetails.accountName || 'Unwind & Doodle'}</strong>
                </div>
                <div className="flex justify-between items-center py-1 bg-slate-950/60 px-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Account Number:</span>
                  <span className="font-mono text-sm text-rose-400 font-bold tracking-wider">
                    {detail.bankDetails.accountNumber}
                  </span>
                </div>
                {detail.paymentReference && (
                  <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Payment Reference:</span>
                    <span className="font-mono text-slate-200">{detail.paymentReference}</span>
                  </div>
                )}
                {detail.bankDetails.instructions && (
                  <p className="text-[11px] text-slate-400 italic pt-1">{detail.bankDetails.instructions}</p>
                )}
              </div>
            </div>
          )}

          {/* Payment Action CTA */}
          <div className="space-y-3 pt-1">
            {detail.paymentMethod === 'manual' && isPending ? (
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-amber-300 text-center text-xs font-semibold space-y-1">
                <p>Please transfer {formatCurrency(detail.pricing.total)} to the account above.</p>
                <p className="text-[11px] text-slate-400">Your order will be confirmed and processed once your payment is received.</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePayNow}
                disabled={!isPending || payLoading || saving}
                className={`w-full py-4 rounded-2xl text-sm font-heading font-extrabold transition-all flex items-center justify-center gap-2 shadow-xl ${
                  !isPending
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-700/50'
                    : payLoading || saving
                    ? 'bg-rose-700 text-white cursor-wait opacity-80'
                    : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white active:scale-[0.99] cursor-pointer'
                }`}
              >
                {payLoading || saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{saving ? 'Saving changes...' : `Connecting to ${detail.paymentMethod === 'flutterwave' ? 'Flutterwave' : 'Paystack'}...`}</span>
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
            )}

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
