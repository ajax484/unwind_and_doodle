"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import {
  ProductPickerModal,
  SelectableProduct,
} from "@/components/admin/ProductPickerModal";
import {
  ManualOrderSuccessModal,
  ManualOrderSuccessData,
} from "./ManualOrderSuccessModal";

interface CustomerSearchResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface WarehouseItem {
  id: string;
  name: string;
  is_active: boolean;
}

interface LocationItem {
  id: string;
  name: string;
}

export interface SelectedOrderProduct {
  productId: string;
  name: string;
  sku: string | null;
  productType: "physical" | "custom" | "bundle";
  sellingPrice: number;
  quantity: number;
  primaryImage: string | null;
}

export function ManualOrderForm() {
  // Unique Idempotency Key generated once per manual order form session
  const formSessionId = useId();
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    setIdempotencyKey(
      `mkey_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    );
  }, [formSessionId]);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<
    CustomerSearchResult[]
  >([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Products State
  const [items, setItems] = useState<SelectedOrderProduct[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Shipping & Warehouse State
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Lagos");
  const [state, setState] = useState("Lagos");
  const [country, setCountry] = useState("Nigeria");
  const [postalCode, setPostalCode] = useState("");
  const [shippingFee, setShippingFee] = useState<number | "">(0);

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Discount & Channel & Notes
  const [discountCode, setDiscountCode] = useState("");
  const [manualOrderChannel, setManualOrderChannel] =
    useState<string>("instagram");
  const [notes, setNotes] = useState("");

  // Submission & Result States
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<ManualOrderSuccessData | null>(
    null,
  );

  // Fetch Warehouses & Locations
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [whRes, locRes] = await Promise.all([
          fetch("/api/admin/inventory/warehouses"),
          fetch("/api/admin/inventory/locations"),
        ]);

        if (whRes.ok) {
          const whJson = await whRes.json();
          if (whJson.success && Array.isArray(whJson.data)) {
            setWarehouses(whJson.data);
            const activeWh = whJson.data.find(
              (w: WarehouseItem) => w.is_active,
            );
            if (activeWh) setSelectedWarehouseId(activeWh.id);
          }
        }

        if (locRes.ok) {
          const locJson = await locRes.json();
          if (locJson.success && Array.isArray(locJson.data)) {
            setLocations(locJson.data);
          }
        }
      } catch {
        // Non-blocking
      }
    }
    fetchOptions();
  }, []);

  // Debounced Customer Search
  const searchExistingCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCustomerResults([]);
      return;
    }

    try {
      setSearchingCustomers(true);
      const res = await fetch(
        `/api/admin/customers?search=${encodeURIComponent(query.trim())}&limit=5`,
      );
      const json = await res.json();
      if (res.ok && json.success && json.data?.customers) {
        setCustomerResults(json.data.customers);
      }
    } catch {
      setSearchingCustomers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchExistingCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchExistingCustomers]);

  const handleSelectCustomer = (c: CustomerSearchResult) => {
    setSelectedCustomerId(c.id);
    setEmail(c.email || "");
    setFirstName(c.first_name || "");
    setLastName(c.last_name || "");
    setPhone(c.phone || "");
    setCustomerSearch("");
    setCustomerResults([]);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
  };

  // Product Selection Handlers
  const handleAddProduct = (prod: SelectableProduct) => {
    setProductError(null);
    const existing = items.find((i) => i.productId === prod.id);
    if (existing) {
      setProductError(
        `"${prod.name}" is already added to this order. Quantity increased by 1.`,
      );
      setItems((prev) =>
        prev.map((i) =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
      setIsProductPickerOpen(false);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        productType: prod.product_type,
        sellingPrice: Number(prod.selling_price || 0),
        quantity: 1,
        primaryImage: prod.primaryImage,
      },
    ]);
    setIsProductPickerOpen(false);
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: qty } : i,
      ),
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Pricing Summary Calculation
  const subtotal = items.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0,
  );
  const numShippingFee =
    typeof shippingFee === "number" ? Math.max(0, shippingFee) : 0;
  const estimatedTotal = subtotal + numShippingFee;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError("Customer email is required.");
      return;
    }

    if (items.length === 0) {
      setFormError("Please add at least one product item to the order.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        customer: {
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
        },
        shippingAddress: {
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim() || "Lagos",
          state: state.trim() || "Lagos",
          country: country.trim() || "Nigeria",
          postalCode: postalCode.trim() || undefined,
        },
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        warehouseId: selectedWarehouseId || undefined,
        locationId: selectedLocationId || undefined,
        manualOrderChannel,
        discountCode: discountCode.trim() || undefined,
        shippingFee: numShippingFee,
        notes: notes.trim() || undefined,
        idempotencyKey,
      };

      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create manual order");
      }

      setSuccessData(json.data);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : "An error occurred while creating the manual order.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setSelectedCustomerId(null);
    setItems([]);
    setDiscountCode("");
    setNotes("");
    setFormError(null);
    setIdempotencyKey(
      `mkey_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    );
  };

  return (
    <div className="space-y-6">
      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Area (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Customer Section */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-heading font-bold text-slate-900">
                    Customer Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Search existing customers or enter guest details.
                  </p>
                </div>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={handleClearSelectedCustomer}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Clear Selected Customer
                  </button>
                )}
              </div>

              {/* Customer Search Bar */}
              {!selectedCustomerId && (
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Search Existing Customer
                  </label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer by name or email..."
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                  {customerResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {c.first_name || ""} {c.last_name || ""}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {c.email}
                            </p>
                          </div>
                          {c.phone && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {c.phone}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 801 234 5678"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 2. Products Section */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-heading font-bold text-slate-900">
                    Order Items
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add physical products, custom products, or bundles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductPickerOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-heading font-bold bg-[#1E293B] hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  + Add Product / Bundle
                </button>
              </div>

              {productError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                  {productError}
                </div>
              )}

              {items.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <p className="text-sm font-semibold text-slate-600">
                    No products added yet
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click "+ Add Product / Bundle" above to select products for
                    this order.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300/50 flex items-center justify-center text-slate-400 font-bold text-xs">
                          {item.primaryImage ? (
                            <img
                              src={item.primaryImage}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "📦"
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {item.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                item.productType === "bundle"
                                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                                  : item.productType === "custom"
                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                    : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {item.productType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            SKU: {item.sku || "N/A"}
                          </p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {formatCurrency(item.sellingPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.quantity - 1,
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                item.productId,
                                parseInt(e.target.value, 10) || 1,
                              )
                            }
                            className="w-10 text-center text-xs font-bold text-slate-800 border-none focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.quantity + 1,
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right min-w-[80px]">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                            Line Total
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(item.sellingPrice * item.quantity)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(item.productId)}
                          className="w-8 h-8 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center justify-center"
                          title="Remove item"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Shipping & Warehouse Section */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Delivery & Warehouse
                </h3>
                <p className="text-xs text-slate-500">
                  Configure shipping address, warehouse fulfillment, and
                  shipping fee.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="123 Admiralty Way"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Suite 4B"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Fulfillment Warehouse
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="">Default Active Warehouse</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} {wh.is_active ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Channel, Discount & Notes */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Order Channel & Additional Options
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Order Source Channel
                  </label>
                  <select
                    value={manualOrderChannel}
                    onChange={(e) => setManualOrderChannel(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Phone</option>
                    <option value="facebook">Facebook</option>
                    <option value="other">Other Direct Channel</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Discount Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) =>
                      setDiscountCode(e.target.value.toUpperCase())
                    }
                    placeholder="e.g. WELCOME10"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all uppercase"
                  />
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Discount code rules will be validated server-side.
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any internal notes about this order..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Summary Card (Right 1 Column) */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-md sticky top-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Order Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Review line items and shipping total before link creation.
                </p>
              </div>

              {/* Subtotal & Fee Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Shipping Fee</span>
                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      value={shippingFee}
                      onChange={(e) =>
                        setShippingFee(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0"
                      className="w-full px-2 py-1 text-right text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {discountCode.trim() && (
                  <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-semibold">
                    <span>Code: {discountCode.trim()}</span>
                    <span>Validated at checkout</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">
                    Total
                  </span>
                  <span className="text-xl font-bold font-heading text-rose-600">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>

              {/* Primary Submit CTA */}
              <button
                type="submit"
                disabled={submitting || items.length === 0 || !email.trim()}
                className={`w-full py-3.5 px-4 rounded-2xl text-sm font-heading font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  submitting || items.length === 0 || !email.trim()
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 active:scale-[0.99]"
                }`}
              >
                {submitting
                  ? "Creating payment link..."
                  : "🔗 Create payment link"}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Stock is reserved for 24 hours upon creating the link. The
                customer will receive a secure payment URL.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onSelectProduct={handleAddProduct}
        selectedProductIds={items.map((i) => i.productId)}
      />

      {/* Success Modal */}
      <ManualOrderSuccessModal
        isOpen={Boolean(successData)}
        data={successData}
        onReset={handleResetForm}
      />
    </div>
  );
}
