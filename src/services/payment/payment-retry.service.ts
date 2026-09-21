import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { getPaymentProvider, getPaymentProviderLabel, PaymentProviderName, PaymentProvider } from './';
import { getEnabledPaymentMethods, getBankTransferSettings } from '../payment-settings.service';
import { BankTransferConfig } from '@/types/payment-settings';
import { reserveOrderInventory, releaseOrderReservations } from '../inventory.service';
import { resolveRequiredPhysicalItems, findCapableWarehouse, InputCheckoutItem } from '../warehouse.service';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  CURRENCY,
  DEFAULT_ORGANIZATION_ID,
} from '@/lib/constants';

export interface CustomerRetryContext {
  customerId?: string | null;
  customerEmail?: string | null;
  token?: string | null;
  isInternalAdmin?: boolean;
}

export interface PaymentAttemptSummary {
  id: string;
  provider: string;
  providerLabel: string;
  providerReference: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  bankDetails?: BankTransferConfig | null;
}

export interface RetryEligibilityResult {
  eligible: boolean;
  reason?: string;
  errorCode?:
    | 'ORDER_NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'ORDER_ALREADY_PAID'
    | 'ORDER_CANCELLED'
    | 'ORDER_NOT_PAYABLE'
    | 'INVENTORY_UNAVAILABLE';
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  orderStatus: string;
  enabledPaymentMethods: PaymentProviderName[];
  latestAttempt: PaymentAttemptSummary | null;
  paymentAttempts: PaymentAttemptSummary[];
  hasActiveReservation: boolean;
  reservationExpiresAt?: string | null;
}

export interface RetryPaymentParams {
  supabase: SupabaseClient<Database>;
  orderIdentifier: string; // orderId or orderNumber
  paymentMethod: PaymentProviderName;
  callbackUrl?: string;
  customerContext?: CustomerRetryContext;
  paymentProvider?: PaymentProvider;
}

export interface RetryPaymentResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  paymentId: string;
  paymentReference: string;
  provider: PaymentProviderName;
  providerLabel: string;
  paymentType: 'redirect' | 'manual';
  authorizationUrl?: string | null;
  bankDetails?: BankTransferConfig | null;
  amount: number;
  currency: string;
  isResumedPendingAttempt?: boolean;
}

/**
 * Validates whether an order is eligible for payment retry and loads available methods.
 */
export async function getPaymentRetryEligibility(
  supabase: SupabaseClient<Database>,
  orderIdentifier: string,
  customerContext?: CustomerRetryContext
): Promise<RetryEligibilityResult> {
  // 1. Locate order by order_number or id
  let { data: order, error: ordErr } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderIdentifier)
    .maybeSingle();

  if (!order) {
    const { data: orderById, error: ordByIdErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderIdentifier)
      .maybeSingle();
    order = orderById;
    ordErr = ordByIdErr;
  }

  if (ordErr || !order) {
    return {
      eligible: false,
      errorCode: 'ORDER_NOT_FOUND',
      reason: 'Order not found',
      orderId: '',
      orderNumber: '',
      totalAmount: 0,
      currency: CURRENCY.NGN,
      orderStatus: '',
      enabledPaymentMethods: [],
      latestAttempt: null,
      paymentAttempts: [],
      hasActiveReservation: false,
    };
  }

  // 2. Authorize customer context
  if (customerContext && !customerContext.isInternalAdmin) {
    let authorized = false;
    if (customerContext.customerId && order.customer_id === customerContext.customerId) {
      authorized = true;
    } else if (
      customerContext.customerEmail &&
      order.email &&
      order.email.toLowerCase() === customerContext.customerEmail.toLowerCase()
    ) {
      authorized = true;
    } else if (customerContext.token) {
      // Validated at route level
      authorized = true;
    }

    if (!authorized) {
      return {
        eligible: false,
        errorCode: 'UNAUTHORIZED',
        reason: 'You do not have permission to retry payment for this order',
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total,
        currency: CURRENCY.NGN,
        orderStatus: order.status,
        enabledPaymentMethods: [],
        latestAttempt: null,
        paymentAttempts: [],
        hasActiveReservation: false,
      };
    }
  }

  // 3. Fetch all historical payment attempts for this order
  const { data: rawPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false });

  const paymentAttempts: PaymentAttemptSummary[] = (rawPayments || []).map((p) => {
    const meta =
      p.metadata && typeof p.metadata === 'object' && !Array.isArray(p.metadata)
        ? (p.metadata as Record<string, unknown>)
        : {};
    return {
      id: p.id,
      provider: p.provider,
      providerLabel: getPaymentProviderLabel(p.provider),
      providerReference: p.provider_reference || null,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
      paidAt: p.paid_at || null,
      bankDetails: (meta.bank_details as BankTransferConfig) || null,
    };
  });

  const latestAttempt = paymentAttempts[0] || null;

  // 4. Check if order is already paid successfully
  const hasSuccessfulPayment = paymentAttempts.some((p) => p.status === PAYMENT_STATUS.SUCCESSFUL);
  if (
    hasSuccessfulPayment ||
    [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED, ORDER_STATUS.RECEIVED, ORDER_STATUS.REFUNDED].includes(
      order.status as any
    )
  ) {
    return {
      eligible: false,
      errorCode: 'ORDER_ALREADY_PAID',
      reason: 'This order has already been successfully paid.',
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total,
      currency: CURRENCY.NGN,
      orderStatus: order.status,
      enabledPaymentMethods: [],
      latestAttempt,
      paymentAttempts,
      hasActiveReservation: false,
    };
  }

  // 5. Check if order was cancelled
  if (order.status === ORDER_STATUS.CANCELLED) {
    return {
      eligible: false,
      errorCode: 'ORDER_CANCELLED',
      reason: 'This order has been cancelled and cannot be paid.',
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total,
      currency: CURRENCY.NGN,
      orderStatus: order.status,
      enabledPaymentMethods: [],
      latestAttempt,
      paymentAttempts,
      hasActiveReservation: false,
    };
  }

  // 6. Check active inventory reservations
  const { data: reservations } = await supabase
    .from('inventory_reservations')
    .select('id, expires_at, status')
    .eq('order_id', order.id)
    .eq('status', 'active');

  const activeRes = reservations?.find((r) => !r.expires_at || new Date(r.expires_at) > new Date());
  const hasActiveReservation = Boolean(activeRes);

  // 7. Fetch merchant's enabled payment methods
  const orgId = order.organization_id || DEFAULT_ORGANIZATION_ID;
  const enabledPaymentMethods = await getEnabledPaymentMethods(supabase, orgId);

  return {
    eligible: true,
    orderId: order.id,
    orderNumber: order.order_number,
    totalAmount: order.total,
    currency: CURRENCY.NGN,
    orderStatus: order.status,
    enabledPaymentMethods,
    latestAttempt,
    paymentAttempts,
    hasActiveReservation,
    reservationExpiresAt: activeRes?.expires_at || null,
  };
}

