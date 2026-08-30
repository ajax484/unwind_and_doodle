# Change Document: Phase 6D — Admin Inventory, Warehouses & Stock Management

**Date:** 2026-08-30  
**Feature:** Phase 6D — Admin Inventory, Warehouses & Stock Management  
**Status:** Completed & Verified  

---

## 1. What Changed

1. **Admin Inventory Types & Zod Schemas**:
   - Created `src/types/admin-inventory.ts` defining `StockAdjustmentSchema`, `CreateStockReceiptSchema`, `WarehouseSchema`, `LocationSchema`, `DeliveryRateSchema`, and TypeScript interfaces for inventory items, summary metrics, stock receipt details, warehouses, and delivery rate matrices.

2. **Inventory & Warehouse Service Layers**:
   - Implemented `src/services/admin-inventory.service.ts`:
     - `listAdminInventory`: Server-side filtering by warehouse and stock level, search by product name/SKU, pagination, and calculation of `availableToSell = Math.max(0, quantity - reserved_quantity)` and estimated inventory valuation (`Σ quantity × cost_price`).
     - `getProductInventoryDetails`: Aggregates multi-warehouse inventory levels and retrieves full immutable movement history from `inventory_movements`.
     - `adjustInventoryStock`: Atomic manual stock adjustments (positive/negative) with non-negative stock validation, recording `inventory_movements` (`movement_type = 'adjustment'`), logging audit trail (`stock.adjusted`), and emitting domain event (`inventory.adjusted`).
     - `createStockReceipt`: Idempotent goods received notes (GRN) creation, inserting `stock_receipts` & `stock_receipt_items`, incrementing warehouse stock on hand, recording `purchase` movement records, and retaining historical purchase cost without mutating the product's catalog default `cost_price`.
     - `listStockReceipts`: Historical GRN listing.
   - Implemented `src/services/admin-warehouse.service.ts`:
     - `listWarehouses`, `getWarehouseDetail`, `createWarehouse`, `updateWarehouse` (supporting soft deactivation via `active = false` to preserve fulfillment history).
     - `assignWarehouseLocations`, `unassignWarehouseLocation`: Managing relationships in `warehouse_locations`.
     - `listLocations`, `createLocation`, `updateLocation`: Managing geographic delivery zones.
     - `listDeliveryRates`, `upsertDeliveryRate`: Managing shipping fees between warehouses and customer locations.

3. **RESTful Admin API Endpoints**:
   - `GET /api/admin/inventory`: Inventory overview with search, filters, and summary valuation.
   - `GET /api/admin/inventory/[productId]`: Multi-warehouse breakdown and movement history.
   - `POST /api/admin/inventory/adjust`: Atomic manual stock adjustments.
   - `GET /api/admin/inventory/receipts` & `POST /api/admin/inventory/receipts`: Stock receipts.
   - `GET /api/admin/inventory/warehouses` & `POST /api/admin/inventory/warehouses`: Fulfillment warehouses.
   - `GET /api/admin/inventory/warehouses/[warehouseId]` & `PATCH /api/admin/inventory/warehouses/[warehouseId]`: Warehouse details and soft deactivation.
   - `POST /api/admin/inventory/warehouses/[warehouseId]/locations` & `DELETE /api/admin/inventory/warehouses/[warehouseId]/locations`: Location assignments.
   - `GET /api/admin/inventory/locations` & `POST /api/admin/inventory/locations`: Delivery locations.
   - `PATCH /api/admin/inventory/locations/[locationId]`: Location update.
   - `GET /api/admin/settings/delivery-rates` & `POST /api/admin/settings/delivery-rates`: Delivery rates.

4. **Responsive Admin UI Pages**:
   - `src/app/admin/inventory/page.tsx`: Inventory overview with summary cards, table/mobile cards, and quick stock adjustment modal.
   - `src/app/admin/inventory/[productId]/page.tsx`: Product inventory details across warehouses and movement timeline.
   - `src/app/admin/inventory/receipts/page.tsx`: Historical GRN listing table and cards.
   - `src/app/admin/inventory/receipts/new/page.tsx`: Multi-item goods receipt builder with live line total calculation.
   - `src/app/admin/inventory/warehouses/page.tsx`: Warehouse management table with active toggles and creation modal.
   - `src/app/admin/inventory/warehouses/[warehouseId]/page.tsx`: Warehouse editor and assigned locations manager.
   - `src/app/admin/settings/delivery/page.tsx`: Delivery rate configuration matrix.
   - `src/app/admin/settings/warehouses/page.tsx` & `src/app/admin/settings/locations/page.tsx`: Settings aliases.

5. **Automated Testing Suite**:
   - Created `tests/admin-inventory-and-warehouses.test.ts` with 12 comprehensive unit and integration tests covering inventory valuation, available stock calculations, adjustments, receipts, idempotency, warehouse soft-deactivation, location assignments, delivery rates, and multi-tenant security barriers.
   - **All 20 test files (197 tests) passed with 0 failures**.

---

## 2. Why the Changes Were Made

Store administrators require real-time visibility and transactional control over stock on hand, checkout holds, inbound purchase batches, regional warehouses, delivery locations, and shipping rates, while preserving historical auditability and multi-tenant isolation.

---

## 3. Files Touched

- `src/types/admin-inventory.ts`
- `src/services/admin-inventory.service.ts`
- `src/services/admin-warehouse.service.ts`
- `src/app/api/admin/inventory/route.ts`
- `src/app/api/admin/inventory/[productId]/route.ts`
- `src/app/api/admin/inventory/adjust/route.ts`
- `src/app/api/admin/inventory/receipts/route.ts`
- `src/app/api/admin/inventory/warehouses/route.ts`
- `src/app/api/admin/inventory/warehouses/[warehouseId]/route.ts`
- `src/app/api/admin/inventory/warehouses/[warehouseId]/locations/route.ts`
- `src/app/api/admin/inventory/locations/route.ts`
- `src/app/api/admin/inventory/locations/[locationId]/route.ts`
- `src/app/api/admin/settings/delivery-rates/route.ts`
- `src/app/admin/inventory/page.tsx`
- `src/app/admin/inventory/[productId]/page.tsx`
- `src/app/admin/inventory/receipts/page.tsx`
- `src/app/admin/inventory/receipts/new/page.tsx`
- `src/app/admin/inventory/warehouses/page.tsx`
- `src/app/admin/inventory/warehouses/[warehouseId]/page.tsx`
- `src/app/admin/settings/delivery/page.tsx`
- `src/app/admin/settings/warehouses/page.tsx`
- `src/app/admin/settings/locations/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/admin-inventory-and-warehouses.test.ts`

---

## 4. Follow-ups & Known Issues

- None. Supplier management and purchase order workflows are deferred to future procurement phases.

---

## 5. Commit Message

```text
feat: implement admin inventory, warehouses, and stock management (Phase 6D)

- Add admin inventory service with valuation, atomic adjustments, and idempotent stock receipts
- Add warehouse service with location assignments, geographic zones, and delivery rates
- Implement REST API routes for inventory, adjustments, receipts, warehouses, locations, and rates
- Build 7 responsive admin pages for inventory overview, product breakdown, GRNs, and fulfillment hubs
- Add 12 integration tests covering inventory math, idempotency, and multi-tenant security
```
