"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import {
  MultiProductPickerModal,
  MultiProductSelection,
  SelectableProduct,
} from "@/components/admin/MultiProductPickerModal";
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
  state?: string;
  lga?: string;
  deliveryFee?: number;
}

export interface SelectedOrderProduct {
  productId: string;
  name: string;
  sku: string | null;
  productType: "physical" | "custom" | "bundle";
  sellingPrice: number;
  quantity: number;
  availableStock?: number;
  primaryImage: string | null;
}

export interface ServerPreviewBreakdown {
  subtotal: number;
  addOnsTotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  appliedDiscount?: {
    id?: string;
    code?: string;
    amount?: number;
  };
}

export function ManualOrderForm() {
  // Idempotency Key generated per session
  const formSessionId = useId();
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    setIdempotencyKey(
      `mkey_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    );
  }, [formSessionId]);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Discount Controls State
  const [discountType, setDiscountType] = useState<"none" | "code" | "manual">("none");
  const [discountCode, setDiscountCode] = useState("");
  const [manualDiscountType, setManualDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [manualDiscountValue, setManualDiscountValue] = useState<number | "">("");

  // Channel & Notes
  const [manualOrderChannel, setManualOrderChannel] = useState<string>("instagram");
  const [notes, setNotes] = useState("");

  // Real-time Preview State
  const [preview, setPreview] = useState<ServerPreviewBreakdown | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Submission & Result States
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<ManualOrderSuccessData | null>(null);

  // Fetch Warehouses & Delivery Locations
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [whRes, locRes] = await Promise.all([
          fetch("/api/admin/inventory/warehouses"),
          fetch("/api/locations"),
        ]);

        if (whRes.ok) {
          const whJson = await whRes.json();
          if (whJson.success && Array.isArray(whJson.data)) {
            setWarehouses(whJson.data);
            const activeWh = whJson.data.find((w: WarehouseItem) => w.is_active);
            if (activeWh) setSelectedWarehouseId(activeWh.id);
          }
        }

        if (locRes.ok) {
          const locJson = await locRes.json();
          if (locJson.success && Array.isArray(locJson.data)) {
            setLocations(locJson.data);
            if (locJson.data.length > 0) {
              setSelectedLocationId(locJson.data[0].id);
            }
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

  // Discount Radio Switch Handler with automatic clearing
  const handleDiscountTypeChange = (newType: "none" | "code" | "manual") => {
    setDiscountType(newType);
    setPreviewError(null);
    if (newType === "none") {
      setDiscountCode("");
      setManualDiscountValue("");
    } else if (newType === "code") {
      setManualDiscountValue("");
    } else if (newType === "manual") {
      setDiscountCode("");
    }
  };

  // Product Selection Handlers
  const handleAddProductsFromPicker = (selections: MultiProductSelection[]) => {
    setProductError(null);
    setItems((prev) => {
      const updated = [...prev];
      for (const sel of selections) {
        const existingIdx = updated.findIndex((i) => i.productId === sel.product.id);
        const maxStock = sel.product.availableStock !== undefined ? sel.product.availableStock : 999;

        if (existingIdx >= 0) {
          const newQty = Math.min(maxStock, updated[existingIdx].quantity + sel.quantity);
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
          };
        } else {
          updated.push({
            productId: sel.product.id,
            name: sel.product.name,
            sku: sel.product.sku,
            productType: sel.product.product_type,
            sellingPrice: Number(sel.product.selling_price || 0),
            quantity: Math.min(maxStock, sel.quantity),
            availableStock: sel.product.availableStock,
            primaryImage: sel.product.primaryImage,
          });
        }
      }
      return updated;
    });
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const maxStock = i.availableStock !== undefined ? Math.max(1, i.availableStock) : 9999;
          return { ...i, quantity: Math.min(qty, maxStock) };
        }
        return i;
      }),
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Real-Time Server Preview (Debounced 300ms)
  const fetchServerPreview = useCallback(async () => {
    if (items.length === 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);

      const payload: Record<string, unknown> = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        locationId: selectedLocationId || undefined,
        warehouseId: selectedWarehouseId || undefined,
      };

      if (discountType === "code" && discountCode.trim()) {
        payload.discountCode = discountCode.trim();
      } else if (discountType === "manual" && typeof manualDiscountValue === "number" && manualDiscountValue > 0) {
        payload.manualDiscount = {
          type: manualDiscountType,
          value: manualDiscountValue,
        };
      }

      const res = await fetch("/api/admin/orders/manual/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPreview(json.data);
      } else {
        setPreviewError(json.error || "Failed to calculate server preview");
      }
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : "Error connecting to preview API");
    } finally {
      setPreviewLoading(false);
    }
  }, [items, selectedLocationId, selectedWarehouseId, discountType, discountCode, manualDiscountType, manualDiscountValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServerPreview();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchServerPreview]);

  // Format Currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Submit Order Handler
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

    if (previewError) {
      setFormError(`Cannot submit order: ${previewError}`);
      return;
    }

    try {
      setSubmitting(true);

      const payload: Record<string, unknown> = {
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
        notes: notes.trim() || undefined,
        idempotencyKey,
      };

      if (discountType === "code" && discountCode.trim()) {
        payload.discountCode = discountCode.trim();
      } else if (discountType === "manual" && typeof manualDiscountValue === "number" && manualDiscountValue > 0) {
        payload.manualDiscount = {
          type: manualDiscountType,
          value: manualDiscountValue,
        };
      }

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
    setDiscountType("none");
    setDiscountCode("");
    setManualDiscountValue("");
    setNotes("");
    setFormError(null);
    setPreview(null);
    setPreviewError(null);
    setIdempotencyKey(
      `mkey_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    );
  };

  return (
    <div className="space-y-6">
      {successData && (
        <ManualOrderSuccessModal
          isOpen={true}
          onClose={handleResetForm}
          data={successData}
        />
      )}

      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Main Editor - 2 cols) */}
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
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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

            {/* 2. Products Section (with Multi-Product Picker) */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-heading font-bold text-slate-900">
                    Order Items
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select multiple products, custom items, or bundles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductPickerOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-heading font-bold bg-[#1E293B] hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  + Add Products / Bundles
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
                    Click "+ Add Products / Bundles" above to choose items for this order.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Unit Price</th>
                        <th className="px-4 py-3 text-center">Quantity</th>
                        <th className="px-4 py-3 text-right">Line Total</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((item) => {
                        const maxStock = item.availableStock !== undefined ? item.availableStock : 9999;
                        return (
                          <tr key={item.productId} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.primaryImage ? (
                                    <img src={item.primaryImage} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>📦</span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{item.name}</span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        item.productType === "bundle"
                                          ? "bg-purple-100 text-purple-700"
                                          : item.productType === "custom"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {item.productType}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">
                                    SKU: {item.sku || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {formatCurrency(item.sellingPrice)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 w-28 mx-auto">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={maxStock}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                                  className="w-10 text-center text-xs font-bold text-slate-800 border-none focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                  disabled={item.quantity >= maxStock}
                                  className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              {formatCurrency(item.sellingPrice * item.quantity)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveProduct(item.productId)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Discount Configuration Section */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Discount Options
                </h3>
                <p className="text-xs text-slate-500">
                  Apply a promo code or specify a manual percentage/fixed discount.
                </p>
              </div>

              {/* Radio Group */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value="none"
                    checked={discountType === "none"}
                    onChange={() => handleDiscountTypeChange("none")}
                    className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>No Discount</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value="code"
                    checked={discountType === "code"}
                    onChange={() => handleDiscountTypeChange("code")}
                    className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Discount Code</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value="manual"
                    checked={discountType === "manual"}
                    onChange={() => handleDiscountTypeChange("manual")}
                    className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>Manual Discount</span>
                </label>
              </div>

              {/* Discount Code Input */}
              {discountType === "code" && (
                <div className="pt-2 animate-fadeIn">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Promo / Coupon Code
                  </label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME10"
                    className="w-full sm:w-64 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all uppercase"
                  />
                </div>
              )}

              {/* Manual Discount Configuration */}
              {discountType === "manual" && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Manual Discount Type
                    </label>
                    <select
                      value={manualDiscountType}
                      onChange={(e) => setManualDiscountType(e.target.value as "percentage" | "fixed_amount")}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed_amount">Fixed Amount (₦)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      {manualDiscountType === "percentage" ? "Percentage Value (%)" : "Fixed Amount (₦)"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={manualDiscountType === "percentage" ? "100" : undefined}
                      value={manualDiscountValue}
                      onChange={(e) =>
                        setManualDiscountValue(e.target.value === "" ? "" : parseFloat(e.target.value))
                      }
                      placeholder={manualDiscountType === "percentage" ? "15" : "2500"}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Shipping & Delivery Section */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-heading font-bold text-slate-900">
                  Delivery &amp; Fulfillment Location
                </h3>
                <p className="text-xs text-slate-500">
                  Select customer delivery location to auto-calculate delivery rate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Delivery Location *
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.state ? `(${loc.state})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

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
                    Channel / Source
                  </label>
                  <select
                    value={manualOrderChannel}
                    onChange={(e) => setManualOrderChannel(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Phone</option>
                    <option value="in_person">In Person</option>
                    <option value="other">Other</option>
                  </select>
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

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes for this order..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sticky Order Summary Card - 1 col) */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-md sticky top-6 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-bold text-slate-900">
                    Order Summary
                  </h3>
                  <p className="text-xs text-slate-500">
                    Server-calculated breakdown
                  </p>
                </div>
                {previewLoading && (
                  <div className="w-5 h-5 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                )}
              </div>

              {previewError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  ⚠️ {previewError}
                </div>
              )}

              {/* Server-Calculated Price Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(preview ? preview.subtotal : items.reduce((s, i) => s + i.sellingPrice * i.quantity, 0))}
                  </span>
                </div>

                {(preview ? preview.discountTotal > 0 : false) && (
                  <div className="flex items-center justify-between text-emerald-700 font-medium">
                    <span>Discount Applied</span>
                    <span>−{formatCurrency(preview!.discountTotal)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-slate-800">
                    {preview ? formatCurrency(preview.deliveryFee) : "₦0"}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-slate-900">
                  <span className="text-base font-heading font-bold">Total</span>
                  <span className="text-xl font-heading font-extrabold text-rose-600">
                    {preview ? formatCurrency(preview.total) : formatCurrency(items.reduce((s, i) => s + i.sellingPrice * i.quantity, 0))}
                  </span>
                </div>
              </div>

              {/* Create Order Submit Button */}
              <button
                type="submit"
                disabled={submitting || previewLoading || items.length === 0 || Boolean(previewError)}
                className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-heading font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <span>Create Manual Order &amp; Link</span>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                All prices and delivery fees are calculated server-authoritatively.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Multi-Product Picker Modal */}
      <MultiProductPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onAddProducts={handleAddProductsFromPicker}
        alreadySelectedProductIds={items.map((i) => i.productId)}
      />
    </div>
  );
}
