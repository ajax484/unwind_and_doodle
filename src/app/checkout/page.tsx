'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CartResponse, CartItemDetail } from '@/types/cart';
import { PublicPaymentMethod } from '@/types/payment-settings';
import { PaymentProviderName } from '@/services/payment/provider.types';
import { getCartHeaders, setClientCartSessionId, dispatchCartUpdated } from '@/lib/cart-client';
import DeliveryLocationPicker from '@/components/DeliveryLocationPicker';
import { toast } from 'sonner';

interface DeliveryLocation {
  id: string;
  name: string;
  state: string;
  country: string;
  deliveryFee: number;
  estimatedDays: string;
}

interface ManualOrderPlacedState {
  orderNumber: string;
  totalAmount: number;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions?: string | null;
  };
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PublicPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentProviderName>('paystack');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Bank Transfer Confirmation state
  const [manualOrderPlaced, setManualOrderPlaced] = useState<ManualOrderPlacedState | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [emailConsent, setEmailConsent] = useState(true);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');
  const [discountCode, setDiscountCode] = useState('');

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function initCheckout() {
      try {
        setLoading(true);
        // Fetch cart, delivery locations, and enabled payment methods in parallel
        const [cartRes, locRes, payRes] = await Promise.all([
          fetch('/api/cart', { headers: getCartHeaders() }),
          fetch('/api/locations'),
          fetch('/api/payment-methods'),
        ]);

        if (!cartRes.ok) throw new Error('Failed to load cart');
        const cartJson = await cartRes.json();
        if (cartJson.success && cartJson.data) {
          if (cartJson.data.sessionId) setClientCartSessionId(cartJson.data.sessionId);
          setCart(cartJson.data);
        }

        if (locRes.ok) {
          const locJson = await locRes.json();
          if (locJson.success && Array.isArray(locJson.data)) {
            setLocations(locJson.data);
            if (locJson.data.length > 0) {
              setSelectedLocationId(locJson.data[0].id);
              setState(locJson.data[0].state);
              setCity(locJson.data[0].name);
            }
          }
        }

        if (payRes.ok) {
          const payJson = await payRes.json();
          if (payJson.success && Array.isArray(payJson.data) && payJson.data.length > 0) {
            const enabled = payJson.data.filter((p: PublicPaymentMethod) => p.enabled);
            setPaymentMethods(enabled);
            // Default selection: pick first enabled method or paystack if enabled
            if (enabled.length > 0) {
              const hasPaystack = enabled.some((p: PublicPaymentMethod) => p.provider === 'paystack');
              setSelectedPaymentMethod(hasPaystack ? 'paystack' : enabled[0].provider);
            }
          }
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error initializing checkout');
      } finally {
        setLoading(false);
      }
    }

    initCheckout();
  }, []);

  // Applied discount state
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const subtotal = cart?.subtotal || 0;
  const discountTotal = appliedDiscount ? appliedDiscount.discountAmount : 0;
  const deliveryFee = selectedLocation ? selectedLocation.deliveryFee : 0;
  const totalAmount = Math.max(0, subtotal - discountTotal + deliveryFee);

  const formattedSubtotal = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(subtotal);

  const formattedDelivery = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(deliveryFee);

  const formattedTotal = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(totalAmount);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a coupon code.');
      return;
    }

    if (!cart || cart.items.length === 0) return;

    try {
      setValidatingDiscount(true);
      setDiscountError(null);

      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode.trim(),
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.valid) {
        setAppliedDiscount(null);
        setDiscountError(json.error || 'Invalid promo code.');
        return;
      }

      setAppliedDiscount({
        code: json.data.code,
        discountAmount: json.data.discountAmount,
      });
      setDiscountCode(json.data.code);
      setDiscountError(null);
    } catch (err: unknown) {
      setAppliedDiscount(null);
      setDiscountError(err instanceof Error ? err.message : 'Error validating coupon');
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError(null);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    setSelectedLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) {
      setState(loc.state);
      setCity(loc.name);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.phone = 'Please enter a valid phone number (e.g. 08012345678)';
    }

    if (!streetAddress.trim()) errors.streetAddress = 'Street address is required';
    if (!city.trim()) errors.city = 'City is required';
    if (!selectedLocationId) errors.location = 'Please select a delivery location';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCopyAccountNumber = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedAccount(true);
    toast.success('Account number copied to clipboard!');
    setTimeout(() => setCopiedAccount(false), 3000);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      toast.warning('Your cart is empty');
      return;
    }

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check customization completeness
    const incompleteCustomization = cart.items.some(
      (item) => item.requiresCustomization && (!item.customization || item.customization.assets.length === 0)
    );
    if (incompleteCustomization) {
      toast.warning('One or more custom items in your cart are missing required photos. Please return to cart.');
      return;
    }

    const incompleteThemeItem = cart.items.find(
      (item) =>
        item.supportsThemeCustomization &&
        (!item.themeCustomization ||
          !item.themeCustomization.selectedThemeIds ||
          item.themeCustomization.selectedThemeIds.length === 0)
    );
    if (incompleteThemeItem) {
      setErrorMessage(
        `"${incompleteThemeItem.productName}" requires theme selection (between 1 and 3 themes). Please return to your cart or the product page to choose your themes.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      // Build checkout payload with explicit paymentMethod
      const payload = {
        paymentMethod: selectedPaymentMethod,
        customer: {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          whatsappPhone: whatsappPhone.trim() || undefined,
          marketingConsent: emailConsent,
          whatsappConsent: whatsappConsent,
        },
        shippingAddress: {
          streetAddress: streetAddress.trim(),
          city: city.trim() || selectedLocation?.name || 'City',
          state: state.trim() || selectedLocation?.state || 'State',
          lga: lga.trim() || undefined,
        },
        locationId: selectedLocationId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          customization: item.customization
            ? {
                notes: item.customization.notes || undefined,
                assetUrls: item.customization.assets,
              }
            : undefined,
          themeCustomization: item.themeCustomization
            ? {
                selectedThemeIds: item.themeCustomization.selectedThemeIds,
                coverName: item.themeCustomization.coverName || undefined,
              }
            : undefined,
          addons: item.addons.map((a) => ({
            addonProductId: a.addonProductId,
            quantity: a.quantity,
          })),
        })),
        discountCode: discountCode.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        callbackUrl: typeof window !== 'undefined' ? `${window.location.origin}/order/callback` : undefined,
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Checkout failed. Please try again.');
      }

      // Handle Manual / Direct Bank Transfer order
      if (json.data?.paymentType === 'manual' || selectedPaymentMethod === 'manual') {
        // Clear cart session upon successful order placement
        try {
          await fetch('/api/cart?clear=true', {
            method: 'DELETE',
            headers: getCartHeaders(),
          });
          dispatchCartUpdated(undefined, false);
        } catch {
          // non-blocking
        }

        const bankDetails = json.data?.bankDetails || paymentMethods.find((p) => p.provider === 'manual')?.bankDetails;
        if (bankDetails) {
          setManualOrderPlaced({
            orderNumber: json.data.orderNumber,
            totalAmount: json.data.pricing?.total || totalAmount,
            bankDetails,
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        } else {
          // Fallback to order tracking page
          router.replace(`/order/${json.data.orderNumber}`);
          return;
        }
      }

      // Handle Gateway Redirect (Paystack / Flutterwave)
      if (json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
      } else {
        throw new Error('No payment URL received from payment provider');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing checkout';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUCCESS SCREEN: DIRECT BANK TRANSFER CONFIRMATION
  // ─────────────────────────────────────────────────────────────
  if (manualOrderPlaced) {
    const formattedTransferAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(manualOrderPlaced.totalAmount);

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-20 space-y-8 animate-in fade-in duration-300">
        <div className="card-soft p-8 sm:p-10 text-center space-y-4 bg-white border border-border-default shadow-md">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-3xl mx-auto">
            🏦
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Order Initiated • Bank Transfer
            </span>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 mt-2">
              Please Complete Your Bank Transfer
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Your items are reserved for 45 minutes. Transfer exactly <strong className="text-slate-900">{formattedTransferAmount}</strong> to our verified store account below.
            </p>
          </div>

          {/* Bank Account Details Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left space-y-3.5 mt-6">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-xs text-slate-500 font-medium">Bank Name</span>
              <span className="text-xs font-bold text-slate-900 font-heading">
                {manualOrderPlaced.bankDetails.bankName}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-xs text-slate-500 font-medium">Account Name</span>
              <span className="text-xs font-bold text-slate-900 font-heading">
                {manualOrderPlaced.bankDetails.accountName}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-xs text-slate-500 font-medium">Account Number</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-indigo-600 tracking-wider">
                  {manualOrderPlaced.bankDetails.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyAccountNumber(manualOrderPlaced.bankDetails.accountNumber)}
                  className="px-2 py-1 text-[10px] font-bold rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                >
                  {copiedAccount ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-xs text-slate-500 font-medium">Payment Reference</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {manualOrderPlaced.orderNumber}
              </span>
            </div>

            {manualOrderPlaced.bankDetails.instructions && (
              <div className="pt-1">
                <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">
                  Additional Instructions:
                </span>
                <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-xl border border-slate-200">
                  {manualOrderPlaced.bankDetails.instructions}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-left text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-base">⏳</span>
            <div>
              <strong>Important:</strong> After transferring, your order status will remain <em>pending</em> until payment verification is confirmed by our operations team.
            </div>
          </div>

          {/* Next Steps CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link
              href={`/order/${manualOrderPlaced.orderNumber}`}
              className="btn-rose w-full sm:w-auto text-xs sm:text-sm !py-3 !px-6 text-center font-bold"
            >
              Track Order Status ({manualOrderPlaced.orderNumber}) →
            </Link>
            <Link
              href="/"
              className="btn-outline w-full sm:w-auto text-xs sm:text-sm !py-3 !px-6 text-center font-bold"
            >
              Return to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-3 border-action-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-xs sm:text-sm font-heading font-medium text-text-secondary">
          Preparing secure checkout...
        </p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <span className="text-5xl">🛍️</span>
        <h2 className="text-2xl font-bold font-heading text-text-primary">Your Cart is Empty</h2>
        <p className="text-text-secondary text-sm">
          Add some mindfulness tools and creative stationery to your cart before proceeding to checkout.
        </p>
        <Link href="/products" className="btn-rose text-xs !px-6 inline-block">
          Explore Products →
        </Link>
      </div>
    );
  }

  const hasIncompleteCustomization = cart.items.some(
    (item) => item.requiresCustomization && (!item.customization || item.customization.assets.length === 0)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* 1. Checkout Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border-default">
        <div className="space-y-1">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-brand-blue block">
            Step 2 of 2
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
            Checkout
          </h1>
        </div>
        <Link
          href="/cart"
          className="text-xs sm:text-sm font-heading font-semibold text-action-primary hover:text-action-primary-hover flex items-center gap-1 transition-colors"
        >
          ← Edit Cart
        </Link>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-status-danger-bg border border-status-danger-accent/30 rounded-2xl text-status-danger-accent text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Customization Warning */}
      {hasIncompleteCustomization && (
        <div className="p-4 bg-status-danger-bg border border-status-danger-accent/30 rounded-2xl text-status-danger-accent text-xs sm:text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Customization incomplete for items in your cart.</span>
          </div>
          <Link href="/cart" className="font-heading font-bold underline whitespace-nowrap">
            Return to Cart →
          </Link>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
        {/* Left Column: Customer, Delivery, and Payment Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Contact Information */}
          <div className="card-soft p-6 sm:p-8 space-y-5 bg-white border border-border-default">
            <h2 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
              <span>👤</span> Contact Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ada"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: '' }));
                  }}
                  className={`form-input text-xs ${fieldErrors.firstName ? 'border-status-danger-accent' : ''}`}
                />
                {fieldErrors.firstName && (
                  <p className="text-[11px] text-status-danger-accent mt-1">{fieldErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lovelace"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (fieldErrors.lastName) setFieldErrors((prev) => ({ ...prev, lastName: '' }));
                  }}
                  className={`form-input text-xs ${fieldErrors.lastName ? 'border-status-danger-accent' : ''}`}
                />
                {fieldErrors.lastName && (
                  <p className="text-[11px] text-status-danger-accent mt-1">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="ada@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                className={`form-input text-xs ${fieldErrors.email ? 'border-status-danger-accent' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-status-danger-accent mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                  Phone Number (Call/SMS) *
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={`form-input text-xs ${fieldErrors.phone ? 'border-status-danger-accent' : ''}`}
                />
                {fieldErrors.phone && (
                  <p className="text-[11px] text-status-danger-accent mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                  WhatsApp Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="form-input text-xs"
                />
              </div>
            </div>
          </div>

          {/* 2. Delivery Address & Location Selection */}
          <div className="card-soft p-6 sm:p-8 space-y-5 bg-white border border-border-default">
            <h2 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
              <span>📍</span> Delivery Details
            </h2>

            <DeliveryLocationPicker
              locations={locations}
              selectedLocationId={selectedLocationId}
              onChange={(payload) => {
                setSelectedLocationId(payload.locationId);
                if (payload.state) setState(payload.state);
                if (payload.city) setCity(payload.city);
                if (payload.lga) setLga(payload.lga);
                if (fieldErrors.location) {
                  setFieldErrors((prev) => ({ ...prev, location: '' }));
                }
              }}
              hubError={fieldErrors.location}
              size="sm"
            />

            <div>
              <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                Street Address *
              </label>
              <input
                type="text"
                placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                value={streetAddress}
                onChange={(e) => {
                  setStreetAddress(e.target.value);
                  if (fieldErrors.streetAddress) setFieldErrors((prev) => ({ ...prev, streetAddress: '' }));
                }}
                className={`form-input text-xs ${fieldErrors.streetAddress ? 'border-status-danger-accent' : ''}`}
              />
              {fieldErrors.streetAddress && (
                <p className="text-[11px] text-status-danger-accent mt-1">{fieldErrors.streetAddress}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                  City / Town *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ikeja"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: '' }));
                  }}
                  className={`form-input text-xs ${fieldErrors.city ? 'border-status-danger-accent' : ''}`}
                />
                {fieldErrors.city && (
                  <p className="text-[11px] text-status-danger-accent mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                  LGA (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eti-Osa"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  className="form-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-text-primary mb-1">
                Special Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Gate code is #1234, please call upon arrival."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="form-input text-xs"
              />
            </div>
          </div>

          {/* 3. Payment Method Selection (Dynamic from Merchant Settings) */}
          <div className="card-soft p-6 sm:p-8 space-y-5 bg-white border border-border-default">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
                <span>💳</span> Payment Method
              </h2>
              <span className="text-[11px] font-bold text-slate-500">
                Choose how you want to pay
              </span>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
                Loading available payment options...
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const isSelected = selectedPaymentMethod === method.provider;

                  // Friendly customer-facing titles and icons
                  const icon =
                    method.provider === 'paystack'
                      ? '💳'
                      : method.provider === 'flutterwave'
                      ? '⚡'
                      : '🏦';

                  const defaultTitle =
                    method.provider === 'paystack'
                      ? 'Pay with Card / Bank (Paystack)'
                      : method.provider === 'flutterwave'
                      ? 'Pay with Flutterwave'
                      : 'Direct Bank Transfer';

                  const defaultDesc =
                    method.provider === 'paystack'
                      ? 'Pay securely using Card, Bank Transfer, USSD, or Apple Pay.'
                      : method.provider === 'flutterwave'
                      ? 'Fast checkout with international & local card or mobile money.'
                      : 'Transfer directly to our store bank account. Order confirmed upon verification.';

                  return (
                    <label
                      key={method.provider}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-action-primary bg-action-primary/5 shadow-xs ring-1 ring-action-primary/20'
                          : 'border-border-default bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.provider}
                          checked={isSelected}
                          onChange={() => setSelectedPaymentMethod(method.provider)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-action-primary bg-action-primary'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{icon}</span>
                          <span className="font-heading font-bold text-xs sm:text-sm text-text-primary">
                            {method.displayTitle || defaultTitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1">
                          {method.displayDescription || defaultDesc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Bank Transfer Notice when Selected */}
            {selectedPaymentMethod === 'manual' && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1 animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5">
                  <span>ℹ️</span> Bank Transfer Process:
                </div>
                <p className="text-[11px] text-indigo-800">
                  When you place your order, you will receive our verified account details to transfer. Your order will be processed as soon as our team confirms your transfer.
                </p>
              </div>
            )}
          </div>

          {/* 4. Marketing Preferences */}
          <div className="card-soft p-5 sm:p-6 space-y-3 bg-bg-default border border-border-default">
            <label className="flex items-center gap-3 cursor-pointer text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="rounded border-border-input text-action-primary focus:ring-action-primary w-4 h-4"
              />
              <span>Send me occasional emails about new products and mindfulness updates.</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="rounded border-border-input text-action-primary focus:ring-action-primary w-4 h-4"
              />
              <span>Send delivery notifications and dispatch updates on WhatsApp.</span>
            </label>
          </div>
        </div>

        {/* Right Column: Sticky Order Summary & Pay CTA (5 cols) */}
        <div className="lg:col-span-5 card-soft p-6 sm:p-8 space-y-6 bg-white border border-border-default sticky top-28 shadow-sm">
          <h2 className="font-heading font-bold text-xl text-text-primary pb-4 border-b border-border-default">
            Your Order
          </h2>

          {/* Line items list */}
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {cart.items.map((item: CartItemDetail) => {
              const formattedPrice = new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                maximumFractionDigits: 0,
              }).format(item.totalPrice);

              return (
                <div key={item.id} className="text-xs pb-3 border-b border-border-default space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-bold text-text-primary">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="font-heading font-bold text-action-primary whitespace-nowrap">
                      {formattedPrice}
                    </span>
                  </div>

                  {/* Bundle Component Summary */}
                  {item.productType === 'bundle' && item.bundleComponents && item.bundleComponents.length > 0 && (
                    <div className="text-[11px] text-purple-900 bg-purple-50/70 p-2 rounded-lg border border-purple-100 mt-1 space-y-0.5">
                      <span className="font-heading font-bold uppercase text-[9px] tracking-wider text-purple-800 block mb-0.5">
                        📦 Bundle Includes:
                      </span>
                      {item.bundleComponents.map((comp, idx) => (
                        <div key={idx} className="flex justify-between items-center text-purple-900">
                          <span className="truncate">• {comp.name}</span>
                          <span className="font-bold ml-2">× {comp.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add-ons */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[11px] text-text-secondary pl-2 space-y-0.5">
                      {item.addons.map((a) => (
                        <div key={a.id} className="flex justify-between">
                          <span>+ {a.addonName} (×{a.quantity})</span>
                          <span className="font-medium text-text-primary">
                            {new Intl.NumberFormat('en-NG', {
                              style: 'currency',
                              currency: 'NGN',
                              maximumFractionDigits: 0,
                            }).format(a.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Theme Customization (Coloring Books) */}
                  {item.themeCustomization && (
                    <div className="text-[11px] text-text-secondary bg-amber-50/70 border border-amber-200/60 rounded px-2 py-1 space-y-0.5">
                      {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                        <div>
                          <span className="font-semibold text-text-primary">Themes:</span>{' '}
                          <span className="text-text-secondary">
                            {item.themeCustomization.themes.map((t) => t.name).join(' · ')}
                          </span>
                        </div>
                      )}
                      {item.themeCustomization.coverName && (
                        <div>
                          <span className="font-semibold text-text-primary">Cover:</span>{' '}
                          <span className="text-text-secondary">
                            {item.themeCustomization.coverName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customization Status */}
                  {item.requiresCustomization && (
                    <div className="text-[11px] pl-2 pt-0.5">
                      {item.customization && item.customization.assets.length > 0 ? (
                        <span className="text-status-success-accent font-semibold">
                          ✓ {item.customization.assets.length} photo{item.customization.assets.length === 1 ? '' : 's'} attached
                        </span>
                      ) : (
                        <span className="text-status-danger-accent font-bold">
                          ⚠ Customization incomplete
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Discount Code Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Promo / Coupon Code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                disabled={Boolean(appliedDiscount)}
                className="form-input text-xs font-mono font-bold uppercase flex-1"
              />
              {appliedDiscount ? (
                <button
                  type="button"
                  onClick={handleRemoveDiscount}
                  className="px-3 py-2 text-xs font-heading font-semibold rounded-xl bg-bg-subtle text-text-primary hover:bg-bg-brand border border-border-default transition-colors cursor-pointer"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  disabled={validatingDiscount}
                  onClick={handleApplyDiscount}
                  className="btn-outline text-xs !py-2 !px-4 font-heading font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {validatingDiscount ? 'Validating...' : 'Apply'}
                </button>
              )}
            </div>

            {discountError && (
              <p className="text-[11px] text-status-danger-accent font-semibold flex items-center gap-1">
                <span>⚠️</span> {discountError}
              </p>
            )}

            {appliedDiscount && (
              <p className="text-[11px] text-status-success-accent font-bold flex items-center gap-1">
                <span>✓</span> Promo code {appliedDiscount.code} applied successfully!
              </p>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3 text-xs sm:text-sm pt-4 border-t border-border-default">
            <div className="flex items-center justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="font-heading font-bold text-text-primary">{formattedSubtotal}</span>
            </div>

            {appliedDiscount && (
              <div className="flex items-center justify-between text-status-success-accent">
                <span>Discount ({appliedDiscount.code})</span>
                <span className="font-heading font-bold">
                  -
                  {new Intl.NumberFormat('en-NG', {
                    style: 'currency',
                    currency: 'NGN',
                    maximumFractionDigits: 0,
                  }).format(appliedDiscount.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-text-secondary">
              <span>
                Delivery ({selectedLocation ? `${selectedLocation.state} → ${selectedLocation.name}` : 'Standard'})
              </span>
              <span className="font-heading font-bold text-text-primary">{formattedDelivery}</span>
            </div>

            <div className="flex items-center justify-between text-base sm:text-lg font-heading font-bold text-text-primary pt-3 border-t border-border-default">
              <span>Total</span>
              <span className="text-action-primary text-xl">{formattedTotal}</span>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={submitting || hasIncompleteCustomization}
            className="btn-rose w-full text-sm sm:text-base !py-4 shadow-md font-heading font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <span>
                {selectedPaymentMethod === 'manual'
                  ? 'Placing Order...'
                  : selectedPaymentMethod === 'flutterwave'
                  ? 'Connecting to Flutterwave...'
                  : 'Connecting to Paystack...'}
              </span>
            ) : hasIncompleteCustomization ? (
              <span>Customization Required</span>
            ) : selectedPaymentMethod === 'manual' ? (
              <span>Place Order via Bank Transfer →</span>
            ) : (
              <span>Pay {formattedTotal} →</span>
            )}
          </button>

          <div className="text-center space-y-1">
            <p className="text-[11px] text-text-tertiary">
              {selectedPaymentMethod === 'manual'
                ? '🔒 Direct Bank Transfer with 45-minute inventory hold'
                : selectedPaymentMethod === 'flutterwave'
                ? '🔒 Payments securely processed by Flutterwave'
                : '🔒 Payments securely processed by Paystack'}
            </p>
            <p className="text-[10px] text-text-tertiary">
              {selectedPaymentMethod === 'manual'
                ? 'GTBank • Zenith • FirstBank • Access • Kuda • OPay'
                : 'Mastercard • Visa • Verve • Bank Transfer • USSD'}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
