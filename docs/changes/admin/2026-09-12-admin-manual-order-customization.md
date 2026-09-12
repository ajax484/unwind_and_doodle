# 2026-09-12 Admin Manual Order Theme & Cover Customization

## What Changed
- **Catalog Model & API**:
  - Updated `AdminProductListItem` in `src/types/admin-product.ts` to include `supports_theme_customization?: boolean`.
  - Updated `listAdminProducts` in `src/services/admin-product.service.ts` to map `supports_theme_customization: Boolean(p.supports_theme_customization)`.
- **Product Picker**:
  - Updated `SelectableProduct` in `src/components/admin/MultiProductPickerModal.tsx` to include `supports_theme_customization` and displayed a "Customizable Themes" badge for matching items.
- **Customization Modal & Manual Order Form**:
  - Created `src/components/admin/manual-order/OrderItemCustomizationModal.tsx` allowing admin to configure 1 to 3 assigned themes and a personalized cover title (max 100 characters) for customizable coloring book items.
  - Updated `SelectedOrderProduct` and state in `src/components/admin/manual-order/ManualOrderForm.tsx` to maintain customization data and render customization chips / edit triggers in the Order Items table.
  - Updated `handleSubmit` to forward `customization: { themeIds, coverName }` on items in the payload to `POST /api/admin/orders/manual`.
- **Test Coverage**:
  - Added test cases in `tests/commerce/manual-order-ui.test.ts` verifying `supports_theme_customization` exposure in product listing and end-to-end theme customization snapshot creation via `createAdminManualOrder`.

## Why
- Admin staff handling offline orders (WhatsApp, phone, Instagram) frequently need to place orders for personalized coloring books where customers have selected specific themes and requested custom cover titles.
- Previously, the backend supported snapshots but the manual order creation form had no UI or payload support for customization, resulting in customizable books being submitted without customer themes or personalization.

## Files Touched
- `src/types/admin-product.ts` [MODIFY]
- `src/services/admin-product.service.ts` [MODIFY]
- `src/components/admin/MultiProductPickerModal.tsx` [MODIFY]
- `src/components/admin/manual-order/OrderItemCustomizationModal.tsx` [NEW]
- `src/components/admin/manual-order/ManualOrderForm.tsx` [MODIFY]
- `tests/commerce/manual-order-ui.test.ts` [MODIFY]

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(admin): enable theme and cover customization in manual order creation

- Add supports_theme_customization to admin product listing response and picker modal
- Create OrderItemCustomizationModal for 1-3 theme selection and cover name input
- Integrate customization state, badges, and payload forwarding into ManualOrderForm
- Add automated test verifying theme customization snapshot on manual orders
```
