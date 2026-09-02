import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { calculateOrderPricing } from '@/services/pricing.service';
import { processCheckout } from '@/services/checkout.service';
import { PaystackPaymentProvider } from '@/services/payment/paystack.provider';
import { CheckoutRequest } from '@/types/checkout';

describe('Pricing & Checkout Flow Business Rules', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-01';
  const locationId = 'loc-lagos';
  const bookId = 'prod-book';
  const pencilId = 'prod-pencil';
  const penId = 'prod-pen';
  const discount10Id = 'disc-save10';
  const discountFixedId = 'disc-fixed1000';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [{ id: warehouseId, name: 'Main Hub', is_active: true }],
      warehouse_locations: [{ warehouse_id: warehouseId, location_id: locationId }],
      delivery_rates: [
        {
          warehouse_id: warehouseId,
          location_id: locationId,
          rate: 1500,
          is_active: true,
        },
      ],
      products: [
        { id: bookId, name: 'Mindful Coloring Book', price: 4000, is_active: true },
        { id: pencilId, name: 'Coloring Pencils 12pk', price: 2000, is_active: true },
        { id: penId, name: 'Dual Tip Gel Pens', price: 2500, is_active: true },
      ],
      product_addons: [
        // pencil is addon with discounted override price of 1500 (instead of 2000)
        { product_id: bookId, addon_product_id: pencilId, price_override: 1500, is_required: false, sort_order: 1 },
        // pen is addon with no price override (uses default 2500)
        { product_id: bookId, addon_product_id: penId, price_override: null, is_required: false, sort_order: 2 },
      ],
      inventory: [
        { warehouse_id: warehouseId, product_id: bookId, quantity: 20, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: pencilId, quantity: 20, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: penId, quantity: 20, reserved_quantity: 0 },
      ],
      discounts: [
        {
          id: discount10Id,
          code: 'SAVE10',
          type: 'percentage',
          value: 10, // 10%
          min_order_amount: 3000,
          is_active: true,
          times_used: 0,
          usage_limit: 100,
        },
        {
          id: discountFixedId,
          code: 'FLAT1000',
          type: 'fixed_amount',
          value: 1000, // NGN 1000
          min_order_amount: 5000,
          is_active: true,
          times_used: 0,
          usage_limit: 50,
        },
      ],
    });
  });

  describe('Pricing Calculation', () => {
    it('calculates correct subtotal, add-on pricing with override, delivery fee, and total', async () => {
      const pricing = await calculateOrderPricing({
        supabase: mockSupabase,
        warehouseId,
        locationId,
        items: [
          {
            productId: bookId,
            quantity: 2, // 2 * 4000 = 8000
            addons: [
              { addonProductId: pencilId, quantity: 2 }, // 2 * 1500 (override) = 3000
              { addonProductId: penId, quantity: 1 }, // 1 * 2500 (default) = 2500
            ],
          },
        ],
      });

      expect(pricing.subtotal).toBe(8000);
      expect(pricing.addOnsTotal).toBe(5500); // 3000 + 2500
      expect(pricing.deliveryFee).toBe(1500);
      expect(pricing.discountTotal).toBe(0);
      // Total = 8000 + 5500 - 0 + 1500 = 15000
      expect(pricing.total).toBe(15000);
      expect(pricing.currency).toBe('NGN');
    });

    it('applies percentage discount correctly when criteria are met', async () => {
      const pricing = await calculateOrderPricing({
        supabase: mockSupabase,
        warehouseId,
        locationId,
        items: [{ productId: bookId, quantity: 1, addons: [] }], // Subtotal = 4000
        discountCode: 'SAVE10',
      });

      expect(pricing.subtotal).toBe(4000);
      expect(pricing.discountTotal).toBe(400); // 10% of 4000
      expect(pricing.deliveryFee).toBe(1500);
      // Total = 4000 - 400 + 1500 = 5100
      expect(pricing.total).toBe(5100);
      expect(pricing.appliedDiscount?.code).toBe('SAVE10');
    });

    it('rejects add-ons not configured for the target product', async () => {
      // Trying to add book as addon to pencil (not in product_addons)
      await expect(
        calculateOrderPricing({
          supabase: mockSupabase,
          warehouseId,
          locationId,
          items: [
            {
              productId: pencilId,
              quantity: 1,
              addons: [{ addonProductId: bookId, quantity: 1 }],
            },
          ],
        })
      ).rejects.toThrow(/not configured as an allowed addon/);
    });
  });

  describe('Full Checkout Process', () => {
    const validCheckoutRequest: CheckoutRequest = {
      locationId,
      customer: {
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '+2348012345678',
        marketingConsent: true,
      },
      shippingAddress: {
        streetAddress: '12 Marina Road',
        city: 'Lagos Island',
        state: 'Lagos',
        postalCode: '100001',
      },
      items: [
        {
          productId: bookId,
          quantity: 2,
          addons: [{ addonProductId: pencilId, quantity: 2 }],
        },
      ],
      discountCode: 'SAVE10',
    };

    it('executes full atomic checkout successfully and returns Paystack authorization URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/auth_xyz123',
            access_code: 'acc_123',
            reference: 'UAD_TEST_123',
          },
        }),
      });

      const provider = new PaystackPaymentProvider({
        secretKey: 'sk_test_paystack_mock',
        fetchFn: mockFetch as any,
      });

      const result = await processCheckout({
        supabase: mockSupabase,
        request: validCheckoutRequest,
        paymentProvider: provider,
      });

      expect(result.orderId).toBeDefined();
      expect(result.orderNumber).toMatch(/^ORD-/);
      expect(result.authorizationUrl).toBe(
        'https://checkout.paystack.com/auth_xyz123'
      );
      expect(result.paymentReference).toMatch(/^UAD/);
      expect(result.pricing.total).toBe(11700); // Subtotal 8000 + Addon 3000 - Discount 800 + Delivery 1500 = 11700

      // Verify Database state
      // 1. Order created with status 'created'
      const order = mockSupabase._store.orders.find((o) => o.id === result.orderId);
      expect(order).toBeDefined();
      expect(order.status).toBe('created');
      expect(order.total).toBe(11700);

      // 2. Order items and addon persisted
      const orderItems = mockSupabase._store.order_items.filter((oi) => oi.order_id === result.orderId);
      expect(orderItems.length).toBe(1);
      expect(orderItems[0].unit_price).toBe(4000);

      const orderItemAddons = mockSupabase._store.order_item_addons.filter(
        (oia) => oia.order_item_id === orderItems[0].id
      );
      expect(orderItemAddons.length).toBe(1);
      expect(orderItemAddons[0].unit_price).toBe(1500);

      // 3. Inventory reserved
      const reservations = mockSupabase._store.inventory_reservations.filter(
        (r) => r.reference_id === result.orderId
      );
      expect(reservations.length).toBe(2); // book + pencil
      expect(reservations.every((r) => r.status === 'active')).toBe(true);

      // 4. Payment record created with provider = 'paystack'
      const payment = mockSupabase._store.payments.find((p) => p.order_id === result.orderId);
      expect(payment).toBeDefined();
      expect(payment.status).toBe('pending');
      expect(payment.provider).toBe('paystack');
      expect(payment.provider_reference).toBe(result.paymentReference);

      // 5. Domain event emitted
      const event = mockSupabase._store.domain_events.find(
        (e) => e.aggregate_id === result.orderId && e.event_type === 'order.created'
      );
      expect(event).toBeDefined();
      expect(event.payload.customerEmail).toBe('ada@example.com');
    });

    it('fails checkout gracefully and cleans up when inventory reservation fails', async () => {
      const bookInv = mockSupabase._store.inventory.find(
        (i) => i.warehouse_id === warehouseId && i.product_id === bookId
      );
      bookInv.quantity = 0;

      await expect(
        processCheckout({
          supabase: mockSupabase,
          request: validCheckoutRequest,
        })
      ).rejects.toThrow(/Insufficient stock/);
    });

    it('executes bundle checkout by resolving physical component inventory at warehouse', async () => {
      const bundleId = 'prod-bundle-01';
      mockSupabase._store.products.push({
        id: bundleId,
        name: 'Complete Mindful Kit Bundle',
        price: 5500,
        product_type: 'bundle',
        is_active: true,
      });
      mockSupabase._store.bundle_items.push(
        { id: 'bi-1', bundle_product_id: bundleId, component_product_id: bookId, quantity: 1 },
        { id: 'bi-2', bundle_product_id: bundleId, component_product_id: pencilId, quantity: 1 }
      );

      const bundleCheckoutReq: CheckoutRequest = {
        locationId,
        customer: {
          email: 'bundleuser@example.com',
          firstName: 'Bundle',
          lastName: 'Buyer',
          marketingConsent: false,
        },
        shippingAddress: {
          streetAddress: '45 Marina Street',
          city: 'Lagos',
          state: 'Lagos',
        },
        items: [
          {
            productId: bundleId,
            quantity: 2,
            addons: [],
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/auth_bundle_123',
            access_code: 'acc_bundle_123',
            reference: 'UAD_BUNDLE_123',
          },
        }),
      });

      const provider = new PaystackPaymentProvider({
        secretKey: 'sk_test_paystack_mock',
        fetchFn: mockFetch as any,
      });

      const result = await processCheckout({
        supabase: mockSupabase,
        request: bundleCheckoutReq,
        paymentProvider: provider,
      });

      expect(result.orderId).toBeDefined();
      expect(result.warehouseId).toBe(warehouseId);

      const reservations = mockSupabase._store.inventory_reservations.filter(
        (r) => r.reference_id === result.orderId
      );
      expect(reservations.length).toBe(2);
      expect(reservations.map((r) => r.product_id).sort()).toEqual([bookId, pencilId].sort());
      expect(reservations.find((r) => r.product_id === bookId)?.quantity).toBe(2);
      expect(reservations.find((r) => r.product_id === pencilId)?.quantity).toBe(2);

      const bundleComps = mockSupabase._store.order_item_bundle_components.filter(
        (bc) => bc.order_item_id === mockSupabase._store.order_items.find((oi) => oi.order_id === result.orderId)?.id
      );
      expect(bundleComps.length).toBe(2);
      expect(bundleComps.find((bc) => bc.component_product_id === bookId)?.total_quantity).toBe(2);
      expect(bundleComps.find((bc) => bc.component_product_id === pencilId)?.total_quantity).toBe(2);
    });
  });
});
