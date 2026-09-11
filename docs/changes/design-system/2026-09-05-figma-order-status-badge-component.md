# 2026-09-05 — Phase 6C: OrderStatusBadge Component in Figma

## What Changed

Created the standardized, reusable **`OrderStatusBadge`** administrative component set and its accompanying **`Order Status Badges`** documentation frame on the **Components** page (`pageId: 16:2942`) in Row 3 (`y: 19,000`), delivering Phase 6C and concluding the final item in the Unwind & Doodle design-system roadmap.

### 1. Reusable Component Set: `OrderStatusBadge`
- **Node ID**: `52:102317`
- **Position**: `x: 50,600, y: 19,000` (Row 3, positioned immediately after the `Order Status Badges` documentation frame)
- **Dimensions**: `10 columns × 4 rows` grid layout, each variant sized with Auto Layout and full pill corner radius (9999px)
- **Total Variants**: **40 variants** (complete matrix supporting both Order and Payment statuses):
  - **`Type`**: `Order` (6 statuses), `Payment` (4 statuses) *(Default: `Order`)*
  - **`Status`**:
    - For `Order`: `Created`, `Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`
    - For `Payment`: `Successful`, `Pending`, `Failed`, `Refunded`
    *(Default: `Created`)*
  - **`Size`**:
    - `MD`: 28px height, 12px horizontal padding, 12px Plus Jakarta Sans Medium font, 14px icon
    - `SM`: 24px height, 8px horizontal padding, 11px Plus Jakarta Sans Medium font, 12px icon
    *(Default: `MD`)*
  - **`Icon`**: `Leading`, `None` *(Default: `Leading`)*
  - **Default Variant Combination**: `Type=Order, Status=Created, Size=MD, Icon=Leading`

### 2. Token & Foundation Component Reuse
- **Zero Disallowed Global Subcomponents**: Strictly avoided creating standalone `PaymentStatusBadge`, `OrderStatus`, `PaymentStatus`, `AdminBadge`, or duplicate generic `Badge` primitives.
- **Reused Semantic Status Tokens**:
  - **Success** (`Confirmed`, `Delivered`, `Successful`): Background `#EBF8F2`, Text & Icon `#1F7A4D`, Icon: Check / PackageCheck.
  - **Warning** (`Order: Pending`, `Payment: Pending`): Background `#FFFBEB`, Text & Icon `#B45309`, Icon: Clock.
  - **Danger** (`Cancelled`, `Failed`): Background `#FDF0F2`, Text & Icon `#B33948`, Icon: X.
  - **Info** (`Created`, `Shipped`, `Refunded`): Background `#EEF2FF`, Text & Icon `#4338CA`, Icons: FileText (Created), Truck (Shipped), RefreshCcw (Refunded).
- **Accessibility Guarantee**: Text label is always displayed, ensuring status comprehension is 100% independent of color perception or icon presence (WCAG 2.1 AA compliant).

### 3. Documentation Frame: `Order Status Badges`
- **Node ID**: `52:102318`
- **Position**: `x: 49,000, y: 19,000` (Row 3, 1200px width, Auto Layout Vertical, 48px padding, height: 3249px)
- Built using the **Modular Master Template Architecture**:
  - **Hero Header**: Live instance of `_Module / Doc Header` (`Badge: "PHASE 6C · ADMINISTRATIVE STATUS SYSTEM"`, `Title: "Order Status Badges"`, `Description: "OrderStatusBadge communicates fulfillment and payment states across the admin experience while keeping order and payment semantics distinct."`).
  - **Section 01 · Anatomy & Structure**: Structural breakdown illustrating Optional Leading Icon, Visible Text Status Label, and Semantic Color Surface Treatment.
  - **Section 02 · Order Fulfillment Statuses**: Matrix of all 6 order fulfillment states (`Created`, `Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`) comparing `MD` and `SM` sizes.
  - **Section 03 · Payment Transaction Statuses**: Matrix of all 4 payment transaction states (`Successful`, `Pending`, `Failed`, `Refunded`) comparing `MD` and `SM` sizes.
  - **Section 04 · Icon Visibility Comparison**: Side-by-side comparison showing `Icon=Leading` vs `Icon=None` across key statuses, proving text alone communicates meaning without relying purely on color or icons.
  - **Section 05 · Semantic Context Distinction**: Dedicated side-by-side comparison of `Order: Pending` (awaiting fulfillment workflow) vs `Payment: Pending` (awaiting financial settlement), reinforcing that shared visual treatment does not imply identical lifecycle semantics.
  - **Section 06 · Real-World Admin Usage**:
    - Orders Table Row Simulator (`#UD-1042`, `#UD-1043`, `#UD-1044`, `#UD-1045` with corresponding status badges).
    - Multi-Status Admin Order Header (`Order Status: [Pending]`, `Payment Status: [Successful]`).
  - **Section 07 · Design System Foundation Rules**: Standardized `_Module / Rules Container` instance covering typography tokens, status colors, touch targets, and WCAG AA accessibility rules.

---

## Why

1. **Contextual Semantic Separation**: In administrative e-commerce workflows, confusing an unconfirmed order with an unsettled payment causes fulfillment errors. `OrderStatusBadge` explicitly distinguishes `Order` from `Payment` via the `Type` property.
2. **Unified Status Primitive**: Consolidates 10 operational states across orders and transactions into a single maintainable component set, eliminating fragmented one-off badges.
3. **Roadmap Completion**: Finalizes Phase 6 and completes the Unwind & Doodle Figma design-system roadmap.

---

## Files Touched
- Figma Document: `Components` page (`pageId: 16:2942`)
  - Created component set `OrderStatusBadge` (`id: 52:102317`, 40 variants)
  - Created documentation frame `Order Status Badges` (`id: 52:102318`, 1200px wide)
- [docs/changes/2026-09-05-figma-order-status-badge-component.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-order-status-badge-component.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Commit Message
```text
feat(design-system): create reusable OrderStatusBadge component and documentation in Figma

- Create 40-variant OrderStatusBadge component set (id: 52:102317) in Row 3 of Components page
- Support Type (Order, Payment), Status (6 Order + 4 Payment states), Size (SM, MD), and Icon (Leading, None)
- Reuse semantic status tokens (Success, Warning, Danger, Info) and typography foundations from Badge
- Maintain clear semantic distinction between Order Pending and Payment Pending
- Build 1200px Order Status Badges documentation frame (id: 52:102318) using modular template architecture
- Include anatomy, order statuses, payment statuses, icon comparison, context distinction, and table simulation
```
