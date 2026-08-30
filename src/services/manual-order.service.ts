import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import {
  CreateManualOrderInput,
  CreateManualOrderSchema,
  PaymentLinkResponse,
  PaymentRequestDetail,
} from '../types/manual-order';
import { resolveOrCreateCustomer } from './customer.service';
import { findCapableWarehouse, RequiredProductItem } from './warehouse.service';
import { reserveOrderInventory, releaseOrderReservations } from './inventory.service';
import { PaystackPaymentProvider } from './payment/paystack.provider';
import { publishDomainEvent } from './events.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES, CURRENCY } from '../lib/constants';

/**
 * Creates an admin manual order atomically, reserves inventory, and generates a payment link token.
 */
export async function createAdminManualOrder(
  supabase: SupabaseClient<Database>,
  input: CreateManualOrderInput,
  userId: string,
  organizationId: string,
  baseUrl?: string
): Promise<PaymentLinkResponse> {
  // 1. Validate schema
  const validated = CreateManualOrderSchema.parse(input);

  // 2. Resolve or create customer
  const { customerId } = await resolveOrCreateCustomer(
    supabase,
    {
      email: validated.customer.email,
      firstName: validated.customer.firstName,
      lastName: validated.customer.lastName,
      phone: validated.customer.phone,
    },
    {
      addressLine1: validated.shippingAddress.addressLine1,
      addressLine2: validated.shippingAddress.addressLine2,
      city: validated.shippingAddress.city,
      state: validated.shippingAddress.state,
      postalCode: validated.shippingAddress.postalCode,
      country: validated.shippingAddress.country,
    },
    validated.locationId
  );

  // 3. Find capable warehouse if not provided
  let warehouseId = validated.warehouseId;
  if (!warehouseId) {
    const requiredItems: RequiredProductItem[] = validated.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));

    const whResult = await findCapableWarehouse(supabase, validated.locationId, requiredItems);
    if (!whResult.capable || !whResult.warehouseId) {
      throw new Error(whResult.error || 'Insufficient inventory across available warehouses.');
    }
    warehouseId = whResult.warehouseId;
  }

  // 4. Call atomic RPC create_admin_manual_order
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_admin_manual_order' as unknown as keyof Database['public']['Functions'], {
    p_org_id: organizationId,
    p_customer: {
      email: validated.customer.email,
      first_name: validated.customer.firstName || '',
      last_name: validated.customer.lastName || '',
      phone: validated.customer.phone || '',
      whatsapp_number: validated.customer.whatsappNumber || '',
    },
    p_shipping_address: {
      address_line1: validated.shippingAddress.addressLine1,
      address_line2: validated.shippingAddress.addressLine2 || '',
      city: validated.shippingAddress.city,
      state: validated.shippingAddress.state,
      postal_code: validated.shippingAddress.postalCode || '',
      country: validated.shippingAddress.country || 'Nigeria',
    },
    p_items: validated.items.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
    })),
    p_location_id: validated.locationId || null,
    p_warehouse_id: warehouseId,
    p_manual_order_channel: validated.manualOrderChannel,
    p_discount_code: validated.discountCode || null,
    p_shipping_fee: validated.shippingFee,
    p_notes: validated.notes || null,
  } as unknown as Database['public']['Functions']['create_admin_manual_order']['Args']);

  if (rpcErr || !rpcResult) {
    throw new Error(`Failed to create manual order: ${rpcErr?.message || 'Unknown database error'}`);
  }

  const result = rpcResult as unknown as {
    order_id: string;
    order_number: string;
    payment_request_id: string;
    token: string;
    total: number;
  };

  const orderId = result.order_id;
  const token = result.token;
  const totalAmount = Number(result.total);

  try {
    // 5. Reserve inventory atomically
    const reservationItems: RequiredProductItem[] = validated.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));

    await reserveOrderInventory(supabase, {
      warehouseId,
      orderId,
      items: reservationItems,
    });

    // 6. Create payment record
    const paystackProvider = new PaystackPaymentProvider();
    const paymentRef = paystackProvider.generateReference();

    const { error: payErr } = await supabase.from('payments').insert({
      order_id: orderId,
      provider: 'paystack',
      provider_reference: paymentRef,
      amount: totalAmount,
      currency: CURRENCY.NGN,
      status: PAYMENT_STATUS.PENDING,
      metadata: {
        order_id: orderId,
        order_number: result.order_number,
        payment_request_token: token,
        created_via: 'admin_manual_order',
      },
    } as unknown as Database['public']['Tables']['payments']['Insert']);

    if (payErr) {
      throw new Error(`Failed to create payment record: ${payErr.message}`);
    }

    // 7. Audit log & domain event
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_id: userId,
      user_id: userId,
      action: 'order.created',
      entity_type: 'order',
      entity_id: orderId,
      after_data: {
        order_number: result.order_number,
        order_source: 'manual',
        channel: validated.manualOrderChannel,
        customer_email: validated.customer.email,
        total: totalAmount,
      },
    } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

    await publishDomainEvent(supabase, {
      eventType: DOMAIN_EVENT_TYPES.ORDER_CREATED,
      aggregateType: 'order',
      aggregateId: orderId,
      payload: {
        orderId,
        orderNumber: result.order_number,
        customerId,
        customerEmail: validated.customer.email,
        orderSource: 'manual',
        totalAmount,
        currency: CURRENCY.NGN,
        createdBy: userId,
      },
    });

    const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${origin}/pay/${token}`;

    return {
      paymentRequestId: result.payment_request_id,
      token,
      paymentUrl,
      orderId,
      orderNumber: result.order_number,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      amount: totalAmount,
    };
  } catch (err) {
    // Cleanup order & inventory if failed after RPC insertion
    await releaseOrderReservations(supabase, orderId).catch(() => {});
    await supabase
      .from('orders')
      .update({ status: ORDER_STATUS.CANCELLED, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    throw err;
  }
}

/**
 * Public token lookup returning order details for the customer payment page.
 */
export async function getPaymentRequestByToken(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<PaymentRequestDetail> {
  const { data: reqRecord, error } = await supabase
    .from('order_payment_requests')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error || !reqRecord) {
    throw new Error('Payment request link not found or invalid');
  }

  // Check expiration
  let status = reqRecord.status as 'pending' | 'paid' | 'cancelled' | 'expired';
  if (status === 'pending' && reqRecord.expires_at && new Date(reqRecord.expires_at) < new Date()) {
    status = 'expired';
    await supabase
      .from('order_payment_requests')
      .update({ status: 'expired' })
      .eq('id', reqRecord.id);
    await releaseOrderReservations(supabase, reqRecord.order_id).catch(() => {});
  }

  // Fetch Order details
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', reqRecord.order_id)
    .single();

  if (orderErr || !order) {
    throw new Error('Associated order not found');
  }

  // Fetch Organization Store Info
  const { data: org } = await supabase
    .from('organizations')
    .select('name, slug')
    .eq('id', order.organization_id)
    .maybeSingle();

  // Fetch Payment Reference if paid
  let paymentReference: string | null = null;
  if (status === 'paid') {
    const { data: payment } = await supabase
      .from('payments')
      .select('provider_reference')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payment) {
      paymentReference = payment.provider_reference;
    }
  }

  // Fetch Order Items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  // Fetch Bundle Components if any
  const itemsWithComponents = await Promise.all(
    (orderItems || []).map(async (item) => {
      const { data: components } = await supabase
        .from('order_item_bundle_components')
        .select('*')
        .eq('order_item_id', item.id);

      return {
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        total: Number(item.total),
        bundleComponents: components?.map((c) => ({
          productName: c.product_name,
          quantityPerBundle: c.quantity_per_bundle,
          totalQuantity: c.total_quantity,
        })),
      };
    })
  );

  const customerName = `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Valued Customer';

  return {
    id: reqRecord.id,
    token: reqRecord.token,
    orderId: order.id,
    orderNumber: order.order_number,
    amount: Number(order.total),
    currency: reqRecord.currency || 'NGN',
    status,
    expiresAt: reqRecord.expires_at,
    customer: {
      name: customerName,
      email: order.email,
      phone: order.phone,
      shippingAddress: (order.shipping_address as Record<string, unknown>) || {},
    },
    items: itemsWithComponents,
    pricing: {
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discount_total),
      shippingFee: Number(order.shipping_fee),
      total: Number(order.total),
      discountCode: order.discount_code,
    },
    store: {
      name: org?.name || 'Unwind & Doodle',
      slug: org?.slug || 'unwind-and-doodle',
    },
    paymentReference,
  };
}

