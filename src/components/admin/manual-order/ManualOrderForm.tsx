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
import {
  OrderItemCustomizationModal,
  ItemCustomizationData,
} from "./OrderItemCustomizationModal";
import TextInput from "@/components/TextInput";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import Button from "@/components/Button";
import AlertBanner from "@/components/AlertBanner";
import Badge from "@/components/Badge";
import Spinner from "@/components/Spinner";

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
  supportsThemeCustomization?: boolean;
  customization?: {
    themeIds?: string[];
    coverName?: string;
  };
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
  const [customizingProduct, setCustomizingProduct] = useState<SelectedOrderProduct | null>(null);

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
            supportsThemeCustomization: Boolean(sel.product.supports_theme_customization),
          });
        }
      }
      return updated;
    });
  };

  const handleSaveItemCustomization = (
    productId: string,
    customization: ItemCustomizationData | undefined
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            customization: customization
              ? {
                  themeIds: customization.themeIds,
                  coverName: customization.coverName,
                }
              : undefined,
          };
        }
        return item;
      })
    );
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

    if (!email.trim() && !phone.trim()) {
      setFormError("Please provide either a customer email or a phone number.");
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
          email: email.trim() || undefined,
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
          customization:
            i.customization && (i.customization.themeIds?.length || i.customization.coverName)
              ? {
                  themeIds: i.customization.themeIds,
                  coverName: i.customization.coverName,
                }
              : undefined,
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
    setCustomizingProduct(null);
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

      {customizingProduct && (
        <OrderItemCustomizationModal
          isOpen={true}
          onClose={() => setCustomizingProduct(null)}
          productId={customizingProduct.productId}
          productName={customizingProduct.name}
          initialCustomization={customizingProduct.customization}
          onSave={(customization) => {
            handleSaveItemCustomization(customizingProduct.productId, customization);
            setCustomizingProduct(null);
          }}
        />
      )}

      {formError && (
        <AlertBanner
          variant="danger"
          size="md"
          dismissible
          onDismiss={() => setFormError(null)}
          description={formError}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Main Editor - 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Customer Section */}
            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <div>
                  <h3 className="text-base font-heading font-bold text-text-primary">
                    Customer Details
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Search existing customers or enter guest details.
                  </p>
                </div>
                {selectedCustomerId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelectedCustomer}
                    className="text-xs font-semibold text-action-primary hover:bg-action-primary/10 rounded-lg min-h-0 py-1 px-2.5"
                  >
                    Clear Selected Customer
                  </Button>
                )}
              </div>

              {/* Customer Search Bar */}
              {!selectedCustomerId && (
                <div className="relative">
                  <label className="text-xs font-semibold text-text-primary mb-1 block">
                    Search Existing Customer
                  </label>
                  <TextInput
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer by name or email..."
                    size="sm"
                    leadingIcon={
                      <span className="text-text-tertiary select-none" aria-hidden="true">
                        🔍
                      </span>
                    }
                    aria-label="Search customer by name or email"
                  />
                  {customerResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-bg-surface border border-border-default rounded-2xl shadow-dropdown overflow-hidden max-h-48 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-bg-subtle border-b border-border-default last:border-none flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-text-primary">
                              {c.first_name || ""} {c.last_name || ""}
                            </p>
                            <p className="text-[11px] text-text-secondary">
                              {c.email}
                            </p>
                          </div>
                          {c.phone && (
                            <span className="text-[11px] text-text-tertiary font-mono">
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
                <div className="space-y-1">
                  <TextInput
                    type="email"
                    label="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com (optional)"
                    size="sm"
                  />
                  <p className="text-[11px] text-text-tertiary">
                    Optional if phone is provided. An internal alias is used for payment links.
                  </p>
                </div>
                <TextInput
                  type="tel"
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 801 234 5678"
                  size="sm"
                />
                <TextInput
                  type="text"
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  size="sm"
                />
                <TextInput
                  type="text"
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  size="sm"
                />
              </div>
            </div>

            {/* 2. Products Section (with Multi-Product Picker) */}
            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <div>
                  <h3 className="text-base font-heading font-bold text-text-primary">
                    Order Items
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Select multiple products, custom items, or bundles.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsProductPickerOpen(true)}
                  variant="primary"
                  size="sm"
                  className="rounded-xl font-heading font-bold shadow-xs"
                >
                  + Add Products / Bundles
                </Button>
              </div>

              {productError && (
                <AlertBanner
                  variant="warning"
                  size="sm"
                  description={productError}
                />
              )}

              {items.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border-default rounded-2xl bg-bg-subtle/50">
                  <p className="text-sm font-semibold text-text-primary">
                    No products added yet
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Click "+ Add Products / Bundles" above to choose items for this order.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border-default rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg-subtle border-b border-border-default text-text-secondary font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Unit Price</th>
                        <th className="px-4 py-3 text-center">Quantity</th>
                        <th className="px-4 py-3 text-right">Line Total</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default bg-bg-surface">
                      {items.map((item) => {
                        const maxStock =
                          item.availableStock !== undefined
                            ? item.availableStock
                            : 9999;
                        const isBundle = item.productType === "bundle";
                        const isCustom = item.productType === "custom";

                        return (
                          <tr
                            key={item.productId}
                            className="hover:bg-bg-subtle/50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-bg-subtle border border-border-default overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.primaryImage ? (
                                    <img
                                      src={item.primaryImage}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>📦</span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-text-primary">
                                      {item.name}
                                    </span>
                                    <Badge
                                      variant={isBundle ? "bundle" : "status"}
                                      statusType={isCustom ? "info" : "neutral"}
                                      size="sm"
                                    >
                                      {item.productType}
                                    </Badge>
                                  </div>
                                  <span className="text-[11px] text-text-tertiary">
                                    SKU: {item.sku || "N/A"}
                                  </span>
                                  {item.supportsThemeCustomization && (
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                      {item.customization?.coverName || (item.customization?.themeIds && item.customization.themeIds.length > 0) ? (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {item.customization.coverName && (
                                            <span className="inline-flex items-center text-[10px] bg-action-primary/10 text-action-primary px-2 py-0.5 rounded-md font-medium">
                                              Cover: &ldquo;{item.customization.coverName}&rdquo;
                                            </span>
                                          )}
                                          {item.customization.themeIds && item.customization.themeIds.length > 0 && (
                                            <span className="inline-flex items-center text-[10px] bg-bg-subtle border border-border-default text-text-secondary px-2 py-0.5 rounded-md font-medium">
                                              🎨 {item.customization.themeIds.length} {item.customization.themeIds.length === 1 ? 'theme' : 'themes'}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setCustomizingProduct(item)}
                                            className="text-[11px] text-action-primary hover:underline font-semibold cursor-pointer ml-1"
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setCustomizingProduct(item)}
                                          className="inline-flex items-center gap-1 text-[11px] text-action-primary bg-action-primary/5 hover:bg-action-primary/10 border border-action-primary/20 px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                                        >
                                          <span>🎨</span> Configure Themes & Cover
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-text-secondary">
                              {formatCurrency(item.sellingPrice)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1 bg-bg-subtle border border-border-default rounded-lg p-1 w-28 mx-auto">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.productId,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-bg-surface hover:bg-bg-subtle/80 text-text-primary font-bold flex items-center justify-center transition-colors cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={maxStock}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(
                                      item.productId,
                                      parseInt(e.target.value, 10) || 1,
                                    )
                                  }
                                  aria-label={`Quantity for ${item.name}`}
                                  className="w-10 text-center text-xs font-bold text-text-primary bg-transparent border-none focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.productId,
                                      item.quantity + 1,
                                    )
                                  }
                                  disabled={item.quantity >= maxStock}
                                  className="w-6 h-6 rounded bg-bg-surface hover:bg-bg-subtle/80 text-text-primary font-bold flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-text-primary">
                              {formatCurrency(
                                item.sellingPrice * item.quantity,
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveProduct(item.productId)
                                }
                                className="p-1.5 min-h-0 h-8 w-8 rounded-lg text-status-danger-accent hover:bg-status-danger-bg hover:text-status-danger-text transition-colors"
                                title="Remove item"
                                aria-label={`Remove ${item.name}`}
                              >
                                🗑️
                              </Button>
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
            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <div className="border-b border-border-default pb-3">
                <h3 className="text-base font-heading font-bold text-text-primary">
                  Discount Options
                </h3>
                <p className="text-xs text-text-secondary">
                  Apply a promo code or specify a manual percentage/fixed discount.
                </p>
              </div>

              {/* Radio Group */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-text-secondary">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value="none"
                    checked={discountType === "none"}
                    onChange={() => handleDiscountTypeChange("none")}
                    className="text-action-primary focus:ring-action-primary cursor-pointer"
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
                    className="text-action-primary focus:ring-action-primary cursor-pointer"
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
                    className="text-action-primary focus:ring-action-primary cursor-pointer"
                  />
                  <span>Manual Discount</span>
                </label>
              </div>

              {/* Discount Code Input */}
              {discountType === "code" && (
                <div className="pt-2 animate-fadeIn">
                  <div className="w-full sm:w-64">
                    <TextInput
                      label="Promo / Coupon Code"
                      value={discountCode}
                      onChange={(e) =>
                        setDiscountCode(e.target.value.toUpperCase())
                      }
                      placeholder="e.g. WELCOME10"
                      size="sm"
                      className="uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Manual Discount Configuration */}
              {discountType === "manual" && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <Select
                    label="Manual Discount Type"
                    value={manualDiscountType}
                    onChange={(e) =>
                      setManualDiscountType(
                        e.target.value as "percentage" | "fixed_amount",
                      )
                    }
                    size="sm"
                    options={[
                      { value: "percentage", label: "Percentage (%)" },
                      { value: "fixed_amount", label: "Fixed Amount (₦)" },
                    ]}
                  />

                  <TextInput
                    label={
                      manualDiscountType === "percentage"
                        ? "Percentage Value (%)"
                        : "Fixed Amount (₦)"
                    }
                    type="number"
                    min={1}
                    max={manualDiscountType === "percentage" ? 100 : undefined}
                    value={manualDiscountValue}
                    onChange={(e) =>
                      setManualDiscountValue(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    placeholder={
                      manualDiscountType === "percentage" ? "15" : "2500"
                    }
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* 4. Shipping & Delivery Section */}
            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-xs space-y-4">
              <div className="border-b border-border-default pb-3">
                <h3 className="text-base font-heading font-bold text-text-primary">
                  Delivery &amp; Fulfillment Location
                </h3>
                <p className="text-xs text-text-secondary">
                  Select customer delivery location to auto-calculate delivery rate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Select
                    label="Delivery Location *"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    size="sm"
                    options={locations.map((loc) => ({
                      value: loc.id,
                      label: `${loc.name} ${loc.state ? `(${loc.state})` : ""}`,
                    }))}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextInput
                    label="Address Line 1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="123 Admiralty Way"
                    size="sm"
                  />
                </div>

                <TextInput
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  size="sm"
                />

                <TextInput
                  label="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  size="sm"
                />

                <Select
                  label="Channel / Source"
                  value={manualOrderChannel}
                  onChange={(e) => setManualOrderChannel(e.target.value)}
                  size="sm"
                  options={[
                    { value: "instagram", label: "Instagram" },
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "phone", label: "Phone" },
                    { value: "in_person", label: "In Person" },
                    { value: "other", label: "Other" },
                  ]}
                />

                <Select
                  label="Fulfillment Warehouse"
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  size="sm"
                  options={[
                    { value: "", label: "Default Active Warehouse" },
                    ...warehouses.map((wh) => ({
                      value: wh.id,
                      label: `${wh.name} ${wh.is_active ? "(Active)" : ""}`,
                    })),
                  ]}
                />

                <div className="sm:col-span-2">
                  <Textarea
                    label="Internal Notes (Optional)"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes for this order..."
                    size="sm"
                    resize="vertical"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sticky Order Summary Card - 1 col) */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-bg-surface border border-border-default shadow-card sticky top-6 space-y-6">
              <div className="border-b border-border-default pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-bold text-text-primary">
                    Order Summary
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Server-calculated breakdown
                  </p>
                </div>
                {previewLoading && (
                  <Spinner size="sm" color="rose" />
                )}
              </div>

              {previewError && (
                <AlertBanner
                  variant="danger"
                  size="sm"
                  description={previewError}
                />
              )}

              {/* Server-Calculated Price Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-text-secondary">
                  <span>
                    Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                  </span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(
                      preview
                        ? preview.subtotal
                        : items.reduce(
                            (s, i) => s + i.sellingPrice * i.quantity,
                            0,
                          ),
                    )}
                  </span>
                </div>

                {(preview ? preview.discountTotal > 0 : false) && (
                  <div className="flex items-center justify-between text-status-success-text font-medium">
                    <span>Discount Applied</span>
                    <span>−{formatCurrency(preview!.discountTotal)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-text-secondary">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-text-primary">
                    {preview ? formatCurrency(preview.deliveryFee) : "₦0"}
                  </span>
                </div>

                <div className="border-t border-border-default pt-3 flex items-center justify-between text-text-primary">
                  <span className="text-base font-heading font-bold">Total</span>
                  <span className="text-xl font-heading font-extrabold text-action-primary">
                    {preview
                      ? formatCurrency(preview.total)
                      : formatCurrency(
                          items.reduce(
                            (s, i) => s + i.sellingPrice * i.quantity,
                            0,
                          ),
                        )}
                  </span>
                </div>
              </div>

              {/* Create Order Submit Button */}
              <Button
                type="submit"
                disabled={
                  submitting ||
                  previewLoading ||
                  items.length === 0 ||
                  Boolean(previewError)
                }
                loading={submitting}
                variant="primary"
                size="lg"
                className="w-full justify-center rounded-xl font-heading font-bold text-sm shadow-md hover:shadow-lg"
              >
                Create Manual Order &amp; Link
              </Button>

              <p className="text-[11px] text-text-tertiary text-center">
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
