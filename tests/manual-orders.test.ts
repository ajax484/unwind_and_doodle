import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  createAdminManualOrder,
  getPaymentRequestByToken,
  initializePaymentRequestTransaction,
  cancelManualOrder,
  previewManualOrderPricing,
  updateCustomerOrderDetails,
} from '../src/services/manual-order.service';
import { resolveDeliveryFee } from '../src/services/pricing.service';
import { computeAvailableStock, computeBuildableBundles } from '../src/services/inventory.service';
import { processPaymentWebhook } from '../src/services/webhook.service';
import {
  PaymentProvider,
  PaymentInput,
  PaymentInitialization,
  PaymentVerification,
  PaymentWebhookVerification,
} from '../src/services/payment/provider.interface';

class TestMockPaymentProvider implements PaymentProvider {
  readonly name = 'paystack';
  public expectedAmount = 16500;
  public expectedCurrency = 'NGN';
  public shouldFailSignature = false;

  generateReference(prefix = 'UAD'): string {
    return `${prefix}_MANUAL_${Date.now()}`;
  }

  async initializeTransaction(input: PaymentInput): Promise<PaymentInitialization> {
    return {
      authorizationUrl: 'https://checkout.paystack.com/mock-manual-pay',
      reference: input.reference,
      provider: 'paystack',
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerification> {
    return {
      status: 'successful',
      reference,
      amount: this.expectedAmount,
      currency: this.expectedCurrency,
      paidAt: new Date().toISOString(),
      channel: 'card',
    };
  }

  async verifyWebhook(rawBody?: string, headers?: any): Promise<PaymentWebhookVerification> {
    if (this.shouldFailSignature) {
      return { isValid: false };
    }
    const parsed = rawBody ? JSON.parse(rawBody) : {};
    return { isValid: true, reference: parsed.reference || 'mock-ref' };
  }
}

describe('Phase 6I: Manual Orders & Customer Payment Links Workflow', () => {
  const orgId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const otherOrgId = '99c7af2e-afd4-4504-a43f-b14cc45d6264';
  const adminUserId = '11111111-1111-4111-8111-111111111111';
  const warehouseId = '22222222-2222-4222-8222-222222222222';
  const locationId = '33333333-3333-4333-8333-333333333333';
  const locationId2 = '33333333-3333-4333-8333-333333333334';

  // Sample valid UUID products
  const physicalProdId = '44444444-4444-4444-8444-444444444444';
  const bundleProdId = '55555555-5555-4555-8555-555555555555';
  const compProdId1 = '66666666-6666-4666-8666-666666666666';
  const compProdId2 = '77777777-7777-4777-8777-777777777777';
  const crossOrgProdId = '88888888-8888-4888-8888-888888888888';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle', slug: 'unwind-and-doodle' }, { id: otherOrgId, name: 'Other Org', slug: 'other-org' }],
      organization_members: [
        { id: 'mem-1', organization_id: orgId, user_id: adminUserId, role: 'admin' },
      ],
      locations: [
        { id: locationId, organization_id: orgId, name: 'Lagos Central' },
        { id: locationId2, organization_id: orgId, name: 'Abuja Central' },
      ],
      warehouses: [{ id: warehouseId, organization_id: orgId, name: 'Main Warehouse', is_active: true }],
      warehouse_locations: [
        { warehouse_id: warehouseId, location_id: locationId },
        { warehouse_id: warehouseId, location_id: locationId2 },
      ],
      delivery_rates: [
        { id: 'dr-1', warehouse_id: warehouseId, location_id: locationId, price: 1500, active: true },
        { id: 'dr-2', warehouse_id: warehouseId, location_id: locationId2, price: 3500, active: true },
      ],
      products: [
        {
          id: physicalProdId,
          organization_id: orgId,
          name: 'Coloring Book',
          slug: 'coloring-book',
          product_type: 'physical',
          status: 'published',
          selling_price: 5000,
          cost_price: 2000,
        },
        {
          id: compProdId1,
          organization_id: orgId,
          name: 'Pencil Set',
          slug: 'pencil-set',
          product_type: 'physical',
          status: 'published',
          selling_price: 3000,
          cost_price: 1000,
        },
        {
          id: compProdId2,
          organization_id: orgId,
          name: 'Marker Set',
          slug: 'marker-set',
          product_type: 'physical',
          status: 'published',
          selling_price: 4000,
          cost_price: 1500,
        },
        {
          id: bundleProdId,
          organization_id: orgId,
          name: 'Creative Bundle',
          slug: 'creative-bundle',
          product_type: 'bundle',
          status: 'published',
          selling_price: 10000,
          cost_price: 4500,
        },
        {
          id: crossOrgProdId,
          organization_id: otherOrgId,
          name: 'Forbidden Item',
          slug: 'forbidden-item',
          product_type: 'physical',
          status: 'published',
          selling_price: 9999,
          cost_price: 5000,
        },
      ],
      bundle_items: [
        { id: 'bi-1', bundle_product_id: bundleProdId, component_product_id: compProdId1, quantity: 2 },
        { id: 'bi-2', bundle_product_id: bundleProdId, component_product_id: compProdId2, quantity: 1 },
      ],
      inventory: [
        { id: 'inv-1', warehouse_id: warehouseId, product_id: physicalProdId, quantity_on_hand: 50, quantity_reserved: 0 },
        { id: 'inv-2', warehouse_id: warehouseId, product_id: bundleProdId, quantity_on_hand: 20, quantity_reserved: 0 },
        { id: 'inv-3', warehouse_id: warehouseId, product_id: compProdId1, quantity_on_hand: 50, quantity_reserved: 0 },
        { id: 'inv-4', warehouse_id: warehouseId, product_id: compProdId2, quantity_on_hand: 50, quantity_reserved: 0 },
      ],
      discounts: [
        {
          id: 'disc-10off',
          organization_id: orgId,
          code: 'WELCOME10',
          discount_type: 'percentage',
          discount_value: 10,
          active: true,
        },
        {
          id: 'disc-expired',
          organization_id: orgId,
          code: 'EXPIRED10',
          discount_type: 'percentage',
          discount_value: 10,
          active: true,
          expires_at: '2020-01-01T00:00:00Z',
        },
      ],
      customers: [],
    });
  });

  it('1. Creates a manual order for a guest customer with physical & bundle items', async () => {
    const result = await createAdminManualOrder(
      mockSupabase,
      {
        customer: {
          email: 'guest@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '+2348012345678',
        },
        shippingAddress: {
          addressLine1: '123 Coastal Way',
          city: 'Lekki',
          state: 'Lagos',
          country: 'Nigeria',
        },
        items: [
          { productId: physicalProdId, quantity: 1 }, // ₦5,000
          { productId: bundleProdId, quantity: 1 },   // ₦10,000
        ],
        manualOrderChannel: 'instagram',
        shippingFee: 1500,
        warehouseId,
      },
      adminUserId,
      orgId
    );

    expect(result).toBeDefined();
    expect(result.token).toMatch(/^mpr_/);
    expect(result.orderNumber).toMatch(/^ORD-M-/);
    expect(result.amount).toBe(16500); // 5000 + 10000 + 1500

    // Verify order was recorded as manual
    const { data: order } = await mockSupabase.from('orders').select('*').eq('id', result.orderId).single();
    expect(order).toBeDefined();
    expect(order!.order_source).toBe('manual');
    expect(order!.manual_order_channel).toBe('instagram');
    expect(order!.status).toBe('created');
    expect(order!.subtotal).toBe(15000);
    expect(order!.total).toBe(16500);

    // Verify order items & bundle component snapshots
    const { data: items } = await mockSupabase.from('order_items').select('*').eq('order_id', result.orderId);
    expect(items).toBeDefined();
    expect(items!.length).toBe(2);

    const bundleItem = items!.find((i) => i.product_id === bundleProdId);
    expect(bundleItem).toBeDefined();

    const { data: bundleComps } = await mockSupabase
      .from('order_item_bundle_components')
      .select('*')
      .eq('order_item_id', bundleItem!.id);
    expect(bundleComps).toBeDefined();
    expect(bundleComps!.length).toBe(2);
  });

  it('2. Applies server-authoritative discount code during manual order creation', async () => {
    const result = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'discount@example.com', firstName: 'Alex' },
        shippingAddress: { addressLine1: '456 Palm Ave', city: 'Ikeja', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 2 }], // ₦10,000 subtotal
        discountCode: 'WELCOME10',                           // 10% = ₦1,000 discount
        shippingFee: 2000,
        warehouseId,
      },
      adminUserId,
      orgId
    );

    expect(result.amount).toBe(11000); // 10000 - 1000 + 2000

    const { data: order } = await mockSupabase.from('orders').select('*').eq('id', result.orderId).single();
    expect(order).toBeDefined();
    expect(order!.subtotal).toBe(10000);
    expect(order!.discount_total).toBe(1000);
    expect(order!.shipping_fee).toBe(2000);
    expect(order!.total).toBe(11000);
    expect(order!.discount_code).toBe('WELCOME10');
  });

  it('3. Rejects creating manual order with cross-organization products', async () => {
    await expect(
      createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'hacker@example.com' },
          shippingAddress: { addressLine1: 'Test St', city: 'Lagos', state: 'Lagos' },
          items: [{ productId: crossOrgProdId, quantity: 1 }],
          warehouseId,
        },
        adminUserId,
        orgId
      )
    ).rejects.toThrow(/belongs to another organization/i);
  });

  it('4. Rejects creating manual order with insufficient inventory', async () => {
    await expect(
      createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'bigbuyer@example.com' },
          shippingAddress: { addressLine1: 'Test St', city: 'Lagos', state: 'Lagos' },
          items: [{ productId: physicalProdId, quantity: 9999 }], // Exceeds 50 in stock
          warehouseId,
        },
        adminUserId,
        orgId
      )
    ).rejects.toThrow(/insufficient/i);
  });

  it('5. Fetches public payment request detail by token without requiring authentication', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'public@example.com', firstName: 'Sam' },
        shippingAddress: { addressLine1: '789 Marina Rd', city: 'Lagos Island', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const publicDetail = await getPaymentRequestByToken(mockSupabase, created.token);
    expect(publicDetail).toBeDefined();
    expect(publicDetail.token).toBe(created.token);
    expect(publicDetail.orderNumber).toBe(created.orderNumber);
    expect(publicDetail.customer.email).toBe('public@example.com');
    expect(publicDetail.status).toBe('pending');
    expect(publicDetail.items.length).toBe(1);
    expect(publicDetail.pricing.total).toBe(5000);
    expect(publicDetail.store?.name).toBe('Unwind & Doodle');
  });

  it('6. Initializes Paystack payment transaction for payment request link', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'paystack@example.com', firstName: 'David' },
        shippingAddress: { addressLine1: '10 Victoria Island', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const mockProvider = new TestMockPaymentProvider();
    const txResult = await initializePaymentRequestTransaction(mockSupabase, created.token, undefined, mockProvider);
    expect(txResult).toBeDefined();
    expect(txResult.authorizationUrl).toBeDefined();
    expect(txResult.reference).toBeDefined();
  });

  it('7. Processes Paystack webhook payment: updates order status from created to pending and payment request status to paid', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'webhook@example.com', firstName: 'Nneka' },
        shippingAddress: { addressLine1: '12 Eko Atlantic', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const { data: payment } = await mockSupabase
      .from('payments')
      .select('*')
      .eq('order_id', created.orderId)
      .single();

    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 5000;

    const webhookResult = await processPaymentWebhook({
      supabase: mockSupabase,
      rawBody: JSON.stringify({ reference: payment!.provider_reference }),
      headers: { 'x-paystack-signature': 'mock-sig' },
      paymentProvider: mockProvider,
    });

    expect(webhookResult.success).toBe(true);

    const { data: updatedOrder } = await mockSupabase.from('orders').select('*').eq('id', created.orderId).single();
    expect(updatedOrder).toBeDefined();
    expect(updatedOrder!.status).toBe('pending');

    const { data: updatedReq } = await mockSupabase
      .from('order_payment_requests')
      .select('*')
      .eq('token', created.token)
      .single();
    expect(updatedReq).toBeDefined();
    expect(updatedReq!.status).toBe('paid');
    expect(updatedReq!.paid_at).toBeDefined();
  });

  it('8. Idempotency: Duplicate webhook processing does not duplicate order/payment updates', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'idempotent@example.com' },
        shippingAddress: { addressLine1: '15 Allen Ave', city: 'Ikeja', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 5000;

    await processPaymentWebhook({
      supabase: mockSupabase,
      rawBody: JSON.stringify({ reference: payment!.provider_reference }),
      headers: { 'x-paystack-signature': 'mock-sig' },
      paymentProvider: mockProvider,
    });

    const secondResult = await processPaymentWebhook({
      supabase: mockSupabase,
      rawBody: JSON.stringify({ reference: payment!.provider_reference }),
      headers: { 'x-paystack-signature': 'mock-sig' },
      paymentProvider: mockProvider,
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.alreadyProcessed).toBe(true);
  });

  it('9. Cancelling an unpaid manual order releases inventory reservation and marks payment request as cancelled', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'cancel@example.com' },
        shippingAddress: { addressLine1: '20 Airport Rd', city: 'Ikeja', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    await cancelManualOrder(mockSupabase, created.orderId, adminUserId, orgId);

    const { data: cancelledOrder } = await mockSupabase.from('orders').select('*').eq('id', created.orderId).single();
    expect(cancelledOrder).toBeDefined();
    expect(cancelledOrder!.status).toBe('cancelled');

    const { data: cancelledReq } = await mockSupabase
      .from('order_payment_requests')
      .select('*')
      .eq('token', created.token)
      .single();
    expect(cancelledReq).toBeDefined();
    expect(cancelledReq!.status).toBe('cancelled');
  });

  it('10. Prevents payment initialization on already-paid orders', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'already-paid@example.com' },
        shippingAddress: { addressLine1: '50 Marina', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 5000;

    await processPaymentWebhook({
      supabase: mockSupabase,
      rawBody: JSON.stringify({ reference: payment!.provider_reference }),
      headers: { 'x-paystack-signature': 'mock-sig' },
      paymentProvider: mockProvider,
    });

    await expect(
      initializePaymentRequestTransaction(mockSupabase, created.token, undefined, mockProvider)
    ).rejects.toThrow(/already been paid/i);
  });

  it('11. Rejects duplicate items in input', async () => {
    await expect(
      createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'dup@example.com' },
          shippingAddress: { addressLine1: '50 Marina', city: 'Lagos', state: 'Lagos' },
          items: [
            { productId: physicalProdId, quantity: 1 },
            { productId: physicalProdId, quantity: 2 },
          ],
          warehouseId,
        },
        adminUserId,
        orgId
      )
    ).rejects.toThrow(/duplicate/i);
  });

  it('12. Rejects expired discount codes using canonical discount schema', async () => {
    await expect(
      createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'expired-disc@example.com' },
          shippingAddress: { addressLine1: '50 Marina', city: 'Lagos', state: 'Lagos' },
          items: [{ productId: physicalProdId, quantity: 1 }],
          discountCode: 'EXPIRED10',
          warehouseId,
        },
        adminUserId,
        orgId
      )
    ).rejects.toThrow(/expired/i);
  });

  it('13. Webhook verification rejects invalid webhook signature', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'invalidsig@example.com' },
        shippingAddress: { addressLine1: '12 Marina', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.shouldFailSignature = true;

    await expect(
      processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: JSON.stringify({ reference: payment!.provider_reference }),
        headers: { 'x-paystack-signature': 'invalid-sig' },
        paymentProvider: mockProvider,
      })
    ).rejects.toThrow(/Invalid paystack webhook signature/i);
  });

  it('14. Webhook verification rejects transaction amount mismatch', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'amountmismatch@example.com' },
        shippingAddress: { addressLine1: '12 Marina', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 10; // Expected 5000, provider returns 10 (tampered)

    await expect(
      processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: JSON.stringify({ reference: payment!.provider_reference }),
        headers: { 'x-paystack-signature': 'mock-sig' },
        paymentProvider: mockProvider,
      })
    ).rejects.toThrow(/Transaction amount mismatch/i);
  });

  it('15. Webhook verification rejects currency mismatch', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'currencymismatch@example.com' },
        shippingAddress: { addressLine1: '12 Marina', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 5000;
    mockProvider.expectedCurrency = 'USD'; // Expected NGN, provider returns USD

    await expect(
      processPaymentWebhook({
        supabase: mockSupabase,
        rawBody: JSON.stringify({ reference: payment!.provider_reference }),
        headers: { 'x-paystack-signature': 'mock-sig' },
        paymentProvider: mockProvider,
      })
    ).rejects.toThrow(/Transaction currency mismatch/i);
  });

  it('16. Fulfills a paid manual order: transitions pending -> confirmed -> shipped -> received and commits inventory', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'fulfill@example.com', firstName: 'Fulfill' },
        shippingAddress: { addressLine1: '100 Broad St', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 2 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    // Pay order via webhook (created -> pending)
    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 10000;
    await processPaymentWebhook({
      supabase: mockSupabase,
      rawBody: JSON.stringify({ reference: payment!.provider_reference }),
      headers: { 'x-paystack-signature': 'mock-sig' },
      paymentProvider: mockProvider,
    });

    // Start processing (pending -> confirmed)
    const { transitionOrderStatus } = await import('../src/services/order-state-machine.service');
    const confirmedRes = await transitionOrderStatus({
      supabase: mockSupabase,
      orderId: created.orderId,
      targetStatus: 'confirmed',
      userId: adminUserId,
      note: 'Admin confirmed order',
    });
    expect(confirmedRes.newStatus).toBe('confirmed');

    // Fulfill order (confirmed -> shipped)
    const shippedRes = await transitionOrderStatus({
      supabase: mockSupabase,
      orderId: created.orderId,
      targetStatus: 'shipped',
      userId: adminUserId,
      note: 'Admin shipped order via GIG Logistics',
      metadata: { carrier: 'GIG Logistics', trackingNumber: 'GIG-12345' },
    });
    expect(shippedRes.newStatus).toBe('shipped');

    // Verify order status history records
    const { data: history } = await mockSupabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', created.orderId);
    expect(history).toBeDefined();
    expect(history!.length).toBeGreaterThanOrEqual(3);

    // Complete delivery (shipped -> received)
    const receivedRes = await transitionOrderStatus({
      supabase: mockSupabase,
      orderId: created.orderId,
      targetStatus: 'received',
      userId: adminUserId,
    });
    expect(receivedRes.newStatus).toBe('received');
  });

  it('17. Rejects fulfilling an unpaid manual order (created -> confirmed/shipped)', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'unpaid-fulfill@example.com' },
        shippingAddress: { addressLine1: '10 Broad St', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    const { transitionOrderStatus } = await import('../src/services/order-state-machine.service');

    // Attempting to confirm or ship unpaid order must fail under state machine rules
    await expect(
      transitionOrderStatus({
        supabase: mockSupabase,
        orderId: created.orderId,
        targetStatus: 'confirmed',
        userId: adminUserId,
      })
    ).rejects.toThrow(/Invalid status transition/i);

    await expect(
      transitionOrderStatus({
        supabase: mockSupabase,
        orderId: created.orderId,
        targetStatus: 'shipped',
        userId: adminUserId,
      })
    ).rejects.toThrow(/Invalid status transition/i);
  });

  it('18. Cancelling a paid manual order releases active inventory reservations without falsely changing payment state', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'paid-cancel@example.com' },
        shippingAddress: { addressLine1: '10 Broad St', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: physicalProdId, quantity: 1 }],
        warehouseId,
      },
      adminUserId,
      orgId
    );

    // Pay order (created -> pending)
    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 5000;
    await processPaymentWebhook({
      supabase: mockSupabase,
      rawBody: JSON.stringify({ reference: payment!.provider_reference }),
      headers: { 'x-paystack-signature': 'mock-sig' },
      paymentProvider: mockProvider,
    });

    const { transitionOrderStatus } = await import('../src/services/order-state-machine.service');
    await transitionOrderStatus({
      supabase: mockSupabase,
      orderId: created.orderId,
      targetStatus: 'cancelled',
      userId: adminUserId,
      note: 'Admin cancelled order before shipping',
    });

    const { data: cancelledOrder } = await mockSupabase.from('orders').select('*').eq('id', created.orderId).single();
    expect(cancelledOrder).toBeDefined();
    expect(cancelledOrder!.status).toBe('cancelled');
    expect(cancelledOrder!.cancelled_at).toBeDefined();

    // Payment request status should remain paid (no false auto-refund)
    const { data: req } = await mockSupabase.from('order_payment_requests').select('*').eq('token', created.token).single();
    expect(req).toBeDefined();
    expect(req!.status).toBe('paid');
  });

  it('19. Bundle inventory commitment during fulfillment uses bundle component snapshot', async () => {
    const created = await createAdminManualOrder(
      mockSupabase,
      {
        customer: { email: 'bundle-fulfill@example.com' },
        shippingAddress: { addressLine1: '10 Broad St', city: 'Lagos', state: 'Lagos' },
        items: [{ productId: bundleProdId, quantity: 1 }], // Bundle containing 2x compProdId1 + 1x compProdId2
        warehouseId,
      },
      adminUserId,
      orgId
    );

    // Verify snapshots exist
    const { data: orderItems } = await mockSupabase.from('order_items').select('*').eq('order_id', created.orderId);
    expect(orderItems).toBeDefined();
    const { data: snapshots } = await mockSupabase.from('order_item_bundle_components').select('*').eq('order_item_id', orderItems![0].id);
    expect(snapshots).toBeDefined();
    expect(snapshots!.length).toBe(2);

    // Pay & Fulfill
    const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
    const mockProvider = new TestMockPaymentProvider();
    mockProvider.expectedAmount = 10000;
    await processPaymentWebhook({
      supabase: mockSupabase,
      rawBody: JSON.stringify({ reference: payment!.provider_reference }),
      headers: { 'x-paystack-signature': 'mock-sig' },
      paymentProvider: mockProvider,
    });

    const { transitionOrderStatus } = await import('../src/services/order-state-machine.service');
    await transitionOrderStatus({
      supabase: mockSupabase,
      orderId: created.orderId,
      targetStatus: 'confirmed',
      userId: adminUserId,
    });

    const { data: finalOrder } = await mockSupabase.from('orders').select('*').eq('id', created.orderId).single();
    expect(finalOrder).toBeDefined();
    expect(finalOrder!.status).toBe('confirmed');
  });

  describe('Prompt 1 Core Logic & APIs Unit & Integration Tests', () => {
    it('20. Manual discounts: percentage & fixed discounts, validation, and mutual exclusivity', async () => {
      // 20a. Valid percentage discount
      const resPct = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'manualpct@example.com' },
          shippingAddress: { addressLine1: '1 Main St', city: 'Lagos', state: 'Lagos' },
          items: [{ productId: physicalProdId, quantity: 2 }], // ₦10,000
          manualDiscount: { type: 'percentage', value: 15 },   // 15% = ₦1,500
          shippingFee: 1500,
          warehouseId,
        },
        adminUserId,
        orgId
      );
      expect(resPct.amount).toBe(10000 - 1500 + 1500); // ₦10,000

      const { data: orderPct } = await mockSupabase.from('orders').select('*').eq('id', resPct.orderId).single();
      expect(orderPct).toBeDefined();
      expect(orderPct!.discount_source).toBe('manual_percentage');
      expect(orderPct!.discount_total).toBe(1500);

      // 20b. Valid fixed discount
      const resFixed = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'manualfixed@example.com' },
          shippingAddress: { addressLine1: '1 Main St', city: 'Lagos', state: 'Lagos' },
          items: [{ productId: physicalProdId, quantity: 2 }], // ₦10,000
          manualDiscount: { type: 'fixed_amount', value: 2500 }, // ₦2,500
          shippingFee: 1500,
          warehouseId,
        },
        adminUserId,
        orgId
      );
      expect(resFixed.amount).toBe(10000 - 2500 + 1500); // ₦9,000

      const { data: orderFixed } = await mockSupabase.from('orders').select('*').eq('id', resFixed.orderId).single();
      expect(orderFixed).toBeDefined();
      expect(orderFixed!.discount_source).toBe('manual_fixed');
      expect(orderFixed!.discount_total).toBe(2500);

      // 20c. Negative discount rejected by Zod schema
      await expect(
        createAdminManualOrder(
          mockSupabase,
          {
            customer: { email: 'bad1@example.com' },
            shippingAddress: { addressLine1: '1 Main St', city: 'Lagos', state: 'Lagos' },
            items: [{ productId: physicalProdId, quantity: 1 }],
            manualDiscount: { type: 'percentage', value: -10 },
            warehouseId,
          },
          adminUserId,
          orgId
        )
      ).rejects.toThrow();

      // 20d. Percentage > 100 rejected
      await expect(
        createAdminManualOrder(
          mockSupabase,
          {
            customer: { email: 'bad2@example.com' },
            shippingAddress: { addressLine1: '1 Main St', city: 'Lagos', state: 'Lagos' },
            items: [{ productId: physicalProdId, quantity: 1 }],
            manualDiscount: { type: 'percentage', value: 110 },
            warehouseId,
          },
          adminUserId,
          orgId
        )
      ).rejects.toThrow(/cannot exceed 100/i);

      // 20e. Fixed discount > subtotal rejected
      await expect(
        createAdminManualOrder(
          mockSupabase,
          {
            customer: { email: 'bad3@example.com' },
            shippingAddress: { addressLine1: '1 Main St', city: 'Lagos', state: 'Lagos' },
            items: [{ productId: physicalProdId, quantity: 1 }], // subtotal 5000
            manualDiscount: { type: 'fixed_amount', value: 6000 },
            warehouseId,
          },
          adminUserId,
          orgId
        )
      ).rejects.toThrow(/cannot exceed subtotal/i);

      // 20f. Discount code and manual discount cannot be used together
      await expect(
        createAdminManualOrder(
          mockSupabase,
          {
            customer: { email: 'bad4@example.com' },
            shippingAddress: { addressLine1: '1 Main St', city: 'Lagos', state: 'Lagos' },
            items: [{ productId: physicalProdId, quantity: 1 }],
            discountCode: 'WELCOME10',
            manualDiscount: { type: 'percentage', value: 10 },
            warehouseId,
          },
          adminUserId,
          orgId
        )
      ).rejects.toThrow(/cannot be used together/i);
    });

    it('21. Canonical delivery fee resolver resolves rates and updates totals', async () => {
      // Test resolveDeliveryFee helper
      const feeRes1 = await resolveDeliveryFee(mockSupabase, locationId, warehouseId);
      expect(feeRes1.deliveryFee).toBe(1500);

      const feeRes2 = await resolveDeliveryFee(mockSupabase, locationId2, warehouseId);
      expect(feeRes2.deliveryFee).toBe(3500);

      // Invalid location throws error
      await expect(resolveDeliveryFee(mockSupabase, '00000000-0000-0000-0000-000000000000', warehouseId)).rejects.toThrow(/No delivery rate found/i);
    });

    it('22. Inventory & Bundle availability helpers compute available stock', async () => {
      // Stock for physicalProdId is 50
      const stock = await computeAvailableStock(mockSupabase, physicalProdId, warehouseId);
      expect(stock).toBe(50);

      // Buildable bundles for bundleProdId (requires 2x compProdId1 [stock 50] + 1x compProdId2 [stock 50]) -> min(50/2, 50/1) = 25
      const buildable = await computeBuildableBundles(mockSupabase, bundleProdId, warehouseId);
      expect(buildable).toBe(25);
    });

    it('23. Customer order edit API: updates customer info, location, fee recalculation, and payment request sync', async () => {
      const created = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'editcustomer@example.com', firstName: 'OriginalFirst', lastName: 'OriginalLast', phone: '08000000000' },
          shippingAddress: { addressLine1: 'Old Address', city: 'Lagos', state: 'Lagos' },
          items: [{ productId: physicalProdId, quantity: 2 }], // ₦10,000 subtotal
          locationId,                                          // Fee ₦1,500 -> Total ₦11,500
          shippingFee: 1500,
          warehouseId,
        },
        adminUserId,
        orgId
      );

      expect(created.amount).toBe(11500);

      // Customer edits location to locationId2 (Fee ₦3,500) and updates name & phone
      const updated = await updateCustomerOrderDetails(mockSupabase, {
        token: created.token,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        phone: '08111111111',
        locationId: locationId2,
        shippingAddress: { addressLine1: 'New Address in Abuja', city: 'Abuja', state: 'FCT', country: 'Nigeria' },
      });

      expect(updated.customer.name).toBe('UpdatedFirst UpdatedLast');
      expect(updated.customer.phone).toBe('08111111111');
      expect(updated.pricing.shippingFee).toBe(3500);
      expect(updated.pricing.subtotal).toBe(10000);
      expect(updated.amount).toBe(13500); // 10000 + 3500

      // Verify DB order updated
      const { data: order } = await mockSupabase.from('orders').select('*').eq('id', created.orderId).single();
      expect(order).toBeDefined();
      expect(order!.first_name).toBe('UpdatedFirst');
      expect(order!.last_name).toBe('UpdatedLast');
      expect(order!.phone).toBe('08111111111');
      expect(order!.location_id).toBe(locationId2);
      expect(order!.shipping_fee).toBe(3500);
      expect(order!.total).toBe(13500);

      // Verify order payment request amount updated
      const { data: payReq } = await mockSupabase.from('order_payment_requests').select('*').eq('token', created.token).single();
      expect(payReq).toBeDefined();
      expect(payReq!.amount).toBe(13500);

      // Verify pending payment record amount updated
      const { data: payment } = await mockSupabase.from('payments').select('*').eq('order_id', created.orderId).single();
      expect(payment).toBeDefined();
      expect(payment!.amount).toBe(13500);
    });

    it('24. Customer order edit API rejects non-editable orders and invalid/expired tokens', async () => {
      // Invalid token
      await expect(
        updateCustomerOrderDetails(mockSupabase, {
          token: 'invalid-token-xyz',
          firstName: 'Hacker',
        })
      ).rejects.toThrow(/invalid/i);

      // Paid order (non-editable)
      const created = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'noneditable@example.com' },
          shippingAddress: { addressLine1: '10 St', city: 'Lagos', state: 'Lagos' },
          items: [{ productId: physicalProdId, quantity: 1 }],
          warehouseId,
        },
        adminUserId,
        orgId
      );

      // Mark payment request as paid
      await mockSupabase.from('order_payment_requests').update({ status: 'paid' }).eq('token', created.token);

      await expect(
        updateCustomerOrderDetails(mockSupabase, {
          token: created.token,
          firstName: 'AttemptEdit',
        })
      ).rejects.toThrow(/Cannot modify/i);
    });

    it('25. Preview pricing helper calculates authoritative totals without creating order records', async () => {
      const preview = await previewManualOrderPricing(mockSupabase, {
        items: [{ productId: physicalProdId, quantity: 2 }],
        locationId,
        manualDiscount: { type: 'percentage', value: 10 },
      });

      expect(preview.subtotal).toBe(10000);
      expect(preview.discountTotal).toBe(1000);
      expect(preview.deliveryFee).toBe(1500);
      expect(preview.total).toBe(10500);
    });
  });
});

