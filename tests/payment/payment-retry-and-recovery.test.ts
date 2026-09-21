import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPaymentRetryEligibility,
  retryPayment,
  PaystackPaymentProvider,
  FlutterwavePaymentProvider,
  ManualPaymentProvider,
} from '@/services/payment';
import { updatePaymentMethod } from '@/services/payment-settings.service';
import {
  PAYMENT_STATUS,
  ORDER_STATUS,
  CURRENCY,
  DEFAULT_ORGANIZATION_ID,
} from '@/lib/constants';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';

describe('Payment Retry, Recovery & Multi-Attempt Lifecycle (Step 7)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgId = DEFAULT_ORGANIZATION_ID;
  const customerId = 'cust-retry-123';
  const orderId = 'ord-retry-001';
  const orderNumber = 'UD-RETRY-001';
  const failedPaymentId = 'pay-failed-001';
  const warehouseId = 'wh-retry-1';

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle' }],
      organization_payment_methods: [
        {
          id: 'pm-1',
          organization_id: orgId,
          provider: 'paystack',
          enabled: true,
          display_order: 1,
        },
        {
          id: 'pm-2',
          organization_id: orgId,
          provider: 'flutterwave',
          enabled: true,
          display_order: 2,
        },
        {
          id: 'pm-3',
          organization_id: orgId,
          provider: 'manual',
          enabled: true,
          display_order: 3,
          bank_name: 'Guaranty Trust Bank',
          account_name: 'Unwind & Doodle Ltd',
          account_number: '0123456789',
        },
      ],
      orders: [
        {
          id: orderId,
          order_number: orderNumber,
          organization_id: orgId,
          customer_id: customerId,
          warehouse_id: warehouseId,
          total: 25000,
          status: ORDER_STATUS.CREATED,
          email: 'customer@example.com',
          first_name: 'Amina',
          last_name: 'Bello',
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      order_items: [
        {
          id: 'oi-1',
          order_id: orderId,
          product_id: 'prod-color-book',
          quantity: 2,
          unit_price: 12500,
          total: 25000,
        },
      ],
      products: [
        {
          id: 'prod-color-book',
          name: 'Coloring Book Deluxe',
          product_type: 'physical',
          selling_price: 12500,
          status: 'active',
        },
      ],
      inventory: [
        {
          id: 'inv-color-book',
          product_id: 'prod-color-book',
          warehouse_id: warehouseId,
          quantity: 20,
          reserved_quantity: 2,
        },
      ],
      inventory_reservations: [
        {
          id: 'res-retry-active',
          order_id: orderId,
          inventory_id: 'inv-color-book',
          quantity: 2,
          status: 'active',
          expires_at: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
        },
      ],
      payments: [
        {
          id: failedPaymentId,
          order_id: orderId,
          provider: 'paystack',
          provider_reference: 'PSTK_FAILED_001',
          amount: 25000,
          currency: 'NGN',
          status: PAYMENT_STATUS.FAILED,
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          metadata: {
            gateway_failure_reason: 'Card declined by issuing bank',
          },
        },
      ],
      audit_logs: [],
    });
  });

  // 1. Retry Eligibility & Status Validation
  describe('1. Retry Eligibility & Status Checks', () => {
    it('reports order as eligible for retry when previous payment failed', async () => {
      const eligibility = await getPaymentRetryEligibility(mockSupabase as any, orderNumber, {
        customerId,
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.orderNumber).toBe(orderNumber);
      expect(eligibility.totalAmount).toBe(25000);
      expect(eligibility.hasActiveReservation).toBe(true);
      expect(eligibility.latestAttempt?.status).toBe(PAYMENT_STATUS.FAILED);
      expect(eligibility.enabledPaymentMethods).toEqual(['paystack', 'flutterwave', 'manual']);
      expect(eligibility.paymentAttempts).toHaveLength(1);
    });

    it('rejects retry when order has already been successfully paid', async () => {
      // Transition order and payment to successful
      await mockSupabase
        .from('payments')
        .insert({
          id: 'pay-success-002',
          order_id: orderId,
          provider: 'paystack',
          provider_reference: 'PSTK_SUCCESS_002',
          amount: 25000,
          currency: 'NGN',
          status: PAYMENT_STATUS.SUCCESSFUL,
        });

      await mockSupabase
        .from('orders')
        .update({ status: ORDER_STATUS.PENDING })
        .eq('id', orderId);

      const eligibility = await getPaymentRetryEligibility(mockSupabase as any, orderNumber, {
        customerId,
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.errorCode).toBe('ORDER_ALREADY_PAID');

      await expect(
        retryPayment({
          supabase: mockSupabase as any,
          orderIdentifier: orderNumber,
          paymentMethod: 'paystack',
          customerContext: { customerId },
        })
      ).rejects.toThrow(/already been successfully paid/);
    });

    it('rejects retry for a cancelled order', async () => {
      await mockSupabase
        .from('orders')
        .update({ status: ORDER_STATUS.CANCELLED })
        .eq('id', orderId);

      const eligibility = await getPaymentRetryEligibility(mockSupabase as any, orderNumber, {
        customerId,
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.errorCode).toBe('ORDER_CANCELLED');

      await expect(
        retryPayment({
          supabase: mockSupabase as any,
          orderIdentifier: orderNumber,
          paymentMethod: 'paystack',
          customerContext: { customerId },
        })
      ).rejects.toThrow(/cancelled and cannot be paid/);
    });

    it('rejects retry from unauthorized customer context', async () => {
      const eligibility = await getPaymentRetryEligibility(mockSupabase as any, orderNumber, {
        customerId: 'different-customer-id',
        customerEmail: 'attacker@example.com',
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.errorCode).toBe('UNAUTHORIZED');

      await expect(
        retryPayment({
          supabase: mockSupabase as any,
          orderIdentifier: orderNumber,
          paymentMethod: 'paystack',
          customerContext: { customerId: 'different-customer-id' },
        })
      ).rejects.toThrow(/permission to retry payment/);
    });
  });

  // 2. Retry with Same Provider & Multi-Attempt Immutability
  describe('2. Retry with Same Provider', () => {
    it('creates a new payment attempt while preserving failed payment record', async () => {
      const pstkInitSpy = vi
        .spyOn(PaystackPaymentProvider.prototype, 'initializeTransaction')
        .mockResolvedValueOnce({
          authorizationUrl: 'https://checkout.paystack.com/retry-auth-url-123',
          reference: 'PSTK_RETRY_002',
          provider: 'paystack',
        });

      const result = await retryPayment({
        supabase: mockSupabase as any,
        orderIdentifier: orderNumber,
        paymentMethod: 'paystack',
        customerContext: { customerId },
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('paystack');
      expect(result.providerLabel).toBe('Paystack');
      expect(result.authorizationUrl).toBe('https://checkout.paystack.com/retry-auth-url-123');
      expect(result.paymentId).not.toBe(failedPaymentId);

      // Verify all payment records in database
      const { data: allPayments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      expect(allPayments).toHaveLength(2);

      // Historical failed payment attempt #1 is intact
      expect(allPayments![0].id).toBe(failedPaymentId);
      expect(allPayments![0].status).toBe(PAYMENT_STATUS.FAILED);
      expect(allPayments![0].provider_reference).toBe('PSTK_FAILED_001');

      // New payment attempt #2 is created
      expect(allPayments![1].id).toBe(result.paymentId);
      expect(allPayments![1].status).toBe(PAYMENT_STATUS.PENDING);
      expect(allPayments![1].amount).toBe(25000);

      // Verify inventory reservation was NOT duplicated
      const { data: reservations } = await mockSupabase
        .from('inventory_reservations')
        .select('*')
        .eq('order_id', orderId);
      expect(reservations).toHaveLength(1);
    });
  });

  // 3. Provider Switching (Paystack -> Flutterwave -> Manual)
  describe('3. Provider Switching Recovery', () => {
    it('switches from failed Paystack payment to Flutterwave retry', async () => {
      const flwInitSpy = vi
        .spyOn(FlutterwavePaymentProvider.prototype, 'initializeTransaction')
        .mockResolvedValueOnce({
          authorizationUrl: 'https://checkout.flutterwave.com/flw-retry-url-789',
          reference: 'FLW_RETRY_003',
          provider: 'flutterwave',
        });

      const result = await retryPayment({
        supabase: mockSupabase as any,
        orderIdentifier: orderNumber,
        paymentMethod: 'flutterwave',
        customerContext: { customerId },
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('flutterwave');
      expect(result.providerLabel).toBe('Flutterwave');
      expect(result.authorizationUrl).toBe('https://checkout.flutterwave.com/flw-retry-url-789');

      // Verify database contains attempt 1 (Paystack: failed) and attempt 2 (Flutterwave: pending)
      const { data: allPayments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      expect(allPayments).toHaveLength(2);
      expect(allPayments![0].provider).toBe('paystack');
      expect(allPayments![0].status).toBe(PAYMENT_STATUS.FAILED);
      expect(allPayments![1].provider).toBe('flutterwave');
      expect(allPayments![1].status).toBe(PAYMENT_STATUS.PENDING);
    });

    it('switches from failed gateway payment to Direct Bank Transfer (manual)', async () => {
      const result = await retryPayment({
        supabase: mockSupabase as any,
        orderIdentifier: orderNumber,
        paymentMethod: 'manual',
        customerContext: { customerId },
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('manual');
      expect(result.providerLabel).toBe('Bank Transfer');
      expect(result.paymentType).toBe('manual');
      expect(result.bankDetails?.bankName).toBe('Guaranty Trust Bank');
      expect(result.bankDetails?.accountNumber).toBe('0123456789');

      // Resuming manual retry again returns the same pending manual attempt without duplicating
      const resumeResult = await retryPayment({
        supabase: mockSupabase as any,
        orderIdentifier: orderNumber,
        paymentMethod: 'manual',
        customerContext: { customerId },
      });

      expect(resumeResult.isResumedPendingAttempt).toBe(true);
      expect(resumeResult.paymentId).toBe(result.paymentId);

      // Confirm only 2 total payment records exist in DB
      const { data: allPayments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId);
      expect(allPayments).toHaveLength(2);
    });

    it('rejects switching to a payment provider currently disabled by the merchant', async () => {
      // Merchant disables Flutterwave
      await updatePaymentMethod(mockSupabase as any, orgId, {
        provider: 'flutterwave',
        enabled: false,
      });

      await expect(
        retryPayment({
          supabase: mockSupabase as any,
          orderIdentifier: orderNumber,
          paymentMethod: 'flutterwave',
          customerContext: { customerId },
        })
      ).rejects.toThrow(/not currently available/);
    });
  });

  // 4. Gateway Initialization Failures
  describe('4. Gateway Initialization Failure Handling', () => {
    it('marks new payment attempt as failed if gateway initialization throws', async () => {
      vi.spyOn(PaystackPaymentProvider.prototype, 'initializeTransaction').mockRejectedValueOnce(
        new Error('Paystack API 503 Service Unavailable')
      );

      await expect(
        retryPayment({
          supabase: mockSupabase as any,
          orderIdentifier: orderNumber,
          paymentMethod: 'paystack',
          customerContext: { customerId },
        })
      ).rejects.toThrow(/Unable to initialize payment with Paystack/);

      // Verify the new attempt was marked failed
      const { data: allPayments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      expect(allPayments).toHaveLength(2);
      expect(allPayments![1].status).toBe(PAYMENT_STATUS.FAILED);
      expect((allPayments![1].metadata as any).init_error).toContain('Paystack API 503');
    });
  });
});
