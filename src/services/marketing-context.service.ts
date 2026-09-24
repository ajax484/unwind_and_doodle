import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
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
 * Resolves full marketing personalization context from customer, order, and catalog state.
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

  // 2. Resolve Order Number
  let orderNumber = input.orderNumber || null;
  if (!orderNumber && payload) {
    if (typeof payload.orderNumber === 'string') orderNumber = payload.orderNumber;
    else if (typeof payload.order_number === 'string') orderNumber = payload.order_number;
  }

  // If orderId is provided but orderNumber is missing, fetch from orders table
  if (!orderNumber && input.orderId) {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', input.orderId)
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

  // 4. Resolve Last Purchased Product & Recommendation Source Family
  let lastProduct: string | null = null;
  let sourceFamily: ProductFamily = 'general_colouring_book';

  if (input.customerId) {
    try {
      // Find the most recent non-cancelled, non-refunded order
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('id, created_at, status')
        .eq('customer_id', input.customerId)
        .order('created_at', { ascending: false });

      const recentOrders = (customerOrders || []).filter(
        (o) => o.status !== 'cancelled' && o.status !== 'refunded'
      );

      if (recentOrders.length > 0) {
        const lastOrderId = recentOrders[0].id;
        const { data: items } = await supabase
          .from('order_items')
          .select('id, product_id, product_name, total, unit_price, sku')
          .eq('order_id', lastOrderId);

        if (items && items.length > 0) {
          const primaryItem = selectPrimaryOrderItem(items);
          if (primaryItem) {
            lastProduct = primaryItem.productName;

            // Classify product family
            let productSlug: string | null = null;
            if (primaryItem.productId) {
              const { data: prod } = await supabase
                .from('products')
                .select('slug, sku, name')
                .eq('id', primaryItem.productId)
                .maybeSingle();

              if (prod) {
                productSlug = prod.slug;
              }
            }

            sourceFamily = classifyProductFamily({
              slug: productSlug,
              sku: primaryItem.sku,
              name: primaryItem.productName,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[marketing_context.last_product_lookup_error]', err);
    }
  }

  // 5. Resolve Product Recommendations
  let productRecommendation = null;
  let personalizedRecommendation = null;

  if (input.customerId) {
    // Post-purchase cross-sell recommendation
    productRecommendation = await resolveProductRecommendation({
      supabase,
      organizationId: input.organizationId,
      customerId: input.customerId,
      sourceFamily,
      type: 'post_purchase',
      appUrl,
    });

    // Sales win-back recommendation
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
    productRecommendation,
    personalizedRecommendation,
  };
}
