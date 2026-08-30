import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  reserveSingleInventory,
  reserveOrderInventory,
  releaseReservation,
  commitReservation,
  commitOrderReservations,
  releaseOrderReservations,
  expireOldReservations,
} from '@/services/inventory.service';

describe('Inventory Service & RPC Business Rules', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-lagos-01';
  const coloringBookId = 'prod-coloring-book';
  const pencilSetId = 'prod-pencil-set';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [{ id: warehouseId, name: 'Lagos Mainland Warehouse', is_active: true }],
      products: [
        { id: coloringBookId, name: 'Coloring Book', price: 5000, is_active: true },
        { id: pencilSetId, name: 'Coloring Pencils', price: 2500, is_active: true },
      ],
      inventory: [
        {
          warehouse_id: warehouseId,
          product_id: coloringBookId,
          quantity: 10,
          reserved_quantity: 2, // available = 8
        },
        {
          warehouse_id: warehouseId,
          product_id: pencilSetId,
          quantity: 5,
          reserved_quantity: 0, // available = 5
        },
      ],
      inventory_reservations: [],
    });
  });

  it('reserves available inventory successfully', async () => {
    const result = await reserveSingleInventory(mockSupabase, {
      warehouseId,
      productId: coloringBookId,
      quantity: 3,
      referenceType: 'order',
      referenceId: 'ord-100',
    });

    expect(result.reservationId).toBeDefined();
    expect(result.quantity).toBe(3);
    expect(result.status).toBe('active');

    // Verify inventory state
    const inv = mockSupabase._store.inventory.find(
      (i) => i.warehouse_id === warehouseId && i.product_id === coloringBookId
    );
    expect(inv.reserved_quantity).toBe(5); // 2 + 3
  });

  it('rejects reservation when available quantity is insufficient (prevents overselling)', async () => {
    // Available is 8, attempting to reserve 9
    await expect(
      reserveSingleInventory(mockSupabase, {
        warehouseId,
        productId: coloringBookId,
        quantity: 9,
        referenceType: 'order',
        referenceId: 'ord-101',
      })
    ).rejects.toThrow(/Insufficient available stock/);

    const inv = mockSupabase._store.inventory.find(
      (i) => i.warehouse_id === warehouseId && i.product_id === coloringBookId
    );
    expect(inv.reserved_quantity).toBe(2); // unchanged
  });

  it('releases an active inventory reservation correctly', async () => {
    const res = await reserveSingleInventory(mockSupabase, {
      warehouseId,
      productId: pencilSetId,
      quantity: 4,
      referenceType: 'order',
      referenceId: 'ord-102',
    });

    let inv = mockSupabase._store.inventory.find(
      (i) => i.warehouse_id === warehouseId && i.product_id === pencilSetId
    );
    expect(inv.reserved_quantity).toBe(4);

    const released = await releaseReservation(mockSupabase, res.reservationId);
    expect(released).toBe(true);

    inv = mockSupabase._store.inventory.find(
      (i) => i.warehouse_id === warehouseId && i.product_id === pencilSetId
    );
    expect(inv.reserved_quantity).toBe(0);
  });

  it('commits a reservation on payment success (deducts physical inventory and clears reservation)', async () => {
    const res = await reserveSingleInventory(mockSupabase, {
      warehouseId,
      productId: pencilSetId,
      quantity: 3,
      referenceType: 'order',
      referenceId: 'ord-103',
    });

    const committed = await commitReservation(mockSupabase, res.reservationId);
    expect(committed).toBe(true);

    const inv = mockSupabase._store.inventory.find(
      (i) => i.warehouse_id === warehouseId && i.product_id === pencilSetId
    );
    expect(inv.quantity).toBe(2); // 5 - 3
    expect(inv.reserved_quantity).toBe(0); // cleared from reserved
  });

  it('commits all reservations for an order reference via commitOrderReservations', async () => {
    const orderId = 'ord-multi-res';
    await reserveSingleInventory(mockSupabase, {
      warehouseId,
      productId: coloringBookId,
      quantity: 2,
      referenceType: 'order',
      referenceId: orderId,
    });
    await reserveSingleInventory(mockSupabase, {
      warehouseId,
      productId: pencilSetId,
      quantity: 2,
      referenceType: 'order',
      referenceId: orderId,
    });

    const result = await commitOrderReservations(mockSupabase, orderId);
    expect(result.committedCount).toBe(2);

    const bookInv = mockSupabase._store.inventory.find((i) => i.product_id === coloringBookId);
    const pencilInv = mockSupabase._store.inventory.find((i) => i.product_id === pencilSetId);

    expect(bookInv.quantity).toBe(8); // 10 - 2
    expect(pencilInv.quantity).toBe(3); // 5 - 2
  });

  it('expires outdated reservations after 45 minutes', async () => {
    // Create an expired reservation in the past
    mockSupabase._store.inventory_reservations.push({
      id: 'res-old',
      warehouse_id: warehouseId,
      product_id: coloringBookId,
      quantity: 2,
      status: 'active',
      reference_type: 'order',
      reference_id: 'ord-expired',
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const expiredCount = await expireOldReservations(mockSupabase);
    expect(expiredCount).toBe(1);

    const res = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-old');
    expect(res.status).toBe('expired');
  });

  it('rolls back previously created reservations if one item fails in a batch order', async () => {
    const orderId = 'ord-batch-fail';

    // Item 1 has sufficient stock (available 8), Item 2 requests 10 (available is only 5)
    await expect(
      reserveOrderInventory(mockSupabase, {
        warehouseId,
        orderId,
        items: [
          { productId: coloringBookId, quantity: 2 },
          { productId: pencilSetId, quantity: 10 },
        ],
      })
    ).rejects.toThrow();

    // Verify coloring book reservation was rolled back
    const bookInv = mockSupabase._store.inventory.find((i) => i.product_id === coloringBookId);
    expect(bookInv.reserved_quantity).toBe(2); // back to initial 2
  });
});
