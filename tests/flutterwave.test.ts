import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import { FlutterwavePaymentProvider } from '@/services/payment/flutterwave.provider';
import { processPaymentWebhook } from '@/services/webhook.service';
import { ORDER_STATUS, PAYMENT_STATUS, CURRENCY } from '@/lib/constants';

describe('Flutterwave Payment Integration & Webhook Handling', () => {
  const secretKey = 'FLWSECK_TEST-mock-secret-key';
  const secretHash = 'FLW_MOCK_SECRET_HASH_123';
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orderId = 'ord-flw-test-101';
  const paymentId = 'pay-flw-test-101';
  const payReference = 'UAD_FLW_TEST_REF_888';
  const totalAmount = 15000; // 15,000 NGN

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      orders: [
        {
          id: orderId,
          order_number: 'ORD-FLW-888',
          customer_id: 'cust-1',
          warehouse_id: 'wh-1',
          location_id: 'loc-1',
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
          provider: 'flutterwave',
          provider_reference: payReference,
          amount: totalAmount,
          currency: CURRENCY.NGN,
          status: PAYMENT_STATUS.PENDING,
          metadata: { order_id: orderId },
        },
      ],
      inventory: [
        {
          warehouse_id: 'wh-1',
          product_id: 'prod-1',
          quantity: 10,
          reserved_quantity: 2,
        },
      ],
      inventory_reservations: [
        {
          id: 'res-flw-1',
          warehouse_id: 'wh-1',
          product_id: 'prod-1',
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

  describe('Flutterwave Reference & Secret Hash Verification', () => {
    it('generates unique Flutterwave reference starting with prefix', () => {
      const provider = new FlutterwavePaymentProvider({ secretKey, secretHash });
      const ref1 = provider.generateReference();
      const ref2 = provider.generateReference();

      expect(ref1).toMatch(/^UAD_FLW_/);
      expect(ref2).toMatch(/^UAD_FLW_/);
      expect(ref1).not.toBe(ref2);
    });

    it('verifies valid verif-hash webhook header', async () => {
      const provider = new FlutterwavePaymentProvider({ secretKey, secretHash });
      const payload = JSON.stringify({
        event: 'charge.completed',
        data: { id: 12345, tx_ref: payReference, status: 'successful' },
      });

      const verification = await provider.verifyWebhook(payload, {
        'verif-hash': secretHash,
      });

      expect(verification.isValid).toBe(true);
      expect(verification.reference).toBe(payReference);
      expect(verification.transactionId).toBe(12345);
    });

    it('rejects invalid or missing verif-hash webhook header', async () => {
      const provider = new FlutterwavePaymentProvider({ secretKey, secretHash });
      const payload = JSON.stringify({
        event: 'charge.completed',
        data: { id: 12345, tx_ref: payReference },
      });

      const badHashVerification = await provider.verifyWebhook(payload, {
        'verif-hash': 'wrong-tampered-hash',
      });
      expect(badHashVerification.isValid).toBe(false);

      const missingHashVerification = await provider.verifyWebhook(payload, {});
      expect(missingHashVerification.isValid).toBe(false);
    });
  });

  describe('Flutterwave API Client Operations', () => {
    it('initializes hosted payment link via Flutterwave API successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          message: 'Hosted Link',
          data: {
            link: 'https://checkout-v3-ui-prod.f4b-flutterwave.com/hosted/pay/link_123',
          },
        }),
      });

      const provider = new FlutterwavePaymentProvider({
        secretKey,
        secretHash,
        fetchFn: mockFetch as any,
      });

      const result = await provider.initializeTransaction({
        reference: payReference,
        amount: 15000,
        currency: 'NGN',
        customer: {
          email: 'test@example.com',
          name: 'Jane Doe',
          phone: '08012345678',
        },
      });

      expect(result.authorizationUrl).toBe(
        'https://checkout-v3-ui-prod.f4b-flutterwave.com/hosted/pay/link_123'
      );
      expect(result.reference).toBe(payReference);
      expect(result.provider).toBe('flutterwave');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/payments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${secretKey}`,
          }),
        })
      );
    });

    it('throws when Flutterwave initialization returns failure response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          status: 'error',
          message: 'Invalid customer email',
        }),
      });

      const provider = new FlutterwavePaymentProvider({
        secretKey,
        secretHash,
        fetchFn: mockFetch as any,
      });

      await expect(
        provider.initializeTransaction({
          reference: payReference,
          amount: 15000,
          currency: 'NGN',
          customer: { email: 'bad-email' },
        })
      ).rejects.toThrow(/Flutterwave initialization failed: Invalid customer email/);
    });
  });

  describe('Webhook Processing, State Transitions & Idempotency', () => {
    const rawWebhookBody = JSON.stringify({
      event: 'charge.completed',
      data: {
        id: 998877,
        tx_ref: payReference,
        flw_ref: 'FLW_MOCK_REF_001',
        amount: 15000,
        currency: 'NGN',
        status: 'successful',
        payment_type: 'card',
        created_at: '2026-08-30T01:00:00.000Z',
        customer: {
          email: 'test@example.com',
          name: 'Jane Doe',
        },
      },
    });

    const mockVerifyFetchSuccess = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        message: 'Transaction fetched successfully',
        data: {
          id: 998877,
          tx_ref: payReference,
          flw_ref: 'FLW_MOCK_REF_001',
          amount: 15000,
          currency: 'NGN',
          status: 'successful',
          payment_type: 'card',
          created_at: '2026-08-30T01:00:00.000Z',
          customer: { id: 1, email: 'test@example.com', name: 'Jane Doe' },
        },
      }),
    });

    it('processes webhook successfully, transitions order to pending, commits reservation, and logs audit', async () => {
      const provider = new FlutterwavePaymentProvider({
        secretKey,
        secretHash,
        fetchFn: mockVerifyFetchSuccess as any,
      });

      const result = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: rawWebhookBody,
        headers: { 'verif-hash': secretHash },
        paymentProvider: provider,
      });

      expect(result.success).toBe(true);
      expect(result.alreadyProcessed).toBe(false);

      // Verify payment status set to successful
      const payment = mockSupabase._store.payments.find((p) => p.id === paymentId);
      expect(payment.status).toBe(PAYMENT_STATUS.SUCCESSFUL);
      expect(payment.provider).toBe('flutterwave');

      // Verify order status updated to 'pending' (not confirmed)
      const order = mockSupabase._store.orders.find((o) => o.id === orderId);
      expect(order.status).toBe(ORDER_STATUS.PENDING);

      // Verify reservation committed
      const inv = mockSupabase._store.inventory.find((i) => i.warehouse_id === 'wh-1');
      expect(inv.quantity).toBe(8); // 10 - 2
      expect(inv.reserved_quantity).toBe(0);

      const res = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-flw-1');
      expect(res.status).toBe('committed');

      // Verify order_status_history entry
      const history = mockSupabase._store.order_status_history.find((h) => h.order_id === orderId);
      expect(history).toBeDefined();
      expect(history.status).toBe(ORDER_STATUS.PENDING);

      // Verify audit_logs entry
      const auditLog = mockSupabase._store.audit_logs.find(
        (a) => a.entity_id === paymentId && a.action === 'payment.verified'
      );
      expect(auditLog).toBeDefined();
      expect(auditLog.new_values.provider).toBe('flutterwave');

      // Verify domain_events entry
      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'payment.completed');
      expect(event).toBeDefined();
      expect(event.payload.paymentId).toBe(paymentId);
    });

    it('handles duplicate webhook calls idempotently without committing inventory twice', async () => {
      const provider = new FlutterwavePaymentProvider({
        secretKey,
        secretHash,
        fetchFn: mockVerifyFetchSuccess as any,
      });

      // First webhook execution
      await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: rawWebhookBody,
        headers: { 'verif-hash': secretHash },
        paymentProvider: provider,
      });

      const invAfterFirst = { ...mockSupabase._store.inventory.find((i) => i.warehouse_id === 'wh-1') };

      // Second webhook execution (duplicate delivery from Flutterwave)
      const secondResult = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: rawWebhookBody,
        headers: { 'verif-hash': secretHash },
        paymentProvider: provider,
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.alreadyProcessed).toBe(true);

      // Verify inventory was NOT deducted again
      const invAfterSecond = mockSupabase._store.inventory.find((i) => i.warehouse_id === 'wh-1');
      expect(invAfterSecond.quantity).toBe(invAfterFirst.quantity);
      expect(invAfterSecond.reserved_quantity).toBe(invAfterFirst.reserved_quantity);
    });

    it('rejects webhook when Flutterwave API verification indicates amount mismatch', async () => {
      const mockVerifyMismatch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          message: 'Transaction fetched successfully',
          data: {
            id: 998877,
            tx_ref: payReference,
            amount: 5000, // Mismatch! Expected 15000
            currency: 'NGN',
            status: 'successful',
          },
        }),
      });

      const provider = new FlutterwavePaymentProvider({
        secretKey,
        secretHash,
        fetchFn: mockVerifyMismatch as any,
      });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase,
          rawBody: rawWebhookBody,
          headers: { 'verif-hash': secretHash },
          paymentProvider: provider,
        })
      ).rejects.toThrow(/Transaction amount mismatch/);
    });

    it('rejects webhook when verified currency is not NGN', async () => {
      const mockVerifyCurrencyMismatch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          message: 'Transaction fetched successfully',
          data: {
            id: 998877,
            tx_ref: payReference,
            amount: 15000,
            currency: 'USD', // Mismatch! Expected NGN
            status: 'successful',
          },
        }),
      });

      const provider = new FlutterwavePaymentProvider({
        secretKey,
        secretHash,
        fetchFn: mockVerifyCurrencyMismatch as any,
      });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase,
          rawBody: rawWebhookBody,
          headers: { 'verif-hash': secretHash },
          paymentProvider: provider,
        })
      ).rejects.toThrow(/Transaction currency mismatch/);
    });

    it('rejects webhook when Flutterwave transaction status is not successful', async () => {
      const mockVerifyFailedStatus = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          message: 'Transaction fetched successfully',
          data: {
            id: 998877,
            tx_ref: payReference,
            amount: 15000,
            currency: 'NGN',
            status: 'failed',
          },
        }),
      });

      const provider = new FlutterwavePaymentProvider({
        secretKey,
        secretHash,
        fetchFn: mockVerifyFailedStatus as any,
      });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase,
          rawBody: rawWebhookBody,
          headers: { 'verif-hash': secretHash },
          paymentProvider: provider,
        })
      ).rejects.toThrow(/Provider reported non-successful transaction status: failed/);
    });
  });
});
