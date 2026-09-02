import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import { processCheckout } from '@/services/checkout.service';
import {
  PaymentProvider,
  PaymentInput,
  PaymentInitialization,
  PaymentVerification,
  PaymentWebhookVerification,
} from '@/services/payment/provider.interface';

class MockPaymentProvider implements PaymentProvider {
  readonly name = 'paystack';

  constructor(private mockUrl = 'https://checkout.paystack.com/pay/pay_tx_mock_123') {}

  generateReference(prefix = 'UAD'): string {
    return `${prefix}_MOCK_REF_123`;
  }

  async initializeTransaction(input: PaymentInput): Promise<PaymentInitialization> {
    return {
      authorizationUrl: this.mockUrl,
      reference: input.reference,
      provider: 'paystack',
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerification> {
    return {
      status: 'successful',
      reference,
      amount: 14500,
      currency: 'NGN',
      paidAt: new Date().toISOString(),
      rawResponse: {},
    };
  }

  async verifyWebhook(signature: string, payload: any): Promise<PaymentWebhookVerification> {
    return {
      isValid: true,
      event: 'charge.completed',
      payload: {},
    };
  }
}

describe('Phase 3E: Checkout Page & Process Flow', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockPaymentProvider: MockPaymentProvider;

  const warehouseId = 'wh-lagos-hub';
  const locationIkejaId = 'loc-ikeja-01';
  const coloringBookId = 'prod-coloring-book-01';
  const pencilsAddonId = 'prod-pencils-addon-01';

  beforeEach(() => {
    mockPaymentProvider = new MockPaymentProvider('https://checkout.paystack.com/pay/pay_tx_mock_123');

    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: warehouseId, name: 'Lagos Hub', code: 'LAG-01', is_active: true },
      ],
      locations: [
        {
          id: locationIkejaId,
          name: 'Ikeja',
          state: 'Lagos',
          country: 'Nigeria',
          is_active: true,
        },
      ],
      warehouse_locations: [
        {
          id: 'wl-1',
          warehouse_id: warehouseId,
          location_id: locationIkejaId,
          priority: 1,
          is_active: true,
        },
      ],
      delivery_rates: [
        {
          id: 'rate-1',
          warehouse_id: warehouseId,
          location_id: locationIkejaId,
          base_rate: 2000,
          per_kg_rate: 0,
          estimated_days: '1-2 business days',
          is_active: true,
        },
      ],
      categories: [],
      products: [
        {
          id: coloringBookId,
          name: 'Mindful Floral Coloring Book',
          slug: 'mindful-floral-coloring-book',
          price: 5000,
          requires_customization: true,
          is_active: true,
        },
        {
          id: pencilsAddonId,
          name: '24 Artist Pencils',
          slug: '24-artist-pencils',
          price: 3500,
          requires_customization: false,
          is_active: true,
        },
      ],
      product_images: [],
      product_categories: [],
      product_addons: [
        {
          id: 'addon-link-1',
          product_id: coloringBookId,
          addon_product_id: pencilsAddonId,
          price_override: 2500,
          is_required: false,
          active: true,
        },
      ],
      inventory: [
        { warehouse_id: warehouseId, product_id: coloringBookId, quantity: 25, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: pencilsAddonId, quantity: 40, reserved_quantity: 0 },
      ],
      inventory_reservations: [],
      carts: [],
      cart_items: [],
      customers: [],
      orders: [],
      order_items: [],
      order_item_addons: [],
      order_status_history: [],
      payments: [],
      customizations: [],
      customization_assets: [],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Checkout Validation & Execution', () => {
    it('executes end-to-end checkout with customer, shipping address, inventory reservation, order creation, and Flutterwave initialization', async () => {
      const checkoutRequest = {
        customer: {
          email: 'ada.lovelace@example.ng',
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: '08012345678',
          whatsappPhone: '08012345678',
          marketingConsent: true,
          whatsappConsent: true,
        },
        shippingAddress: {
          streetAddress: '14 Admiralty Way',
          city: 'Ikeja',
          state: 'Lagos',
          lga: 'Ikeja',
        },
        locationId: locationIkejaId,
        items: [
          {
            productId: coloringBookId,
            quantity: 2,
            customization: {
              notes: 'For Ada',
              assetUrls: ['https://storage.example.com/ada.jpg'],
            },
            addons: [
              {
                addonProductId: pencilsAddonId,
                quantity: 1,
              },
            ],
          },
        ],
      };

      const result = await processCheckout({
        supabase: mockSupabase,
        request: checkoutRequest,
        paymentProvider: mockPaymentProvider,
      });

      expect(result.orderId).toBeDefined();
      expect(result.orderNumber).toBeDefined();
      expect(result.authorizationUrl).toBe('https://checkout.paystack.com/pay/pay_tx_mock_123');

      // Pricing check: (2 * 5000) products + 2500 (addon) + 2000 (delivery) = 14500
      expect(result.pricing.subtotal).toBe(10000);
      expect(result.pricing.addOnsTotal).toBe(2500);
      expect(result.pricing.deliveryFee).toBe(2000);
      expect(result.pricing.total).toBe(14500);
    });

    it('rejects checkout when warehouse stock is insufficient', async () => {
      const checkoutRequest = {
        customer: {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '08000000000',
          marketingConsent: false,
        },
        shippingAddress: {
          streetAddress: 'Test Address',
          city: 'Ikeja',
          state: 'Lagos',
        },
        locationId: locationIkejaId,
        items: [
          {
            productId: coloringBookId,
            quantity: 1000, // Exceeds stock of 25
            addons: [],
          },
        ],
      };

      await expect(
        processCheckout({
          supabase: mockSupabase,
          request: checkoutRequest,
          paymentProvider: mockPaymentProvider,
        })
      ).rejects.toThrow();
    });
  });
});
