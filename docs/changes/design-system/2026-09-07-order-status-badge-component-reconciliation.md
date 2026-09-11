# 2026-09-07 — Phase 6C: OrderStatusBadge Molecule Component Reconciliation

## What Changed
- **Canonical Design-System `OrderStatusBadge` Molecule (`src/components/OrderStatusBadge.tsx`)**:
  - Reconciled the administrative order and payment lifecycle badge molecule directly adhering to canonical Figma specifications (`OrderStatusBadge` Component Set `52:102317` with 40 variants and Documentation Board `52:102318` "Order Status Badges" on the `Components` page).
  - Strictly composed the foundational `<Badge>` atom primitive, eliminating ad-hoc styling and enforcing token consistency.
  - Implemented crisp, resolution-independent SVG icons for all 7 lifecycle states matching Figma specifications:
    - `FileText`: Order Created (`info` status token)
    - `Clock`: Order Pending & Payment Pending (`warning` status token)
    - `Check`: Order Confirmed & Payment Successful/Paid (`success` status token)
    - `Truck`: Order Shipped (`info` status token)
    - `PackageCheck`: Order Delivered / Received (`success` status token)
    - `X`: Order Cancelled & Payment Failed (`danger` status token)
    - `RefreshCcw`: Order Refunded & Payment Refunded (`purple` status token)
  - Configured complete variant matrix across 4 component dimensions:
    - `type`: `'order' | 'payment'` (default: `'order'`)
    - `status`: Supported both database enum values and Figma identifiers (`created`, `pending`, `confirmed`, `shipped`, `delivered`, `received`, `cancelled`, `successful`, `paid`, `failed`, `refunded`)
    - `size`: `'md'` (28px height, 12px padding) and `'sm'` (24px height, 8px padding)
    - `icon`: `'leading'` (SVG icon), `'none'` (text-only), and `'dot'` (optical indicator)
  - Preserved attention-grabbing subtle breathing pulse animation for `pending` fulfillment orders.
- **Admin Compatibility Forwarding (`src/components/admin/OrderStatusBadge.tsx`)**:
  - Refactored administrative component entry point to cleanly re-export `OrderStatusBadge` and types from `@/components/OrderStatusBadge`, guaranteeing 100% backward API compatibility across all admin pages.
- **Storybook Suite (`src/components/OrderStatusBadge.stories.tsx`)**:
  - Implemented 10 canonical stories covering the complete 40-variant matrix, side-by-side size comparisons, icon toggles, context distinction, real-world admin table simulation, Vitest play assertions, and token style checks:
    1. `Default` (Order Created, MD, Leading Icon)
    2. `OrderStatusesMatrix` (All 6 order fulfillment states)
    3. `PaymentStatusesMatrix` (All 4 payment gateway settlement states)
    4. `SizeComparison` (MD 28px vs SM 24px)
    5. `IconNone` (Text-only badges proving WCAG AA independent text clarity)
    6. `DotIndicator` (Optical dot indicator fallback)
    7. `OrderVsPaymentPending` (Context distinction: Order Pending vs Payment Pending)
    8. `AdminOrdersTableScenario` (Realistic order table simulation with dual badge columns)
    9. `InteractivePlay` (Vitest play test verifying rendering, accessible names, and SVG icons)
    10. `CssCheck` (Automated computed token verification for status backgrounds, borders, and typography)
- **Validation**:
  - `npx tsc --noEmit`: Passed with 0 errors.
  - `npm run test:story -- OrderStatusBadge.stories.tsx`: 10/10 tests passed in 1.59s.
  - `npx vitest --project storybook run`: 233/233 tests passed across all 22 story files in 22.85s.
  - `npm run build-storybook`: Static production build succeeded in 17.95s.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-orderstatusbadge--default`.

## Why
- Part of Phase 6C administrative status system reconciliation.
- Clearly separates order fulfillment lifecycle workflows from payment settlement transaction semantics while reusing shared design tokens.
- Elevates administrative status indicators into a tested, documented, token-compliant design system molecule.
- Ensures 100% backward compatibility for all admin pages and orders tables.

## Files Touched
- `src/components/OrderStatusBadge.tsx` (NEW)
- `src/components/admin/OrderStatusBadge.tsx` (MODIFIED)
- `src/components/OrderStatusBadge.stories.tsx` (NEW)
- `docs/changes/design-system/2026-09-07-order-status-badge-component-reconciliation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)
- `docs/design-system/CHANGELOG.md` (MODIFIED)

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(design-system): reconcile OrderStatusBadge molecule with Phase 6C Figma specifications

- Create canonical OrderStatusBadge in src/components composing Badge atom with SVG status icons
- Support Type (order, payment), Status (10 states), Size (SM, MD), and Icon (leading, none, dot)
- Re-export canonical component in src/components/admin/OrderStatusBadge.tsx for backward compatibility
- Author 10-story Storybook suite with admin table simulation, context distinction, and play tests
```