/**
 * Initializes a Paystack transaction for a customer payment request link.
 */
export async function initializePaymentRequestTransaction(
  supabase: SupabaseClient<Database>,
  token: string,
  callbackUrl?: string,
  paymentProvider?: PaymentProvider
) {
  const detail = await getPaymentRequestByToken(supabase, token);

  if (detail.status === 'paid') {
    throw new Error('This order has already been paid successfully.');
  }

  if (detail.status === 'expired') {
    throw new Error('This payment link has expired. Please contact the seller for a new link.');
  }

  if (detail.status === 'cancelled') {
    throw new Error('This payment link has been cancelled.');
  }

  // Fetch or create payment record
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', detail.orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const provider = paymentProvider || new PaystackPaymentProvider();
  const paymentRef = existingPayment?.provider_reference || provider.generateReference();

  if (!existingPayment) {
    await supabase.from('payments').insert({
      order_id: detail.orderId,
      provider: 'paystack',
      provider_reference: paymentRef,
      amount: detail.pricing.total,
      currency: CURRENCY.NGN,
      status: PAYMENT_STATUS.PENDING,
      metadata: {
        order_id: detail.orderId,
        payment_request_token: token,
      },
    } as unknown as Database['public']['Tables']['payments']['Insert']);
  }

  const txData = await provider.initializeTransaction({
    reference: paymentRef,
    amount: detail.pricing.total,
    currency: CURRENCY.NGN,
    customer: {
      email: detail.customer.email,
      name: detail.customer.name,
      phone: detail.customer.phone || undefined,
    },
    redirectUrl: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/order/callback?reference=${paymentRef}`,
    metadata: {
      order_id: detail.orderId,
      payment_request_token: token,
    },
    description: `Payment for Order ${detail.orderNumber}`,
  });

  return {
    authorizationUrl: txData.authorizationUrl,
    reference: paymentRef,
  };
}

/**
 * Cancels an unpaid manual order, releases inventory, and marks payment request as cancelled.
 */
export async function cancelManualOrder(
  supabase: SupabaseClient<Database>,
  orderId: string,
  userId: string,
  organizationId: string
) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.organization_id !== organizationId) {
    throw new Error('Forbidden: Cannot cancel order belonging to another organization');
  }

  if (order.status !== ORDER_STATUS.CREATED) {
    throw new Error(`Cannot cancel order in state ${order.status}`);
  }

  // Release inventory
  await releaseOrderReservations(supabase, orderId);

  // Update order status
  await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.CANCELLED, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  // Update payment requests
  await supabase
    .from('order_payment_requests')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('order_id', orderId);

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'order.updated',
    entity_type: 'order',
    entity_id: orderId,
    after_data: { status: ORDER_STATUS.CANCELLED },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);
}
