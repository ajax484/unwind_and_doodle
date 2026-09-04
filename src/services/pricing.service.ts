import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { CheckoutItem, PriceBreakdown } from '../types/checkout';
import { CURRENCY, DEFAULT_ORGANIZATION_ID } from '../lib/constants';
import { validateAndCalculateDiscount, DiscountCartItem } from './discount.service';

export interface DeliveryFeeResult {
  deliveryFee: number;
  locationId: string;
  warehouseId?: string;
  description?: string;
}

export interface CalculatePricingParams {
  supabase: SupabaseClient<Database>;
  warehouseId: string;
  locationId: string;
  items: CheckoutItem[];
  discountCode?: string;
  manualDiscount?: {
    type: 'percentage' | 'fixed_amount' | 'fixed';
    value: number;
  };
  organizationId?: string;
}

/**
 * Server-side canonical function to resolve delivery fee for a location and warehouse.
 * Shared between checkout, manual orders, and customer order edit workflows.
 */
export async function resolveDeliveryFee(
  supabase: SupabaseClient<Database>,
  locationId: string,
  warehouseId?: string
): Promise<DeliveryFeeResult> {
  if (!locationId) {
    throw new Error('Location ID is required to resolve delivery fee');
  }

  let query = supabase.from('delivery_rates').select('*').eq('location_id', locationId);

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  const { data: deliveryRates, error: delError } = await query;

  if (delError) {
    throw new Error(`Failed to query delivery rate: ${delError.message}`);
  }

  const activeRate = (deliveryRates || []).find((r) => {
    if ((r as Record<string, unknown>).active !== undefined) return (r as Record<string, unknown>).active;
    if ((r as Record<string, unknown>).is_active !== undefined) return (r as Record<string, unknown>).is_active;
    return true;
  });

  if (!activeRate) {
    throw new Error(
      warehouseId
        ? `No delivery rate found for warehouse ${warehouseId} and location ${locationId}`
        : `No delivery rate found for location ${locationId}`
    );
  }

  const deliveryFee =
    (activeRate as Record<string, unknown>).base_rate !== undefined
      ? Number((activeRate as Record<string, unknown>).base_rate)
      : (activeRate as Record<string, unknown>).price !== undefined
      ? Number((activeRate as Record<string, unknown>).price)
      : Number((activeRate as Record<string, unknown>).rate || 0);

  return {
    deliveryFee,
    locationId,
    warehouseId: activeRate.warehouse_id || warehouseId,
    description: 'Standard Delivery Rate',
  };
}

/**
 * Calculates authoritative pricing for an order strictly from the database.
 * Client-submitted prices are completely ignored to ensure security and consistency.
 */
