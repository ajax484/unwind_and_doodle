# Admin Manual Order Page Design System Migration

## What Changed

Migrated the Admin Manual Order creation page and its dedicated subcomponents to the canonical Unwind & Doodle design system, replacing legacy arbitrary palette classes (`slate-*`, `rose-*`, `amber-*`), ad-hoc forms, and raw HTML elements with official design system primitives and semantic tokens:

1. **Page Entry Point (`src/app/admin/orders/manual/new/page.tsx`)**:
   - Replaced handcrafted breadcrumbs with canonical `<Breadcrumbs size="sm" showHome={false} items={[...]} />`.
   - Replaced raw back `<Link>` with canonical `<Button variant="outline" size="sm" href="/admin/orders">← Back to Orders</Button>`.
   - Replaced hardcoded text and border classes with `text-text-primary`, `text-text-secondary`, and `border-border-default`.

2. **Core Form (`src/components/admin/manual-order/ManualOrderForm.tsx`)**:
   - Replaced custom error box with `<AlertBanner variant="danger" size="md" dismissible />`.
   - Replaced customer search input and guest details inputs (email, phone, first name, last name) with canonical `<TextInput size="sm" />`.
   - Replaced delivery location, channel, and warehouse dropdowns with canonical `<Select size="sm" />`.
   - Replaced internal notes textarea with canonical `<Textarea size="sm" resize="vertical" />`.
   - Replaced product error alert with `<AlertBanner variant="warning" size="sm" />`.
   - Replaced product type indicators with canonical `<Badge />`.
   - Replaced "+ Add Products / Bundles" and "Create Manual Order & Link" submission buttons with canonical `<Button />`.
   - Replaced custom preview spinner with `<Spinner size="sm" color="rose" />`.
   - Normalized card backgrounds, borders, typography, and shadow tokens across customer, items, discount, shipping, and order summary rails.

3. **Success Modal (`src/components/admin/manual-order/ManualOrderSuccessModal.tsx`)**:
   - Replaced raw links and buttons with canonical `<Button />` (`variant="primary"`, `variant="secondary"`, `variant="outline"`).
   - Normalized modal surface, backdrop, and success badge indicators to design tokens (`bg-bg-surface`, `bg-status-success-bg`, `text-status-success-text`, `bg-status-success-accent`).

4. **Product Picker Modal (`src/components/admin/MultiProductPickerModal.tsx`)**:
   - Replaced search input with canonical `<TextInput size="sm" leadingIcon={...} />`.
   - Replaced raw checkboxes with canonical `<Checkbox />`.
   - Replaced product type and stock badges with canonical `<Badge />`.
   - Replaced loading indicator with canonical `<Spinner size="md" color="rose" />`.
   - Replaced error alert with `<AlertBanner variant="danger" size="sm" />`.
   - Replaced action buttons with canonical `<Button />`.

5. **Design System Component Extension (`src/components/Button.tsx`)**:
   - Added optional `target?: string;` and `rel?: string;` props to `ButtonProps` to seamlessly support external links when `href` is specified.

## Why

Eliminates UI drift and standalone legacy patterns across the back-office manual order fulfillment workflow. Brings the manual order creation route into strict visual and token parity with the rest of the Unwind & Doodle design system while preserving all underlying business logic, idempotency mechanics, server preview calculations, and Paystack payment link generation.

## Files Touched

- `src/app/admin/orders/manual/new/page.tsx`
- `src/components/admin/manual-order/ManualOrderForm.tsx`
- `src/components/admin/manual-order/ManualOrderSuccessModal.tsx`
- `src/components/admin/MultiProductPickerModal.tsx`
- `src/components/Button.tsx`
- `docs/changes/admin/2026-09-11-admin-manual-order-design-system-migration.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

feat(admin): migrate manual order creation page and modals to canonical design system
