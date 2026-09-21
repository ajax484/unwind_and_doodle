import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { processCheckout } from '@/services/checkout.service';
import { getPaymentProvider, PaystackPaymentProvider, FlutterwavePaymentProvider, ManualPaymentProvider } from '@/services/payment';
import { updatePaymentMethod } from '@/services/payment-settings.service';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { CheckoutRequest } from '@/types/checkout';

describe('Checkout Payment Method Selection & Dynamic Provider Resolution (Step 3)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgId = 'org-checkout-test-999';
  const warehouseId = 'wh-checkout-test';
  const locationId = 'loc-checkout-test';
  const productId = 'prod-checkout-test';

  const baseCheckoutRequest: CheckoutRequest = {
    locationId,
    customer: {
      email: 'customer@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '08012345678',
      marketingConsent: false,
    },
    shippingAddress: {
      streetAddress: '14 Admiralty Way',
      city: 'Lekki',
      state: 'Lagos',
    },
    items: [{ productId, quantity: 1, addons: [] }],
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgId, name: 'Unwind and Doodle Test Store', slug: 'unwind-checkout-test' },
      ],
      organization_members: [
        { id: 'mem-admin-1', organization_id: orgId, user_id: 'user-admin', role: 'owner' },
      ],
      warehouses: [
        { id: warehouseId, name: 'Main Hub', code: 'MAIN-HUB', is_active: true },
      ],
      locations: [
        { id: locationId, name: 'Lekki Phase 1', state: 'Lagos', country: 'Nigeria', is_active: true },
      ],
      warehouse_locations: [
        { id: 'wl-1', warehouse_id: warehouseId, location_id: locationId, priority: 1, is_active: true },
      ],
      delivery_rates: [
        { id: 'rate-1', warehouse_id: warehouseId, location_id: locationId, rate: 2000, is_active: true },
      ],
      products: [
        { id: productId, name: 'Mindfulness Coloring Book', selling_price: 15000, is_active: true },
      ],
      inventory: [
        { warehouse_id: warehouseId, product_id: productId, quantity: 20, reserved_quantity: 0 },
      ],
      organization_payment_methods: [
        {
          id: 'pm-pstk',
          organization_id: orgId,
          provider: 'paystack',
          enabled: true,
          display_title: 'Paystack',
        },
        {
          id: 'pm-flw',
          organization_id: orgId,
          provider: 'flutterwave',
          enabled: false,
          display_title: 'Flutterwave',
        },
        {
          id: 'pm-man',
          organization_id: orgId,
          provider: 'manual',
          enabled: false,
          display_title: 'Direct Bank Transfer',
          bank_name: 'GTBank',
          account_name: 'Unwind & Doodle Ltd',
          account_number: '0123456789',
        },
      ],
      orders: [],
      payments: [],
    });
  });

  it('initializes Paystack and records provider="paystack" by default when Paystack is enabled', async () => {
    const initSpy = vi.spyOn(PaystackPaymentProvider.prototype, 'initializeTransaction').mockResolvedValueOnce({
      authorizationUrl: 'https://checkout.paystack.com/access_code_123',
      reference: 'UAD_PSTK_TEST_123',
      provider: 'paystack',
    });

    const result = await processCheckout({
      supabase: mockSupabase as any,
      request: {
        ...baseCheckoutRequest,
        paymentMethod: 'paystack',
      },
    });

    expect(initSpy).toHaveBeenCalled();
    expect(result.provider).toBe('paystack');
    expect(result.paymentType).toBe('redirect');
    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/access_code_123');

    // Verify payment record in database
    const payment = mockSupabase._store.payments.find((p) => p.id === result.paymentId);
    expect(payment).toBeDefined();
    expect(payment.provider).toBe('paystack');
    expect(payment.status).toBe(PAYMENT_STATUS.PENDING);
    expect(payment.amount).toBe(17000); // 15,000 + 2,000 delivery fee
  });

  it('rejects checkout with descriptive error if client attempts to use a disabled provider', async () => {
    // Flutterwave is currently disabled in initialData
    await expect(
      processCheckout({
        supabase: mockSupabase as any,
        request: {
          ...baseCheckoutRequest,
          paymentMethod: 'flutterwave',
        },
      })
    ).rejects.toThrow(/Payment method 'flutterwave' is not currently available for this store/);
  });

  it('supports multiple enabled providers and dynamically routes to Flutterwave when enabled and selected', async () => {
    // Enable Flutterwave
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      { provider: 'flutterwave', enabled: true },
      'user-admin'
    );

    const initSpy = vi.spyOn(FlutterwavePaymentProvider.prototype, 'initializeTransaction').mockResolvedValueOnce({
      authorizationUrl: 'https://checkout.flutterwave.com/pay/flw_link_abc',
      reference: 'UAD_FLW_TEST_456',
      provider: 'flutterwave',
    });

    const result = await processCheckout({
      supabase: mockSupabase as any,
      request: {
        ...baseCheckoutRequest,
        paymentMethod: 'flutterwave',
      },
    });

    expect(initSpy).toHaveBeenCalled();
    expect(result.provider).toBe('flutterwave');
    expect(result.paymentType).toBe('redirect');
    expect(result.authorizationUrl).toBe('https://checkout.flutterwave.com/pay/flw_link_abc');

    // Verify payment record
    const payment = mockSupabase._store.payments.find((p) => p.id === result.paymentId);
    expect(payment).toBeDefined();
    expect(payment.provider).toBe('flutterwave');
    expect(payment.status).toBe(PAYMENT_STATUS.PENDING);
  });

  it('handles Direct Bank Transfer (manual) without fake gateway redirect and returns configured bank details', async () => {
    // Enable Manual Bank Transfer
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      {
        provider: 'manual',
        enabled: true,
        bankName: 'Guaranty Trust Bank',
        accountName: 'Unwind & Doodle Enterprise',
        accountNumber: '0987654321',
        instructions: 'Include Order ID in transfer narration',
      },
      'user-admin'
    );

    const result = await processCheckout({
      supabase: mockSupabase as any,
      request: {
        ...baseCheckoutRequest,
        paymentMethod: 'manual',
      },
    });

    expect(result.provider).toBe('manual');
    expect(result.paymentType).toBe('manual');
    expect(result.authorizationUrl).toBeNull();
    expect(result.bankDetails).toEqual({
      bankName: 'Guaranty Trust Bank',
      accountName: 'Unwind & Doodle Enterprise',
      accountNumber: '0987654321',
      instructions: 'Include Order ID in transfer narration',
    });

    // Verify payment and order records
    const payment = mockSupabase._store.payments.find((p) => p.id === result.paymentId);
    expect(payment).toBeDefined();
    expect(payment.provider).toBe('manual');
    expect(payment.status).toBe(PAYMENT_STATUS.PENDING);
    expect(payment.metadata.bank_details.bankName).toBe('Guaranty Trust Bank');

    const order = mockSupabase._store.orders.find((o) => o.id === result.orderId);
    expect(order).toBeDefined();
    expect(order.status).toBe(ORDER_STATUS.CREATED);

    // Verify inventory reservation held
    const reservation = mockSupabase._store.inventory_reservations.find(
      (r) => r.reference_id === result.orderId || r.order_id === result.orderId || r.status === 'reserved'
    );
    expect(reservation).toBeDefined();
    expect(['active', 'reserved']).toContain(reservation.status);
  });

  it('preserves historical payment isolation when a merchant later disables the payment provider', async () => {
    // 1. Enable Flutterwave & place order with Flutterwave
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      { provider: 'flutterwave', enabled: true },
      'user-admin'
    );

    vi.spyOn(FlutterwavePaymentProvider.prototype, 'initializeTransaction').mockResolvedValueOnce({
      authorizationUrl: 'https://checkout.flutterwave.com/pay/flw_order_1',
      reference: 'UAD_FLW_HIST_ORD',
      provider: 'flutterwave',
    });

    const checkoutResult = await processCheckout({
      supabase: mockSupabase as any,
      request: { ...baseCheckoutRequest, paymentMethod: 'flutterwave' },
    });

    const paymentId = checkoutResult.paymentId;
    const initialPayment = mockSupabase._store.payments.find((p) => p.id === paymentId);
    expect(initialPayment?.provider).toBe('flutterwave');

    // 2. Merchant later disables Flutterwave in settings
    await updatePaymentMethod(
      mockSupabase as any,
      orgId,
      { provider: 'flutterwave', enabled: false },
      'user-admin'
    );

    // 3. Verify historical payment record STILL permanently identifies Flutterwave
    const historicalPayment = mockSupabase._store.payments.find((p) => p.id === paymentId);
    expect(historicalPayment?.provider).toBe('flutterwave');

    // Provider resolved from historical record still resolves Flutterwave provider
    const resolvedProvider = getPaymentProvider(historicalPayment.provider);
    expect(resolvedProvider.name).toBe('flutterwave');
  });

  it('maintains backwards compatibility for requests omitting paymentMethod (defaults to paystack)', async () => {
    const initSpy = vi.spyOn(PaystackPaymentProvider.prototype, 'initializeTransaction').mockResolvedValueOnce({
      authorizationUrl: 'https://checkout.paystack.com/legacy_test',
      reference: 'UAD_LEGACY_REF',
      provider: 'paystack',
    });

    // Request without paymentMethod field
    const result = await processCheckout({
      supabase: mockSupabase as any,
      request: {
        ...baseCheckoutRequest,
      },
    });

    expect(initSpy).toHaveBeenCalled();
    expect(result.provider).toBe('paystack');
    expect(result.paymentType).toBe('redirect');
  });
});
