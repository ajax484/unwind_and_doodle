import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../lib/supabase/types';
import {
  CreateManualOrderInput,
  CreateManualOrderSchema,
  PaymentLinkResponse,
  PaymentRequestDetail,
  UpdateCustomerOrderInput,
  UpdateCustomerOrderSchema,
} from '../types/manual-order';
import { resolveOrCreateCustomer } from './customer.service';
import { findCapableWarehouse, RequiredProductItem, resolveRequiredPhysicalItems } from './warehouse.service';
import { reserveOrderInventory, releaseOrderReservations } from './inventory.service';
import { resolveDeliveryFee, calculateOrderPricing } from './pricing.service';
import { PaystackPaymentProvider } from './payment/paystack.provider';
import { publishDomainEvent } from './events.service';
import { validateThemeCustomization, persistThemeCustomizationSnapshot } from './theme.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES, CURRENCY } from '../lib/constants';
import { PaymentProvider } from './payment/provider.interface';

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
      firstName: validated.customer.firstName || 'Customer',
      lastName: validated.customer.lastName || '',
      phone: validated.customer.phone || undefined,
      marketingConsent: false,
    },
    {
      streetAddress: validated.shippingAddress.addressLine1 || validated.shippingAddress.addressLine2 || 'Address on file',
      city: validated.shippingAddress.city,
      state: validated.shippingAddress.state,
      postalCode: validated.shippingAddress.postalCode || undefined,
    },
    validated.locationId || ''
  );

  // 3. Find capable warehouse if not provided
  let warehouseId = validated.warehouseId;
  const requiredItems = await resolveRequiredPhysicalItems(supabase, validated.items);

  if (!warehouseId) {
    if (!validated.locationId) {
      throw new Error('Either warehouseId or locationId must be provided.');
    }
    const whResult = await findCapableWarehouse(supabase, validated.locationId, requiredItems);
    if (!whResult.capable || !whResult.warehouseId) {
      throw new Error(whResult.error || 'Insufficient inventory across available warehouses.');
    }
    warehouseId = whResult.warehouseId;
  }

  // Pre-validate theme customizations if present
  const validatedThemeCustomizations = await Promise.all(
    validated.items.map(async (item) => {
      const customPayload = item.customization;
      const themeIds = customPayload?.theme_ids || customPayload?.themeIds;
      const coverName = customPayload?.cover_name || customPayload?.coverName;

      if (!themeIds && !coverName) return null;

      return validateThemeCustomization(supabase, organizationId, item.productId, {
        selectedThemeIds: themeIds,
        coverName,
      });
    })
  );

  let shippingFee = validated.shippingFee;
  if (validated.locationId && shippingFee === 0) {
    try {
      const delRes = await resolveDeliveryFee(supabase, validated.locationId, warehouseId);
      shippingFee = delRes.deliveryFee;
    } catch {
      // keep 0 if resolution not configured
    }
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
    p_manual_discount: validated.manualDiscount
      ? {
          type: validated.manualDiscount.type,
          value: validated.manualDiscount.value,
        }
      : null,
    p_shipping_fee: shippingFee,
    p_notes: validated.notes || null,
    p_idempotency_key: ((validated as Record<string, unknown>).idempotencyKey as string | null) || null,
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
    subtotal?: number;
    discount_total?: number;
    shipping_fee?: number;
  };

  const orderId = result.order_id;
  const token = result.token;
  const totalAmount = Number(result.total);

  // Persist theme customization snapshots for created order items
  const { data: createdOrderItems } = await supabase
    .from('order_items')
    .select('id, product_id')
    .eq('order_id', orderId);

  if (createdOrderItems) {
    for (let idx = 0; idx < validated.items.length; idx++) {
      const itemInput = validated.items[idx];
      const validatedCustom = validatedThemeCustomizations[idx];
      if (validatedCustom) {
        const matchingOrderItem = createdOrderItems.find((oi) => oi.product_id === itemInput.productId);
        if (matchingOrderItem) {
          await persistThemeCustomizationSnapshot(supabase, matchingOrderItem.id, validatedCustom);
        }
      }
    }
  }

  try {
    // 5. Create payment record
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

    const finalSubtotal = Number(result.subtotal ?? 0);
    const finalDiscountTotal = Number(result.discount_total ?? 0);
    const finalShippingFee = Number(result.shipping_fee ?? 0);
    const finalTotal = Number(result.total ?? totalAmount ?? 0);

    return {
      paymentRequestId: result.payment_request_id,
      token,
      paymentUrl,
      orderId,
      orderNumber: result.order_number,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      amount: finalTotal,
      subtotal: finalSubtotal,
      discountTotal: finalDiscountTotal,
      shippingFee: finalShippingFee,
      total: finalTotal,
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

  // Fetch Bundle Components & Theme Customizations if any
  const itemsWithComponents = await Promise.all(
    (orderItems || []).map(async (item) => {
      const [{ data: components }, { data: themeCust }] = await Promise.all([
        supabase.from('order_item_bundle_components').select('*').eq('order_item_id', item.id),
        supabase.from('order_item_theme_customizations').select('*').eq('order_item_id', item.id).maybeSingle(),
      ]);

      let themeCustomizationDetail: PaymentRequestDetail['items'][number]['themeCustomization'] = null;
      if (themeCust) {
        const { data: snapshots } = await supabase
          .from('order_item_theme_snapshots')
          .select('*')
          .eq('customization_id', themeCust.id)
          .order('sort_order', { ascending: true });

        themeCustomizationDetail = {
          coverName: themeCust.cover_name,
          themes: (snapshots || []).map((s) => ({
            themeId: s.theme_id,
            themeName: s.theme_name,
            sortOrder: s.sort_order,
          })),
        };
      }

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
        themeCustomization: themeCustomizationDetail,
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
      firstName: order.first_name,
      lastName: order.last_name,
      email: order.email,
      phone: order.phone,
      locationId: order.location_id,
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

/**
 * Calculates a server-authoritative preview summary for manual order items and discounts.
 */
export async function previewManualOrderPricing(
  supabase: SupabaseClient<Database>,
  input: {
    items: Array<{ productId: string; quantity: number }>;
    locationId: string;
    warehouseId?: string;
    discountCode?: string;
    manualDiscount?: { type: 'percentage' | 'fixed_amount' | 'fixed'; value: number };
    organizationId?: string;
  }
) {
  const checkoutItems = input.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    addons: ((i as Record<string, unknown>).addons as { quantity: number; addonProductId: string }[]) || [],
  }));

  let warehouseId = input.warehouseId;
  if (!warehouseId) {
    const requiredItems = await resolveRequiredPhysicalItems(supabase, checkoutItems);
    const whResult = await findCapableWarehouse(supabase, input.locationId, requiredItems);
    if (!whResult.capable || !whResult.warehouseId) {
      throw new Error(whResult.error || 'No warehouse available for location');
    }
    warehouseId = whResult.warehouseId;
  }

  return calculateOrderPricing({
    supabase,
    warehouseId,
    locationId: input.locationId,
    items: checkoutItems,
    discountCode: input.discountCode,
    manualDiscount: input.manualDiscount,
    organizationId: input.organizationId,
  });
}

/**
 * Secure customer edit RPC/API: Allows customers with valid payment link token
 * to update name, phone, and delivery location atomically while synchronizing payment amount.
 */
export async function updateCustomerOrderDetails(
  supabase: SupabaseClient<Database>,
  input: UpdateCustomerOrderInput
): Promise<PaymentRequestDetail> {
  const validated = UpdateCustomerOrderSchema.parse(input);

  // 1. Look up payment request by token
  const { data: reqRecord, error: reqErr } = await supabase
    .from('order_payment_requests')
    .select('*')
    .eq('token', validated.token)
    .maybeSingle();

  if (reqErr || !reqRecord) {
    throw new Error('Invalid or expired payment link token');
  }

  if (reqRecord.status !== 'pending') {
    throw new Error(`Cannot modify order with payment status: ${reqRecord.status}`);
  }

  if (reqRecord.expires_at && new Date(reqRecord.expires_at) < new Date()) {
    throw new Error('This payment link has expired');
  }

  // 2. Fetch associated order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', reqRecord.order_id)
    .single();

  if (orderErr || !order) {
    throw new Error('Associated order not found');
  }

  if (order.status !== ORDER_STATUS.CREATED) {
    throw new Error(`Order cannot be modified in status: ${order.status}`);
  }

  // 3. Prepare updates
  let newShippingFee = Number(order.shipping_fee);
  let newLocationId = order.location_id;
  let newShippingAddress = (order.shipping_address as Record<string, unknown>) || {};

  if (validated.locationId && validated.locationId !== order.location_id) {
    // Resolve delivery fee for new location using canonical resolver
    const delRes = await resolveDeliveryFee(
      supabase,
      validated.locationId,
      order.warehouse_id || undefined
    );
    newShippingFee = delRes.deliveryFee;
    newLocationId = validated.locationId;
  }

  if (validated.shippingAddress) {
    newShippingAddress = {
      ...newShippingAddress,
      address_line1: validated.shippingAddress.addressLine1,
      address_line2: validated.shippingAddress.addressLine2 || '',
      city: validated.shippingAddress.city,
      state: validated.shippingAddress.state,
      postal_code: validated.shippingAddress.postalCode || '',
      country: validated.shippingAddress.country || 'Nigeria',
    };
  }

  const subtotal = Number(order.subtotal);
  const discountTotal = Number(order.discount_total);
  const newTotal = Math.max(0, subtotal - discountTotal + newShippingFee);

  const orderUpdates: Database['public']['Tables']['orders']['Update'] = {
    updated_at: new Date().toISOString(),
    location_id: newLocationId,
    shipping_fee: newShippingFee,
    total: newTotal,
    shipping_address: newShippingAddress as Json,
  };

  if (validated.firstName !== undefined) orderUpdates.first_name = validated.firstName;
  if (validated.lastName !== undefined) orderUpdates.last_name = validated.lastName;
  if (validated.phone !== undefined) orderUpdates.phone = validated.phone;

  // 4. Update order atomically
  const { error: updateErr } = await supabase
    .from('orders')
    .update(orderUpdates)
    .eq('id', order.id);

  if (updateErr) {
    throw new Error(`Failed to update order details: ${updateErr.message}`);
  }

  // Update customer record if customer_id exists
  if (order.customer_id) {
    const custUpdates: Database['public']['Tables']['customers']['Update'] = {
      updated_at: new Date().toISOString(),
    };
    if (validated.firstName !== undefined) custUpdates.first_name = validated.firstName;
    if (validated.lastName !== undefined) custUpdates.last_name = validated.lastName;
    if (validated.phone !== undefined) custUpdates.phone = validated.phone;

    await supabase.from('customers').update(custUpdates).eq('id', order.customer_id);
  }

  // 5. Update payment request amount if total changed
  if (newTotal !== Number(reqRecord.amount)) {
    await supabase
      .from('order_payment_requests')
      .update({ amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', reqRecord.id);

    // Synchronize pending payment records
    await supabase
      .from('payments')
      .update({ amount: newTotal })
      .eq('order_id', order.id)
      .eq('status', PAYMENT_STATUS.PENDING as Database['public']['Enums']['payment_status']);
  }

  // 6. Return updated detail using getPaymentRequestByToken
  return getPaymentRequestByToken(supabase, validated.token);
}
