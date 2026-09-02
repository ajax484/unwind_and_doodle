import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { updateCustomerOrderDetails, getPaymentRequestByToken } from '@/services/manual-order.service';

describe('Prompt 3: Customer Payment Page & Secure Edit Flow', () => {
  const orgId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const warehouseId = '22222222-2222-4222-8222-222222222222';
  const locationId1 = '33333333-3333-4333-8333-333333333333';
  const locationId2 = '33333333-3333-4333-8333-333333333334';
  const orderId = 'ord-m-1001';
  const paymentReqId = 'pr-1001';
  const validToken = 'mtoken_sec_123456789';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle', slug: 'unwind-and-doodle' }],
      locations: [
        { id: locationId1, organization_id: orgId, name: 'Lagos Island', state: 'Lagos' },
        { id: locationId2, organization_id: orgId, name: 'Abuja Central', state: 'FCT' },
      ],
      warehouses: [{ id: warehouseId, organization_id: orgId, name: 'Main Warehouse', is_active: true }],
      delivery_rates: [
        { id: 'dr-1', warehouse_id: warehouseId, location_id: locationId1, price: 1500, active: true },
        { id: 'dr-2', warehouse_id: warehouseId, location_id: locationId2, price: 3500, active: true },
      ],
      orders: [
        {
          id: orderId,
          organization_id: orgId,
          order_number: 'ORD-M1001',
          status: 'created',
          payment_status: 'unpaid',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+2348012345678',
          subtotal: 10000,
          discount_total: 0,
          shipping_fee: 1500,
          total: 11500,
          warehouse_id: warehouseId,
          location_id: locationId1,
          shipping_address: { addressLine1: '1 Main St', city: 'Lagos', state: 'Lagos' },
        },
      ],
      order_payment_requests: [
        {
          id: paymentReqId,
          organization_id: orgId,
          order_id: orderId,
          token: validToken,
          amount: 11500,
          status: 'pending',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
      payments: [
        {
          id: 'pay-1001',
          organization_id: orgId,
          order_id: orderId,
          payment_request_id: paymentReqId,
          amount: 11500,
          status: 'pending',
          payment_provider: 'paystack',
        },
      ],
      order_items: [
        {
          id: 'oi-1',
          order_id: orderId,
          product_name: 'Coloring Book',
          quantity: 2,
          unit_price: 5000,
          total: 10000,
        },
      ],
    });
  });

  it('1. Customer updates name, phone, and delivery location via secure payment token', async () => {
    const updated = await updateCustomerOrderDetails(mockSupabase, {
      token: validToken,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+2348099998888',
      locationId: locationId2, // delivery fee changes 1500 -> 3500
    });

    expect(updated.customer.name).toBe('Jane Smith');
    expect(updated.customer.phone).toBe('+2348099998888');
    expect(updated.pricing.shippingFee).toBe(3500);
    expect(updated.pricing.total).toBe(13500); // 10000 + 3500
    expect(updated.amount).toBe(13500);
  });

  it('2. Payment request amount and pending payment records synchronize atomically', async () => {
    await updateCustomerOrderDetails(mockSupabase, {
      token: validToken,
      locationId: locationId2,
    });

    // Check payment request token data after update
    const refreshed = await getPaymentRequestByToken(mockSupabase, validToken);
    expect(refreshed.amount).toBe(13500);
    expect(refreshed.pricing.total).toBe(13500);
  });

  it('3. Rejects update requests with invalid or expired payment link tokens', async () => {
    await expect(
      updateCustomerOrderDetails(mockSupabase, {
        token: 'invalid_token_xyz',
        firstName: 'Hacker',
      })
    ).rejects.toThrow(/invalid or expired/i);
  });

  it('4. Rejects updates when order status is no longer editable (paid or confirmed)', async () => {
    // Mark order & payment request as paid/confirmed in mock DB
    await mockSupabase.from('orders').update({ status: 'confirmed' } as any).eq('id', orderId);
    await mockSupabase.from('order_payment_requests').update({ status: 'paid' }).eq('id', paymentReqId);

    await expect(
      updateCustomerOrderDetails(mockSupabase, {
        token: validToken,
        firstName: 'Jane',
      })
    ).rejects.toThrow(/cannot modify order/i);
  });

  it('5. Immutability check: Customer cannot modify prices, products, or discounts via customer edit payload', async () => {
    // Attempting to pass extra properties to updateCustomerOrderDetails
    const payload = {
      token: validToken,
      firstName: 'Jane',
      // Extra fields attempting price tampering
      total: 100,
      subtotal: 100,
      discountTotal: 5000,
    } as unknown as Parameters<typeof updateCustomerOrderDetails>[1];

    const result = await updateCustomerOrderDetails(mockSupabase, payload);
    // Total must still be calculated strictly server-side (10000 subtotal + 1500 shipping)
    expect(result.pricing.total).toBe(11500);
    expect(result.pricing.subtotal).toBe(10000);
  });
});
