'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CartResponse, CartItemDetail } from '@/types/cart';
import { getCartHeaders, setClientCartSessionId } from '@/lib/cart-client';
import { toast } from 'sonner';

interface DeliveryLocation {
  id: string;
  name: string;
  state: string;
  country: string;
  deliveryFee: number;
  estimatedDays: string;
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        // Fetch cart & delivery locations in parallel
        const [cartRes, locRes] = await Promise.all([
          fetch('/api/cart', { headers: getCartHeaders() }),
          fetch('/api/locations'),
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

      // Build checkout payload
      const payload = {
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

      // Redirect to Paystack authorization URL
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-3 border-[#D99BA3] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs sm:text-sm font-heading font-medium text-[#52657A]">
          Preparing secure checkout...
        </p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-[#FBF0F2] text-[#D99BA3] rounded-full flex items-center justify-center text-4xl mx-auto shadow-xs">
          🛒
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-heading text-[#243342]">Your cart is empty</h2>
          <p className="text-xs sm:text-sm text-[#52657A]">
            Please add items to your cart before proceeding to checkout.
          </p>
        </div>
        <Link href="/products" className="btn-rose text-xs sm:text-sm !px-6 inline-block font-heading font-bold">
          ← Return to Shop
        </Link>
      </div>
    );
  }

  const hasIncompleteCustomization = cart.items.some(
    (item) => item.requiresCustomization && (!item.customization || item.customization.assets.length === 0)
  );

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* 1. Checkout Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#EDF3F7]">
        <div className="space-y-1">
          <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#A7C2D4] block">
            Step 2 of 2
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#243342]">
            Checkout
          </h1>
        </div>
        <Link
          href="/cart"
          className="text-xs sm:text-sm font-heading font-semibold text-[#D99BA3] hover:text-[#C67D87] flex items-center gap-1 transition-colors"
        >
          ← Edit Cart
        </Link>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-[#FDF0F2] border border-[#F0DCE0] rounded-2xl text-[#B33948] text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Customization Warning */}
      {hasIncompleteCustomization && (
        <div className="p-4 bg-[#FDF0F2] border border-[#F0DCE0] rounded-2xl text-[#B33948] text-xs sm:text-sm flex items-center justify-between gap-4">
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
        {/* Left Column: Customer & Delivery Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Contact Information */}
          <div className="card-soft p-6 sm:p-8 space-y-5 bg-white border border-[#EDF3F7]">
            <h2 className="font-heading font-bold text-lg text-[#243342] flex items-center gap-2">
              <span>👤</span> Contact Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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
                  className={`form-input text-xs ${fieldErrors.firstName ? 'border-red-400' : ''}`}
                />
                {fieldErrors.firstName && (
                  <p className="text-[11px] text-[#B33948] mt-1">{fieldErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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
                  className={`form-input text-xs ${fieldErrors.lastName ? 'border-red-400' : ''}`}
                />
                {fieldErrors.lastName && (
                  <p className="text-[11px] text-[#B33948] mt-1">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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
                className={`form-input text-xs ${fieldErrors.email ? 'border-red-400' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-[#B33948] mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={`form-input text-xs ${fieldErrors.phone ? 'border-red-400' : ''}`}
                />
                {fieldErrors.phone && (
                  <p className="text-[11px] text-[#B33948] mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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

          {/* 2. Delivery Address */}
          <div className="card-soft p-6 sm:p-8 space-y-5 bg-white border border-[#EDF3F7]">
            <h2 className="font-heading font-bold text-lg text-[#243342] flex items-center gap-2">
              <span>📍</span> Delivery Address
            </h2>

            <div>
              <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
                Delivery Location / State Hub *
              </label>
              <select
                value={selectedLocationId}
                onChange={handleLocationChange}
                className="form-input text-xs bg-white cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.state} → {loc.name} (+₦{loc.deliveryFee.toLocaleString()} • {loc.estimatedDays})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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
                className={`form-input text-xs ${fieldErrors.streetAddress ? 'border-red-400' : ''}`}
              />
              {fieldErrors.streetAddress && (
                <p className="text-[11px] text-[#B33948] mt-1">{fieldErrors.streetAddress}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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
                  className={`form-input text-xs ${fieldErrors.city ? 'border-red-400' : ''}`}
                />
                {fieldErrors.city && (
                  <p className="text-[11px] text-[#B33948] mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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
              <label className="block text-xs font-heading font-semibold text-[#243342] mb-1">
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

          {/* 3. Marketing Preferences */}
          <div className="card-soft p-5 sm:p-6 space-y-3 bg-[#FDFCFB] border border-[#EDF3F7]">
            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#52657A]">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="rounded border-[#DCE7EE] text-[#D99BA3] focus:ring-[#D99BA3] w-4 h-4"
              />
              <span>Send me occasional emails about new products and mindfulness updates.</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#52657A]">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="rounded border-[#DCE7EE] text-[#D99BA3] focus:ring-[#D99BA3] w-4 h-4"
              />
              <span>Send delivery notifications and dispatch updates on WhatsApp.</span>
            </label>
          </div>
        </div>

        {/* Right Column: Sticky Order Summary & Pay CTA (5 cols) */}
        <div className="lg:col-span-5 card-soft p-6 sm:p-8 space-y-6 bg-white border border-[#EDF3F7] sticky top-28 shadow-sm">
          <h2 className="font-heading font-bold text-xl text-[#243342] pb-4 border-b border-[#EDF3F7]">
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
                <div key={item.id} className="text-xs pb-3 border-b border-[#EDF3F7] space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-bold text-[#243342]">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="font-heading font-bold text-[#D99BA3] whitespace-nowrap">
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
                    <div className="text-[11px] text-[#52657A] pl-2 space-y-0.5">
                      {item.addons.map((a) => (
                        <div key={a.id} className="flex justify-between">
                          <span>+ {a.addonName} (×{a.quantity})</span>
                          <span className="font-medium text-[#243342]">
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
                    <div className="text-[11px] text-[#52657A] bg-amber-50/70 border border-amber-200/60 rounded px-2 py-1 space-y-0.5">
                      {item.themeCustomization.themes && item.themeCustomization.themes.length > 0 && (
                        <div>
                          <span className="font-semibold text-slate-700">Themes:</span>{' '}
                          <span className="text-slate-600">
                            {item.themeCustomization.themes.map((t) => t.name).join(' · ')}
                          </span>
                        </div>
                      )}
                      {item.themeCustomization.coverName && (
                        <div>
                          <span className="font-semibold text-slate-700">Cover:</span>{' '}
                          <span className="text-slate-600">
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
                        <span className="text-[#1F7A4D] font-semibold">
                          ✓ {item.customization.assets.length} photo{item.customization.assets.length === 1 ? '' : 's'} attached
                        </span>
                      ) : (
                        <span className="text-[#B33948] font-bold">
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
                  className="px-3 py-2 text-xs font-heading font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
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
              <p className="text-[11px] text-[#B33948] font-semibold flex items-center gap-1">
                <span>⚠️</span> {discountError}
              </p>
            )}

            {appliedDiscount && (
              <p className="text-[11px] text-[#1F7A4D] font-bold flex items-center gap-1">
                <span>✓</span> Promo code {appliedDiscount.code} applied successfully!
              </p>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3 text-xs sm:text-sm pt-4 border-t border-[#EDF3F7]">
            <div className="flex items-center justify-between text-[#52657A]">
              <span>Subtotal</span>
              <span className="font-heading font-bold text-[#243342]">{formattedSubtotal}</span>
            </div>

            {appliedDiscount && (
              <div className="flex items-center justify-between text-[#1F7A4D]">
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

            <div className="flex items-center justify-between text-[#52657A]">
              <span>
                Delivery ({selectedLocation ? `${selectedLocation.state} → ${selectedLocation.name}` : 'Standard'})
              </span>
              <span className="font-heading font-bold text-[#243342]">{formattedDelivery}</span>
            </div>

            <div className="flex items-center justify-between text-base sm:text-lg font-heading font-bold text-[#243342] pt-3 border-t border-[#EDF3F7]">
              <span>Total</span>
              <span className="text-[#D99BA3] text-xl">{formattedTotal}</span>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={submitting || hasIncompleteCustomization}
            className="btn-rose w-full text-sm sm:text-base !py-4 shadow-md font-heading font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span>Connecting to Flutterwave...</span>
            ) : hasIncompleteCustomization ? (
              <span>Customization Required</span>
            ) : (
              <span>Pay {formattedTotal} →</span>
            )}
          </button>

          <div className="text-center space-y-1">
            <p className="text-[11px] text-[#8295A8]">
              🔒 Payments securely processed by Flutterwave
            </p>
            <p className="text-[10px] text-[#8295A8]">
              Mastercard • Visa • Bank Transfer • USSD
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
