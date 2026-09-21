import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPaymentProvider,
  UnsupportedPaymentProviderError,
  PaystackPaymentProvider,
  FlutterwavePaymentProvider,
  ManualPaymentProvider,
} from '@/services/payment';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { revalidatePayment } from '@/services/payment-revalidation.service';
import { processCheckout } from '@/services/checkout.service';
import { processPaymentWebhook } from '@/services/webhook.service';
import { GET as verifyOrderPayment } from '@/app/api/orders/verify/route';
import { NextRequest } from 'next/server';
import { ORDER_STATUS, PAYMENT_STATUS, CURRENCY } from '@/lib/constants';

describe('Centralized Payment Provider Factory & Architecture Refactor', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-provider-test';
  const locationId = 'loc-provider-test';
  const productId = 'prod-provider-test';
  const orderId = 'ord-provider-test-1';
  const flutterwaveOrderId = 'ord-provider-flw-2';

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: warehouseId, name: 'Lagos Main Hub', code: 'LAG-HUB', is_active: true },
      ],
      locations: [
        { id: locationId, name: 'Lagos Island', state: 'Lagos', country: 'Nigeria', is_active: true },
      ],
      warehouse_locations: [
        { id: 'wl-1', warehouse_id: warehouseId, location_id: locationId, priority: 1, is_active: true },
      ],
      delivery_rates: [
        { id: 'rate-1', warehouse_id: warehouseId, location_id: locationId, rate: 1500, is_active: true },
      ],
      products: [
        { id: productId, name: 'Mindfulness Journal', price: 10000, is_active: true },
      ],
      product_images: [],
      product_categories: [],
      product_addons: [],
      inventory: [
        { warehouse_id: warehouseId, product_id: productId, quantity: 50, reserved_quantity: 0 },
      ],
      inventory_reservations: [],
      customers: [
        { id: 'cust-1', email: 'customer@example.com', first_name: 'Amara', last_name: 'Okonkwo', is_active: true },
      ],
      orders: [
        {
          id: orderId,
          order_number: 'ORD-HIST-PAYSTACK-1',
          customer_id: 'cust-1',
          warehouse_id: warehouseId,
          location_id: locationId,
          status: ORDER_STATUS.CREATED,
          subtotal: 10000,
          discount_total: 0,
          shipping_fee: 1500,
          total: 11500,
          email: 'customer@example.com',
          first_name: 'Amara',
          last_name: 'Okonkwo',
          shipping_address: { streetAddress: '10 Marina', city: 'Lagos', state: 'Lagos' },
        },
        {
          id: flutterwaveOrderId,
          order_number: 'ORD-HIST-FLUTTERWAVE-2',
          customer_id: 'cust-1',
          warehouse_id: warehouseId,
          location_id: locationId,
          status: ORDER_STATUS.CREATED,
          subtotal: 10000,
          discount_total: 0,
          shipping_fee: 1500,
          total: 11500,
          email: 'customer@example.com',
          first_name: 'Amara',
          last_name: 'Okonkwo',
          shipping_address: { streetAddress: '10 Marina', city: 'Lagos', state: 'Lagos' },
        },
      ],
      order_items: [
        {
          id: 'oi-1',
          order_id: orderId,
          product_id: productId,
          product_name: 'Mindfulness Journal',
          quantity: 1,
          unit_price: 10000,
          total: 10000,
        },
        {
          id: 'oi-2',
          order_id: flutterwaveOrderId,
          product_id: productId,
          product_name: 'Mindfulness Journal',
          quantity: 1,
          unit_price: 10000,
          total: 10000,
        },
      ],
      order_item_addons: [],
      order_status_history: [],
      payments: [
        {
          id: 'pay-pstk-hist-1',
          order_id: orderId,
          provider: 'paystack',
          provider_reference: 'UAD_PSTK_HIST_REF_1',
          amount: 11500,
          currency: CURRENCY.NGN,
          status: PAYMENT_STATUS.PENDING,
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'pay-flw-hist-2',
          order_id: flutterwaveOrderId,
          provider: 'flutterwave',
          provider_reference: 'UAD_FLW_HIST_REF_2',
          amount: 11500,
          currency: CURRENCY.NGN,
          status: PAYMENT_STATUS.PENDING,
          created_at: '2026-08-02T10:00:00Z',
        },
      ],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Provider Factory Resolution (getPaymentProvider)', () => {
    it('resolves PaystackPaymentProvider for "paystack" (case-insensitive)', () => {
      const provider1 = getPaymentProvider('paystack');
      expect(provider1).toBeInstanceOf(PaystackPaymentProvider);
      expect(provider1.name).toBe('paystack');

      const provider2 = getPaymentProvider('PAYSTACK');
      expect(provider2).toBeInstanceOf(PaystackPaymentProvider);
    });

    it('resolves FlutterwavePaymentProvider for "flutterwave" and "flw" (case-insensitive)', () => {
      const flw1 = getPaymentProvider('flutterwave');
      expect(flw1).toBeInstanceOf(FlutterwavePaymentProvider);
      expect(flw1.name).toBe('flutterwave');

      const flw2 = getPaymentProvider('FLW');
      expect(flw2).toBeInstanceOf(FlutterwavePaymentProvider);
      expect(flw2.name).toBe('flutterwave');
    });

    it('resolves ManualPaymentProvider for "manual" (case-insensitive)', () => {
      const manual = getPaymentProvider('manual');
      expect(manual).toBeInstanceOf(ManualPaymentProvider);
      expect(manual.name).toBe('manual');
      expect(manual.generateReference()).toMatch(/^UAD_MAN_/);
    });

    it('throws explicit UnsupportedPaymentProviderError on unknown/unsupported providers without silent fallback', () => {
      expect(() => getPaymentProvider('stripe')).toThrowError(UnsupportedPaymentProviderError);
      expect(() => getPaymentProvider('crypto')).toThrowError(/Unsupported payment provider: crypto/);
      expect(() => getPaymentProvider('')).toThrowError(UnsupportedPaymentProviderError);
    });
  });

  describe('2. Historical Payment Revalidation & Provider Awareness', () => {
    it('verifies historical Paystack payment record using Paystack provider', async () => {
      const mockVerify = vi
        .spyOn(PaystackPaymentProvider.prototype, 'verifyTransaction')
        .mockResolvedValueOnce({
          status: 'successful',
          reference: 'UAD_PSTK_HIST_REF_1',
          amount: 11500,
          currency: 'NGN',
          paidAt: new Date().toISOString(),
        });

      const result = await revalidatePayment(mockSupabase, {
        paymentId: 'pay-pstk-hist-1',
      });

      expect(mockVerify).toHaveBeenCalledWith('UAD_PSTK_HIST_REF_1');
      expect(result.success).toBe(true);
      expect(result.status).toBe('successful');
      expect(result.provider).toBe('paystack');
    });

    it('verifies historical Flutterwave payment record using Flutterwave provider', async () => {
      const mockFlwVerify = vi
        .spyOn(FlutterwavePaymentProvider.prototype, 'verifyTransaction')
        .mockResolvedValueOnce({
          status: 'successful',
          reference: 'UAD_FLW_HIST_REF_2',
          amount: 11500,
          currency: 'NGN',
          paidAt: new Date().toISOString(),
        });

      const result = await revalidatePayment(mockSupabase, {
        paymentId: 'pay-flw-hist-2',
      });

      expect(mockFlwVerify).toHaveBeenCalledWith('UAD_FLW_HIST_REF_2');
      expect(result.success).toBe(true);
      expect(result.status).toBe('successful');
      expect(result.provider).toBe('flutterwave');
    });
  });

  describe('3. Webhook Handling with Strict Provider Matching', () => {
    it('rejects webhook when webhook provider does not match the payment record provider', async () => {
      const flwProvider = getPaymentProvider('flutterwave');
      vi.spyOn(flwProvider, 'verifyWebhook').mockResolvedValueOnce({
        isValid: true,
        reference: 'UAD_PSTK_HIST_REF_1', // A paystack payment reference sent to flutterwave webhook
        event: 'charge.completed',
      });

      await expect(
        processPaymentWebhook({
          supabase: mockSupabase,
          rawBody: JSON.stringify({ event: 'charge.completed' }),
          headers: {},
          paymentProvider: flwProvider,
        })
      ).rejects.toThrow(/Payment provider mismatch: payment was created with paystack, received webhook for flutterwave/);
    });
  });

  describe('4. Checkout Flow with Injected / Resolved Provider', () => {
    it('accepts and initializes transaction with any resolved PaymentProvider from factory', async () => {
      const flwProvider = getPaymentProvider('flutterwave');
      vi.spyOn(flwProvider, 'initializeTransaction').mockResolvedValueOnce({
        authorizationUrl: 'https://checkout.flutterwave.com/pay/flw_123',
        reference: 'UAD_FLW_TEST_99',
        provider: 'flutterwave',
      });

      const result = await processCheckout({
        supabase: mockSupabase,
        request: {
          locationId,
          customer: {
            email: 'newcustomer@example.com',
            firstName: 'Tunde',
            lastName: 'Bakare',
            marketingConsent: false,
          },
          shippingAddress: {
            streetAddress: '15 Victoria Island',
            city: 'Lagos',
            state: 'Lagos',
          },
          items: [{ productId, quantity: 1, addons: [] }],
        },
        paymentProvider: flwProvider,
      });

      expect(result.authorizationUrl).toBe('https://checkout.flutterwave.com/pay/flw_123');
      const { data: createdPayment } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('id', result.paymentId)
        .single();
      expect(createdPayment?.provider).toBe('flutterwave');
    });
  });
});
