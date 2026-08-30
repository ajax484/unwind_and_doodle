import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  listAdminInventory,
  getProductInventoryDetails,
  adjustInventoryStock,
  createStockReceipt,
  listStockReceipts,
} from '@/services/admin-inventory.service';
import {
  listWarehouses,
  getWarehouseDetail,
  createWarehouse,
  updateWarehouse,
  assignWarehouseLocations,
  unassignWarehouseLocation,
  listLocations,
  createLocation,
  listDeliveryRates,
  upsertDeliveryRate,
} from '@/services/admin-warehouse.service';

describe('Phase 6D: Admin Inventory, Warehouses & Stock Management', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-competitor-02';

  const adminUserA = 'usr-admin-ada';
  const adminUserB = 'usr-admin-other';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Competitor Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
        { id: 'mem-2', organization_id: orgB, user_id: adminUserB, role: 'admin' },
      ],
      warehouses: [
        {
          id: 'wh-lagos-main',
          organization_id: orgA,
          name: 'Lagos Mainland Hub',
          state: 'Lagos',
          lga: 'Ikeja',
          address_line_1: '10 Commercial Road',
          active: true,
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'wh-abuja',
          organization_id: orgA,
          name: 'Abuja Regional Depot',
          state: 'FCT Abuja',
          lga: 'Garki',
          address_line_1: '5 Central Way',
          active: true,
          created_at: '2026-08-05T10:00:00Z',
        },
        {
          id: 'wh-org-b',
          organization_id: orgB,
          name: 'Org B Warehouse',
          state: 'Rivers',
          active: true,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      locations: [
        { id: 'loc-lagos-isl', organization_id: orgA, name: 'Victoria Island', state: 'Lagos', lga: 'Eti-Osa', created_at: '2026-08-01T10:00:00Z' },
        { id: 'loc-ikeja', organization_id: orgA, name: 'Ikeja Central', state: 'Lagos', lga: 'Ikeja', created_at: '2026-08-01T10:00:00Z' },
        { id: 'loc-abuja-garki', organization_id: orgA, name: 'Garki Area 1', state: 'FCT Abuja', lga: 'Garki', created_at: '2026-08-05T10:00:00Z' },
        { id: 'loc-org-b-loc', organization_id: orgB, name: 'Port Harcourt', state: 'Rivers', created_at: '2026-08-01T10:00:00Z' },
      ],
      warehouse_locations: [
        { warehouse_id: 'wh-lagos-main', location_id: 'loc-lagos-isl' },
        { warehouse_id: 'wh-lagos-main', location_id: 'loc-ikeja' },
        { warehouse_id: 'wh-abuja', location_id: 'loc-abuja-garki' },
      ],
      delivery_rates: [
        { id: 'rate-1', warehouse_id: 'wh-lagos-main', location_id: 'loc-lagos-isl', price: 2500 },
        { id: 'rate-2', warehouse_id: 'wh-lagos-main', location_id: 'loc-ikeja', price: 1500 },
        { id: 'rate-3', warehouse_id: 'wh-abuja', location_id: 'loc-abuja-garki', price: 3000 },
      ],
      products: [
        {
          id: 'prod-safari-book',
          organization_id: orgA,
          name: 'Safari Coloring Book',
          slug: 'safari-coloring-book',
          sku: 'BK-SAFARI-01',
          product_type: 'physical',
          selling_price: 15000,
          cost_price: 5000,
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'prod-pencils-pack',
          organization_id: orgA,
          name: 'Colored Pencils Pack',
          slug: 'colored-pencils-pack',
          sku: 'ACC-PENCILS-24',
          product_type: 'physical',
          selling_price: 6000,
          cost_price: 2000,
          status: 'published',
          created_at: '2026-08-02T10:00:00Z',
          updated_at: '2026-08-02T10:00:00Z',
        },
        {
          id: 'prod-empty-stock',
          organization_id: orgA,
          name: 'Glitter Gel Pens',
          slug: 'glitter-gel-pens',
          sku: 'ACC-PENS-01',
          product_type: 'physical',
          selling_price: 4500,
          cost_price: 1500,
          status: 'published',
          created_at: '2026-08-03T10:00:00Z',
          updated_at: '2026-08-03T10:00:00Z',
        },
        {
          id: 'prod-org-b-item',
          organization_id: orgB,
          name: 'Competitor Item',
          slug: 'competitor-item',
          sku: 'COMP-01',
          product_type: 'physical',
          selling_price: 20000,
          cost_price: 8000,
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
      ],
      product_images: [],
      inventory: [
        {
          id: 'inv-1',
          warehouse_id: 'wh-lagos-main',
          product_id: 'prod-safari-book',
          quantity: 50,
          reserved_quantity: 5,
          updated_at: '2026-08-10T10:00:00Z',
        },
        {
          id: 'inv-2',
          warehouse_id: 'wh-abuja',
          product_id: 'prod-safari-book',
          quantity: 20,
          reserved_quantity: 2,
          updated_at: '2026-08-10T10:00:00Z',
        },
        {
          id: 'inv-3',
          warehouse_id: 'wh-lagos-main',
          product_id: 'prod-pencils-pack',
          quantity: 30,
          reserved_quantity: 0,
          updated_at: '2026-08-10T10:00:00Z',
        },
        {
          id: 'inv-4',
          warehouse_id: 'wh-lagos-main',
          product_id: 'prod-empty-stock',
          quantity: 0,
          reserved_quantity: 0,
          updated_at: '2026-08-10T10:00:00Z',
        },
        // Org B inventory
        {
          id: 'inv-org-b',
          warehouse_id: 'wh-org-b',
          product_id: 'prod-org-b-item',
          quantity: 100,
          reserved_quantity: 10,
          updated_at: '2026-08-10T10:00:00Z',
        },
      ],
      inventory_movements: [
        {
          id: 'mov-1',
          warehouse_id: 'wh-lagos-main',
          product_id: 'prod-safari-book',
          quantity: 50,
          movement_type: 'purchase',
          reference_id: 'GRN-001',
          note: 'Initial batch delivery',
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      stock_receipts: [
        {
          id: 'rec-001',
          organization_id: orgA,
          warehouse_id: 'wh-lagos-main',
          reference: 'GRN-001',
          notes: 'Batch from Lagos Printer',
          received_at: '2026-08-01T10:00:00Z',
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      stock_receipt_items: [
        {
          id: 'rec-item-1',
          stock_receipt_id: 'rec-001',
          product_id: 'prod-safari-book',
          quantity: 50,
          cost_price: 4800, // Historical cost
        },
      ],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Inventory Overview & Valuation Calculation', () => {
    it('calculates available stock as quantity - reserved_quantity and calculates total inventory valuation', async () => {
      const res = await listAdminInventory(mockSupabase, {
        organizationId: orgA,
      });

      expect(res.inventory.length).toBeGreaterThanOrEqual(3);
      expect(res.summary.totalProductsTracked).toBe(3);
      expect(res.summary.outOfStockCount).toBe(1); // prod-empty-stock
      expect(res.summary.totalReservedUnits).toBe(7); // 5 + 2

      // Valuation = (50 * 5000) + (20 * 5000) + (30 * 2000) + (0 * 1500) = 250,000 + 100,000 + 60,000 = 410,000
      expect(res.summary.estimatedInventoryValue).toBe(410000);

      const safariMain = res.inventory.find(
        (i) => i.productId === 'prod-safari-book' && i.warehouseId === 'wh-lagos-main'
      );
      expect(safariMain?.quantityOnHand).toBe(50);
      expect(safariMain?.quantityReserved).toBe(5);
      expect(safariMain?.availableToSell).toBe(45);
    });

    it('searches inventory by product name and SKU', async () => {
      const searchByName = await listAdminInventory(mockSupabase, {
        organizationId: orgA,
        search: 'Safari',
      });
      expect(searchByName.inventory.length).toBe(2); // In Lagos and Abuja

      const searchBySku = await listAdminInventory(mockSupabase, {
        organizationId: orgA,
        search: 'ACC-PENCILS-24',
      });
      expect(searchBySku.inventory.length).toBe(1);
      expect(searchBySku.inventory[0].productId).toBe('prod-pencils-pack');
    });

    it('filters inventory by warehouse and stock status', async () => {
      const abujaStock = await listAdminInventory(mockSupabase, {
        organizationId: orgA,
        warehouseId: 'wh-abuja',
      });
      expect(abujaStock.inventory.length).toBe(1);
      expect(abujaStock.inventory[0].warehouseName).toBe('Abuja Regional Depot');

      const outOfStock = await listAdminInventory(mockSupabase, {
        organizationId: orgA,
        stockStatus: 'out_of_stock',
      });
      expect(outOfStock.inventory.length).toBe(1);
      expect(outOfStock.inventory[0].productId).toBe('prod-empty-stock');
    });
  });

  describe('2. Product Inventory Details & Movement Logs', () => {
    it('retrieves multi-warehouse stock distributions and movement history', async () => {
      const details = await getProductInventoryDetails(mockSupabase, 'prod-safari-book', orgA);

      expect(details.totalStockOnHand).toBe(70); // 50 + 20
      expect(details.totalStockReserved).toBe(7); // 5 + 2
      expect(details.totalAvailableToSell).toBe(63); // 70 - 7
      expect(details.warehouses.length).toBe(2);

      expect(details.movements.length).toBe(1);
      expect(details.movements[0].movementType).toBe('purchase');
      expect(details.movements[0].quantity).toBe(50);
    });
  });

  describe('3. Atomic Stock Adjustments', () => {
    it('applies positive stock adjustments, updates available quantity, and creates movements & audit logs', async () => {
      const result = await adjustInventoryStock(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos-main',
          product_id: 'prod-pencils-pack',
          adjustment_quantity: 15,
          reason: 'Stock audit count',
          note: 'Found extra pack during audit',
        },
        adminUserA,
        orgA
      );

      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(45); // 30 + 15
      expect(result.availableToSell).toBe(45);

      // Verify movement record
      const movements = mockSupabase._store.inventory_movements.filter(
        (m) => m.product_id === 'prod-pencils-pack'
      );
      expect(movements.length).toBe(1);
      expect(movements[0].movement_type).toBe('adjustment');
      expect(movements[0].quantity).toBe(15);
      expect(movements[0].note).toContain('Stock audit count');

      // Verify audit log
      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'stock.adjusted');
      expect(audit).toBeDefined();

      // Verify domain event
      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'inventory.adjusted');
      expect(event).toBeDefined();
    });

    it('applies negative stock adjustments correctly', async () => {
      const result = await adjustInventoryStock(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos-main',
          product_id: 'prod-safari-book',
          adjustment_quantity: -10,
          reason: 'Damaged goods',
          note: 'Water damage in corner',
        },
        adminUserA,
        orgA
      );

      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(40); // 50 - 10
      expect(result.availableToSell).toBe(35); // 40 - 5 reserved
    });

    it('rejects negative adjustments that would reduce inventory below zero', async () => {
      await expect(
        adjustInventoryStock(
          mockSupabase,
          {
            warehouse_id: 'wh-lagos-main',
            product_id: 'prod-safari-book',
            adjustment_quantity: -60, // Current stock is 50
            reason: 'Damaged goods',
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/cannot be negative/i);
    });
  });

  describe('4. Goods Received Notes (Stock Receipts)', () => {
    it('creates a multi-item stock receipt, increments stock on hand, logs purchase movements, and retains historical cost', async () => {
      const receipt = await createStockReceipt(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos-main',
          reference: 'GRN-2026-002',
          notes: 'Batch delivery from factory',
          received_at: '2026-08-15T12:00:00Z',
          items: [
            { product_id: 'prod-safari-book', quantity: 100, cost_price: 4900 },
            { product_id: 'prod-empty-stock', quantity: 200, cost_price: 1400 },
          ],
        },
        adminUserA,
        orgA
      );

      expect(receipt.reference).toBe('GRN-2026-002');
      expect(receipt.totalItemsCount).toBe(2);
      expect(receipt.totalUnitsReceived).toBe(300);
      expect(receipt.totalReceiptCost).toBe(100 * 4900 + 200 * 1400); // 490,000 + 280,000 = 770,000

      // Check updated stock on hand
      const safari = mockSupabase._store.inventory.find(
        (i) => i.warehouse_id === 'wh-lagos-main' && i.product_id === 'prod-safari-book'
      );
      expect(safari?.quantity).toBe(150); // 50 + 100

      const gelPens = mockSupabase._store.inventory.find(
        (i) => i.warehouse_id === 'wh-lagos-main' && i.product_id === 'prod-empty-stock'
      );
      expect(gelPens?.quantity).toBe(200); // 0 + 200

      // Check movements created
      const movements = mockSupabase._store.inventory_movements.filter(
        (m) => m.reference_id === receipt.id
      );
      expect(movements.length).toBe(2);
      expect(movements[0].movement_type).toBe('purchase');

      // Verify domain event
      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'inventory.stock_received');
      expect(event).toBeDefined();
    });

    it('enforces idempotency and rejects duplicate receipt reference', async () => {
      await expect(
        createStockReceipt(
          mockSupabase,
          {
            warehouse_id: 'wh-lagos-main',
            reference: 'GRN-001', // Already exists in beforeEach
            items: [{ product_id: 'prod-safari-book', quantity: 10, cost_price: 5000 }],
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/already exists/i);
    });

    it('auto-generates a structured GRN reference when reference is omitted', async () => {
      const receipt = await createStockReceipt(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos-main',
          items: [{ product_id: 'prod-safari-book', quantity: 15, cost_price: 5000 }],
        },
        adminUserA,
        orgA
      );

      expect(receipt.reference).toBeDefined();
      expect(receipt.reference).toMatch(/^GRN-\d{8}-\d{4}$/);
    });

    it('lists historical stock receipts with aggregated units and costs', async () => {
      const list = await listStockReceipts(mockSupabase, orgA);
      expect(list.length).toBe(1);
      expect(list[0].reference).toBe('GRN-001');
      expect(list[0].totalUnitsReceived).toBe(50);
      expect(list[0].totalReceiptCost).toBe(50 * 4800);
    });
  });

  describe('5. Warehouse Management & Soft Deactivation', () => {
    it('creates, updates, and deactivates warehouses preserving integrity', async () => {
      // 1. Create
      const created = await createWarehouse(
        mockSupabase,
        {
          name: 'Port Harcourt Hub',
          state: 'Rivers',
          lga: 'Port Harcourt',
          address_line_1: '20 Trans-Amadi',
          active: true,
        },
        adminUserA,
        orgA
      );
      expect(created.name).toBe('Port Harcourt Hub');

      // 2. Update
      const updated = await updateWarehouse(
        mockSupabase,
        created.id,
        { name: 'Port Harcourt Coastal Hub' },
        adminUserA,
        orgA
      );
      expect(updated.name).toBe('Port Harcourt Coastal Hub');

      // 3. Deactivate (soft)
      const deactivated = await updateWarehouse(
        mockSupabase,
        created.id,
        { active: false },
        adminUserA,
        orgA
      );
      expect(deactivated.active).toBe(false);

      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'warehouse.deactivated');
      expect(audit).toBeDefined();
    });

    it('lists warehouses with assigned locations count', async () => {
      const list = await listWarehouses(mockSupabase, orgA);
      expect(list.length).toBe(2);

      const lagos = list.find((w) => w.id === 'wh-lagos-main');
      expect(lagos?.assignedLocationsCount).toBe(2);
    });
  });

  describe('6. Location Management & Warehouse Assignments', () => {
    it('creates delivery locations and assigns them to warehouses', async () => {
      // 1. Create Location
      const loc = await createLocation(
        mockSupabase,
        {
          name: 'Lekki Phase 1',
          state: 'Lagos',
          lga: 'Eti-Osa',
        },
        adminUserA,
        orgA
      );
      expect(loc.name).toBe('Lekki Phase 1');

      // 2. Assign to Warehouse
      const res = await assignWarehouseLocations(
        mockSupabase,
        'wh-lagos-main',
        [loc.id],
        orgA,
        adminUserA
      );
      expect(res.assignedCount).toBe(1);

      const detail = await getWarehouseDetail(mockSupabase, 'wh-lagos-main', orgA);
      expect(detail.assignedLocations.some((l) => l.id === loc.id)).toBe(true);

      // 3. Unassign
      const unassignRes = await unassignWarehouseLocation(
        mockSupabase,
        'wh-lagos-main',
        loc.id,
        orgA,
        adminUserA
      );
      expect(unassignRes.success).toBe(true);

      const checkDetail = await getWarehouseDetail(mockSupabase, 'wh-lagos-main', orgA);
      expect(checkDetail.assignedLocations.some((l) => l.id === loc.id)).toBe(false);
    });
  });

  describe('7. Delivery Rates Matrix Management', () => {
    it('creates and updates warehouse delivery rates and validates non-negative pricing', async () => {
      const rate = await upsertDeliveryRate(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos-main',
          location_id: 'loc-lagos-isl',
          price: 2800, // Update from 2500
          active: true,
        },
        adminUserA,
        orgA
      );

      expect(rate.price).toBe(2800);

      const rates = await listDeliveryRates(mockSupabase, orgA);
      const updated = rates.find((r) => r.locationId === 'loc-lagos-isl');
      expect(updated?.price).toBe(2800);

      // Reject negative price
      await expect(
        upsertDeliveryRate(
          mockSupabase,
          {
            warehouse_id: 'wh-lagos-main',
            location_id: 'loc-lagos-isl',
            price: -500,
            active: true,
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/cannot be negative/i);
    });
  });

  describe('8. Multi-Tenant Security & Tenant Isolation', () => {
    it('denies accessing or adjusting inventory belonging to another organization', async () => {
      await expect(
        adjustInventoryStock(
          mockSupabase,
          {
            warehouse_id: 'wh-org-b', // Org B warehouse
            product_id: 'prod-safari-book', // Org A product
            adjustment_quantity: 10,
            reason: 'Test',
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden|not found/i);

      await expect(
        adjustInventoryStock(
          mockSupabase,
          {
            warehouse_id: 'wh-lagos-main', // Org A warehouse
            product_id: 'prod-org-b-item', // Org B product
            adjustment_quantity: 10,
            reason: 'Test',
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden|not found/i);
    });

    it('denies inspecting another organization warehouse details', async () => {
      await expect(
        getWarehouseDetail(mockSupabase, 'wh-org-b', orgA)
      ).rejects.toThrow(/Forbidden|not found/i);
    });

    it('denies assigning locations across organization boundaries', async () => {
      await expect(
        assignWarehouseLocations(
          mockSupabase,
          'wh-org-b', // Org B warehouse
          ['loc-lagos-isl'],
          orgA,
          adminUserA
        )
      ).rejects.toThrow(/Forbidden|not found/i);
    });
  });
});
