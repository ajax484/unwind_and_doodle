# Feature: Bundle Virtual Inventory Calculation & UI Integration

## What Changed
Resolved the issue where product bundles appeared as **Out of Stock** (`availableStock = 0`, `isAvailable = false`) across both backend services and frontend UI components.

### Cause
Bundles are virtual products and do not hold direct rows in the `inventory` table. When stock queries looked up inventory solely by `product_id = bundle.id`, zero inventory rows were returned, causing stock calculations to evaluate to 0.

### Backend Fix Applied
1. **`src/services/catalog.service.ts` (`getPublishedCatalog`)**:
   - Identified all published products with `product_type === 'bundle'`.
   - Batch-fetched `bundle_items` (`component_product_id`, `quantity`).
   - Included component product IDs in the `inventory` query.
   - Calculated virtual available bundle stock:
     $$\text{Bundle Available Stock} = \min_{c \in \text{components}} \left( \left\lfloor \frac{\text{Component Available Stock}_c}{\text{Quantity per Bundle}_c} \right\rfloor \right)$$

2. **`src/services/admin-product.service.ts` (`listAdminProducts`)**:
   - Identified all admin products with `product_type === 'bundle'`.
   - Calculated virtual `totalStock` (`onHand`), `reservedStock`, and `availableStock` for each bundle in the admin product list.

### Frontend UI Integration Applied
1. **`src/app/admin/products/page.tsx`**:
   - Added `Product Bundle` to the product type filter dropdown.
   - Rendered distinct purple `Bundle` badge for bundle products in the catalog table.
   - Added `(virtual total)` indicator to the available stock column for bundle products.

2. **`src/components/admin/ProductPickerModal.tsx`**:
   - Added `availableStock` property to `SelectableProduct`.
   - Added live stock status badge (`X in stock` / `Out of stock`) next to item selling price when picking products for bundles or manual orders.

---

## Files Touched
- `src/services/catalog.service.ts`
- `src/services/admin-product.service.ts`
- `src/app/admin/products/page.tsx`
- `src/components/admin/ProductPickerModal.tsx`
- `docs/changes/2026-08-30-bundle-virtual-inventory-calculation.md`

---

## Commit Message
```text
feat(admin-ui): integrate bundle virtual stock badges and filter options into frontend

- Add Product Bundle option to admin catalog type filter
- Add purple Bundle badge and virtual stock label in admin product list
- Display live component stock indicator in ProductPickerModal
- Verify all unit tests and catalog page rendering
```
