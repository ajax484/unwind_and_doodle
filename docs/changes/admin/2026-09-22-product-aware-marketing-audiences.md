# Product-Aware Marketing Audiences & Segmentation

Upgrade the marketing audience and segmentation system with product-aware purchase predicates (`purchased_product`, `not_purchased_product`, `purchased_any_product`, `purchased_all_products`) and location-aware predicates (`shipping_state`, `shipping_city`), preserving backward compatibility and strict tenant isolation.

## What Changed

1. **Typed Definitions (`src/types/marketing.ts`)**:
   - Introduced `ProductSegmentField` (`'purchased_product' | 'not_purchased_product' | 'purchased_any_product' | 'purchased_all_products'`).
   - Introduced `LocationSegmentField` (`'shipping_state' | 'shipping_city'`).
   - Added `'in'` to `SegmentOperator`.
   - Updated `SegmentField` to union customer, purchase, product, and location fields.

2. **Segmentation Validation & Dynamic Evaluation (`src/services/marketing-segmentation.service.ts`)**:
   - **Purchase Definition**: Grounded purchases strictly in canonical qualifying orders (`confirmed`, `shipped`, `received`). Unpaid (`created`, `pending`), cancelled, and refunded orders are excluded.
   - **Product Predicates**:
     - `purchased_product`: Matches customers with at least one qualifying order containing the target product UUID.
     - `not_purchased_product`: Matches customers with zero qualifying orders containing the product.
     - `purchased_any_product`: Matches customers with at least one order containing any of the selected product UUIDs.
     - `purchased_all_products`: Matches customers who have purchased all specified product UUIDs.
     - **Fail-Safe & Tenant Isolation**: Checks referenced product IDs against the tenant's catalog. If a product ID is invalid, archived/deleted, or from a foreign organization, it fails safely to `false` (does not match anyone) rather than accidentally matching all customers.
   - **Location Predicates**:
     - Evaluates against the customer's **most recent qualifying order shipping address** (`orders.shipping_address -> state, city`), falling back to default customer address (`customer_addresses.state / lga`) for customers without orders.
     - Applies normalized comparisons (`trim().toLowerCase()`) to handle casing and whitespace differences (e.g. `"Lagos"` matches `"lagos"` and `" Lagos "`).
     - Supports `equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `is_null`, `is_not_null`, and `in`.

3. **Audience Builder UI (`src/components/admin/marketing/SegmentForm.tsx`)**:
   - Updated `FIELD_CONFIGS` with structured labels for customer, product, shipping, and purchase fields.
   - Integrated existing `ProductPickerModal` and `MultiProductPickerModal` for searchable product selection.
   - Added product metadata chips displaying name, SKU, price, and clear/change controls, with amber warning badges for archived/deleted products.
   - Added Nigerian state selector with custom state support and city text input.
   - Updated rule validation and audience preview to handle product and location conditions seamlessly.

4. **Test Suite (`tests/marketing/marketing-product-audiences.test.ts`)**:
   - 26 unit and integration tests covering single-item purchases, cross-sells (`Purchased A AND Not B`), multiple items in a single order, repeat purchases, name immutability via UUIDs, order status exclusion, latest-location semantics, dynamic re-evaluation upon new orders, and cross-tenant fail-safes.

## Why

Merchants need to build retention and cross-sell campaigns (such as offering Coloring Book B only to customers who already own Coloring Book A, or regional campaigns for customers with recent deliveries to Lagos). This upgrade provides flexible product and location segmentation on top of the existing composable rule engine without creating a duplicate segmentation system or breaking existing audiences.

## Files Touched

- `src/types/marketing.ts`
- `src/services/marketing-segmentation.service.ts`
- `src/components/admin/marketing/SegmentForm.tsx`
- `tests/marketing/marketing-product-audiences.test.ts`
- `docs/changes/admin/2026-09-22-product-aware-marketing-audiences.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

`feat(marketing): add product-aware and location-aware audience segmentation`
