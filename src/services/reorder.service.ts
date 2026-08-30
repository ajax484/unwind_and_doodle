import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { addItemToCart, getOrCreateCart, CartAddonInput } from './cart.service';

export interface UnavailableReorderItem {
  productId: string;
  productName: string;
  reason: 'out_of_stock' | 'discontinued' | 'insufficient_inventory';
}

export interface ReorderResult {
  success: boolean;
  cartId: string;
  itemsAddedCount: number;
  unavailableItems: UnavailableReorderItem[];
  message: string;
}

/**
 * Reorders a previous completed/received order.
 * - Recalculates current product prices and add-on prices from the database.
 * - Validates current warehouse inventory and product status.
 * - Adds available items to the new cart.
 * - Informs the customer of any out-of-stock or discontinued items.
 */
export async function reorderPastOrder(
  supabase: SupabaseClient<Database>,
  options: {
    customerId: string;
    orderIdentifier: string; // id or order_number
    sessionId: string;
  }
): Promise<ReorderResult> {
  const { customerId, orderIdentifier, sessionId } = options;

  // 1. Fetch order with ownership verification
  let orderQuery = supabase
    .from('orders')
    .select('id, order_number, customer_id, status');

  if (orderIdentifier.includes('-') && orderIdentifier.length > 20) {
    orderQuery = orderQuery.eq('id', orderIdentifier);
  } else {
    orderQuery = orderQuery.eq('order_number', orderIdentifier.trim());
  }

  const { data: order, error: orderErr } = await orderQuery.maybeSingle();

  if (orderErr || !order) {
    throw new Error('Order not found');
  }

  if (order.customer_id !== customerId) {
    throw new Error('Unauthorized: This order does not belong to your account');
  }

  // 2. Fetch past order items
  const { data: orderItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  if (itemsErr || !orderItems || orderItems.length === 0) {
    throw new Error('No items found in this order to reorder');
  }

  const itemIds = orderItems.map((i) => i.id);
  const productIds = Array.from(new Set(orderItems.map((i) => i.product_id)));

  // 3. Fetch add-ons associated with these items
  const { data: orderAddons } = await supabase
    .from('order_item_addons')
    .select('*')
    .in('order_item_id', itemIds);

  type OrderAddonRow = Database['public']['Tables']['order_item_addons']['Row'];
  const addonsByItem = new Map<string, OrderAddonRow[]>();
  for (const addon of (orderAddons || []) as OrderAddonRow[]) {
    if (!addonsByItem.has(addon.order_item_id)) {
      addonsByItem.set(addon.order_item_id, []);
    }
    addonsByItem.get(addon.order_item_id)!.push(addon);
  }

  // 4. Fetch live product status and current catalog prices
  const { data: liveProducts } = await supabase
    .from('products')
    .select('id, name, slug, status, selling_price, requires_customization')
    .in('id', productIds);

  const productMap = new Map((liveProducts || []).map((p) => [p.id, p]));

  // 5. Fetch inventory availability
  const { data: inventoryLevels } = await supabase
    .from('inventory')
    .select('product_id, quantity, quantity_on_hand, quantity_reserved, reserved_quantity')
    .in('product_id', productIds);

  // Map product stock
  const stockMap = new Map<string, number>();
  if (inventoryLevels && inventoryLevels.length > 0) {
    for (const inv of inventoryLevels) {
      const onHand = inv.quantity_on_hand !== undefined && inv.quantity_on_hand !== null
        ? inv.quantity_on_hand
        : (inv.quantity || 0);
      const reserved = inv.quantity_reserved !== undefined && inv.quantity_reserved !== null
        ? inv.quantity_reserved
        : (inv.reserved_quantity || 0);
      const available = Math.max(0, onHand - reserved);
      const current = stockMap.get(inv.product_id) || 0;
      stockMap.set(inv.product_id, current + available);
    }
  }

  // 6. Process items and add to cart
  const cart = await getOrCreateCart(supabase, sessionId);
  let addedCount = 0;
  const unavailableItems: UnavailableReorderItem[] = [];

  for (const item of orderItems) {
    const liveProd = productMap.get(item.product_id);

    // Check if product is published
    if (!liveProd || liveProd.status !== 'published') {
      unavailableItems.push({
        productId: item.product_id,
        productName: item.product_name || liveProd?.name || 'Product',
        reason: 'discontinued',
      });
      continue;
    }

    // Check stock if inventory tracking is present
    const availableStock = stockMap.get(item.product_id);
    if (availableStock !== undefined && availableStock < item.quantity) {
      unavailableItems.push({
        productId: item.product_id,
        productName: liveProd.name,
        reason: availableStock === 0 ? 'out_of_stock' : 'insufficient_inventory',
      });
      continue;
    }

    // Prepare add-ons
    const itemAddons = addonsByItem.get(item.id) || [];
    const validAddons: CartAddonInput[] = [];

    for (const add of itemAddons) {
      if (add.addon_product_id) {
        validAddons.push({
          addonProductId: add.addon_product_id,
          quantity: add.quantity,
        });
      }
    }

    // Add item to cart with current prices
    try {
      await addItemToCart(supabase, sessionId, {
        productId: item.product_id,
        quantity: item.quantity,
        addons: validAddons.length > 0 ? validAddons : undefined,
      });
      addedCount++;
    } catch {
      unavailableItems.push({
        productId: item.product_id,
        productName: liveProd.name,
        reason: 'out_of_stock',
      });
    }
  }

  let message = '';
  if (addedCount > 0 && unavailableItems.length === 0) {
    message = `All ${addedCount} item${addedCount > 1 ? 's have' : ' has'} been added to your cart with current prices.`;
  } else if (addedCount > 0 && unavailableItems.length > 0) {
    message = `${addedCount} item${addedCount > 1 ? 's' : ''} added to cart. ${unavailableItems.length} item${unavailableItems.length > 1 ? 's' : ''} couldn't be added because they are currently unavailable.`;
  } else {
    message = `None of the items from this previous order could be added because they are currently out of stock or discontinued.`;
  }

  return {
    success: addedCount > 0,
    cartId: cart.id,
    itemsAddedCount: addedCount,
    unavailableItems,
    message,
  };
}
