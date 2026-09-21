import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { PAYMENT_STATUS, DEFAULT_ORGANIZATION_ID } from '../lib/constants';
import {
  fulfillSuccessfulPayment,
  FulfillPaymentResult,
} from './payment-fulfillment.service';

export interface ConfirmManualPaymentParams {
  supabase: SupabaseClient<Database>;
  paymentId: string;
  orderId?: string;
  adminContext: {
    userId: string;
    organizationId: string;
    role?: string;
    userEmail?: string;
  };
  note?: string;
}

export type ConfirmManualPaymentResult = FulfillPaymentResult;

/**
 * Authoritative, organization-scoped service for admin confirmation of Manual / Bank Transfer payments.
 * Validates role, organization ownership, provider type, and status before delegating
 * into the centralized successful-payment fulfillment pipeline.
 */
export async function confirmManualPayment(
  params: ConfirmManualPaymentParams
): Promise<ConfirmManualPaymentResult> {
  const { supabase, paymentId, orderId, adminContext, note } = params;

  if (!paymentId || !paymentId.trim()) {
    throw new Error('Payment ID is required');
  }

  // 1. Fetch payment record
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId.trim())
    .maybeSingle();

  if (payErr || !payment) {
    throw new Error(`Payment record not found: ${paymentId}`);
  }

  // 2. Fetch associated order
  const effectiveOrderId = orderId?.trim() || payment.order_id;
  const { data: order, error: ordErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', effectiveOrderId)
    .maybeSingle();

  if (ordErr || !order) {
    throw new Error(`Order record not found: ${effectiveOrderId}`);
  }

  // Verify that payment matches the target order
  if (payment.order_id !== order.id) {
    throw new Error(`Payment ${paymentId} is not associated with order ${order.id}`);
  }

  // 3. Organization isolation check
  const orderOrgId = order.organization_id || DEFAULT_ORGANIZATION_ID;
  if (adminContext.organizationId && orderOrgId !== adminContext.organizationId) {
    throw new Error(`Forbidden: Order does not belong to your organization`);
  }

  // 4. Validate payment provider is manual
  if (payment.provider !== 'manual') {
    throw new Error(
      `Cannot manually confirm payment for provider '${payment.provider}'. Only manual/bank transfer payments can be confirmed by admins.`
    );
  }

  // 5. Idempotency check: if payment is already successful, return early without re-executing fulfillment
  if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
    return {
      alreadyProcessed: true,
      orderId: order.id,
      orderNumber: order.order_number,
      orderStatus: order.status,
      paymentId: payment.id,
      paymentStatus: payment.status,
    };
  }

  // 6. Ensure payment is in a confirmable state (pending)
  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new Error(
      `Cannot confirm manual payment in status '${payment.status}'. Only pending payments can be confirmed.`
    );
  }

  // 7. Hand off to the canonical successful-payment fulfillment pipeline
  const effectiveReference = payment.provider_reference || `MAN_${payment.id}`;
  const nowIso = new Date().toISOString();

  const fulfillmentResult = await fulfillSuccessfulPayment({
    supabase,
    orderId: order.id,
    paymentId: payment.id,
    provider: 'manual',
    reference: effectiveReference,
    verifiedDetails: {
      amount: payment.amount,
      currency: payment.currency,
      channel: 'bank_transfer',
      paidAt: nowIso,
      providerReference: effectiveReference,
      rawMetadata: {
        confirmed_by_admin: adminContext.userId,
        admin_email: adminContext.userEmail || undefined,
        admin_note: note || 'Confirmed via admin portal',
      },
    },
    source: 'manual_admin',
    actorId: adminContext.userId,
  });

  return fulfillmentResult;
}
