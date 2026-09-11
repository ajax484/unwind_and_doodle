# Feature: Auto-calculated Bundle Cost Price

## What Changed
Implemented automatic calculation of a product bundle's total cost price based on its component products and their respective quantities.

### Frontend Updates
- **`src/components/admin/ProductPickerModal.tsx`**: Added `cost_price?: number` to `SelectableProduct`.
- **`src/components/admin/BundleComponentBuilder.tsx`**:
  - Added `cost_price?: number` to `SelectedComponentItem`.
  - Added `cost_price: Number(product.cost_price || 0)` when selecting products.
  - Added **Auto Component Cost** (`componentsCostTotal`) card to the Admin Pricing Summary grid at the bottom of the component builder.
- **`src/app/admin/products/bundles/new/page.tsx`**:
  - Added `handleComponentsChange` callback that dynamically calculates `costPrice` whenever components are added, removed, or quantity changed ($\sum \text{component cost price} \times \text{quantity}$).
  - Added visual indicator under the Cost Price field displaying the auto-calculated sum.
- **`src/app/admin/products/bundles/[id]/edit/page.tsx`**:
  - Extracted `costPrice` when initializing component state.
  - Connected `handleComponentsChange` callback for dynamic cost price recalculation.
  - Added visual indicator under the Cost Price field displaying the auto-calculated sum.

### Automated Tests
- **`tests/admin-bundles.test.ts`**: Added test case 10 verifying that creating a bundle automatically calculates component cost totals from individual product cost prices.

---

## Files Touched
- `src/components/admin/ProductPickerModal.tsx`
- `src/components/admin/BundleComponentBuilder.tsx`
- `src/app/admin/products/bundles/new/page.tsx`
- `src/app/admin/products/bundles/[id]/edit/page.tsx`
- `tests/admin-bundles.test.ts`
- `docs/changes/2026-08-30-bundle-auto-cost-price.md` [NEW]

---

## Commit Message
```text
feat(bundles): auto calculate bundle cost price from component product prices

- Pass cost_price through SelectableProduct and SelectedComponentItem interfaces
- Auto-calculate bundle cost price on component add/remove/quantity changes
- Display Auto Component Cost in BundleComponentBuilder summary grid
- Add auto-calculated helper note under cost price input in bundle new/edit forms
- Add unit test verifying bundle component cost total calculation
```
