'use client';

import React, { useState } from 'react';
import { ProductPickerModal, SelectableProduct } from './ProductPickerModal';

export interface SelectedComponentItem {
  component_product_id: string;
  name: string;
  sku: string | null;
  selling_price: number;
  cost_price?: number;
  primaryImage: string | null;
  product_type: 'physical' | 'custom' | 'bundle';
  quantity: number;
}

interface BundleComponentBuilderProps {
  components: SelectedComponentItem[];
  onChangeComponents: (components: SelectedComponentItem[]) => void;
  bundleSellingPrice: number;
}

export function BundleComponentBuilder({
  components,
  onChangeComponents,
  bundleSellingPrice,
}: BundleComponentBuilderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelectProduct = (product: SelectableProduct) => {
    const existingIndex = components.findIndex((c) => c.component_product_id === product.id);

    if (existingIndex >= 0) {
      // Increase quantity of existing component
      const updated = [...components];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      };
      onChangeComponents(updated);
    } else {
      // Add new component row
      const newItem: SelectedComponentItem = {
        component_product_id: product.id,
        name: product.name,
        sku: product.sku,
        selling_price: Number(product.selling_price || 0),
        cost_price: Number(product.cost_price || 0),
        primaryImage: product.primaryImage,
        product_type: product.product_type,
        quantity: 1,
      };
      onChangeComponents([...components, newItem]);
    }
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    const updated = [...components];
    updated[index] = {
      ...updated[index],
      quantity: Math.max(1, Math.floor(newQty)),
    };
    onChangeComponents(updated);
  };

  const handleRemoveComponent = (index: number) => {
    const updated = components.filter((_, i) => i !== index);
    onChangeComponents(updated);
  };

  // Pricing calculations
  const componentsValue = components.reduce(
    (sum, c) => sum + Number(c.selling_price || 0) * Number(c.quantity || 1),
    0
  );
  const componentsCostTotal = components.reduce(
    (sum, c) => sum + Number(c.cost_price || 0) * Number(c.quantity || 1),
    0
  );
  const customerSavings = componentsValue - (bundleSellingPrice || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-heading font-bold text-slate-800 flex items-center gap-2">
            <span>Bundle Components</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {components.length} item{components.length === 1 ? '' : 's'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add existing physical or custom products that make up this bundle.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98]"
        >
          <span>＋</span>
          <span>Add Product</span>
        </button>
      </div>

      {/* Components Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {components.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-xl mx-auto mb-3">
              🎁
            </div>
            <p className="text-sm font-semibold text-slate-700">No components added yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Click &quot;Add Product&quot; to choose products that make up this bundle. At least 1 component is required.
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-4 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 font-semibold text-xs text-slate-700 rounded-xl transition-all shadow-xs"
            >
              + Select Products
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Individual Price</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {components.map((item, idx) => {
                  const itemSubtotal = item.selling_price * item.quantity;

                  return (
                    <tr key={item.component_product_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Product Name & Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.primaryImage ? (
                              <img
                                src={item.primaryImage}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-base">🎨</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{item.name}</div>
                            {item.sku && <div className="text-[10px] text-slate-400">SKU: {item.sku}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        ₦{item.selling_price.toLocaleString()}
                      </td>

                      {/* Quantity Control */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1 max-w-[120px] mx-auto">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value, 10))}
                            className="w-12 text-center py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        ₦{itemSubtotal.toLocaleString()}
                      </td>

                      {/* Remove Button */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center justify-center text-sm"
                          title="Remove component"
                        >
                          🗑
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

      {/* Admin Pricing Summary Card */}
      {components.length > 0 && (
        <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 space-y-3 shadow-md border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Admin Pricing Summary (Informational Only)
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Auto-calculated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
            {/* Components Value */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400 font-medium">Components Total Value</div>
              <div className="text-lg font-bold text-white mt-1">
                ₦{componentsValue.toLocaleString()}
              </div>
            </div>

            {/* Components Total Cost */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400 font-medium">Auto Component Cost</div>
              <div className="text-lg font-bold text-indigo-300 mt-1">
                ₦{componentsCostTotal.toLocaleString()}
              </div>
            </div>

            {/* Bundle Price */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400 font-medium">Bundle Selling Price</div>
              <div className="text-lg font-bold text-rose-400 mt-1">
                ₦{(bundleSellingPrice || 0).toLocaleString()}
              </div>
            </div>

            {/* Customer Savings */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400 font-medium">Customer Savings</div>
              <div
                className={`text-lg font-bold mt-1 ${
                  customerSavings >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                ₦{customerSavings.toLocaleString()}
                {customerSavings < 0 && (
                  <span className="text-[10px] block font-normal text-amber-300">
                    (Bundle priced higher than items)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal dialog */}
      <ProductPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectProduct={handleSelectProduct}
        selectedProductIds={components.map((c) => c.component_product_id)}
      />
    </div>
  );
}
