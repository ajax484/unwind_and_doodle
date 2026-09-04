import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { CheckoutRequest, CheckoutResult } from '../types/checkout';
import { resolveOrCreateCustomer } from './customer.service';
import { findCapableWarehouse, resolveRequiredPhysicalItems } from './warehouse.service';
import { calculateOrderPricing } from './pricing.service';
import { reserveOrderInventory, releaseOrderReservations } from './inventory.service';
import { PaymentProvider } from './payment/provider.interface';
import { PaystackPaymentProvider } from './payment/paystack.provider';
import { publishDomainEvent } from './events.service';
import { validateThemeCustomization, persistThemeCustomizationSnapshot } from './theme.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES, CURRENCY, DEFAULT_ORGANIZATION_ID } from '../lib/constants';

export interface ProcessCheckoutOptions {
  supabase: SupabaseClient<Database>;
  request: CheckoutRequest;
  paymentProvider?: PaymentProvider;
}

/**
 * Orchestrates the atomic server-side checkout process:
 * 1. Resolves/creates customer and address
 * 2. Resolves required physical component items (expanding bundle products into component items)
 * 3. Finds single warehouse satisfying all physical stock requirements
 * 4. Calculates authoritative prices, discounts, and delivery rates
 * 5. Creates order and line items with historical prices
 * 6. Atomically reserves inventory for physical component items for 45 minutes
 * 7. Creates pending payment record and publishes domain event
 * 8. Initializes payment transaction via the configured PaymentProvider (Paystack)
 * 9. Returns payment checkout authorization URL
 */
