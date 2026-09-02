import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import { previewManualOrderPricing } from '../src/services/manual-order.service';

describe('Prompt 2: Admin UI Implementation & Real-Time Preview API', () => {
  const orgId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const warehouseId = '22222222-2222-4222-8222-222222222222';
  const locationId = '33333333-3333-4333-8333-333333333333';
  const locationId2 = '33333333-3333-4333-8333-333333333334';

  const physicalProdId = '44444444-4444-4444-8444-444444444444';
  const bundleProdId = '55555555-5555-4555-8555-555555555555';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle', slug: 'unwind-and-doodle' }],
      locations: [
        { id: locationId, organization_id: orgId, name: 'Lagos Island', state: 'Lagos' },
        { id: locationId2, organization_id: orgId, name: 'Abuja Central', state: 'FCT' },
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
        },
        {
          id: bundleProdId,
          organization_id: orgId,
          name: 'Creative Bundle',
          slug: 'creative-bundle',
          product_type: 'bundle',
          status: 'published',
          selling_price: 10000,
        },
      ],
      inventory: [
        { id: 'inv-1', warehouse_id: warehouseId, product_id: physicalProdId, quantity: 50, reserved_quantity: 0 },
        { id: 'inv-2', warehouse_id: warehouseId, product_id: bundleProdId, quantity: 20, reserved_quantity: 0 },
      ],
      discounts: [
        {
          id: 'disc-10',
          organization_id: orgId,
          code: 'WELCOME10',
          type: 'percentage',
          value: 10,
          active: true,
        },
      ],
    });
  });

  it('1. Server preview calculates correct subtotal, delivery fee, and total with location change', async () => {
    const preview1 = await previewManualOrderPricing(mockSupabase, {
      items: [{ productId: physicalProdId, quantity: 2 }], // ₦10,000
      locationId,                                          // Fee ₦1,500
      organizationId: orgId,
    });

    expect(preview1.subtotal).toBe(10000);
    expect(preview1.deliveryFee).toBe(1500);
    expect(preview1.discountTotal).toBe(0);
    expect(preview1.total).toBe(11500);

    // Location change to locationId2 (Fee ₦3,500)
    const preview2 = await previewManualOrderPricing(mockSupabase, {
      items: [{ productId: physicalProdId, quantity: 2 }], // ₦10,000
      locationId: locationId2,                             // Fee ₦3,500
      organizationId: orgId,
    });

    expect(preview2.deliveryFee).toBe(3500);
    expect(preview2.total).toBe(13500);
  });

  it('2. Server preview calculates manual percentage and fixed amount discounts', async () => {
    // 15% manual discount on ₦10,000 items + ₦1,500 delivery = 10000 - 1500 + 1500 = ₦10,000
    const previewPct = await previewManualOrderPricing(mockSupabase, {
      items: [{ productId: physicalProdId, quantity: 2 }],
      locationId,
      manualDiscount: { type: 'percentage', value: 15 },
      organizationId: orgId,
    });

    expect(previewPct.subtotal).toBe(10000);
    expect(previewPct.discountTotal).toBe(1500);
    expect(previewPct.total).toBe(10000);

    // Fixed ₦3,000 manual discount
    const previewFixed = await previewManualOrderPricing(mockSupabase, {
      items: [{ productId: physicalProdId, quantity: 2 }],
      locationId,
      manualDiscount: { type: 'fixed_amount', value: 3000 },
      organizationId: orgId,
    });

    expect(previewFixed.discountTotal).toBe(3000);
    expect(previewFixed.total).toBe(8500); // 10000 - 3000 + 1500
  });

  it('3. Preview pricing rejects invalid fixed discount exceeding subtotal', async () => {
    await expect(
      previewManualOrderPricing(mockSupabase, {
        items: [{ productId: physicalProdId, quantity: 1 }], // subtotal 5000
        locationId,
        manualDiscount: { type: 'fixed_amount', value: 7000 },
        organizationId: orgId,
      })
    ).rejects.toThrow(/cannot exceed subtotal/i);
  });

  it('4. Preview pricing rejects mutually exclusive discount code + manual discount', async () => {
    await expect(
      previewManualOrderPricing(mockSupabase, {
        items: [{ productId: physicalProdId, quantity: 1 }],
        locationId,
        discountCode: 'WELCOME10',
        manualDiscount: { type: 'percentage', value: 10 },
        organizationId: orgId,
      })
    ).rejects.toThrow(/cannot be used together/i);
  });
});
