# Feature: Phase 6I Manual Orders Admin Frontend Implementation

## What Changed
Implemented the complete **Admin Manual Orders UI** allowing store administrators to create custom/direct orders for customers (e.g. from Instagram, WhatsApp, or phone), reserve inventory, and generate secure Paystack customer payment links (`/pay/[token]`).

### UI Components & Routing
- Created `src/app/admin/orders/manual/new/page.tsx`:
  - Route for `/admin/orders/manual/new`.
  - Header title: **Create Manual Order** with breadcrumbs and navigation.
- Created `src/components/admin/manual-order/ManualOrderForm.tsx`:
  - Two-column responsive desktop layout.
  - **Customer Section**: Debounced search across existing organization customers (`GET /api/admin/customers?search=...`). Autofills customer details (email, first name, last name, phone) with full editability and guest support.
  - **Products Section**: Integrated `ProductPickerModal` supporting physical products, custom products, and bundles. Displays thumbnails, SKUs, product type badges (`physical`, `custom`, `bundle`), price formatting, quantity controls (`-` / `+` / input min 1), line totals, and item removal. Rejects duplicate product selection.
  - **Shipping Section**: Address fields, warehouse selector (`GET /api/admin/inventory/warehouses`), location selector (`GET /api/admin/inventory/locations`), and non-negative shipping fee input.
  - **Discount & Channel Section**: Discount code input (validated server-side), channel selector (`Instagram`, `WhatsApp`, `Phone`, `Facebook`, `Other`), and internal notes textarea.
  - **Order Summary**: Sticky summary card with subtotal preview, discount preview, shipping fee, total, and primary CTA **Create payment link**.
  - **Idempotency Guard**: Generates unique `idempotencyKey` per form session (`mkey_<timestamp>_<random>`) maintained across retries.
- Created `src/components/admin/manual-order/ManualOrderSuccessModal.tsx`:
  - Success view displaying order reference badge (`ORD-M-20260830-XXXXX`), total amount, and secure payment link URL (`/pay/[token]`).
  - Actions: **Copy payment link** (with clipboard feedback), **Open payment page** (in new tab), **View order details**, and **Create another order** (form reset).
- Updated `src/app/admin/orders/page.tsx`:
  - Added **+ Create Manual Order** button in the header linking to `/admin/orders/manual/new`.

---

## Files Touched
- `src/app/admin/orders/manual/new/page.tsx` [NEW]
- `src/components/admin/manual-order/ManualOrderForm.tsx` [NEW]
- `src/components/admin/manual-order/ManualOrderSuccessModal.tsx` [NEW]
- `src/app/admin/orders/page.tsx`
- `docs/changes/2026-08-30-manual-orders-admin-frontend.md` [NEW]

---

## Commit Message
```text
feat(admin): implement Phase 6I Manual Orders Admin Frontend

- Add /admin/orders/manual/new route for admin manual order creation
- Add ManualOrderForm with debounced customer search, ProductPickerModal, warehouse selection, and server-authoritative pricing
- Add ManualOrderSuccessModal with payment link copy/open actions and order navigation
- Add Create Manual Order button to admin orders list header
```
