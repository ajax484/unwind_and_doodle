import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';

export interface RequiredProductItem {
  productId: string;
  quantity: number;
}

export interface InputCheckoutItem {
  productId: string;
  quantity: number;
  addons?: { addonProductId: string; quantity: number }[];
}

export interface WarehouseResolutionResult {
  capable: boolean;
  warehouseId?: string;
  warehouseName?: string;
  error?: string;
  missingItems?: {
    productId: string;
    required: number;
    available: number;
  }[];
}

/**
 * Resolves checkout items into physical component requirements.
 * If an item is a product bundle (product_type === 'bundle'), it queries `bundle_items`
 * and expands the required quantity into the underlying physical component items.
 */
export async function resolveRequiredPhysicalItems(
  supabase: SupabaseClient<Database>,
  items: InputCheckoutItem[]
): Promise<RequiredProductItem[]> {
  if (!items || items.length === 0) return [];

  const mainProductIds = Array.from(new Set(items.map((i) => i.productId)));

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, product_type')
    .in('id', mainProductIds);

  if (prodErr) {
    throw new Error(`Failed to query product types for warehouse allocation: ${prodErr.message}`);
  }

  const bundleProductIds = (products || [])
    .filter((p) => p.product_type === 'bundle')
    .map((p) => p.id);

  const bundleComponentsMap = new Map<string, { componentProductId: string; quantity: number }[]>();

  if (bundleProductIds.length > 0) {
    const { data: bItems, error: biErr } = await supabase
      .from('bundle_items')
      .select('bundle_product_id, component_product_id, quantity')
      .in('bundle_product_id', bundleProductIds);

    if (biErr) {
      throw new Error(`Failed to query bundle components for warehouse allocation: ${biErr.message}`);
    }

    for (const bi of bItems || []) {
      if (!bundleComponentsMap.has(bi.bundle_product_id)) {
        bundleComponentsMap.set(bi.bundle_product_id, []);
      }
      bundleComponentsMap.get(bi.bundle_product_id)!.push({
        componentProductId: bi.component_product_id,
        quantity: bi.quantity,
      });
    }
  }

  const result: RequiredProductItem[] = [];

  for (const item of items) {
    const components = bundleComponentsMap.get(item.productId);
    if (components && components.length > 0) {
      // Expand bundle into physical component requirements
      for (const comp of components) {
        result.push({
          productId: comp.componentProductId,
          quantity: item.quantity * comp.quantity,
        });
      }
    } else {
      // Standard physical / custom item
      result.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Process add-ons
    for (const addon of item.addons || []) {
      if (addon.quantity > 0) {
        result.push({
          productId: addon.addonProductId,
          quantity: addon.quantity,
        });
      }
    }
  }

  return result;
}

/**
 * Finds a single warehouse that:
 * 1. Serves the customer's selected location (via warehouse_locations)
 * 2. Has enough available inventory (quantity - reserved_quantity) for EVERY physical product in the cart (including add-ons)
 *
 * For V1, multi-warehouse order splitting is NOT allowed.
 */
export async function findCapableWarehouse(
  supabase: SupabaseClient<Database>,
  locationId: string,
  items: RequiredProductItem[]
): Promise<WarehouseResolutionResult> {
  // Aggregate required quantities by product ID
  const aggregatedRequirements = new Map<string, number>();
  for (const item of items) {
    const current = aggregatedRequirements.get(item.productId) || 0;
    aggregatedRequirements.set(item.productId, current + item.quantity);
  }

  const productIds = Array.from(aggregatedRequirements.keys());
  if (productIds.length === 0) {
    return {
      capable: false,
      error: 'No products specified for warehouse resolution',
    };
  }

  // 1. Fetch warehouse IDs that serve the given location
  const { data: warehouseLocs, error: wlError } = await supabase
    .from('warehouse_locations')
    .select('warehouse_id')
    .eq('location_id', locationId);

  if (wlError) {
    throw new Error(`Failed to query warehouse locations: ${wlError.message}`);
  }

  if (!warehouseLocs || warehouseLocs.length === 0) {
    return {
      capable: false,
      error: 'No active warehouse serves the selected delivery location',
    };
  }

  const candidateWarehouseIds = warehouseLocs.map((wl) => wl.warehouse_id);

  // 2. Fetch active warehouses among candidates
  const { data: rawWarehouses, error: whError } = await supabase
    .from('warehouses')
    .select('*')
    .in('id', candidateWarehouseIds);

  if (whError) {
    throw new Error(`Failed to query active warehouses: ${whError.message}`);
  }

  const activeWarehouses = (rawWarehouses || []).filter((w) => {
    if ((w as Record<string, unknown>).active !== undefined) return (w as Record<string, unknown>).active;
    if ((w as Record<string, unknown>).is_active !== undefined) return (w as Record<string, unknown>).is_active;
    return true;
  });

  if (!activeWarehouses || activeWarehouses.length === 0) {
    return {
      capable: false,
      error: 'No active warehouse serves the selected delivery location',
    };
  }

  const activeWhIds = activeWarehouses.map((w) => w.id);
  const whNameMap = new Map(activeWarehouses.map((w) => [w.id, w.name]));

  // 3. Fetch inventory for all active candidate warehouses and product IDs
  const { data: inventoryRecords, error: invError } = await supabase
    .from('inventory')
    .select('warehouse_id, product_id, quantity, reserved_quantity')
    .in('warehouse_id', activeWhIds)
    .in('product_id', productIds);

  if (invError) {
    throw new Error(`Failed to query inventory: ${invError.message}`);
  }

  // Map inventory by warehouse_id -> product_id -> available_quantity
  const inventoryMap = new Map<string, Map<string, number>>();
  for (const inv of inventoryRecords || []) {
    if (!inventoryMap.has(inv.warehouse_id)) {
      inventoryMap.set(inv.warehouse_id, new Map());
    }
    const available = Math.max(0, (inv.quantity || 0) - (inv.reserved_quantity || 0));
    inventoryMap.get(inv.warehouse_id)!.set(inv.product_id, available);
  }

  // 4. Evaluate each active warehouse to check if it satisfies ALL required items
  let bestWarehouseId: string | null = null;
  let bestWarehouseName: string | null = null;
  let lastMissingItems: { productId: string; required: number; available: number }[] = [];

  for (const warehouseId of activeWhIds) {
    const warehouseName = whNameMap.get(warehouseId) || warehouseId;
    const whStock = inventoryMap.get(warehouseId) || new Map();
    let hasAllItems = true;
    const missing: { productId: string; required: number; available: number }[] = [];

    for (const [productId, requiredQty] of aggregatedRequirements.entries()) {
      const availableQty = whStock.get(productId) || 0;
      if (availableQty < requiredQty) {
        hasAllItems = false;
        missing.push({
          productId,
          required: requiredQty,
          available: availableQty,
        });
      }
    }

    if (hasAllItems) {
      bestWarehouseId = warehouseId;
      bestWarehouseName = warehouseName;
      break; // Found a single warehouse capable of fulfilling entire cart
    } else {
      lastMissingItems = missing;
    }
  }

  if (bestWarehouseId) {
    return {
      capable: true,
      warehouseId: bestWarehouseId,
      warehouseName: bestWarehouseName || bestWarehouseId,
    };
  }

  return {
    capable: false,
    error: 'Insufficient stock in any single warehouse serving your location',
    missingItems: lastMissingItems,
  };
}
