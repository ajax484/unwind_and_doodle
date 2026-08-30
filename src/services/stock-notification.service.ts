import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { publishDomainEvent } from './events.service';

export interface StockNotificationRecord {
  id: string;
  customerId: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  channel: Database['public']['Enums']['stock_notification_channel'];
  notifiedAt: string | null;
  createdAt: string;
}

/**
 * Subscribes a customer to back-in-stock notifications for an out-of-stock product.
 * Prevents duplicate active subscriptions for the same customer/product/channel.
 */
export async function subscribeToStockNotification(
  supabase: SupabaseClient<Database>,
  customerId: string,
  input: {
    productId: string;
    channel?: Database['public']['Enums']['stock_notification_channel'];
  }
): Promise<StockNotificationRecord> {
  const channel = input.channel || 'email';

  // 1. Verify product exists
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('id', input.productId)
    .maybeSingle();

  if (prodErr || !product) {
    throw new Error('Product not found');
  }

  // 2. Check for active unnotified subscription
  const { data: existing } = await supabase
    .from('stock_notifications')
    .select('*')
    .eq('customer_id', customerId)
    .eq('product_id', input.productId)
    .eq('channel', channel)
    .is('notified_at', null)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      customerId: existing.customer_id,
      productId: existing.product_id,
      productName: product.name,
      productSlug: product.slug,
      channel: existing.channel,
      notifiedAt: existing.notified_at,
      createdAt: existing.created_at,
    };
  }

  // 3. Insert new notification request
  const { data: created, error: createErr } = await supabase
    .from('stock_notifications')
    .insert({
      customer_id: customerId,
      product_id: input.productId,
      channel,
      notified_at: null,
    } as Database['public']['Tables']['stock_notifications']['Insert'])
    .select('*')
    .single();

  if (createErr || !created) {
    throw new Error(`Failed to subscribe to stock alert: ${createErr?.message}`);
  }

  return {
    id: created.id,
    customerId: created.customer_id,
    productId: created.product_id,
    productName: product.name,
    productSlug: product.slug,
    channel: created.channel,
    notifiedAt: created.notified_at,
    createdAt: created.created_at,
  };
}

/**
 * Unsubscribes a customer from a stock alert.
 */
export async function unsubscribeFromStockNotification(
  supabase: SupabaseClient<Database>,
  customerId: string,
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('stock_notifications')
    .delete()
    .eq('id', notificationId)
    .eq('customer_id', customerId);

  if (error) {
    throw new Error(`Failed to unsubscribe: ${error.message}`);
  }

  return true;
}

/**
 * Lists all stock notification requests for a customer.
 */
export async function getCustomerStockNotifications(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<StockNotificationRecord[]> {
  const { data, error } = await supabase
    .from('stock_notifications')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return [];

  const productIds = Array.from(new Set(data.map((n) => n.product_id)));
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug')
    .in('id', productIds);

  const prodMap = new Map((products || []).map((p) => [p.id, p]));

  return data.map((n) => {
    const prod = prodMap.get(n.product_id);
    return {
      id: n.id,
      customerId: n.customer_id,
      productId: n.product_id,
      productName: prod?.name,
      productSlug: prod?.slug,
      channel: n.channel,
      notifiedAt: n.notified_at,
      createdAt: n.created_at,
    };
  });
}

/**
 * Triggered when inventory increases for a product.
 * Publishes outbox domain event for pending notifications without blocking inventory operations.
 */
export async function handleStockReplenishment(
  supabase: SupabaseClient<Database>,
  productId: string,
  availableStock: number
): Promise<number> {
  if (availableStock <= 0) return 0;

  // Find all pending notifications
  const { data: pending, error } = await supabase
    .from('stock_notifications')
    .select('id, customer_id, channel')
    .eq('product_id', productId)
    .is('notified_at', null);

  if (error || !pending || pending.length === 0) return 0;

  // Fetch customer details
  const customerIds = Array.from(new Set(pending.map((p) => p.customer_id)));
  const { data: customers } = await supabase
    .from('customers')
    .select('id, email, phone, whatsapp_number, email_marketing_consent, whatsapp_marketing_consent')
    .in('id', customerIds);

  const customerMap = new Map((customers || []).map((c) => [c.id, c]));

  // Publish domain event for stock notification eligibility
  await publishDomainEvent(supabase, {
    eventType: 'stock_notification.eligible',
    aggregateType: 'product',
    aggregateId: productId,
    payload: {
      productId,
      availableStock,
      recipients: pending.map((item) => {
        const cust = customerMap.get(item.customer_id);
        return {
          notificationId: item.id,
          customerId: item.customer_id,
          channel: item.channel,
          email: cust?.email,
          phone: cust?.phone || cust?.whatsapp_number,
        };
      }),
    },
  });

  // Mark notified
  const now = new Date().toISOString();
  const notifIds = pending.map((p) => p.id);
  await supabase
    .from('stock_notifications')
    .update({ notified_at: now } as Database['public']['Tables']['stock_notifications']['Update'])
    .in('id', notifIds);

  return pending.length;
}
