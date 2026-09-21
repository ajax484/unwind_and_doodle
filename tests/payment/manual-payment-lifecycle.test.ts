import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { processCheckout } from '@/services/checkout.service';
import { getPaymentProvider, ManualPaymentProvider } from '@/services/payment';
import { updatePaymentMethod } from '@/services/payment-settings.service';
import { confirmManualPayment } from '@/services/manual-payment.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES } from '@/lib/constants';
import { CheckoutRequest } from '@/types/checkout';

describe('Manual / Bank Transfer Payment Lifecycle + Admin Verification (Step 4)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgId = 'org-manual-test-777';
  const warehouseId = 'wh-manual-test';
  const locationId = 'loc-manual-test';
  const productId = 'prod-manual-test';
  const adminUserId = 'user-admin-1';

  const baseCheckoutRequest: CheckoutRequest = {
    locationId,
    customer: {
      email: 'customer@example.com',
      firstName: 'Chidi',
      lastName: 'Anagonye',
      phone: '08099887766',
      marketingConsent: false,
    },
    shippingAddress: {
      streetAddress: '42 Victoria Island Way',
      city: 'Victoria Island',
      state: 'Lagos',
    },
    items: [{ productId, quantity: 2, addons: [] }],
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgId, name: 'Unwind and Doodle Test Store', slug: 'unwind-manual-test' },
      ],
      organization_members: [
        { id: 'mem-admin-1', organization_id: orgId, user_id: adminUserId, role: 'owner' },
      ],
      warehouses: [
        { id: warehouseId, name: 'Lagos Central Hub', code: 'LAGOS-CENTRAL', is_active: true },
      ],
      locations: [
        { id: locationId, name: 'Victoria Island', state: 'Lagos', country: 'Nigeria', is_active: true },
      ],
      warehouse_locations: [
        { id: 'wl-1', warehouse_id: warehouseId, location_id: locationId, priority: 1, is_active: true },
      ],
      delivery_rates: [
        { id: 'rate-1', warehouse_id: warehouseId, location_id: locationId, rate: 2500, is_active: true },
      ],
      products: [
        { id: productId, name: 'Ceramic Doodle Mug', selling_price: 10000, is_active: true },
      ],
      inventory: [
        { warehouse_id: warehouseId, product_id: productId, quantity: 25, reserved_quantity: 0 },
      ],
      organization_payment_methods: [
        {
          id: 'pm-manual',
          organization_id: orgId,
          provider: 'manual',
          enabled: true,
          display_title: 'Direct Bank Transfer',
          bank_name: 'Guaranty Trust Bank',
          account_name: 'Unwind & Doodle Studios Ltd',
          account_number: '0123456789',
        },
        {
          id: 'pm-paystack',
          organization_id: orgId,
          provider: 'paystack',
          enabled: true,
          display_title: 'Pay with Card (Paystack)',
        },
      ],
    });
  });

  // 1. Manual Payment Provider Contract
  describe('ManualPaymentProvider implementation', () => {
    it('generates references with prefix and formats initialization without gateway redirection', async () => {
      const provider = getPaymentProvider('manual');
      expect(provider).toBeInstanceOf(ManualPaymentProvider);
      expect(provider.name).toBe('manual');

      const ref = provider.generateReference('UAD_TEST');
      expect(ref).toMatch(/^UAD_TEST_/);

      const initResult = await provider.initializeTransaction({
        reference: ref,
        amount: 22500,
        currency: 'NGN',
        customer: { email: 'customer@example.com' },
      });

      expect(initResult.reference).toBe(ref);
      expect(initResult.provider).toBe('manual');
    });

    it('rejects automated gateway verification with explicit explanation', async () => {
      const provider = getPaymentProvider('manual');
      await expect(provider.verifyTransaction('MAN_REF_123')).rejects.toThrow(
        /cannot be verified via gateway API. Admin verification is required/
      );
    });

    it('returns invalid for automated webhook attempts', async () => {
      const provider = getPaymentProvider('manual');
      const webhookRes = await provider.verifyWebhook('{}', {});
      expect(webhookRes.isValid).toBe(false);
    });
  });

  // 2. Checkout & Bank Details Snapshotting
  describe('Manual Checkout & Bank Details Snapshot', () => {
    it('creates an order and pending manual payment with snapshotted bank details', async () => {
      const result = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'manual',
        },
      });

      expect(result.provider).toBe('manual');
      expect(result.paymentType).toBe('manual');
      expect(result.pricing.total).toBe(22500); // (10,000 * 2) + 2,500 delivery
      expect(result.bankDetails).toEqual({
        bankName: 'Guaranty Trust Bank',
        accountName: 'Unwind & Doodle Studios Ltd',
        accountNumber: '0123456789',
      });

      // Verify payment in mock DB
      const { data: payments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('id', result.paymentId);

      expect(payments).toHaveLength(1);
      const payment = payments![0];
      expect(payment.provider).toBe('manual');
      expect(payment.status).toBe(PAYMENT_STATUS.PENDING);
      expect(payment.amount).toBe(22500);
      expect((payment.metadata as any).bank_details).toEqual({
        bankName: 'Guaranty Trust Bank',
        accountName: 'Unwind & Doodle Studios Ltd',
        accountNumber: '0123456789',
      });

      // Verify inventory was reserved for the manual order
      const { data: inventoryList } = await mockSupabase
        .from('inventory')
        .select('*')
        .eq('product_id', productId);
      expect(inventoryList![0].reserved_quantity).toBe(2);
    });

    it('retains historical bank snapshot even when merchant updates bank settings', async () => {
      // Step A: Customer places manual order with initial bank details
      const checkoutResult = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'manual',
        },
      });

      // Step B: Merchant changes their bank account details in payment settings
      await updatePaymentMethod(mockSupabase as any, orgId, {
        provider: 'manual',
        enabled: true,
        bankName: 'Zenith Bank',
        accountName: 'Unwind & Doodle Enterprises',
        accountNumber: '9988776655',
      });

      // Step C: Verify existing payment record preserved original snapshotted bank details
      const { data: payments } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('id', checkoutResult.paymentId);

      expect((payments![0].metadata as any).bank_details).toEqual({
        bankName: 'Guaranty Trust Bank',
        accountName: 'Unwind & Doodle Studios Ltd',
        accountNumber: '0123456789',
      });
    });
  });

  // 3. Admin Verification & Canonical Fulfillment
  describe('Admin Manual Payment Confirmation', () => {
    it('authoritatively confirms manual payment and triggers full fulfillment pipeline', async () => {
      // 1. Customer initiates manual order
      const checkoutResult = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'manual',
        },
      });

      // 2. Admin explicitly confirms payment
      const confirmResult = await confirmManualPayment({
        supabase: mockSupabase as any,
        paymentId: checkoutResult.paymentId,
        orderId: checkoutResult.orderId,
        adminContext: {
          userId: adminUserId,
          organizationId: orgId,
          role: 'owner',
          userEmail: 'admin@unwindanddoodle.com',
        },
        note: 'Customer provided transfer reference GTB-9988',
      });

      expect(confirmResult.alreadyProcessed).toBe(false);
      expect(confirmResult.paymentStatus).toBe(PAYMENT_STATUS.SUCCESSFUL);
      expect(confirmResult.orderStatus).toBe(ORDER_STATUS.PENDING);

      // 3. Verify payment table state
      const { data: updatedPayment } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('id', checkoutResult.paymentId)
        .single();

      expect(updatedPayment).toBeDefined();
      expect(updatedPayment!.status).toBe(PAYMENT_STATUS.SUCCESSFUL);
      expect((updatedPayment!.metadata as any).verified_via).toBe('manual_admin');
      expect((updatedPayment!.metadata as any).confirmed_by_admin).toBe(adminUserId);
      expect((updatedPayment!.metadata as any).admin_note).toBe('Customer provided transfer reference GTB-9988');

      // 4. Verify order state
      const { data: updatedOrder } = await mockSupabase
        .from('orders')
        .select('*')
        .eq('id', checkoutResult.orderId)
        .single();
      expect(updatedOrder).toBeDefined();
      expect(updatedOrder!.status).toBe(ORDER_STATUS.PENDING);

      // 5. Verify inventory reservations were committed (active inventory decremented, reservation committed)
      const { data: inventoryList } = await mockSupabase
        .from('inventory')
        .select('*')
        .eq('product_id', productId);
      expect(inventoryList![0].quantity).toBe(23); // 25 - 2
      expect(inventoryList![0].reserved_quantity).toBe(0);

      // 6. Verify status history audit
      const { data: statusHistory } = await mockSupabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', checkoutResult.orderId);

      const fulfillmentHistory = statusHistory?.find((h) => h.note?.includes('manual_admin'));
      expect(fulfillmentHistory).toBeDefined();

      // 7. Verify audit log entry
      const { data: auditLogs } = await mockSupabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', checkoutResult.paymentId);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs![0].actor_id).toBe(adminUserId);
      expect(auditLogs![0].action).toBe('update');

      // 8. Verify domain event outbox
      const { data: domainEvents } = await mockSupabase
        .from('domain_events')
        .select('*')
        .eq('event_type', DOMAIN_EVENT_TYPES.PAYMENT_COMPLETED);

      expect(domainEvents).toHaveLength(1);
      expect((domainEvents![0].payload as any).paymentId).toBe(checkoutResult.paymentId);
      expect((domainEvents![0].payload as any).provider).toBe('manual');
    });

    it('rejects confirmation from an unauthorized / mismatched organization context', async () => {
      const checkoutResult = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'manual',
        },
      });

      await expect(
        confirmManualPayment({
          supabase: mockSupabase as any,
          paymentId: checkoutResult.paymentId,
          adminContext: {
            userId: 'intruder-user',
            organizationId: 'different-org-id',
            role: 'owner',
          },
        })
      ).rejects.toThrow(/Forbidden: Order does not belong to your organization/);
    });

    it('rejects manual confirmation of gateway payments (e.g. Paystack)', async () => {
      const checkoutResult = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'paystack',
        },
      });

      await expect(
        confirmManualPayment({
          supabase: mockSupabase as any,
          paymentId: checkoutResult.paymentId,
          adminContext: {
            userId: adminUserId,
            organizationId: orgId,
            role: 'owner',
          },
        })
      ).rejects.toThrow(/Cannot manually confirm payment for provider 'paystack'/);
    });

    it('rejects manual confirmation of non-pending payments (e.g. failed)', async () => {
      const checkoutResult = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'manual',
        },
      });

      // Artificially fail the payment
      await mockSupabase
        .from('payments')
        .update({ status: PAYMENT_STATUS.FAILED })
        .eq('id', checkoutResult.paymentId);

      await expect(
        confirmManualPayment({
          supabase: mockSupabase as any,
          paymentId: checkoutResult.paymentId,
          adminContext: {
            userId: adminUserId,
            organizationId: orgId,
            role: 'owner',
          },
        })
      ).rejects.toThrow(/Cannot confirm manual payment in status 'failed'/);
    });

    it('handles idempotent duplicate confirmations gracefully without re-executing side-effects', async () => {
      const checkoutResult = await processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'manual',
        },
      });

      // First confirmation
      const firstResult = await confirmManualPayment({
        supabase: mockSupabase as any,
        paymentId: checkoutResult.paymentId,
        adminContext: {
          userId: adminUserId,
          organizationId: orgId,
          role: 'owner',
        },
      });
      expect(firstResult.alreadyProcessed).toBe(false);

      // Second confirmation (e.g. concurrent or double click)
      const secondResult = await confirmManualPayment({
        supabase: mockSupabase as any,
        paymentId: checkoutResult.paymentId,
        adminContext: {
          userId: adminUserId,
          organizationId: orgId,
          role: 'owner',
        },
      });

      expect(secondResult.alreadyProcessed).toBe(true);
      expect(secondResult.paymentStatus).toBe(PAYMENT_STATUS.SUCCESSFUL);

      // Verify inventory was only decremented once
      const { data: inventoryList } = await mockSupabase
        .from('inventory')
        .select('*')
        .eq('product_id', productId);
      expect(inventoryList![0].quantity).toBe(23); // exactly 25 - 2, NOT 25 - 4

      // Verify domain events was only emitted once
      const { data: domainEvents } = await mockSupabase
        .from('domain_events')
        .select('*')
        .eq('event_type', DOMAIN_EVENT_TYPES.PAYMENT_COMPLETED);
      expect(domainEvents).toHaveLength(1);
    });
  });
});