export async function calculateOrderPricing(
  params: CalculatePricingParams
): Promise<PriceBreakdown> {
  const { supabase, warehouseId, locationId, items, discountCode, manualDiscount } = params;

  if (discountCode && discountCode.trim() && manualDiscount) {
    throw new Error('Discount code and manual discount cannot be used together.');
  }

  // 1. Collect all product IDs (main products and addon products)
  const mainProductIds = items.map((i) => i.productId);
  const addonProductIds = items.flatMap((i) => (i.addons || []).map((a) => a.addonProductId));
  const allProductIds = Array.from(new Set([...mainProductIds, ...addonProductIds]));

  // 2. Query products table for base info and prices
  const { data: dbProducts, error: prodError } = await supabase
    .from('products')
    .select('*')
    .in('id', allProductIds);

  if (prodError) {
    throw new Error(`Failed to fetch product prices: ${prodError.message}`);
  }

  let organizationId = params.organizationId || DEFAULT_ORGANIZATION_ID;
  if (!params.organizationId && dbProducts && dbProducts.length > 0 && dbProducts[0].organization_id) {
    organizationId = dbProducts[0].organization_id;
  }
  const productsMap = new Map<string, { id: string; name: string; price: number; is_active: boolean }>();
  for (const p of dbProducts || []) {
    const legacy = p as Record<string, unknown>;
    const isActive = p.status ? p.status === 'published' : legacy.is_active !== false;
    const unitPrice = p.selling_price !== undefined && p.selling_price !== null ? p.selling_price : ((legacy.price as number) || 0);
    productsMap.set(p.id, {
      id: p.id,
      name: p.name,
      price: unitPrice,
      is_active: isActive,
    });
  }

  // 3. Query product_addons for valid associations and price overrides (support parent_product_id and product_id)
  const [{ data: dbAddonsParent }, { data: dbAddonsLegacy }] = await Promise.all([
    supabase.from('product_addons').select('*').in('parent_product_id', mainProductIds),
    supabase.from('product_addons').select('*').in('product_id' as unknown as 'parent_product_id', mainProductIds),
  ]);

  const allDbAddons = [...(dbAddonsParent || []), ...(dbAddonsLegacy || [])];

  // Map: `${productId}:${addonProductId}` -> price_override
  const addonOverrideMap = new Map<string, number | null>();
  for (const a of allDbAddons) {
    const parentId = a.parent_product_id || (a as Record<string, unknown>).product_id;
    if (parentId && a.addon_product_id) {
      addonOverrideMap.set(`${parentId}:${a.addon_product_id}`, a.price_override);
    }
  }

  let subtotal = 0;
  let addOnsTotal = 0;
  const itemBreakdowns: PriceBreakdown['itemBreakdowns'] = [];

  for (const item of items) {
    const mainProduct = productsMap.get(item.productId);
    if (!mainProduct) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    if (!mainProduct.is_active) {
      throw new Error(`Product is currently inactive: ${mainProduct.name}`);
    }

    const mainUnitPrice = mainProduct.price;
    const mainTotalPrice = mainUnitPrice * item.quantity;
    subtotal += mainTotalPrice;

    const addonBreakdowns: PriceBreakdown['itemBreakdowns'][0]['addons'] = [];

    for (const addon of item.addons || []) {
      const addonProduct = productsMap.get(addon.addonProductId);
      if (!addonProduct) {
        throw new Error(`Addon product not found: ${addon.addonProductId}`);
      }
      if (!addonProduct.is_active) {
        throw new Error(`Addon product is currently inactive: ${addonProduct.name}`);
      }

      const key = `${item.productId}:${addon.addonProductId}`;
      if (!addonOverrideMap.has(key)) {
        throw new Error(
          `Product '${addonProduct.name}' is not configured as an allowed addon for '${mainProduct.name}'`
        );
      }

      const priceOverride = addonOverrideMap.get(key);
      const unitPrice = priceOverride !== null && priceOverride !== undefined ? priceOverride : addonProduct.price;
      const totalAddonPrice = unitPrice * addon.quantity;

      addOnsTotal += totalAddonPrice;

      addonBreakdowns.push({
        addonProductId: addon.addonProductId,
        addonName: addonProduct.name,
        quantity: addon.quantity,
        unitPrice,
        totalPrice: totalAddonPrice,
      });
    }

    itemBreakdowns.push({
      productId: item.productId,
      productName: mainProduct.name,
      quantity: item.quantity,
      unitPrice: mainUnitPrice,
      totalPrice: mainTotalPrice,
      addons: addonBreakdowns,
    });
  }

  // 4. Calculate delivery fee using canonical resolver
  const deliveryRes = await resolveDeliveryFee(supabase, locationId, warehouseId);
  const deliveryFee = deliveryRes.deliveryFee;

  // 5. Calculate discount
  let discountTotal = 0;
  let appliedDiscount: PriceBreakdown['appliedDiscount'];

  if (manualDiscount) {
    if (manualDiscount.value <= 0) {
      throw new Error('Manual discount value must be greater than zero');
    }
    const merchandiseTotal = subtotal + addOnsTotal;

    if (manualDiscount.type === 'percentage') {
      if (manualDiscount.value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      discountTotal = (merchandiseTotal * manualDiscount.value) / 100;
    } else if (manualDiscount.type === 'fixed_amount' || manualDiscount.type === 'fixed') {
      if (manualDiscount.value > merchandiseTotal) {
        throw new Error(`Fixed discount amount (₦${manualDiscount.value}) cannot exceed subtotal (₦${merchandiseTotal})`);
      }
      discountTotal = manualDiscount.value;
    } else {
      throw new Error(`Invalid manual discount type: ${manualDiscount.type}`);
    }
  } else if (discountCode && discountCode.trim()) {
    const cartItemsForDiscount: DiscountCartItem[] = itemBreakdowns.map((ib) => ({
      productId: ib.productId,
      quantity: ib.quantity,
      unitPrice: ib.unitPrice,
    }));

    const result = await validateAndCalculateDiscount(
      supabase,
      organizationId,
      discountCode,
      cartItemsForDiscount
    );

    if (result.valid && result.discountAmount !== undefined) {
      discountTotal = result.discountAmount;
      appliedDiscount = {
        id: result.discountId!,
        code: result.code!,
        amount: result.discountAmount,
      };
    } else if (result.error) {
      throw new Error(result.error);
    }
  }

  const total = Math.max(0, subtotal + addOnsTotal - discountTotal + deliveryFee);

  return {
    subtotal,
    addOnsTotal,
    discountTotal,
    deliveryFee,
    total,
    currency: CURRENCY.NGN,
    itemBreakdowns,
    appliedDiscount,
  };
}
