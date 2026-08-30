import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import { findCapableWarehouse } from '@/services/warehouse.service';

describe('Warehouse Resolution Business Rules', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const locationIkeja = 'loc-ikeja-lagos';
  const locationAbuja = 'loc-abuja-fct';
  const locationPortHarcourt = 'loc-portharcourt-rivers';

  const whIkeja = 'wh-ikeja-01';
  const whLekki = 'wh-lekki-02';

  const bookId = 'prod-coloring-book';
  const penId = 'prod-gel-pen';
  const journalId = 'prod-hardcover-journal';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: whIkeja, name: 'Ikeja Central Hub', is_active: true },
        { id: whLekki, name: 'Lekki Distribution Hub', is_active: true },
      ],
      warehouse_locations: [
        { warehouse_id: whIkeja, location_id: locationIkeja },
        { warehouse_id: whLekki, location_id: locationIkeja },
        { warehouse_id: whIkeja, location_id: locationAbuja },
      ],
      inventory: [
        // whIkeja has: 5 books (0 reserved), 2 pens (0 reserved), 0 journals
        { warehouse_id: whIkeja, product_id: bookId, quantity: 5, reserved_quantity: 0 },
        { warehouse_id: whIkeja, product_id: penId, quantity: 2, reserved_quantity: 0 },
        { warehouse_id: whIkeja, product_id: journalId, quantity: 0, reserved_quantity: 0 },

        // whLekki has: 10 books (0 reserved), 10 pens (0 reserved), 5 journals (0 reserved)
        { warehouse_id: whLekki, product_id: bookId, quantity: 10, reserved_quantity: 0 },
        { warehouse_id: whLekki, product_id: penId, quantity: 10, reserved_quantity: 0 },
        { warehouse_id: whLekki, product_id: journalId, quantity: 5, reserved_quantity: 0 },
      ],
    });
  });

  it('finds a capable warehouse when location and inventory requirements are met', async () => {
    const result = await findCapableWarehouse(mockSupabase, locationIkeja, [
      { productId: bookId, quantity: 2 },
      { productId: penId, quantity: 1 },
    ]);

    expect(result.capable).toBe(true);
    expect(result.warehouseId).toBe(whIkeja);
  });

  it('rejects when no active warehouse serves the selected delivery location', async () => {
    const result = await findCapableWarehouse(mockSupabase, locationPortHarcourt, [
      { productId: bookId, quantity: 1 },
    ]);

    expect(result.capable).toBe(false);
    expect(result.error).toMatch(/No active warehouse serves the selected delivery location/);
  });

  it('selects warehouse with complete inventory when another candidate warehouse lacks stock', async () => {
    // Ordering 3 pens and 1 journal. whIkeja only has 2 pens and 0 journals, but whLekki has both!
    const result = await findCapableWarehouse(mockSupabase, locationIkeja, [
      { productId: penId, quantity: 3 },
      { productId: journalId, quantity: 1 },
    ]);

    expect(result.capable).toBe(true);
    expect(result.warehouseId).toBe(whLekki);
    expect(result.warehouseName).toBe('Lekki Distribution Hub');
  });

  it('rejects when no single warehouse can fulfill the entire cart (no multi-warehouse splitting allowed)', async () => {
    // Abuja is served only by whIkeja. We request 5 pens (whIkeja only has 2 pens).
    const result = await findCapableWarehouse(mockSupabase, locationAbuja, [
      { productId: penId, quantity: 5 },
    ]);

    expect(result.capable).toBe(false);
    expect(result.error).toMatch(/Insufficient stock in any single warehouse/);
    expect(result.missingItems).toBeDefined();
    expect(result.missingItems?.[0].productId).toBe(penId);
    expect(result.missingItems?.[0].required).toBe(5);
    expect(result.missingItems?.[0].available).toBe(2);
  });

  it('properly aggregates quantities for duplicate product requirements across items/addons', async () => {
    // Requesting 2 books as item 1, and 4 books as item 2 (Total = 6 books).
    // whIkeja has 5 books (fails). whLekki has 10 books (succeeds).
    const result = await findCapableWarehouse(mockSupabase, locationIkeja, [
      { productId: bookId, quantity: 2 },
      { productId: bookId, quantity: 4 },
    ]);

    expect(result.capable).toBe(true);
    expect(result.warehouseId).toBe(whLekki);
  });
});
