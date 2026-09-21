import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { processPaymentWebhook } from '@/services/webhook.service';
import { revalidatePayment } from '@/services/payment-revalidation.service';
import { fulfillSuccessfulPayment } from '@/services/payment-fulfillment.service';
import {
  PaystackPaymentProvider,
  FlutterwavePaymentProvider,
  getPaymentProvider,
  transitionPaymentStatus,
  validatePaymentTransition,
  InvalidPaymentTransitionError,
} from '@/services/payment';
import {
  PAYMENT_STATUS,
  ORDER_STATUS,
  DOMAIN_EVENT_TYPES,
  DEFAULT_ORGANIZATION_ID,
} from '@/lib/constants';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';

const TEST_PAYSTACK_SECRET = 'sk_test_paystack_secret_hardened_123456';
const TEST_FLUTTERWAVE_SECRET = 'flw_secret_key_hardened_123456';
const TEST_FLUTTERWAVE_HASH = 'flw_webhook_secret_hash_hardened_123456';

describe('Payment Webhook Hardening, Idempotency & State Transitions (Step 6)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let paystackProvider: PaystackPaymentProvider;
  let flutterwaveProvider: FlutterwavePaymentProvider;

  const orgId = DEFAULT_ORGANIZATION_ID;
  const orderId1 = 'ord-harden-1';
  const paymentId1 = 'pay-harden-1';
  const pstkRef1 = 'PSTK_REF_HARDEN_001';

  const orderId2 = 'ord-harden-2';
  const paymentId2 = 'pay-harden-2';
  const flwRef2 = 'FLW_REF_HARDEN_002';

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.PAYSTACK_SECRET_KEY = TEST_PAYSTACK_SECRET;
    process.env.FLUTTERWAVE_SECRET_KEY = TEST_FLUTTERWAVE_SECRET;
    process.env.FLUTTERWAVE_SECRET_HASH = TEST_FLUTTERWAVE_HASH;

    paystackProvider = new PaystackPaymentProvider({ secretKey: TEST_PAYSTACK_SECRET });
    flutterwaveProvider = new FlutterwavePaymentProvider({
      secretKey: TEST_FLUTTERWAVE_SECRET,
      secretHash: TEST_FLUTTERWAVE_HASH,
    });

    mockSupabase = createMockSupabaseClient({
      orders: [
        {
          id: orderId1,
          order_number: 'UD-9001',
          organization_id: orgId,
          customer_id: 'cust-1',
          total: 25000,
          status: ORDER_STATUS.CREATED,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: orderId2,
          order_number: 'UD-9002',
          organization_id: orgId,
          customer_id: 'cust-2',
          total: 18500,
          status: ORDER_STATUS.CREATED,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      payments: [
        {
          id: paymentId1,
          order_id: orderId1,
          provider: 'paystack',
          provider_reference: pstkRef1,
          amount: 25000,
          currency: 'NGN',
          status: PAYMENT_STATUS.PENDING,
          created_at: new Date().toISOString(),
          metadata: {},
        },
        {
          id: paymentId2,
          order_id: orderId2,
          provider: 'flutterwave',
          provider_reference: flwRef2,
          amount: 18500,
          currency: 'NGN',
          status: PAYMENT_STATUS.PENDING,
          created_at: new Date().toISOString(),
          metadata: {},
        },
      ],
      inventory_reservations: [
        {
          id: 'res-harden-1',
          order_id: orderId1,
          inventory_id: 'inv-1',
          quantity: 2,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
        {
          id: 'res-harden-2',
          order_id: orderId2,
          inventory_id: 'inv-2',
          quantity: 1,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      ],
      inventory: [
        {
          id: 'inv-1',
          product_id: 'prod-1',
          warehouse_id: 'wh-1',
          quantity: 10,
          reserved_quantity: 2,
        },
        {
          id: 'inv-2',
          product_id: 'prod-2',
          warehouse_id: 'wh-1',
          quantity: 5,
          reserved_quantity: 1,
        },
      ],
      payment_events: [],
      order_status_history: [],
      audit_logs: [],
      domain_events: [],
    });
  });

  // 1. Webhook Signature Verification
  describe('1. Webhook Signature Verification', () => {
    it('accepts valid Paystack HMAC SHA-512 signature', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          id: 991234,
          reference: pstkRef1,
          amount: 2500000, // kobo
          currency: 'NGN',
          status: 'success',
          paid_at: new Date().toISOString(),
        },
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha512', TEST_PAYSTACK_SECRET)
        .update(rawBody)
        .digest('hex');

      vi.spyOn(paystackProvider, 'verifyTransaction').mockResolvedValueOnce({
        status: 'successful',
        reference: pstkRef1,
        providerReference: '991234',
        amount: 25000,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        channel: 'card',
        rawResponse: {},
      });

      const result = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody,
        headers: { 'x-paystack-signature': signature },
        paymentProvider: paystackProvider,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId1);
      expect(result.paymentId).toBe(paymentId1);
      expect(result.alreadyProcessed).toBe(false);
    });

    it('rejects Paystack webhook with invalid signature before any database mutation', async () => {
      const rawBody = JSON.stringify({
        event: 'charge.success',
        data: { reference: pstkRef1 },
      });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase as any,
          rawBody,
          headers: { 'x-paystack-signature': 'invalid_signature_hex_1234' },
          paymentProvider: paystackProvider,
        })
      ).rejects.toThrow(/Invalid paystack webhook signature/);

      // Verify payment was NOT modified
      const { data: pay } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('id', paymentId1)
        .single();
      expect(pay?.status).toBe(PAYMENT_STATUS.PENDING);
    });

    it('rejects Paystack webhook with missing signature header', async () => {
      const rawBody = JSON.stringify({
        event: 'charge.success',
        data: { reference: pstkRef1 },
      });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase as any,
          rawBody,
          headers: {},
          paymentProvider: paystackProvider,
        })
      ).rejects.toThrow(/Invalid paystack webhook signature/);
    });

    it('accepts valid Flutterwave secret hash header', async () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 554321,
          tx_ref: flwRef2,
          flw_ref: 'FLW_INT_554',
          amount: 18500,
          currency: 'NGN',
          status: 'successful',
          created_at: new Date().toISOString(),
        },
      };
      const rawBody = JSON.stringify(payload);

      vi.spyOn(flutterwaveProvider, 'verifyTransaction').mockResolvedValueOnce({
        status: 'successful',
        reference: flwRef2,
        providerReference: '554321',
        amount: 18500,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        channel: 'card',
        rawResponse: {},
      });

      const result = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody,
        headers: { 'verif-hash': TEST_FLUTTERWAVE_HASH },
        paymentProvider: flutterwaveProvider,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId2);
      expect(result.paymentId).toBe(paymentId2);
    });

    it('rejects Flutterwave webhook with invalid secret hash', async () => {
      const rawBody = JSON.stringify({
        event: 'charge.completed',
        data: { tx_ref: flwRef2 },
      });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase as any,
          rawBody,
          headers: { 'verif-hash': 'wrong_secret_hash' },
          paymentProvider: flutterwaveProvider,
        })
      ).rejects.toThrow(/Invalid flutterwave webhook signature\/hash/);
    });
  });

  // 2. Webhook Idempotency & Deduplication
  describe('2. Webhook Idempotency & Deduplication', () => {
    it('handles duplicate webhook delivery idempotently without duplicate side-effects', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          id: 991234,
          reference: pstkRef1,
          amount: 2500000,
          currency: 'NGN',
        },
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha512', TEST_PAYSTACK_SECRET)
        .update(rawBody)
        .digest('hex');

      vi.spyOn(paystackProvider, 'verifyTransaction').mockResolvedValue({
        status: 'successful',
        reference: pstkRef1,
        providerReference: '991234',
        amount: 25000,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        rawResponse: {},
      });

      // First webhook delivery
      const firstRes = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody,
        headers: { 'x-paystack-signature': signature },
        paymentProvider: paystackProvider,
      });
      expect(firstRes.success).toBe(true);
      expect(firstRes.alreadyProcessed).toBe(false);

      // Verify payment was marked successful
      const { data: pay } = await mockSupabase.from('payments').select('*').eq('id', paymentId1).single();
      expect(pay?.status).toBe(PAYMENT_STATUS.SUCCESSFUL);

      // Verify domain events count = 1
      const { data: events1 } = await mockSupabase
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', paymentId1);
      expect(events1).toHaveLength(1);

      // Second identical webhook delivery
      const secondRes = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody,
        headers: { 'x-paystack-signature': signature },
        paymentProvider: paystackProvider,
      });
      expect(secondRes.success).toBe(true);
      expect(secondRes.alreadyProcessed).toBe(true);

      // Verify domain events count remains exactly 1 (no duplicate emission)
      const { data: events2 } = await mockSupabase
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', paymentId1);
      expect(events2).toHaveLength(1);
    });
  });

  // 3. Webhook vs Return Callback Concurrency Race
  describe('3. Webhook vs Return Callback Concurrency', () => {
    it('executes fulfillment exactly once when return callback arrives before webhook', async () => {
      // 1. Customer return callback arrives first and fulfills payment
      const fulfillRes = await fulfillSuccessfulPayment({
        supabase: mockSupabase as any,
        orderId: orderId1,
        paymentId: paymentId1,
        provider: 'paystack',
        reference: pstkRef1,
        verifiedDetails: {
          amount: 25000,
          currency: 'NGN',
          paidAt: new Date().toISOString(),
          providerReference: 'pstk_tx_call_1',
        },
        source: 'return_callback',
      });
      expect(fulfillRes.alreadyProcessed).toBe(false);

      // 2. Gateway webhook arrives second
      const payload = {
        event: 'charge.success',
        data: {
          id: 991234,
          reference: pstkRef1,
        },
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha512', TEST_PAYSTACK_SECRET)
        .update(rawBody)
        .digest('hex');

      const webhookRes = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody,
        headers: { 'x-paystack-signature': signature },
        paymentProvider: paystackProvider,
      });

      expect(webhookRes.success).toBe(true);
      expect(webhookRes.alreadyProcessed).toBe(true);

      // Verify domain event emitted only once
      const { data: events } = await mockSupabase
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', paymentId1);
      expect(events).toHaveLength(1);
    });

    it('executes fulfillment exactly once when webhook arrives before return callback', async () => {
      // 1. Webhook arrives first and fulfills payment
      vi.spyOn(paystackProvider, 'verifyTransaction').mockResolvedValueOnce({
        status: 'successful',
        reference: pstkRef1,
        providerReference: 'pstk_tx_wb_1',
        amount: 25000,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        rawResponse: {},
      });

      const payload = {
        event: 'charge.success',
        data: {
          id: 991234,
          reference: pstkRef1,
        },
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha512', TEST_PAYSTACK_SECRET)
        .update(rawBody)
        .digest('hex');

      const webhookRes = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody,
        headers: { 'x-paystack-signature': signature },
        paymentProvider: paystackProvider,
      });
      expect(webhookRes.alreadyProcessed).toBe(false);

      // 2. Return callback arrives second
      const callbackRes = await fulfillSuccessfulPayment({
        supabase: mockSupabase as any,
        orderId: orderId1,
        paymentId: paymentId1,
        provider: 'paystack',
        reference: pstkRef1,
        verifiedDetails: {
          amount: 25000,
          currency: 'NGN',
          paidAt: new Date().toISOString(),
        },
        source: 'return_callback',
      });
      expect(callbackRes.alreadyProcessed).toBe(true);
    });
  });

  // 4. Payment State Machine & State Transitions
  describe('4. Payment State Machine & Controlled Transitions', () => {
    it('allows legal state transitions (pending -> successful -> refunded)', () => {
      expect(validatePaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESSFUL)).toBe(true);
      expect(validatePaymentTransition(PAYMENT_STATUS.SUCCESSFUL, PAYMENT_STATUS.REFUNDED)).toBe(true);
      expect(validatePaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED)).toBe(true);
      expect(validatePaymentTransition(PAYMENT_STATUS.FAILED, PAYMENT_STATUS.PENDING)).toBe(true);
    });

    it('rejects illegal state transition (successful -> failed)', () => {
      expect(() =>
        validatePaymentTransition(PAYMENT_STATUS.SUCCESSFUL, PAYMENT_STATUS.FAILED, paymentId1)
      ).toThrow(InvalidPaymentTransitionError);
    });

    it('rejects illegal state transition (successful -> pending)', () => {
      expect(() =>
        validatePaymentTransition(PAYMENT_STATUS.SUCCESSFUL, PAYMENT_STATUS.PENDING, paymentId1)
      ).toThrow(InvalidPaymentTransitionError);
    });

    it('rejects illegal state transition (refunded -> successful)', () => {
      expect(() =>
        validatePaymentTransition(PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.SUCCESSFUL, paymentId1)
      ).toThrow(InvalidPaymentTransitionError);
    });

    it('executes atomic transitionPaymentStatus compare-and-swap', async () => {
      const result = await transitionPaymentStatus({
        supabase: mockSupabase as any,
        paymentId: paymentId1,
        toStatus: PAYMENT_STATUS.SUCCESSFUL,
        expectedCurrentStatus: PAYMENT_STATUS.PENDING,
        paidAt: new Date().toISOString(),
      });

      expect(result.success).toBe(true);
      expect(result.fromStatus).toBe(PAYMENT_STATUS.PENDING);
      expect(result.toStatus).toBe(PAYMENT_STATUS.SUCCESSFUL);
      expect(result.alreadyInTargetStatus).toBe(false);

      // Calling again with the same status is an idempotent no-op
      const secondCall = await transitionPaymentStatus({
        supabase: mockSupabase as any,
        paymentId: paymentId1,
        toStatus: PAYMENT_STATUS.SUCCESSFUL,
      });
      expect(secondCall.alreadyInTargetStatus).toBe(true);
    });
  });

  // 5. Revalidation Hardening & Failure Recovery
  describe('5. Revalidation Hardening & Failure Recovery', () => {
    it('revalidates Paystack pending payment successfully', async () => {
      vi.spyOn(PaystackPaymentProvider.prototype, 'verifyTransaction').mockResolvedValueOnce({
        status: 'successful',
        reference: pstkRef1,
        providerReference: 'reval_pstk_123',
        amount: 25000,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        rawResponse: {},
      });

      const res = await revalidatePayment(mockSupabase as any, {
        paymentId: paymentId1,
        triggeredBy: 'admin',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('successful');
      expect(res.amount).toBe(25000);

      const { data: pay } = await mockSupabase.from('payments').select('*').eq('id', paymentId1).single();
      expect(pay?.status).toBe(PAYMENT_STATUS.SUCCESSFUL);
    });

    it('revalidates Flutterwave pending payment successfully', async () => {
      vi.spyOn(FlutterwavePaymentProvider.prototype, 'verifyTransaction').mockResolvedValueOnce({
        status: 'successful',
        reference: flwRef2,
        providerReference: 'reval_flw_456',
        amount: 18500,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        rawResponse: {},
      });

      const res = await revalidatePayment(mockSupabase as any, {
        paymentId: paymentId2,
        triggeredBy: 'cron',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('successful');
      expect(res.amount).toBe(18500);

      const { data: pay } = await mockSupabase.from('payments').select('*').eq('id', paymentId2).single();
      expect(pay?.status).toBe(PAYMENT_STATUS.SUCCESSFUL);
    });

    it('leaves payment pending when gateway experiences temporary network/timeout error', async () => {
      vi.spyOn(PaystackPaymentProvider.prototype, 'verifyTransaction').mockRejectedValueOnce(
        new Error('ETIMEDOUT: Connection timed out connecting to Paystack API')
      );

      const res = await revalidatePayment(mockSupabase as any, {
        paymentId: paymentId1,
        triggeredBy: 'cron',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('error');
      expect(res.message).toContain('ETIMEDOUT');

      // Crucial: Payment remains in PENDING status for future retry, not falsely marked failed!
      const { data: pay } = await mockSupabase.from('payments').select('*').eq('id', paymentId1).single();
      expect(pay?.status).toBe(PAYMENT_STATUS.PENDING);
    });

    it('marks payment failed and releases reservation when gateway explicitly reports failure', async () => {
      vi.spyOn(PaystackPaymentProvider.prototype, 'verifyTransaction').mockResolvedValueOnce({
        status: 'failed',
        reference: pstkRef1,
        providerReference: 'pstk_fail_999',
        amount: 25000,
        currency: 'NGN',
        rawResponse: { gateway_response: 'Insufficient funds' },
      });

      const res = await revalidatePayment(mockSupabase as any, {
        paymentId: paymentId1,
        triggeredBy: 'cron',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('failed');

      // Verify payment was transitioned to failed
      const { data: pay } = await mockSupabase.from('payments').select('*').eq('id', paymentId1).single();
      expect(pay?.status).toBe(PAYMENT_STATUS.FAILED);
      expect((pay?.metadata as any).gateway_failure_reason).toBe('Insufficient funds');

      // Verify inventory reservation was released
      const { data: resv } = await mockSupabase
        .from('inventory_reservations')
        .select('*')
        .eq('id', 'res-harden-1')
        .single();
      expect(resv?.status).toBe('released');
    });
  });
});
