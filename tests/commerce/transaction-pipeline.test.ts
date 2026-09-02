import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { processCheckout } from '@/services/checkout.service';
import { processPaymentWebhook } from '@/services/webhook.service';
import {
  canTransitionOrderStatus,
  transitionOrderStatus,
} from '@/services/order-state-machine.service';
import {
  reserveSingleInventory,
  expireOldReservations,
  releaseOrderReservations,
} from '@/services/inventory.service';
import {
  publishDomainEvent,
  processPendingDomainEvents,
} from '@/services/events.service';
import { PaystackPaymentProvider } from '@/services/payment/paystack.provider';
import { ORDER_STATUS, PAYMENT_STATUS, CURRENCY } from '@/lib/constants';

describe('Phase 4: Commerce Transaction Pipeline & Concurrency Controls', () => {
  const secretKey = 'sk_test_paystack_secret_12345';
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-lagos-hub';
  const locationId = 'loc-lagos-01';
  const bookId = 'prod-book-floral';
  const pencilId = 'prod-pencils-addon';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: warehouseId, name: 'Lagos Hub', code: 'LAG-01', is_active: true },
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
          base_rate: 2000,
          is_active: true,
        },
      ],
      products: [
        { id: bookId, name: 'Mindful Floral Coloring Book', price: 5000, is_active: true },
        { id: pencilId, name: '24 Artist Pencils', price: 3000, is_active: true },
      ],
      product_addons: [
        {
          id: 'addon-1',
          product_id: bookId,
          addon_product_id: pencilId,
          price_override: 2500,
          is_required: false,
          active: true,
        },
      ],
      inventory: [
        { warehouse_id: warehouseId, product_id: bookId, quantity: 1, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: pencilId, quantity: 10, reserved_quantity: 0 },
      ],
      inventory_reservations: [],
      orders: [],
      order_items: [],
      order_item_addons: [],
      order_status_history: [],
      payments: [],
      customizations: [],
      customization_assets: [],
      domain_events: [],
      audit_logs: [],
    });
  });

  describe('1. Happy Path: Checkout → Payment → Reservation → Order Pending → Inventory Finalized', () => {
    it('executes full pipeline atomically from checkout to confirmed payment', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/transaction/initialize')) {
          return {
            ok: true,
            json: async () => ({
              status: true,
              message: 'Authorization URL created',
              data: {
                authorization_url: 'https://checkout.paystack.com/auth_pipe_1',
                reference: 'UAD_PIPE_REF_1',
              },
            }),
          };
        }
        if (url.includes('/transaction/verify/')) {
          return {
            ok: true,
            json: async () => ({
              status: true,
              message: 'Verification successful',
              data: {
                id: 112233,
                status: 'success',
                reference: 'UAD_PIPE_REF_1',
                amount: 700000, // 7000 NGN in kobo: 5000 + 2000 delivery
                currency: 'NGN',
                channel: 'card',
                paid_at: new Date().toISOString(),
              },
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockFetch as any });

      // 1. Customer initiates checkout
      const checkoutResult = await processCheckout({
        supabase: mockSupabase,
        request: {
          customer: {
            email: 'customer@example.com',
            firstName: 'Amaka',
            lastName: 'Okafor',
            phone: '08012345678',
            marketingConsent: false,
          },
          shippingAddress: {
            streetAddress: '10 Awolowo Road',
            city: 'Ikeja',
            state: 'Lagos',
          },
          locationId,
          items: [{ productId: bookId, quantity: 1, addons: [] }],
        },
        paymentProvider: provider,
      });

      expect(checkoutResult.orderId).toBeDefined();
      expect(checkoutResult.authorizationUrl).toBe('https://checkout.paystack.com/auth_pipe_1');

      // Verify inventory reserved
      const invAfterCheckout = mockSupabase._store.inventory.find((i) => i.product_id === bookId);
      expect(invAfterCheckout.quantity).toBe(1);
      expect(invAfterCheckout.reserved_quantity).toBe(1);

      // Verify Order is 'created'
      const order = mockSupabase._store.orders.find((o) => o.id === checkoutResult.orderId);
      expect(order.status).toBe(ORDER_STATUS.CREATED);

      // 2. Paystack webhook arrives
      const webhookPayload = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 112233,
          status: 'success',
          reference: checkoutResult.paymentReference,
          amount: 700000,
          currency: 'NGN',
        },
      });
      const sig = crypto.createHmac('sha512', secretKey).update(webhookPayload).digest('hex');

      const webhookResult = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: webhookPayload,
        headers: { 'x-paystack-signature': sig },
        paymentProvider: provider,
      });

      expect(webhookResult.success).toBe(true);

      // Verify Order transitioned to 'pending' (NOT confirmed)
      const orderAfterPay = mockSupabase._store.orders.find((o) => o.id === checkoutResult.orderId);
      expect(orderAfterPay.status).toBe(ORDER_STATUS.PENDING);

      // Verify Inventory is finalized: quantity 1 -> 0, reserved 1 -> 0
      const invAfterPay = mockSupabase._store.inventory.find((i) => i.product_id === bookId);
      expect(invAfterPay.quantity).toBe(0);
      expect(invAfterPay.reserved_quantity).toBe(0);

      // Verify Payment record status is successful
      const payment = mockSupabase._store.payments.find((p) => p.order_id === checkoutResult.orderId);
      expect(payment.status).toBe(PAYMENT_STATUS.SUCCESSFUL);
    });
  });

  describe('2. Failed Payment & Reservation Release', () => {
    it('releases inventory reservations when payment is cancelled/failed', async () => {
      const orderId = 'ord-fail-test';

      // Manually create reservation and order
      mockSupabase._store.inventory[0].reserved_quantity = 1;
      mockSupabase._store.inventory_reservations.push({
        id: 'res-fail-1',
        warehouse_id: warehouseId,
        product_id: bookId,
        quantity: 1,
        status: 'active',
        reference_type: 'order',
        reference_id: orderId,
        expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      });
      mockSupabase._store.orders.push({
        id: orderId,
        order_number: 'ORD-FAIL-01',
        customer_id: 'c1',
        warehouse_id: warehouseId,
        location_id: locationId,
        status: ORDER_STATUS.CREATED,
        subtotal: 5000,
        delivery_fee: 2000,
        total_amount: 7000,
        currency: 'NGN',
      });

      // Release reservations on failure
      const releaseRes = await releaseOrderReservations(mockSupabase, orderId);
      expect(releaseRes.releasedCount).toBe(1);

      // Verify inventory reserved_quantity is restored to 0, quantity unchanged
      const inv = mockSupabase._store.inventory.find((i) => i.product_id === bookId);
      expect(inv.quantity).toBe(1);
      expect(inv.reserved_quantity).toBe(0);

      const reservation = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-fail-1');
      expect(reservation.status).toBe('released');
    });
  });

  describe('3. 45-Minute Reservation Expiration Cleaner', () => {
    it('releases expired reservations and leaves unexpired ones active', async () => {
      // Set initial inventory
      const inv = mockSupabase._store.inventory.find((i) => i.product_id === bookId);
      inv.quantity = 5;
      inv.reserved_quantity = 3;

      const pastExpiry = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
      const futureExpiry = new Date(Date.now() + 40 * 60 * 1000).toISOString(); // 40 min ahead

      // Expired reservation (qty 2)
      mockSupabase._store.inventory_reservations.push({
        id: 'res-exp-1',
        warehouse_id: warehouseId,
        product_id: bookId,
        quantity: 2,
        status: 'active',
        reference_type: 'order',
        reference_id: 'ord-exp-1',
        expires_at: pastExpiry,
      });

      // Active unexpired reservation (qty 1)
      mockSupabase._store.inventory_reservations.push({
        id: 'res-act-1',
        warehouse_id: warehouseId,
        product_id: bookId,
        quantity: 1,
        status: 'active',
        reference_type: 'order',
        reference_id: 'ord-act-1',
        expires_at: futureExpiry,
      });

      const expiredCount = await expireOldReservations(mockSupabase);
      expect(expiredCount).toBe(1);

      // Verify expired reservation status updated
      const expiredRes = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-exp-1');
      expect(expiredRes.status).toMatch(/released|expired/);

      // Verify active reservation remains active
      const activeRes = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-act-1');
      expect(activeRes.status).toBe('active');

      // Reserved quantity should now be 1 (reduced by 2)
      expect(inv.reserved_quantity).toBe(1);
      expect(inv.quantity).toBe(5);
    });
  });

  describe('4. Concurrency & Race Condition Protection', () => {
    it('guarantees only one reservation succeeds when two customers attempt to buy the last unit concurrently', async () => {
      const inv = mockSupabase._store.inventory.find((i) => i.product_id === bookId);
      inv.quantity = 1;
      inv.reserved_quantity = 0;

      // Customer A and Customer B attempt to reserve 1 unit simultaneously
      const attemptA = reserveSingleInventory(mockSupabase, {
        warehouseId,
        productId: bookId,
        quantity: 1,
        referenceType: 'order',
        referenceId: 'ord-cust-A',
      });

      const attemptB = reserveSingleInventory(mockSupabase, {
        warehouseId,
        productId: bookId,
        quantity: 1,
        referenceType: 'order',
        referenceId: 'ord-cust-B',
      });

      const results = await Promise.allSettled([attemptA, attemptB]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(inv.reserved_quantity).toBe(1);
    });
  });

  describe('5. Duplicate Webhook & Callback Arrival Races', () => {
    it('handles multiple duplicate webhooks idempotently without double-deducting inventory', async () => {
      const orderId = 'ord-dup-webhook';
      const paymentRef = 'UAD_DUP_TX_123';

      mockSupabase._store.inventory[0].quantity = 5;
      mockSupabase._store.inventory[0].reserved_quantity = 2;

      mockSupabase._store.orders.push({
        id: orderId,
        order_number: 'ORD-DUP-01',
        customer_id: 'c1',
        warehouse_id: warehouseId,
        location_id: locationId,
        status: ORDER_STATUS.CREATED,
        subtotal: 10000,
        delivery_fee: 2000,
        total_amount: 12000,
        currency: 'NGN',
      });

      mockSupabase._store.payments.push({
        id: 'pay-dup-1',
        order_id: orderId,
        provider: 'paystack',
        provider_reference: paymentRef,
        amount: 12000,
        currency: 'NGN',
        status: PAYMENT_STATUS.PENDING,
        metadata: { order_id: orderId },
      });

      mockSupabase._store.inventory_reservations.push({
        id: 'res-dup-1',
        warehouse_id: warehouseId,
        product_id: bookId,
        quantity: 2,
        status: 'active',
        reference_type: 'order',
        reference_id: orderId,
        expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            id: 998811,
            status: 'success',
            reference: paymentRef,
            amount: 1200000,
            currency: 'NGN',
          },
        }),
      });

      const provider = new PaystackPaymentProvider({ secretKey, fetchFn: mockFetch as any });

      const webhookBody = JSON.stringify({
        event: 'charge.success',
        data: { id: 998811, status: 'success', reference: paymentRef, amount: 1200000, currency: 'NGN' },
      });
      const sig = crypto.createHmac('sha512', secretKey).update(webhookBody).digest('hex');

      // Webhook 1
      const res1 = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: webhookBody,
        headers: { 'x-paystack-signature': sig },
        paymentProvider: provider,
      });
      expect(res1.success).toBe(true);
      expect(res1.alreadyProcessed).toBe(false);

      // Webhook 2 (duplicate)
      const res2 = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: webhookBody,
        headers: { 'x-paystack-signature': sig },
        paymentProvider: provider,
      });
      expect(res2.success).toBe(true);
      expect(res2.alreadyProcessed).toBe(true);

      // Webhook 3 (duplicate)
      const res3 = await processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: webhookBody,
        headers: { 'x-paystack-signature': sig },
        paymentProvider: provider,
      });
      expect(res3.success).toBe(true);
      expect(res3.alreadyProcessed).toBe(true);

      // Inventory should have been deducted ONCE (5 - 2 = 3)
      const inv = mockSupabase._store.inventory[0];
      expect(inv.quantity).toBe(3);
      expect(inv.reserved_quantity).toBe(0);
    });
  });

  describe('6. Outbox Pattern & Domain Event Processing with Retries', () => {
    it('stores domain events in outbox and processes them with retry on handler failure', async () => {
      // Publish outbox event
      const eventId = await publishDomainEvent(mockSupabase, {
        eventType: 'order.pending',
        aggregateType: 'order',
        aggregateId: 'ord-outbox-test',
        payload: { orderNumber: 'ORD-OUT-001', customerEmail: 'test@example.com' },
      });

      expect(eventId).toBeDefined();

      const eventInStore = mockSupabase._store.domain_events.find((e) => e.id === eventId);
      expect(eventInStore).toBeDefined();
      expect(eventInStore.processed_at).toBeNull();

      // First run with a failing handler (e.g. email service temporary downtime)
      let failureCount = 0;
      const failingHandler = async () => {
        failureCount++;
        throw new Error('Email service timeout');
      };

      const result1 = await processPendingDomainEvents(
        mockSupabase,
        { 'order.pending': failingHandler }
      );

      expect(result1.failedCount).toBe(1);
      expect(result1.processedCount).toBe(0);
      expect(eventInStore.processed_at).toBeNull(); // Remains unprocessed for retry

      // Second run after email service is recovered
      let processedSuccessfully = false;
      const recoveredHandler = async () => {
        processedSuccessfully = true;
      };

      const result2 = await processPendingDomainEvents(
        mockSupabase,
        { 'order.pending': recoveredHandler }
      );

      expect(result2.processedCount).toBe(1);
      expect(result2.failedCount).toBe(0);
      expect(processedSuccessfully).toBe(true);
      expect(eventInStore.processed_at).not.toBeNull();
    });
  });

  describe('7. Order State Machine Transition Rules & Timestamps', () => {
    it('enforces legal transitions and sets appropriate server timestamps', async () => {
      const orderId = 'ord-trans-test';
      mockSupabase._store.orders.push({
        id: orderId,
        order_number: 'ORD-TRANS-01',
        customer_id: 'c1',
        warehouse_id: warehouseId,
        location_id: locationId,
        status: ORDER_STATUS.PENDING,
        subtotal: 5000,
        delivery_fee: 2000,
        total_amount: 7000,
        currency: 'NGN',
      });

      // 1. pending -> confirmed
      const res1 = await transitionOrderStatus({
        supabase: mockSupabase,
        orderId,
        targetStatus: ORDER_STATUS.CONFIRMED,
        note: 'Admin confirmed order',
      });
      expect(res1.newStatus).toBe(ORDER_STATUS.CONFIRMED);

      // 2. confirmed -> shipped (should record shipped_at)
      const res2 = await transitionOrderStatus({
        supabase: mockSupabase,
        orderId,
        targetStatus: ORDER_STATUS.SHIPPED,
        note: 'Dispatched via Courier',
      });
      expect(res2.newStatus).toBe(ORDER_STATUS.SHIPPED);

      const orderInStore = mockSupabase._store.orders.find((o) => o.id === orderId);
      expect(orderInStore.shipped_at).toBeDefined();

      // 3. shipped -> received (should record received_at)
      const res3 = await transitionOrderStatus({
        supabase: mockSupabase,
        orderId,
        targetStatus: ORDER_STATUS.RECEIVED,
        note: 'Delivered to customer',
      });
      expect(res3.newStatus).toBe(ORDER_STATUS.RECEIVED);
      expect(orderInStore.received_at).toBeDefined();
    });

    it('rejects illegal transitions strictly', async () => {
      expect(canTransitionOrderStatus(ORDER_STATUS.CREATED, ORDER_STATUS.SHIPPED)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.CREATED, ORDER_STATUS.RECEIVED)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.RECEIVED, ORDER_STATUS.PENDING)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.CANCELLED, ORDER_STATUS.CONFIRMED)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.REFUNDED, ORDER_STATUS.PENDING)).toBe(false);

      const orderId = 'ord-illegal-test';
      mockSupabase._store.orders.push({
        id: orderId,
        order_number: 'ORD-ILLEGAL-01',
        customer_id: 'c1',
        warehouse_id: warehouseId,
        location_id: locationId,
        status: ORDER_STATUS.CREATED,
        subtotal: 5000,
        delivery_fee: 2000,
        total_amount: 7000,
        currency: 'NGN',
      });

      await expect(
        transitionOrderStatus({
          supabase: mockSupabase,
          orderId,
          targetStatus: ORDER_STATUS.SHIPPED,
        })
      ).rejects.toThrow(/Invalid status transition/);
    });
  });
});
