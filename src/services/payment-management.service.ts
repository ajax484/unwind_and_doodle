import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../lib/supabase/types';
import {
  AdminPaymentFilters,
  AdminPaymentListResponse,
  AdminPaymentListItem,
  AdminPaymentDetail,
  PaymentRefundRecord,
  PaymentTimelineEvent,
  RefundPaymentResult,
} from '../types/payment-management';
import { getPaymentProvider } from './payment/provider.factory';
import { getPaymentProviderLabel } from './payment/provider.types';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES, DEFAULT_ORGANIZATION_ID } from '../lib/constants';
import { publishDomainEvent } from './events.service';

/**
 * Lists organization payments with search, multi-factor filtering, and pagination.
 */
export async function listAdminPayments(
  supabase: SupabaseClient<Database>,
  filters: AdminPaymentFilters & { organizationId?: string }
): Promise<AdminPaymentListResponse> {
  const {
    organizationId,
    status = 'all',
    provider = 'all',
    search,
    startDate,
    endDate,
    sortBy = 'newest',
    page = 1,
    limit = 25,
  } = filters;

  const offset = (page - 1) * limit;

  // 1. Fetch payments
  let query = supabase.from('payments').select('*');

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (provider && provider !== 'all') {
    query = query.eq('provider', provider);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: rawPayments, error: payErr } = await query;
  if (payErr) {
    throw new Error(`Failed to list payments: ${payErr.message}`);
  }

  let paymentsList = rawPayments || [];

  // 2. Fetch associated orders to enforce organization scoping and customer enrichment
  const orderIds = Array.from(new Set(paymentsList.map((p) => p.order_id).filter(Boolean)));
  const { data: orders, error: ordErr } = orderIds.length > 0
    ? await supabase.from('orders').select('id, order_number, customer_id, email, first_name, last_name, total, organization_id, status').in('id', orderIds)
    : { data: [], error: null };

  if (ordErr) {
    throw new Error(`Failed to load payment orders: ${ordErr.message}`);
  }

  const orderMap = new Map((orders || []).map((o) => [o.id, o]));

  // 3. Organization isolation filter
  if (organizationId) {
    paymentsList = paymentsList.filter((p) => {
      const order = orderMap.get(p.order_id);
      const orderOrg = order?.organization_id || DEFAULT_ORGANIZATION_ID;
      return orderOrg === organizationId;
    });
  }

  // 4. In-memory Search filter (matches orderNumber, providerReference, paymentId, customer email/name)
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    paymentsList = paymentsList.filter((p) => {
      const order = orderMap.get(p.order_id);
      const orderMatch = order?.order_number?.toLowerCase().includes(s);
      const refMatch = p.provider_reference?.toLowerCase().includes(s);
      const idMatch = p.id.toLowerCase().includes(s);
      const emailMatch = order?.email?.toLowerCase().includes(s);
      const nameMatch = `${order?.first_name || ''} ${order?.last_name || ''}`.toLowerCase().includes(s);
      return orderMatch || refMatch || idMatch || emailMatch || nameMatch;
    });
  }

  // 5. Sorting
  if (sortBy === 'oldest') {
    paymentsList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sortBy === 'highest_amount') {
    paymentsList.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  } else if (sortBy === 'lowest_amount') {
    paymentsList.sort((a, b) => (a.amount || 0) - (b.amount || 0));
  } else {
    // Default: newest
    paymentsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = paymentsList.length;
  const paginated = paymentsList.slice(offset, offset + limit);

  // 6. Map to AdminPaymentListItem
  const items: AdminPaymentListItem[] = paginated.map((p) => {
    const order = orderMap.get(p.order_id);
    const meta = p.metadata && typeof p.metadata === 'object' && !Array.isArray(p.metadata)
      ? (p.metadata as Record<string, unknown>)
      : {};
    
    const refunds = Array.isArray(meta.refunds) ? (meta.refunds as PaymentRefundRecord[]) : [];
    const refundedAmount = refunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const isSuccessful = p.status === PAYMENT_STATUS.SUCCESSFUL;
    const isRefundable = isSuccessful && (p.amount - refundedAmount > 0);

    return {
      id: p.id,
      orderId: p.order_id,
      orderNumber: order?.order_number || 'N/A',
      amount: p.amount,
      currency: p.currency,
      provider: p.provider,
      providerLabel: getPaymentProviderLabel(p.provider),
      providerReference: p.provider_reference || null,
      status: p.status,
      customer: {
        id: order?.customer_id || undefined,
        name: `${order?.first_name || ''} ${order?.last_name || ''}`.trim() || 'Guest Customer',
        email: order?.email || (meta.customer_email as string) || '',
      },
      refundedAmount,
      isRefundable,
      paidAt: p.paid_at || null,
      createdAt: p.created_at,
    };
  });

  return {
    payments: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves full comprehensive payment details, refund records, and timeline history.
 */
export async function getAdminPaymentDetail(
  supabase: SupabaseClient<Database>,
  paymentId: string,
  organizationId?: string
): Promise<AdminPaymentDetail> {
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId.trim())
    .maybeSingle();

  if (payErr || !payment) {
    throw new Error(`Payment record not found: ${paymentId}`);
  }

  // Fetch associated order
  const { data: order, error: ordErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', payment.order_id)
    .maybeSingle();

  if (ordErr || !order) {
    throw new Error(`Order record not found for payment: ${payment.order_id}`);
  }

  // Tenant check
  const orderOrgId = order.organization_id || DEFAULT_ORGANIZATION_ID;
  if (organizationId && orderOrgId !== organizationId) {
    throw new Error(`Forbidden: Payment does not belong to your organization`);
  }

  // Fetch customer & audit logs in parallel
  const [
    { data: customer },
    { data: auditLogs },
    { data: statusHistory },
  ] = await Promise.all([
    order.customer_id
      ? supabase.from('customers').select('*').eq('id', order.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('audit_logs').select('*').in('entity_id', [payment.id, order.id]),
    supabase.from('order_status_history').select('*').eq('order_id', order.id),
  ]);

  const meta = payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
    ? (payment.metadata as Record<string, unknown>)
    : {};

  const refunds = Array.isArray(meta.refunds) ? (meta.refunds as PaymentRefundRecord[]) : [];
  const totalRefunded = refunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const remainingRefundable = Math.max(0, payment.amount - totalRefunded);
  const isSuccessful = payment.status === PAYMENT_STATUS.SUCCESSFUL;
  const isRefundable = isSuccessful && remainingRefundable > 0;

  // Build chronological payment timeline
  const timeline: PaymentTimelineEvent[] = [
    {
      id: `event-created-${payment.id}`,
      title: 'Payment Created',
      description: `Payment initiated via ${getPaymentProviderLabel(payment.provider)} for ${payment.currency} ${payment.amount.toLocaleString()}`,
      timestamp: payment.created_at,
      badge: payment.status,
      type: 'created',
    },
  ];

  if (payment.paid_at || payment.status === PAYMENT_STATUS.SUCCESSFUL) {
    const verifiedVia = (meta.verified_via as string) || 'gateway';
    timeline.push({
      id: `event-verified-${payment.id}`,
      title: payment.provider === 'manual' ? 'Bank Transfer Confirmed' : 'Payment Verified',
      description: payment.provider === 'manual'
        ? `Confirmed by admin ${(meta.admin_email as string) || (meta.confirmed_by_admin as string) || ''} (${(meta.admin_note as string) || 'Manual Bank Transfer'})`
        : `Verified successfully with ${getPaymentProviderLabel(payment.provider)} gateway`,
      timestamp: payment.paid_at || payment.created_at,
      actor: (meta.confirmed_by_admin as string) || null,
      type: 'verified',
    });
  }

  for (const r of refunds) {
    timeline.push({
      id: `event-refund-${r.id || r.refundId}`,
      title: r.provider === 'manual' ? 'Manual Refund Recorded' : 'Gateway Refund Processed',
      description: `Refund of ${payment.currency} ${Number(r.amount).toLocaleString()} (${r.reason || 'Admin Refund'})`,
      timestamp: r.createdAt,
      actor: r.actorEmail || r.actorId || null,
      type: 'refunded',
    });
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const shippingAddrObj =
    order.shipping_address && typeof order.shipping_address === 'object' && !Array.isArray(order.shipping_address)
      ? (order.shipping_address as { streetAddress?: string; address_line_1?: string; city?: string; state?: string })
      : null;

  return {
    id: payment.id,
    orderId: order.id,
    orderNumber: order.order_number,
    orderStatus: order.status,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    providerLabel: getPaymentProviderLabel(payment.provider),
    providerReference: payment.provider_reference || null,
    status: payment.status,
    paidAt: payment.paid_at || null,
    createdAt: payment.created_at,
    updatedAt: (payment as any).updated_at || undefined,
    customer: {
      id: order.customer_id || undefined,
      firstName: order.first_name || customer?.first_name || '',
      lastName: order.last_name || customer?.last_name || '',
      email: order.email || customer?.email || '',
      phone: order.phone || customer?.phone || null,
    },
    shippingAddress: shippingAddrObj
      ? {
          streetAddress: shippingAddrObj.streetAddress || shippingAddrObj.address_line_1 || '',
          city: shippingAddrObj.city || '',
          state: shippingAddrObj.state || '',
        }
      : null,
    bankDetails: (meta.bank_details as any) || null,
    refunds,
    totalRefunded,
    remainingRefundable,
    isRefundable,
    timeline,
    rawMetadata: (payment.metadata as Json) || null,
  };
}

export interface RefundPaymentParams {
  supabase: SupabaseClient<Database>;
  paymentId: string;
  amount?: number;
  reason?: string;
  customerNote?: string;
  adminContext: {
    userId: string;
    organizationId: string;
    role?: string;
    userEmail?: string;
  };
}

/**
 * Authoritative, provider-aware refund orchestrator.
 * Dynamically resolves the original payment's provider via `getPaymentProvider(payment.provider)`,
 * enforces refund amount boundaries, handles manual vs gateway refunds, updates records, and records audit logs.
 */
export async function refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
  const { supabase, paymentId, amount, reason, customerNote, adminContext } = params;

  if (!paymentId || !paymentId.trim()) {
    throw new Error('Payment ID is required');
  }

  // 1. Fetch payment and order
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId.trim())
    .maybeSingle();

  if (payErr || !payment) {
    throw new Error(`Payment record not found: ${paymentId}`);
  }

  const { data: order, error: ordErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', payment.order_id)
    .maybeSingle();

  if (ordErr || !order) {
    throw new Error(`Order record not found for payment: ${payment.order_id}`);
  }

  // 2. Organization isolation check
  const orderOrgId = order.organization_id || DEFAULT_ORGANIZATION_ID;
  if (adminContext.organizationId && orderOrgId !== adminContext.organizationId) {
    throw new Error(`Forbidden: Payment does not belong to your organization`);
  }

  // 3. Status eligibility check
  const isSuccessful = payment.status === PAYMENT_STATUS.SUCCESSFUL;
  if (!isSuccessful) {
    throw new Error(
      `Cannot refund payment in status '${payment.status}'. Only successful payments can be refunded.`
    );
  }

  // 4. Calculate existing refunds and refundable balance
  const existingMetadata =
    payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
      ? (payment.metadata as Record<string, unknown>)
      : {};

  const existingRefunds = Array.isArray(existingMetadata.refunds)
    ? (existingMetadata.refunds as PaymentRefundRecord[])
    : [];

  const totalPaid = Number(payment.amount);
  const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const remainingRefundable = Math.max(0, totalPaid - alreadyRefunded);

  if (remainingRefundable <= 0) {
    throw new Error('Payment has already been fully refunded');
  }

  const effectiveRefundAmount = amount !== undefined ? Number(amount) : remainingRefundable;

  if (effectiveRefundAmount <= 0) {
    throw new Error('Refund amount must be greater than 0');
  }

  if (effectiveRefundAmount > remainingRefundable) {
    throw new Error(
      `Refund amount (₦${effectiveRefundAmount.toLocaleString()}) exceeds remaining refundable balance (₦${remainingRefundable.toLocaleString()})`
    );
  }

  // 5. Authoritatively resolve the original provider from payment record
  const originalProviderName = payment.provider || 'manual';
  const paymentProvider = getPaymentProvider(originalProviderName);
  const isManual = originalProviderName === 'manual';

  // 6. Execute refund
  let providerRefundId = `REF_${Date.now()}`;
  let providerStatus: 'processed' | 'pending' | 'failed' = 'processed';

  if (!isManual) {
    const transactionRef = payment.provider_reference || payment.id;
    if (!paymentProvider.refundTransaction) {
      throw new Error(`Payment provider '${originalProviderName}' does not support refunds`);
    }

    const providerResult = await paymentProvider.refundTransaction({
      transaction: transactionRef,
      amount: effectiveRefundAmount,
      merchantNote: reason || 'Admin initiated refund',
      customerNote: customerNote || reason || 'Refund processed for order',
    });

    providerRefundId = String(providerResult.refundId || providerRefundId);
    providerStatus = providerResult.status || 'processed';
  } else {
    // Manual / Direct Bank Transfer refund: record manual administrative refund
    providerRefundId = `MAN_REF_${Date.now()}`;
    providerStatus = 'processed';
  }

  // 7. Update Payment Record
  const newRefundRecord: PaymentRefundRecord = {
    id: `ref-${Date.now()}`,
    refundId: providerRefundId,
    amount: effectiveRefundAmount,
    status: providerStatus,
    provider: originalProviderName,
    reason: reason || (isManual ? 'Manual bank transfer refund recorded' : 'Gateway refund processed'),
    actorId: adminContext.userId,
    actorEmail: adminContext.userEmail || null,
    createdAt: new Date().toISOString(),
  };

  const updatedRefundsList = [...existingRefunds, newRefundRecord];
  const newTotalRefunded = alreadyRefunded + effectiveRefundAmount;
  const isFullyRefunded = newTotalRefunded >= totalPaid;
  const newPaymentStatus = isFullyRefunded ? 'refunded' : payment.status;

  const updatedMetadata = {
    ...existingMetadata,
    refunds: updatedRefundsList,
    total_refunded: newTotalRefunded,
    last_refund_at: new Date().toISOString(),
  };

  const { error: updatePayErr } = await supabase
    .from('payments')
    .update({
      status: newPaymentStatus,
      metadata: updatedMetadata as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
      updated_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['payments']['Update'])
    .eq('id', payment.id);

  if (updatePayErr) {
    throw new Error(`Failed to update payment refund status: ${updatePayErr.message}`);
  }

  // 8. Transition order status if fully refunded
  if (isFullyRefunded && order.status !== ORDER_STATUS.REFUNDED) {
    try {
      await supabase
        .from('orders')
        .update({
          status: ORDER_STATUS.REFUNDED,
          updated_at: new Date().toISOString(),
        } as unknown as Database['public']['Tables']['orders']['Update'])
        .eq('id', order.id);

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        from_status: order.status,
        to_status: ORDER_STATUS.REFUNDED,
        status: ORDER_STATUS.REFUNDED,
        note: reason
          ? `Order fully refunded via ${getPaymentProviderLabel(originalProviderName)}: ${reason}`
          : `Order fully refunded via ${getPaymentProviderLabel(originalProviderName)}`,
        changed_by: adminContext.userId,
      } as Database['public']['Tables']['order_status_history']['Insert']);
    } catch (orderErr) {
      console.warn(`[refundPayment] Warning: order status transition to refunded failed:`, orderErr);
    }
  }

  // 9. Record Audit Log
  const auditOperation = isManual ? 'manual_refund_recorded' : 'payment.refunded';
  await supabase.from('audit_logs').insert({
    organization_id: orderOrgId,
    actor_id: adminContext.userId,
    action: 'update',
    entity_type: 'payment',
    entity_id: payment.id,
    before_data: { status: payment.status, totalRefunded: alreadyRefunded },
    after_data: {
      status: newPaymentStatus,
      operation: auditOperation,
      provider: originalProviderName,
      refundAmount: effectiveRefundAmount,
      totalRefunded: newTotalRefunded,
      refundId: providerRefundId,
      reason: reason || undefined,
    },
    new_values: {
      operation: auditOperation,
      refundAmount: effectiveRefundAmount,
      totalRefunded: newTotalRefunded,
    },
  } as Database['public']['Tables']['audit_logs']['Insert']);

  // 10. Publish Domain Event
  await publishDomainEvent(supabase, {
    eventType: DOMAIN_EVENT_TYPES.ORDER_REFUNDED,
    aggregateType: 'order',
    aggregateId: order.id,
    organizationId: orderOrgId,
    payload: {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.order_number,
      refundId: providerRefundId,
      refundAmount: effectiveRefundAmount,
      totalRefunded: newTotalRefunded,
      provider: originalProviderName,
      isManual,
      reason: reason || undefined,
      actorId: adminContext.userId,
    },
  });

  return {
    success: true,
    paymentId: payment.id,
    orderId: order.id,
    orderNumber: order.order_number,
    refundId: providerRefundId,
    refundAmount: effectiveRefundAmount,
    totalRefunded: newTotalRefunded,
    remainingRefundable: totalPaid - newTotalRefunded,
    paymentStatus: newPaymentStatus,
    provider: originalProviderName,
    isManual,
    message: isManual
      ? `Manual refund of ₦${effectiveRefundAmount.toLocaleString()} recorded successfully`
      : `Refund of ₦${effectiveRefundAmount.toLocaleString()} processed via ${getPaymentProviderLabel(originalProviderName)}`,
  };
}
