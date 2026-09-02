import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  PaystackPaymentProvider,
  generatePaystackReference,
  verifyPaystackSignature,
} from '@/services/paystack.service';
import { processPaymentWebhook } from '@/services/webhook.service';
import { processCheckout } from '@/services/checkout.service';
import { releaseOrderReservations } from '@/services/inventory.service';
import { ORDER_STATUS, PAYMENT_STATUS, CURRENCY } from '@/lib/constants';

describe('Paystack Payment Integration, Verification & Webhook Handling', () => {
  const secretKey = 'sk_test_paystack_secret_12345';
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-lagos-hub';
  const locationId = 'loc-lagos';
  const productId = 'prod-coloring-book';
  const orderId = 'ord-paystack-test';
  const paymentId = 'pay-test-123';
  const payReference = 'UAD_TEST_REF_999';
  const totalAmount = 15000;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: warehouseId, name: 'Main Hub', code: 'LAG-01', is_active: true },
      ],
      locations: [
        { id: locationId, name: 'Ikeja', state: 'Lagos', country: 'Nigeria', is_active: true },
      ],
      warehouse_locations: [
        { id: 'wl-1', warehouse_id: warehouseId, location_id: locationId, priority: 1, is_active: true },
      ],
      delivery_rates: [
        {
          id: 'rate-1',
          warehouse_id: warehouseId,
          location_id: locationId,
          base_rate: 1500,
          is_active: true,
        },
      ],
      products: [
        { id: productId, name: 'Mindful Floral Coloring Book', price: 13500, is_active: true },
      ],
      product_addons: [],
      orders: [
        {
          id: orderId,
          order_number: 'ORD-TEST-999',
          customer_id: 'cust-1',
          warehouse_id: warehouseId,
          location_id: locationId,
          status: ORDER_STATUS.CREATED,
          subtotal: 13500,
          delivery_fee: 1500,
          total_amount: totalAmount,
          currency: CURRENCY.NGN,
        },
      ],
      payments: [
        {
          id: paymentId,
          order_id: orderId,
          provider: 'paystack',
          provider_reference: payReference,
          amount: totalAmount,
          currency: CURRENCY.NGN,
          status: PAYMENT_STATUS.PENDING,
          metadata: { order_id: orderId },
        },
      ],
      inventory: [
        {
          warehouse_id: warehouseId,
          product_id: productId,
          quantity: 10,
          reserved_quantity: 2,
        },
      ],
      inventory_reservations: [
        {
          id: 'res-paystack-1',
          warehouse_id: warehouseId,
          product_id: productId,
          quantity: 2,
          status: 'active',
          reference_type: 'order',
          reference_id: orderId,
          expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        },
      ],
      order_status_history: [],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Paystack Reference & Signature Verification', () => {
    it('generates unique Paystack reference starting with prefix', () => {
      const ref1 = generatePaystackReference();
      const ref2 = generatePaystackReference();

      expect(ref1).toMatch(/^UAD_/);
      expect(ref2).toMatch(/^UAD_/);
      expect(ref1).not.toBe(ref2);
    });

    it('verifies valid HMAC SHA-512 signature', () => {
      const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'UAD_123' } });
      const validSignature = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');

      const isValid = verifyPaystackSignature(payload, validSignature, secretKey);
      expect(isValid).toBe(true);
    });

    it('rejects invalid or forged HMAC SHA-512 signature', () => {
      const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'UAD_123' } });
      const invalidSignature = 'invalid_tampered_signature_hex';

      const isValid = verifyPaystackSignature(payload, invalidSignature, secretKey);
      expect(isValid).toBe(false);
    });
  });

  describe('2. Paystack Initialization (Amount to Kobo Conversion)', () => {
    it('converts NGN amount to kobo correctly and returns authorizationUrl', async () => {
      let interceptedBody: any;
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        interceptedBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            status: true,
            message: 'Authorization URL created',
            data: {
              authorization_url: 'https://checkout.paystack.com/auth_xyz',
              access_code: 'acc_123',
              reference: 'UAD_REF_1',
            },
          }),
        };
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockFetch as any });

      const result = await provider.initializeTransaction({
        reference: 'UAD_REF_1',
        amount: 29500, // ₦29,500
        currency: 'NGN',
        customer: { email: 'customer@example.com', name: 'John Doe', phone: '08012345678' },
        redirectUrl: 'http://localhost:3000/order/callback',
      });

      expect(result.authorizationUrl).toBe('https://checkout.paystack.com/auth_xyz');
      expect(result.reference).toBe('UAD_REF_1');
      expect(result.provider).toBe('paystack');

      // Check kobo conversion: 29,500 NGN = 2,950,000 kobo
      expect(interceptedBody.amount).toBe(2950000);
      expect(interceptedBody.email).toBe('customer@example.com');
      expect(interceptedBody.currency).toBe('NGN');
      expect(interceptedBody.callback_url).toBe('http://localhost:3000/order/callback');
    });

    it('throws when Paystack initialization fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          status: false,
          message: 'Invalid email address',
        }),
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockFetch as any });

      await expect(
        provider.initializeTransaction({
          reference: 'UAD_REF_2',
          amount: 500,
          currency: 'NGN',
          customer: { email: 'bad-email' },
        })
      ).rejects.toThrow(/Paystack initialization failed: Invalid email address/);
    });
  });

  describe('3. Paystack Direct Verification', () => {
    it('verifies transaction and converts kobo amount back to NGN', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            id: 998877,
            status: 'success',
            reference: 'UAD_REF_VERIFY',
            amount: 1500000, // 15,000 NGN in kobo
            currency: 'NGN',
            channel: 'card',
            paid_at: '2026-08-30T00:30:00.000Z',
          },
        }),
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockFetch as any });
      const verification = await provider.verifyTransaction('UAD_REF_VERIFY');

      expect(verification.status).toBe('successful');
      expect(verification.amount).toBe(15000); // 1500000 / 100
      expect(verification.currency).toBe('NGN');
      expect(verification.channel).toBe('card');
      expect(verification.providerReference).toBe('998877');
    });

    it('handles failed transaction verification status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            id: 998878,
            status: 'failed',
            reference: 'UAD_REF_FAILED',
            amount: 1500000,
            currency: 'NGN',
          },
        }),
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockFetch as any });
      const verification = await provider.verifyTransaction('UAD_REF_FAILED');

      expect(verification.status).toBe('failed');
    });
  });

  describe('4. Webhook Processing, Idempotency & Order State Machine', () => {
    const rawWebhookBody = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 998877,
        domain: 'test',
        status: 'success',
        reference: payReference,
        amount: 1500000, // 15000 NGN in kobo
        currency: 'NGN',
        paid_at: '2026-08-30T00:30:00.000Z',
        channel: 'card',
        gateway_response: 'Successful',
        customer: {
          email: 'test@example.com',
        },
      },
    });

    const validSignature = crypto.createHmac('sha512', secretKey).update(rawWebhookBody).digest('hex');

    const mockVerifyFetchSuccess = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        message: 'Verification successful',
        data: {
          id: 998877,
          domain: 'test',
          status: 'success',
          reference: payReference,
          amount: 1500000,
          currency: 'NGN',
          channel: 'card',
          gateway_response: 'Successful',
          paid_at: '2026-08-30T00:30:00.000Z',
          created_at: '2026-08-30T00:29:00.000Z',
          customer: { id: 1, email: 'test@example.com', customer_code: 'CUS_1' },
        },
      }),
    });

    it('processes webhook successfully, transitions order to pending (not confirmed), commits reservation, and emits event', async () => {
      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockVerifyFetchSuccess as any });

      const result = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: rawWebhookBody,
        headers: { 'x-paystack-signature': validSignature },
        paymentProvider: provider,
      });

      expect(result.success).toBe(true);
      expect(result.alreadyProcessed).toBe(false);

      // Verify payment marked successful
      const payment = mockSupabase._store.payments.find((p) => p.id === paymentId);
      expect(payment.status).toBe(PAYMENT_STATUS.SUCCESSFUL);

      // Verify order status set to 'pending' (NOT confirmed)
      const order = mockSupabase._store.orders.find((o) => o.id === orderId);
      expect(order.status).toBe(ORDER_STATUS.PENDING);

      // Verify reservation committed (inventory quantity deducted from 10 to 8, reserved from 2 to 0)
      const inv = mockSupabase._store.inventory.find((i) => i.warehouse_id === warehouseId);
      expect(inv.quantity).toBe(8);
      expect(inv.reserved_quantity).toBe(0);

      const res = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-paystack-1');
      expect(res.status).toBe('committed');

      // Verify order_status_history created
      const history = mockSupabase._store.order_status_history.find((h) => h.order_id === orderId);
      expect(history).toBeDefined();
      expect(history.status).toBe(ORDER_STATUS.PENDING);

      // Verify audit_logs created
      const auditLog = mockSupabase._store.audit_logs.find((a) => a.entity_id === paymentId);
      expect(auditLog).toBeDefined();

      // Verify domain_events created
      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'payment.completed');
      expect(event).toBeDefined();
      expect(event.payload.paymentId).toBe(paymentId);
    });

    it('handles duplicate webhook calls idempotently without duplicate side-effects', async () => {
      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockVerifyFetchSuccess as any });

      // First execution
      await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: rawWebhookBody,
        headers: { 'x-paystack-signature': validSignature },
        paymentProvider: provider,
      });

      const invAfterFirst = { ...mockSupabase._store.inventory.find((i) => i.warehouse_id === warehouseId) };

      // Second execution (duplicate webhook from Paystack)
      const secondResult = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: rawWebhookBody,
        headers: { 'x-paystack-signature': validSignature },
        paymentProvider: provider,
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.alreadyProcessed).toBe(true);

      // Verify inventory was NOT double-deducted
      const invAfterSecond = mockSupabase._store.inventory.find((i) => i.warehouse_id === warehouseId);
      expect(invAfterSecond.quantity).toBe(invAfterFirst.quantity);
      expect(invAfterSecond.reserved_quantity).toBe(invAfterFirst.reserved_quantity);
    });

    it('rejects webhook when verified amount does not match order amount', async () => {
      const mockVerifyAmountMismatch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            id: 998877,
            status: 'success',
            reference: payReference,
            amount: 500000, // 5,000 NGN instead of 15,000 NGN
            currency: 'NGN',
          },
        }),
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockVerifyAmountMismatch as any });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase,
          rawBody: rawWebhookBody,
          headers: { 'x-paystack-signature': validSignature },
          paymentProvider: provider,
        })
      ).rejects.toThrow(/Transaction amount mismatch/);
    });

    it('rejects webhook when currency does not match NGN', async () => {
      const mockVerifyCurrencyMismatch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            id: 998877,
            status: 'success',
            reference: payReference,
            amount: 1500000,
            currency: 'USD',
          },
        }),
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockVerifyCurrencyMismatch as any });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase,
          rawBody: rawWebhookBody,
          headers: { 'x-paystack-signature': validSignature },
          paymentProvider: provider,
        })
      ).rejects.toThrow(/Transaction currency mismatch/);
    });

    it('safely ignores non-charge.success webhook events without failing', async () => {
      const unhandledEventBody = JSON.stringify({
        event: 'transfer.success',
        data: {},
      });
      const unhandledSig = crypto.createHmac('sha512', secretKey).update(unhandledEventBody).digest('hex');

      const provider = new PaystackPaymentProvider({ secretKey });
      const result = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: unhandledEventBody,
        headers: { 'x-paystack-signature': unhandledSig },
        paymentProvider: provider,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ignored');
    });
  });

  describe('5. Payment Failure & Retry Flow', () => {
    it('releases inventory reservations when a payment attempt fails', async () => {
      await releaseOrderReservations(mockSupabase, orderId);

      const reservation = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-paystack-1');
      expect(reservation.status).toBe('released');

      const inv = mockSupabase._store.inventory.find((i) => i.warehouse_id === warehouseId);
      expect(inv.reserved_quantity).toBe(0);
    });

    it('allows payment retry by generating a new traceable Paystack payment attempt', async () => {
      const retryReference = generatePaystackReference('UAD_RETRY');

      const { data: newPayment } = await mockSupabase
        .from('payments')
        .insert({
          order_id: orderId,
          provider: 'paystack',
          provider_reference: retryReference,
          amount: totalAmount,
          currency: CURRENCY.NGN,
          status: PAYMENT_STATUS.PENDING,
          metadata: { order_id: orderId, attempt: 2 },
        })
        .select('*')
        .single();

      expect(newPayment).toBeDefined();
      expect(newPayment!.provider_reference).toBe(retryReference);

      // Verify all payment attempts remain in the database
      const orderPayments = mockSupabase._store.payments.filter((p) => p.order_id === orderId);
      expect(orderPayments.length).toBe(2);
    });
  });
});
