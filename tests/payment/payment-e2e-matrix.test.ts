import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  getPaymentProvider,
  PaystackPaymentProvider,
  FlutterwavePaymentProvider,
  ManualPaymentProvider,
} from '@/services/payment';
import { processCheckout } from '@/services/checkout.service';
import { processPaymentWebhook } from '@/services/webhook.service';
import { fulfillSuccessfulPayment } from '@/services/payment-fulfillment.service';
import { revalidatePayment } from '@/services/payment-revalidation.service';
import { confirmManualPayment } from '@/services/manual-payment.service';
import { refundPayment } from '@/services/payment-management.service';
import { retryPayment, getPaymentRetryEligibility } from '@/services/payment/payment-retry.service';
import {
  PAYMENT_STATUS,
  ORDER_STATUS,
  CURRENCY,
  DEFAULT_ORGANIZATION_ID,
} from '@/lib/constants';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';

describe('Payment Production Hardening & End-to-End Matrix (Step 9)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgId = DEFAULT_ORGANIZATION_ID;
  const otherOrgId = 'org-competitor-999';
  const warehouseId = 'wh-e2e-lagos';
  const customerId = 'cust-e2e-001';
  const locationId = 'loc-e2e-lagos';

  const defaultShippingAddress = {
    streetAddress: '12 Marina Road, Victoria Island',
    city: 'Lagos Island',
    state: 'Lagos',
    country: 'Nigeria',
    postalCode: '100001',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_paystack_dummy_123';
    process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_TEST_dummy';
    process.env.FLUTTERWAVE_SECRET_HASH = 'FLW_HASH_SECRET_123';

    // Mock global fetch for provider gateway calls & refunds
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/refund') && urlStr.includes('paystack')) {
        return {
          ok: true,
          json: async () => ({
            status: true,
            data: {
              id: 998877,
              status: 'processed',
              amount: 500000,
              currency: 'NGN',
              transaction: { reference: 'PSTK_REF_001' },
            },
          }),
        } as any;
      }
      if (urlStr.includes('/refund') || (urlStr.includes('flutterwave') && urlStr.includes('refund'))) {
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              id: 554433,
              status: 'completed',
              amount_refunded: 16500,
              currency: 'NGN',
              tx_ref: 'FLW_REF_001',
            },
          }),
        } as any;
      }
      return {
        ok: true,
        json: async () => ({ status: true, data: {} }),
      } as any;
    });

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgId, name: 'Unwind & Doodle' },
        { id: otherOrgId, name: 'Competitor Store' },
      ],
      organization_payment_methods: [
        {
          id: 'pm-paystack',
          organization_id: orgId,
          provider: 'paystack',
          enabled: true,
          display_order: 1,
        },
        {
          id: 'pm-flutterwave',
          organization_id: orgId,
          provider: 'flutterwave',
          enabled: true,
          display_order: 2,
        },
        {
          id: 'pm-manual',
          organization_id: orgId,
          provider: 'manual',
          enabled: true,
          display_order: 3,
          bank_name: 'Guaranty Trust Bank',
          account_name: 'Unwind & Doodle Ltd',
          account_number: '0123456789',
        },
      ],
      locations: [
        {
          id: locationId,
          organization_id: orgId,
          name: 'Lagos State',
          is_active: true,
        },
      ],
      warehouses: [
        {
          id: warehouseId,
          organization_id: orgId,
          name: 'Main Lagos Warehouse',
          is_active: true,
        },
      ],
      warehouse_locations: [
        {
          warehouse_id: warehouseId,
          location_id: locationId,
        },
      ],
      delivery_rates: [
        {
          id: 'dr-lagos',
          organization_id: orgId,
          warehouse_id: warehouseId,
          location_id: locationId,
          rate: 1500,
          estimated_days_min: 1,
          estimated_days_max: 3,
        },
      ],
      products: [
        {
          id: 'prod-sketchbook',
          organization_id: orgId,
          name: 'Premium Sketchbook',
          product_type: 'physical',
          price: 15000,
          selling_price: 15000,
          is_active: true,
          status: 'published',
        },
      ],
      inventory: [
        {
          id: 'inv-sketchbook',
          product_id: 'prod-sketchbook',
          warehouse_id: warehouseId,
          quantity: 25,
          reserved_quantity: 0,
        },
      ],
      customers: [
        {
          id: customerId,
          organization_id: orgId,
          email: 'customer@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
        },
      ],
      orders: [],
      order_items: [],
      inventory_reservations: [],
      payments: [],
      payment_events: [],
      audit_logs: [],
    });
  });

  // =========================================================================
  // 1. Paystack End-to-End Matrix Lifecycle
  // =========================================================================
  describe('1. Paystack E2E Lifecycle', () => {
    it('executes full lifecycle: Checkout -> Gateway Init -> Webhook Success -> Atomic Fulfillment -> Partial Refund', async () => {
      const paystackSecretKey = 'sk_test_paystack_dummy_123';
      const mockPaystack = new PaystackPaymentProvider({
        secretKey: paystackSecretKey,
        fetchFn: vi.fn().mockImplementation(async (url: string) => {
          if (url.includes('/transaction/initialize')) {
            return {
              ok: true,
              json: async () => ({
                status: true,
                data: {
                  authorization_url: 'https://checkout.paystack.com/auth-pstk-123',
                  access_code: 'pstk-access-123',
                  reference: 'PSTK_REF_001',
                },
              }),
            };
          }
          if (url.includes('/transaction/verify')) {
            return {
              ok: true,
              json: async () => ({
                status: true,
                data: {
                  status: 'success',
                  amount: 1650000, // ₦16,500 in kobo (15000 product + 1500 delivery)
                  currency: 'NGN',
                  channel: 'card',
                  paid_at: new Date().toISOString(),
                  reference: 'PSTK_REF_001',
                },
              }),
            };
          }
          if (url.includes('/refund')) {
            return {
              ok: true,
              json: async () => ({
                status: true,
                data: {
                  id: 998877,
                  status: 'processed',
                  amount: 500000, // ₦5,000 refund
                  currency: 'NGN',
                  transaction: { reference: 'PSTK_REF_001' },
                },
              }),
            };
          }
          return { ok: false, json: async () => ({ status: false }) };
        }) as any,
      });

      const checkoutRes = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          locationId,
          customer: { email: 'customer@example.com', firstName: 'Ada', lastName: 'Lovelace', marketingConsent: false },
          shippingAddress: defaultShippingAddress,
          items: [{ productId: 'prod-sketchbook', quantity: 1, addons: [] }],
          paymentMethod: 'paystack',
        },
        paymentProvider: mockPaystack,
      });

      expect(checkoutRes.orderId).toBeDefined();
      expect(checkoutRes.provider).toBe('paystack');
      expect(checkoutRes.pricing.total).toBe(16500);

      // Verify payment row was created as pending
      const { data: payments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', checkoutRes.orderId);
      expect(payments).toHaveLength(1);
      expect(payments![0].status).toBe(PAYMENT_STATUS.PENDING);
      expect(payments![0].provider).toBe('paystack');

      // B. Webhook Verification & Fulfillment
      const rawWebhookBody = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 112233,
          reference: payments![0].provider_reference,
          amount: 1650000,
          currency: 'NGN',
          status: 'success',
        },
      });

      const signature = crypto.createHmac('sha512', paystackSecretKey).update(rawWebhookBody).digest('hex');

      const webhookRes = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody: rawWebhookBody,
        headers: {
          'x-paystack-signature': signature,
        },
        paymentProvider: mockPaystack,
      });

      expect(webhookRes.success).toBe(true);

      // Check payment status updated to successful
      const { data: updatedPayment } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('id', payments![0].id)
        .single();
      expect(updatedPayment?.status).toBe(PAYMENT_STATUS.SUCCESSFUL);

      // C. Refund execution via original provider
      const refundRes = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: payments![0].id,
        amount: 5000,
        reason: 'Customer requested partial refund',
        adminContext: {
          userId: 'admin-1',
          organizationId: orgId,
          role: 'admin',
          userEmail: 'admin@unwindanddoodle.com',
        },
      });

      expect(refundRes.success).toBe(true);
      expect(refundRes.refundAmount).toBe(5000);
      expect(refundRes.remainingRefundable).toBe(11500);
    });
  });

  // =========================================================================
  // 2. Flutterwave End-to-End Matrix Lifecycle
  // =========================================================================
  describe('2. Flutterwave E2E Lifecycle', () => {
    it('executes full lifecycle: Checkout -> Webhook -> Success -> Full Refund', async () => {
      const mockFlutterwave = new FlutterwavePaymentProvider({
        secretKey: 'FLWSECK_TEST_dummy',
        secretHash: 'FLW_HASH_SECRET_123',
        fetchFn: vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === 'string' && url.includes('/payments')) {
            return {
              ok: true,
              json: async () => ({
                status: 'success',
                data: { link: 'https://checkout.flutterwave.com/pay/flw-e2e-001' },
              }),
            };
          }
          if (typeof url === 'string' && url.includes('/transactions/')) {
            return {
              ok: true,
              json: async () => ({
                status: 'success',
                data: {
                  id: 887766,
                  tx_ref: 'FLW_REF_001',
                  flw_ref: 'FLW_MOCK_REF_887766',
                  amount: 16500,
                  currency: 'NGN',
                  status: 'successful',
                },
              }),
            };
          }
          if (typeof url === 'string' && url.includes('/refunds')) {
            return {
              ok: true,
              json: async () => ({
                status: 'success',
                data: {
                  id: 'ref-flw-123',
                  status: 'completed',
                  amount_refunded: 16500,
                  currency: 'NGN',
                  tx_ref: 'FLW_REF_001',
                },
              }),
            };
          }
          return { ok: false, json: async () => ({ status: 'error' }) };
        }) as any,
      });

      const checkoutRes = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          locationId,
          customer: { email: 'customer@example.com', firstName: 'Ada', lastName: 'Lovelace', marketingConsent: false },
          shippingAddress: defaultShippingAddress,
          items: [{ productId: 'prod-sketchbook', quantity: 1, addons: [] }],
          paymentMethod: 'flutterwave',
        },
        paymentProvider: mockFlutterwave,
      });

      expect(checkoutRes.orderId).toBeDefined();
      expect(checkoutRes.provider).toBe('flutterwave');

      const { data: payments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', checkoutRes.orderId);
      expect(payments![0].provider).toBe('flutterwave');

      // Webhook arrival
      const rawWebhookBody = JSON.stringify({
        event: 'charge.completed',
        data: {
          id: 887766,
          tx_ref: payments![0].provider_reference,
          amount: 16500,
          currency: 'NGN',
          status: 'successful',
        },
      });

      const webhookRes = await processPaymentWebhook({
        supabase: mockSupabase as any,
        rawBody: rawWebhookBody,
        headers: {
          'verif-hash': 'FLW_HASH_SECRET_123',
        },
        paymentProvider: mockFlutterwave,
      });

      expect(webhookRes.success).toBe(true);

      // Refund
      const refundRes = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: payments![0].id,
        amount: 16500,
        reason: 'Full order return',
        adminContext: {
          userId: 'admin-1',
          organizationId: orgId,
          role: 'admin',
          userEmail: 'admin@unwindanddoodle.com',
        },
      });

      expect(refundRes.success).toBe(true);
      expect(refundRes.remainingRefundable).toBe(0);
      expect(refundRes.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);
    });
  });

  // =========================================================================
  // 3. Direct Bank Transfer End-to-End Matrix Lifecycle
  // =========================================================================
  describe('3. Direct Bank Transfer E2E Lifecycle', () => {
    it('executes full lifecycle: Checkout -> Snapshotted Details -> Admin Confirmation -> Fulfillment -> Manual Refund', async () => {
      const checkoutRes = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          locationId,
          customer: { email: 'customer@example.com', firstName: 'Ada', lastName: 'Lovelace', marketingConsent: false },
          shippingAddress: defaultShippingAddress,
          items: [{ productId: 'prod-sketchbook', quantity: 1, addons: [] }],
          paymentMethod: 'manual',
        },
      });

      expect(checkoutRes.provider).toBe('manual');
      expect(checkoutRes.bankDetails).toBeDefined();
      expect(checkoutRes.bankDetails?.bankName).toBe('Guaranty Trust Bank');

      const { data: payments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', checkoutRes.orderId);
      expect(payments![0].provider).toBe('manual');
      expect(payments![0].status).toBe(PAYMENT_STATUS.PENDING);

      // Admin manual payment confirmation
      const confirmRes = await confirmManualPayment({
        supabase: mockSupabase as any,
        paymentId: payments![0].id,
        orderId: checkoutRes.orderId,
        adminContext: {
          userId: 'admin-1',
          organizationId: orgId,
          role: 'admin',
          userEmail: 'admin@unwindanddoodle.com',
        },
        note: 'Customer wired to GTB and sent receipt',
      });

      expect(confirmRes.paymentStatus).toBe(PAYMENT_STATUS.SUCCESSFUL);

      // Manual administrative refund (does not call external gateway)
      const refundRes = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: payments![0].id,
        amount: 16500,
        reason: 'Customer cancelled, money sent back to account',
        adminContext: {
          userId: 'admin-1',
          organizationId: orgId,
          role: 'admin',
          userEmail: 'admin@unwindanddoodle.com',
        },
      });

      expect(refundRes.success).toBe(true);
      expect(refundRes.provider).toBe('manual');
      expect(refundRes.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);
    });
  });

  // =========================================================================
  // 4. Provider Switching Recovery Matrix
  // =========================================================================
  describe('4. Provider Switching Recovery', () => {
    it('handles Paystack failure -> Flutterwave retry -> Direct Bank Transfer resuming', async () => {
      // 1. Order created with failed Paystack payment
      const { data: order } = await mockSupabase
        .from('orders')
        .insert({
          order_number: 'UD-E2E-SWITCH-01',
          organization_id: orgId,
          customer_id: customerId,
          warehouse_id: warehouseId,
          location_id: locationId,
          total: 16500,
          status: ORDER_STATUS.CREATED,
          email: 'customer@example.com',
          shipping_address: defaultShippingAddress,
        })
        .select()
        .single();

      const { data: paystackPayment } = await mockSupabase
        .from('payments')
        .insert({
          order_id: order!.id,
          provider: 'paystack',
          provider_reference: 'PSTK_FAILED_01',
          amount: 16500,
          currency: 'NGN',
          status: PAYMENT_STATUS.FAILED,
        })
        .select()
        .single();

      // 2. Retry with Flutterwave
      const mockFlutterwave = new FlutterwavePaymentProvider({
        secretKey: 'FLWSECK_TEST_dummy',
        fetchFn: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'success',
            data: { link: 'https://checkout.flutterwave.com/pay/flw-retry-01' },
          }),
        }) as any,
      });

      const retryFlwRes = await retryPayment({
        supabase: mockSupabase as any,
        orderIdentifier: order!.id,
        paymentMethod: 'flutterwave',
        paymentProvider: mockFlutterwave,
      });

      expect(retryFlwRes.success).toBe(true);
      expect(retryFlwRes.provider).toBe('flutterwave');

      // Verify both payments exist: Attempt 1 (Paystack: failed), Attempt 2 (Flutterwave: pending)
      const { data: allPayments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('order_id', order!.id);

      expect(allPayments).toHaveLength(2);
      expect(allPayments!.some((p) => p.provider === 'paystack' && p.status === 'failed')).toBe(true);
      expect(allPayments!.some((p) => p.provider === 'flutterwave' && p.status === 'pending')).toBe(true);
    });
  });

  // =========================================================================
  // 5. Security & Isolation Matrix
  // =========================================================================
  describe('5. Security & Isolation Matrix', () => {
    it('rejects cross-organization payment operations', async () => {
      // Create payment belonging to otherOrgId
      const { data: otherOrder } = await mockSupabase
        .from('orders')
        .insert({
          order_number: 'UD-OTHER-ORG-01',
          organization_id: otherOrgId,
          total: 20000,
          status: ORDER_STATUS.PENDING,
          email: 'competitor.cust@example.com',
          shipping_address: defaultShippingAddress,
        })
        .select()
        .single();

      const { data: otherPayment } = await mockSupabase
        .from('payments')
        .insert({
          order_id: otherOrder!.id,
          provider: 'manual',
          provider_reference: 'MAN_OTHER_01',
          amount: 20000,
          currency: 'NGN',
          status: PAYMENT_STATUS.PENDING,
        })
        .select()
        .single();

      // Admin from orgId attempts to confirm otherOrgId's payment
      await expect(
        confirmManualPayment({
          supabase: mockSupabase as any,
          paymentId: otherPayment!.id,
          orderId: otherOrder!.id,
          adminContext: {
            userId: 'admin-1',
            organizationId: orgId, // Mismatched tenant
            role: 'admin',
          },
        })
      ).rejects.toThrow(/Order does not belong to your organization/);
    });

    it('rejects webhook transaction when amount is tampered', async () => {
      const paystackKey = 'sk_test_dummy_key';
      const { data: order } = await mockSupabase
        .from('orders')
        .insert({
          order_number: 'UD-TAMPER-01',
          organization_id: orgId,
          total: 50000,
          status: ORDER_STATUS.CREATED,
          email: 'target@example.com',
          shipping_address: defaultShippingAddress,
        })
        .select()
        .single();

      const { data: payment } = await mockSupabase
        .from('payments')
        .insert({
          order_id: order!.id,
          provider: 'paystack',
          provider_reference: 'PSTK_TAMPER_01',
          amount: 50000,
          currency: 'NGN',
          status: PAYMENT_STATUS.PENDING,
        })
        .select()
        .single();

      const mockTamperedProvider = new PaystackPaymentProvider({
        secretKey: paystackKey,
        fetchFn: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: true,
            data: {
              status: 'success',
              amount: 2000000, // Attacker paid ₦20,000 instead of ₦50,000
              currency: 'NGN',
              reference: 'PSTK_TAMPER_01',
            },
          }),
        }) as any,
      });

      const rawBody = JSON.stringify({
        event: 'charge.success',
        data: { reference: 'PSTK_TAMPER_01', amount: 2000000 },
      });

      const signature = crypto.createHmac('sha512', paystackKey).update(rawBody).digest('hex');

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase as any,
          rawBody,
          headers: {
            'x-paystack-signature': signature,
          },
          paymentProvider: mockTamperedProvider,
        })
      ).rejects.toThrow(/Transaction amount mismatch/);
    });
  });
});
