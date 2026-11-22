import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  DynamicLineItem,
  MarketingContext,
  ResolveMarketingContextInput,
  ProductFamily,
} from '@/types/marketing-context';
import {
  classifyProductFamily,
  resolveProductRecommendation,
} from './marketing-recommendation.service';
import { getConfig } from '@/lib/config';

/**
 * Resolves the primary product from an array of order items deterministically.
 * Priority rule: Highest line-item total, then highest unit price, then alphanumeric ID order.
 */
export function selectPrimaryOrderItem(
  items: Array<{
    id?: string;
    product_id?: string;
    product_name: string;
    total?: number;
    unit_price?: number;
    sku?: string | null;
  }>
): {
  productId?: string;
  productName: string;
  sku?: string | null;
} | null {
  if (!items || items.length === 0) return null;

  const sorted = [...items].sort((a, b) => {
    const totalA = Number(a.total ?? 0);
    const totalB = Number(b.total ?? 0);
    if (totalB !== totalA) return totalB - totalA;

    const priceA = Number(a.unit_price ?? 0);
    const priceB = Number(b.unit_price ?? 0);
    if (priceB !== priceA) return priceB - priceA;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  const primary = sorted[0];
  return {
    productId: primary.product_id,
    productName: primary.product_name,
    sku: primary.sku,
  };
}

/**
 * Hydrates product metadata (name, slug, price, primary image URL) for a set of product IDs.
 */
async function hydrateProductsById(
  supabase: SupabaseClient<Database>,
  productIds: string[]
): Promise<
  Map<
    string,
    {
      name: string;
      slug: string | null;
      price: number;
      imageUrl: string | null;
    }
  >
> {
  const result = new Map<
    string,
    { name: string; slug: string | null; price: number; imageUrl: string | null }
  >();

  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueIds.length === 0) return result;

  try {
    const { data: products } = await (supabase as any)
      .from('products')
      .select('id, name, slug, price, image_url')
      .in('id', uniqueIds);

    if (Array.isArray(products)) {
      for (const p of products) {
        result.set(p.id, {
          name: p.name || 'Product',
          slug: p.slug || null,
          price: Number(p.price ?? 0),
          imageUrl: p.image_url || null,
        });
      }
    }

    // Enrich with primary product_images if available
    const { data: images } = await (supabase as any)
      .from('product_images')
      .select('product_id, url, is_primary, display_order')
      .in('product_id', uniqueIds)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true });

    if (Array.isArray(images)) {
      const seenImage = new Set<string>();
      for (const img of images) {
        if (img.product_id && img.url && !seenImage.has(img.product_id)) {
          seenImage.add(img.product_id);
          const existing = result.get(img.product_id);
          if (existing) {
            existing.imageUrl = img.url;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[marketing_context.product_hydration_error]', err);
  }

  return result;
}

/**
 * Resolves full marketing personalization context from customer, order, cart, and catalog state.
 * Keeps templates simple while decoupling business logic from sanitization and rendering.
 */
export async function resolveMarketingContext(
  supabase: SupabaseClient<Database>,
  input: ResolveMarketingContextInput
): Promise<MarketingContext> {
  const { appUrl } = getConfig();
  let firstName = '';
  let lastName = '';
  let email = input.customerEmail || '';

  // 1. Resolve Customer Details
  if (input.customerId) {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name, last_name, email')
        .eq('id', input.customerId)
        .maybeSingle();

      if (customer) {
        firstName = customer.first_name || '';
        lastName = customer.last_name || '';
        if (!email && customer.email) {
          email = customer.email;
        }
      }
    } catch (err) {
      console.warn('[marketing_context.customer_lookup_error]', err);
    }
  }

  // Fallback to domain event payload for customer name if not found in database
  const payload = input.domainEventPayload;
  if (!firstName && payload) {
    if (typeof payload.firstName === 'string') firstName = payload.firstName;
    else if (typeof payload.first_name === 'string') firstName = payload.first_name;
    else if (typeof payload.customerName === 'string') {
      const parts = payload.customerName.trim().split(' ');
      firstName = parts[0] || '';
      if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ');
    }
  }

  // 2. Resolve Order Number & Target Order ID
  let orderNumber = input.orderNumber || null;
  let targetOrderId = input.orderId || null;
  if (payload) {
    if (!orderNumber) {
      if (typeof payload.orderNumber === 'string') orderNumber = payload.orderNumber;
      else if (typeof payload.order_number === 'string') orderNumber = payload.order_number;
    }
    if (!targetOrderId) {
      if (typeof payload.orderId === 'string') targetOrderId = payload.orderId;
      else if (typeof payload.order_id === 'string') targetOrderId = payload.order_id;
    }
  }

  if (!orderNumber && targetOrderId) {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', targetOrderId)
        .maybeSingle();

      if (orderData?.order_number) {
        orderNumber = orderData.order_number;
      }
    } catch (err) {
      console.warn('[marketing_context.order_number_lookup_error]', err);
    }
  }

  // 3. Resolve Current Product Name
  let productName = input.productName || null;
  if (!productName && payload) {
    if (typeof payload.productName === 'string') productName = payload.productName;
    else if (typeof payload.product_name === 'string') productName = payload.product_name;
  }

  // 4. Resolve Order Items, Last Purchased Product & Recommendation Source Family
  let lastProduct: string | null = null;
  let sourceFamily: ProductFamily = 'general_colouring_book';
  const orderItems: DynamicLineItem[] = [];
  let orderSubtotal: number | null = null;
  let orderUrl: string | null = null;

  try {
    let resolvedOrderId = targetOrderId;

    if (!resolvedOrderId && input.customerId) {
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('id, order_number, created_at, status')
        .eq('customer_id', input.customerId)
        .order('created_at', { ascending: false });

      const recentOrders = (customerOrders || []).filter(
        (o) => o.status !== 'cancelled' && o.status !== 'refunded'
      );

      if (recentOrders.length > 0) {
        resolvedOrderId = recentOrders[0].id;
        if (!orderNumber && recentOrders[0].order_number) {
          orderNumber = recentOrders[0].order_number;
        }
      }
    }

    if (resolvedOrderId) {
      const { data: items } = await supabase
        .from('order_items')
        .select('id, product_id, product_name, quantity, total, unit_price, sku')
        .eq('order_id', resolvedOrderId);

      if (items && items.length > 0) {
        const productIds = items.map((i) => i.product_id).filter(Boolean) as string[];
        const productMap = await hydrateProductsById(supabase, productIds);

        let runningSubtotal = 0;
        for (const it of items) {
          const prod = it.product_id ? productMap.get(it.product_id) : undefined;
          const qty = Number(it.quantity ?? 1);
          const unitPrice = Number(it.unit_price ?? prod?.price ?? 0);
          const lineTotal = Number(it.total ?? unitPrice * qty);
          runningSubtotal += lineTotal;

          orderItems.push({
            productId: it.product_id || null,
            name: it.product_name || prod?.name || 'Product',
            quantity: qty,
            unitPrice,
            totalPrice: lineTotal,
            imageUrl: prod?.imageUrl || null,
            slug: prod?.slug || null,
            productUrl: prod?.slug ? `${appUrl.replace(/\/+$/, '')}/products/${prod.slug}` : null,
          });
        }
        orderSubtotal = runningSubtotal;
        if (orderNumber) {
          orderUrl = `${appUrl.replace(/\/+$/, '')}/account/orders/${orderNumber}`;
        }

        const primaryItem = selectPrimaryOrderItem(items);
        if (primaryItem) {
          lastProduct = primaryItem.productName;
          const primaryProd = primaryItem.productId ? productMap.get(primaryItem.productId) : undefined;

          sourceFamily = classifyProductFamily({
            slug: primaryProd?.slug || null,
            sku: primaryItem.sku,
            name: primaryItem.productName,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[marketing_context.order_items_lookup_error]', err);
  }

  // 5. Resolve Abandoned / Active Cart Items (with images, names, quantities, prices)
  const cartItems: DynamicLineItem[] = [];
  let cartSubtotal: number | null = null;
  const cartUrl = `${appUrl.replace(/\/+$/, '')}/cart`;

  try {
    const targetCartId =
      input.cartId ||
      (payload && typeof payload.cartId === 'string' ? payload.cartId : null) ||
      (payload && typeof payload.checkoutId === 'string' ? payload.checkoutId : null);

    let rawCartItems: Array<{ product_id?: string; quantity?: number; price?: number; name?: string }> = [];

    if (targetCartId) {
      const { data: dbCartItems } = await (supabase as any)
        .from('cart_items')
        .select('id, product_id, quantity')
        .eq('cart_id', targetCartId);

      if (Array.isArray(dbCartItems) && dbCartItems.length > 0) {
        rawCartItems = dbCartItems;
      }
    }

    // Fallback to payload.items if cart_items table returned nothing (e.g., unit tests or cleared cart)
    if (rawCartItems.length === 0 && payload && Array.isArray(payload.items)) {
      rawCartItems = payload.items as Array<{
        product_id?: string;
        quantity?: number;
        price?: number;
        name?: string;
      }>;
    }

    // Fallback to customer's most recent abandoned or active cart
    if (rawCartItems.length === 0 && input.customerId) {
      const { data: latestCart } = await (supabase as any)
        .from('carts')
        .select('id, status, updated_at, cart_items(id, product_id, quantity)')
        .eq('customer_id', input.customerId)
        .in('status', ['abandoned', 'active'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestCart && Array.isArray(latestCart.cart_items) && latestCart.cart_items.length > 0) {
        rawCartItems = latestCart.cart_items;
      }
    }

    if (rawCartItems.length > 0) {
      const cartProductIds = rawCartItems
        .map((ci) => ci.product_id)
        .filter(Boolean) as string[];
      const productMap = await hydrateProductsById(supabase, cartProductIds);

      let runningCartSubtotal = 0;
      for (const ci of rawCartItems) {
        const prod = ci.product_id ? productMap.get(ci.product_id) : undefined;
        const qty = Number(ci.quantity ?? 1);
        const unitPrice = Number(prod?.price ?? ci.price ?? 0);
        const lineTotal = unitPrice * qty;
        runningCartSubtotal += lineTotal;

        cartItems.push({
          productId: ci.product_id || null,
          name: prod?.name || ci.name || 'Product',
          quantity: qty,
          unitPrice,
          totalPrice: lineTotal,
          imageUrl: prod?.imageUrl || null,
          slug: prod?.slug || null,
          productUrl: prod?.slug ? `${appUrl.replace(/\/+$/, '')}/products/${prod.slug}` : null,
        });
      }
      cartSubtotal = runningCartSubtotal;
    }
  } catch (err) {
    console.warn('[marketing_context.cart_items_lookup_error]', err);
  }

  // 6. Resolve Product Recommendations
  let productRecommendation = null;
  let personalizedRecommendation = null;

  if (input.customerId) {
    productRecommendation = await resolveProductRecommendation({
      supabase,
      organizationId: input.organizationId,
      customerId: input.customerId,
      sourceFamily,
      type: 'post_purchase',
      appUrl,
    });

    personalizedRecommendation = await resolveProductRecommendation({
      supabase,
      organizationId: input.organizationId,
      customerId: input.customerId,
      sourceFamily,
      type: 'win_back',
      appUrl,
    });
  }

  return {
    firstName: firstName || null,
    lastName: lastName || null,
    email: email || null,
    orderNumber: orderNumber || null,
    productName: productName || null,
    lastProduct: lastProduct || null,
    cartItems: cartItems.length > 0 ? cartItems : undefined,
    cartSubtotal,
    cartUrl,
    orderItems: orderItems.length > 0 ? orderItems : undefined,
    orderSubtotal,
    orderUrl,
    productRecommendation,
    personalizedRecommendation,
  };
}