export async function processCheckout(options: ProcessCheckoutOptions): Promise<CheckoutResult> {
  const { supabase, request } = options;
  const paymentProvider = options.paymentProvider || new PaystackPaymentProvider();

  // 1. Resolve or create customer & address
  const { customerId, customerAddressId } = await resolveOrCreateCustomer(
    supabase,
    request.customer,
    request.shippingAddress,
    request.locationId
  );

  // 2. Resolve required physical product items (expanding bundles into component items)
  const requiredProductItems = await resolveRequiredPhysicalItems(supabase, request.items);

  // 3. Find a warehouse that serves the location and has sufficient stock
  const warehouseResult = await findCapableWarehouse(supabase, request.locationId, requiredProductItems);
  if (!warehouseResult.capable || !warehouseResult.warehouseId) {
    throw new Error(
      warehouseResult.error || 'No single warehouse can fulfill all items for your location'
    );
  }

  const warehouseId = warehouseResult.warehouseId;

  // 4. Calculate authoritative pricing from DB
  const pricing = await calculateOrderPricing({
    supabase,
    warehouseId,
    locationId: request.locationId,
    items: request.items,
    discountCode: request.discountCode,
  });

  // 5. Generate unique order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;

  // Resolve default organization ID
  let orgId = DEFAULT_ORGANIZATION_ID;
  try {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
    if (org?.id) {
      orgId = org.id;
    }
  } catch {
    // fallback to default
  }

  // 5.5. Server-side validation of theme customization requirements
  const validatedThemeCusts = new Map<number, Awaited<ReturnType<typeof validateThemeCustomization>>>();
  for (let i = 0; i < request.items.length; i++) {
    const item = request.items[i];
    const valResult = await validateThemeCustomization(
      supabase,
      orgId,
      item.productId,
      item.themeCustomization
    );
    if (valResult) {
      validatedThemeCusts.set(i, valResult);
    }
  }

  // 6. Create order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      organization_id: orgId,
      customer_id: customerId,
      warehouse_id: warehouseId,
      location_id: request.locationId,
      status: ORDER_STATUS.CREATED,
      subtotal: pricing.subtotal,
      discount_total: pricing.discountTotal,
      discount_id: pricing.appliedDiscount?.id || null,
      discount_code: pricing.appliedDiscount?.code || null,
      shipping_fee: pricing.deliveryFee,
      total: pricing.total,
      shipping_address: request.shippingAddress as unknown as Database['public']['Tables']['orders']['Insert']['shipping_address'],
      first_name: request.customer.firstName,
      last_name: request.customer.lastName,
      email: request.customer.email,
      phone: request.customer.phone || null,
      placed_at: new Date().toISOString(),
    } as Database['public']['Tables']['orders']['Insert'])
    .select('*')
    .single();

  if (orderError || !order) {
    throw new Error(`Failed to create order: ${orderError?.message}`);
  }

  try {
    // 7. Create order items and add-ons
    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];
      const itemBreakdown = pricing.itemBreakdowns[i];

      const { data: orderItem, error: oiError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.productId,
          product_name: itemBreakdown?.productName || 'Product',
          quantity: item.quantity,
          unit_price: itemBreakdown.unitPrice,
          total: itemBreakdown.totalPrice,
        } as Database['public']['Tables']['order_items']['Insert'])
        .select('id')
        .single();

      if (oiError || !orderItem) {
        throw new Error(`Failed to create order line item: ${oiError?.message}`);
      }

      // Handle theme customization snapshot
      const validatedThemeCust = validatedThemeCusts.get(i);
      if (validatedThemeCust) {
        await persistThemeCustomizationSnapshot(supabase, orderItem.id, validatedThemeCust);
      }

      // Handle customization linked to order_item_id
      if (item.customization) {
        const { data: custRecord } = await supabase
          .from('customizations')
          .insert({
            order_item_id: orderItem.id,
            status: 'pending',
          } as Database['public']['Tables']['customizations']['Insert'])
          .select('id')
          .single();

        if (custRecord && item.customization.assetUrls && item.customization.assetUrls.length > 0) {
          for (const url of item.customization.assetUrls) {
            await supabase.from('customization_assets').insert({
              customization_id: custRecord.id,
              storage_path: url,
              original_filename: url.split('/').pop() || 'custom-image.jpg',
            } as Database['public']['Tables']['customization_assets']['Insert']);
          }
        }
      }

      // Handle bundle component snapshots linked to order_item_id
      const { data: bItems } = await supabase
        .from('bundle_items')
        .select('component_product_id, quantity')
        .eq('bundle_product_id', item.productId);

      if (bItems && bItems.length > 0) {
        const compProductIds = bItems.map((bi) => bi.component_product_id);
        const { data: compProducts } = await supabase
          .from('products')
          .select('id, name')
          .in('id', compProductIds);

        const compNameMap = new Map((compProducts || []).map((cp) => [cp.id, cp.name]));

        for (const bi of bItems) {
          await supabase.from('order_item_bundle_components').insert({
            order_item_id: orderItem.id,
            component_product_id: bi.component_product_id,
            product_name: compNameMap.get(bi.component_product_id) || 'Component Product',
            quantity_per_bundle: bi.quantity,
            total_quantity: item.quantity * bi.quantity,
          } as Database['public']['Tables']['order_item_bundle_components']['Insert']);
        }
      }

      // Add-ons
      for (const addon of itemBreakdown.addons) {
        const { error: oiaError } = await supabase.from('order_item_addons').insert({
          order_item_id: orderItem.id,
          addon_product_id: addon.addonProductId,
          product_name: addon.addonName || 'Add-on',
          quantity: addon.quantity,
          unit_price: addon.unitPrice,
          total: addon.totalPrice,
        } as Database['public']['Tables']['order_item_addons']['Insert']);

        if (oiaError) {
          throw new Error(`Failed to create order item addon: ${oiaError.message}`);
        }
      }
    }

    // 8. Atomically reserve inventory for 45 minutes
    const reservationResult = await reserveOrderInventory(supabase, {
      warehouseId,
      orderId: order.id,
      items: requiredProductItems,
    });

    // 9. Record initial order status history
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      from_status: null,
      to_status: ORDER_STATUS.CREATED,
      note: 'Order initiated at checkout',
    } as Database['public']['Tables']['order_status_history']['Insert']);

    // 10. Generate payment reference via provider & create payment record
    const paymentReference = paymentProvider.generateReference();
    const { data: paymentRecord, error: payError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        provider: paymentProvider.name,
        provider_reference: paymentReference,
        amount: pricing.total,
        currency: CURRENCY.NGN,
        status: PAYMENT_STATUS.PENDING,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          warehouse_id: warehouseId,
          customer_email: request.customer.email,
        },
      })
      .select('id')
      .single();

    if (payError || !paymentRecord) {
      throw new Error(`Failed to create payment record: ${payError?.message}`);
    }

    // 11. Publish domain event
    await publishDomainEvent(supabase, {
      eventType: DOMAIN_EVENT_TYPES.ORDER_CREATED,
      aggregateType: 'order',
      aggregateId: order.id,
      payload: {
        orderId: order.id,
        orderNumber: order.order_number,
        customerId,
        customerEmail: request.customer.email,
        warehouseId,
        locationId: request.locationId,
        totalAmount: pricing.total,
        currency: CURRENCY.NGN,
        itemCount: request.items.length,
        items: pricing.itemBreakdowns.map((ib) => ({
          productId: ib.productId,
          quantity: ib.quantity,
          unitPrice: ib.unitPrice,
          totalPrice: ib.totalPrice,
          addonCount: ib.addons.length,
        })),
        shippingAddress: request.shippingAddress,
        createdAt: order.created_at,
      },
    });

    // 12. Initialize transaction with PaymentProvider
    const paymentData = await paymentProvider.initializeTransaction({
      reference: paymentReference,
      amount: pricing.total,
      currency: CURRENCY.NGN,
      customer: {
        email: request.customer.email,
        name: `${request.customer.firstName} ${request.customer.lastName}`.trim(),
        phone: request.customer.phone,
      },
      redirectUrl: request.callbackUrl,
      metadata: {
        order_id: order.id,
        payment_id: paymentRecord.id,
      },
      description: `Payment for Order ${order.order_number}`,
    });

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentId: paymentRecord.id,
      paymentReference,
      authorizationUrl: paymentData.authorizationUrl,
      warehouseId,
      pricing,
      expiresAt: reservationResult.expiresAt,
    };
  } catch (error) {
    // Clean up order and reservations if failure occurred
    try {
      await releaseOrderReservations(supabase, order.id);
      await supabase
        .from('orders')
        .update({ status: ORDER_STATUS.CANCELLED, updated_at: new Date().toISOString() })
        .eq('id', order.id);
    } catch (cleanupErr) {
      console.error('Failed to cleanup order after checkout failure:', cleanupErr);
    }
    throw error;
  }
}