/**
 * Executes a payment retry for an order:
 * - Preserves previous failed payment attempts historically
 * - Validates enabled payment methods and recalculates server-side values
 * - Reuses existing valid inventory reservation or safely renews it without duplication
 * - Handles gateway initialization or returns resumed bank transfer instructions
 */
export async function retryPayment(params: RetryPaymentParams): Promise<RetryPaymentResult> {
  const { supabase, orderIdentifier, paymentMethod, callbackUrl, customerContext } = params;

  // 1. Validate eligibility
  const eligibility = await getPaymentRetryEligibility(supabase, orderIdentifier, customerContext);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'Order is not eligible for payment retry');
  }

  // 2. Fetch full order record
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', eligibility.orderId)
    .single();

  if (!order) {
    throw new Error('Order record not found');
  }

  const orgId = order.organization_id || DEFAULT_ORGANIZATION_ID;

  // 3. Verify requested payment method is enabled
  if (!eligibility.enabledPaymentMethods.includes(paymentMethod)) {
    throw new Error(
      `Payment method '${getPaymentProviderLabel(paymentMethod)}' is not currently available.`
    );
  }

  // 4. Handle Inventory Reservation Check & Re-reservation
  // If active reservation exists, reuse it. If expired, renew or recreate atomically.
  if (!eligibility.hasActiveReservation) {
    // Check if order items exist to re-reserve
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', order.id);

    if (orderItems && orderItems.length > 0 && order.warehouse_id) {
      try {
        const inputItems: InputCheckoutItem[] = orderItems.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
        }));
        const requiredItems = await resolveRequiredPhysicalItems(supabase, inputItems);
        const warehouseCheck = await findCapableWarehouse(
          supabase,
          order.location_id || '',
          requiredItems
        );

        if (!warehouseCheck.capable || !warehouseCheck.warehouseId) {
          throw new Error('Inventory is no longer available for this order.');
        }

        // Release any stale expired records before re-reserving
        await releaseOrderReservations(supabase, order.id);

        // Reserve fresh inventory for the order
        await reserveOrderInventory(supabase, {
          warehouseId: order.warehouse_id,
          orderId: order.id,
          items: requiredItems,
        });
      } catch (invErr) {
        throw new Error(
          invErr instanceof Error ? invErr.message : 'Failed to secure stock for payment retry'
        );
      }
    }
  }

  // 5. Handle Direct Bank Transfer (manual)
  if (paymentMethod === 'manual') {
    // Check if there is already a pending manual payment attempt
    const existingManualPending = eligibility.paymentAttempts.find(
      (p) => p.provider === 'manual' && p.status === PAYMENT_STATUS.PENDING
    );

    if (existingManualPending) {
      // Resume existing pending manual attempt
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        paymentId: existingManualPending.id,
        paymentReference: existingManualPending.providerReference || order.order_number,
        provider: 'manual',
        providerLabel: 'Bank Transfer',
        paymentType: 'manual',
        bankDetails: existingManualPending.bankDetails || (await getBankTransferSettings(supabase, orgId)),
        amount: existingManualPending.amount,
        currency: existingManualPending.currency,
        isResumedPendingAttempt: true,
      };
    }

    // Otherwise create a new manual payment attempt with current bank details snapshot
    const bankDetails = await getBankTransferSettings(supabase, orgId);
    if (!bankDetails) {
      throw new Error('Store bank details are not configured for bank transfer.');
    }

    const manualProvider = getPaymentProvider('manual');
    const paymentRef = manualProvider.generateReference();

    const { data: newPayment, error: payErr } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        provider: 'manual',
        provider_reference: paymentRef,
        amount: order.total,
        currency: CURRENCY.NGN,
        status: PAYMENT_STATUS.PENDING,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          warehouse_id: order.warehouse_id,
          customer_email: order.email,
          bank_details: bankDetails,
          retry_from_attempt: eligibility.latestAttempt?.id || null,
        } as unknown as Database['public']['Tables']['payments']['Insert']['metadata'],
      } as unknown as Database['public']['Tables']['payments']['Insert'])
      .select()
      .single();

    if (payErr || !newPayment) {
      throw new Error(`Failed to create manual payment retry: ${payErr?.message}`);
    }

    // Record audit log
    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      actor_id: customerContext?.customerId || null,
      action: 'create',
      entity_type: 'payment',
      entity_id: newPayment.id,
      after_data: {
        operation: 'payment.retry_initiated',
        provider: 'manual',
        order_id: order.id,
        order_number: order.order_number,
        amount: order.total,
      },
    } as Database['public']['Tables']['audit_logs']['Insert']);

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentId: newPayment.id,
      paymentReference: paymentRef,
      provider: 'manual',
      providerLabel: 'Bank Transfer',
      paymentType: 'manual',
      bankDetails,
      amount: order.total,
      currency: CURRENCY.NGN,
      isResumedPendingAttempt: false,
    };
  }

  // 6. Handle Gateway Providers (Paystack / Flutterwave)
  const providerInstance = params.paymentProvider || getPaymentProvider(paymentMethod);
  const paymentReference = providerInstance.generateReference();

  // Create new payment attempt record (historical attempt immutability)
  const { data: paymentRecord, error: insertPayErr } = await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      provider: paymentMethod,
      provider_reference: paymentReference,
      amount: order.total,
      currency: CURRENCY.NGN,
      status: PAYMENT_STATUS.PENDING,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        warehouse_id: order.warehouse_id,
        customer_email: order.email,
        retry_from_attempt: eligibility.latestAttempt?.id || null,
      } as unknown as Database['public']['Tables']['payments']['Insert']['metadata'],
    } as unknown as Database['public']['Tables']['payments']['Insert'])
    .select()
    .single();

  if (insertPayErr || !paymentRecord) {
    throw new Error(`Failed to create payment retry record: ${insertPayErr?.message}`);
  }

  // Record audit log for retry attempt
  await supabase.from('audit_logs').insert({
    organization_id: orgId,
    actor_id: customerContext?.customerId || null,
    action: 'create',
    entity_type: 'payment',
    entity_id: paymentRecord.id,
    after_data: {
      operation: 'payment.retry_initiated',
      provider: paymentMethod,
      order_id: order.id,
      order_number: order.order_number,
      amount: order.total,
    },
  } as Database['public']['Tables']['audit_logs']['Insert']);

  // 7. Initialize transaction with Payment Provider
  const effectiveCallback =
    callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || ''}/order/callback`;

  let initResult;
  try {
    initResult = await providerInstance.initializeTransaction({
      reference: paymentReference,
      amount: order.total,
      currency: CURRENCY.NGN,
      customer: {
        email: order.email,
        name: `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Customer',
        phone: order.phone || undefined,
      },
      redirectUrl: effectiveCallback,
      metadata: {
        order_id: order.id,
        payment_id: paymentRecord.id,
        is_retry: true,
      },
      description: `Payment for Order ${order.order_number} (Retry)`,
    });
  } catch (initErr) {
    // If gateway initialization explicitly failed, mark payment attempt as failed
    await supabase
      .from('payments')
      .update({
        status: PAYMENT_STATUS.FAILED,
        metadata: {
          init_error: initErr instanceof Error ? initErr.message : 'Gateway initialization failed',
        } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
      } as unknown as Database['public']['Tables']['payments']['Update'])
      .eq('id', paymentRecord.id);

    throw new Error(
      `Unable to initialize payment with ${getPaymentProviderLabel(paymentMethod)}: ${
        initErr instanceof Error ? initErr.message : 'Unknown gateway error'
      }`
    );
  }

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.order_number,
    paymentId: paymentRecord.id,
    paymentReference,
    provider: paymentMethod,
    providerLabel: getPaymentProviderLabel(paymentMethod),
    paymentType: 'redirect',
    authorizationUrl: initResult.authorizationUrl || null,
    amount: order.total,
    currency: CURRENCY.NGN,
    isResumedPendingAttempt: false,
  };
}
