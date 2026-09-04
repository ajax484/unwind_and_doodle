import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { fulfillSuccessfulPayment } from '@/services/payment-fulfillment.service';
import { ORDER_STATUS, PAYMENT_STATUS, CURRENCY } from '@/lib/constants';

describe('Payment Fulfillment Service', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orderId = 'ord-fulfill-1';
  const paymentId = 'pay-fulfill-1';
  const reference = 'REF-FULFILL-100';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      orders: [
        {
          id: orderId,
          order_number: 'ORD-FULFILL-001',
          total: 10000,
          status: ORDER_STATUS.CREATED,
          payment_status: PAYMENT_STATUS.PENDING,
          customer_id: 'cust-1',
          organization_id: '88c7af2e-afd4-4504-a43f-b14cc45d6263',
          discount_id: 'disc-promo-10',
        },
      ],
      payments: [
        {
          id: paymentId,
          order_id: orderId,
          amount: 10000,
          currency: CURRENCY.NGN,
          provider: 'paystack',
          provider_reference: reference,
          status: PAYMENT_STATUS.PENDING,
          metadata: {},
        },
      ],
      discounts: [
        {
          id: 'disc-promo-10',
          code: 'PROMO10',
          times_redeemed: 5,
          max_redemptions: 100,
          organization_id: '88c7af2e-afd4-4504-a43f-b14cc45d6263',
        },
      ],
      inventory_reservations: [
        {
          id: 'res-1',
          order_id: orderId,
          warehouse_id: 'wh-1',
          product_id: 'prod-1',
          quantity: 1,
          status: 'active',
        },
      ],
      order_payment_requests: [
        {
          id: 'opr-1',
          order_id: orderId,
          status: 'sent',
        },
      ],
      order_status_history: [],
      audit_logs: [],
      domain_events: [],
      carts: [
        {
          id: 'cart-1',
          customer_id: 'cust-1',
          status: 'active',
        },
      ],
    });
  });

  it('executes full atomic payment fulfillment', async () => {
    const result = await fulfillSuccessfulPayment({
      supabase: mockSupabase,
      orderId,
      paymentId,
      provider: 'paystack',
      reference,
      verifiedDetails: {
        amount: 10000,
        currency: CURRENCY.NGN,
        channel: 'card',
        paidAt: '2026-09-04T12:00:00Z',
      },
      source: 'webhook',
    });

    expect(result.alreadyProcessed).toBe(false);
    expect(result.orderStatus).toBe(ORDER_STATUS.PENDING);
    expect(result.paymentStatus).toBe(PAYMENT_STATUS.SUCCESSFUL);

    // Verify payment updated
    const { data: updatedPayment } = await mockSupabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();
    expect(updatedPayment?.status).toBe(PAYMENT_STATUS.SUCCESSFUL);
    expect((updatedPayment?.metadata as Record<string, unknown>)?.channel).toBe('card');

    // Verify order updated
    const { data: updatedOrder } = await mockSupabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    expect(updatedOrder?.status).toBe(ORDER_STATUS.PENDING);

    // Verify manual order payment request updated
    const { data: updatedOpr } = await mockSupabase
      .from('order_payment_requests')
      .select('*')
      .eq('order_id', orderId)
      .single();
    expect(updatedOpr?.status).toBe('paid');

    // Verify cart converted
    const { data: updatedCart } = await mockSupabase
      .from('carts')
      .select('*')
      .eq('id', 'cart-1')
      .single();
    expect(updatedCart?.status).toBe('converted');
  });

  it('handles duplicate calls idempotently without repeating side-effects', async () => {
    // First call
    await fulfillSuccessfulPayment({
      supabase: mockSupabase,
      orderId,
      paymentId,
      provider: 'paystack',
      reference,
      verifiedDetails: {
        amount: 10000,
        currency: CURRENCY.NGN,
      },
      source: 'webhook',
    });

    // Second call
    const secondResult = await fulfillSuccessfulPayment({
      supabase: mockSupabase,
      orderId,
      paymentId,
      provider: 'paystack',
      reference,
      verifiedDetails: {
        amount: 10000,
        currency: CURRENCY.NGN,
      },
      source: 'return_callback',
    });

    expect(secondResult.alreadyProcessed).toBe(true);
  });

  it('does not revert downstream order status (e.g. confirmed or shipped)', async () => {
    // Advance order to confirmed first
    await mockSupabase
      .from('orders')
      .update({ status: ORDER_STATUS.CONFIRMED })
      .eq('id', orderId);

    const result = await fulfillSuccessfulPayment({
      supabase: mockSupabase,
      orderId,
      paymentId,
      provider: 'paystack',
      reference,
      verifiedDetails: {
        amount: 10000,
        currency: CURRENCY.NGN,
      },
      source: 'revalidation_cron',
    });

    expect(result.orderStatus).toBe(ORDER_STATUS.CONFIRMED);

    const { data: order } = await mockSupabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    expect(order?.status).toBe(ORDER_STATUS.CONFIRMED);
  });

  it('converts guest cart using cartSessionId when customer_id is absent', async () => {
    const guestOrderId = 'ord-guest-1';
    const guestPaymentId = 'pay-guest-1';
    const guestSessionId = 'guest-session-xyz';

    await mockSupabase.from('orders').insert({
      id: guestOrderId,
      order_number: 'ORD-GUEST-001',
      total: 5000,
      status: ORDER_STATUS.CREATED,
      customer_id: null,
      organization_id: '88c7af2e-afd4-4504-a43f-b14cc45d6263',
      email: 'guest@example.com',
      shipping_address: {},
    });

    await mockSupabase.from('payments').insert({
      id: guestPaymentId,
      order_id: guestOrderId,
      amount: 5000,
      currency: CURRENCY.NGN,
      provider: 'paystack',
      provider_reference: 'REF-GUEST-99',
      status: PAYMENT_STATUS.PENDING,
      metadata: {},
    });

    await mockSupabase.from('carts').insert({
      id: 'cart-guest-1',
      session_id: guestSessionId,
      customer_id: null,
      status: 'active',
      organization_id: '88c7af2e-afd4-4504-a43f-b14cc45d6263',
    });

    await fulfillSuccessfulPayment({
      supabase: mockSupabase,
      orderId: guestOrderId,
      paymentId: guestPaymentId,
      provider: 'paystack',
      reference: 'REF-GUEST-99',
      verifiedDetails: {
        amount: 5000,
        currency: CURRENCY.NGN,
      },
      source: 'return_callback',
      cartSessionId: guestSessionId,
    });

    const { data: updatedGuestCart } = await mockSupabase
      .from('carts')
      .select('*')
      .eq('id', 'cart-guest-1')
      .single();
    expect(updatedGuestCart?.status).toBe('converted');
  });
});
