# Code ↔ Figma Token Reconciliation (Step 7B.2)

## What Changed
Reconciled the Next.js 15 + Tailwind CSS v4 codebase against the canonical Figma design system established in Phases 1–6 and audited in Step 7B.1.

1. **`src/app/globals.css` Theme & Primitives Expansion**:
   - Implemented 3-tier token hierarchy (**Primitives → Semantics → Utilities**):
     - **Primitive Brand Blue**: `--color-brand-blue: #A7C2D4`, hover/dark `#7FA6BF`, deep `#4A7A99`, light `#EBF3F8`, subtle `#F4F8FA`.
     - **Primitive Brand Rose**: `--color-brand-rose: #D99BA3`, hover/dark `#C67D87`, deep `#9E4D58`, light `#FBF0F2`, subtle `#FDF7F8`.
     - **Primitive Neutral**: `--color-neutral-charcoal: #243342`, slate `#52657A`, muted `#8295A8`, placeholder `#9DB0C2`, cream `#FFFDF7`, white `#FFFFFF`, border-soft `#EDF3F7`, border-input `#DCE7EE`, footer-border `#36495C`.
     - **Primitive Status**: Green (`#EBF8F2` / `#1F7A4D` / `#10B981`), Amber (`#FFFBEB` / `#B45309` / `#F59E0B`), Red (`#FDF0F2` / `#B33948` / `#EF4444`), Indigo (`#EEF2FF` / `#4338CA` / `#6366F1`), Purple (`#7E22CE`).
     - **Semantic Background**: `--color-bg-default`, `--color-bg-surface`, `--color-bg-subtle`, `--color-bg-brand`, `--color-bg-accent`.
     - **Semantic Text**: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-placeholder`, `--color-text-inverse`, `--color-text-brand`, `--color-text-accent`.
     - **Semantic Border**: `--color-border-default`, `--color-border-input`, `--color-border-brand`, `--color-border-accent`, `--color-border-inverse`, `--color-border-strong`.
     - **Semantic Action**: `--color-action-primary` (`#D99BA3`), `--color-action-primary-hover` (`#C67D87`), `--color-action-secondary` (`#A7C2D4`), `--color-action-secondary-hover` (`#7FA6BF`), `--color-action-secondary-text` (`#4A7A99`), `--color-action-secondary-bg` (`#EBF3F8`).
     - **Semantic Status**: Success, Warning, Danger, Info (bg, text, accent tokens).
     - **Elevation Shadows**: `--shadow-card`, `--shadow-card-hover`, `--shadow-action-rose`, `--shadow-action-blue`.
     - **Radius Tokens**: `--radius-sm` (8px), `--radius-md` (14px), `--radius-lg` (20px), `--radius-xl` (24px), `--radius-pill` (9999px).
   - Reconciled existing utility and component classes (`.card-editorial`, `.card-soft`, `.btn-primary`, `.btn-rose`, `.btn-secondary`, `.btn-blue`, `.btn-outline`, `.badge-stock`, `.badge-in-stock`, `.badge-out-of-stock`, `.form-input`, `.stepper-btn`) to consume CSS variables from `@theme`.

2. **Core Shell & Components Token Reconciliation**:
   - `src/app/layout.tsx`: Replaced hardcoded `bg-[#FFFDF7] text-slate-800` with `bg-bg-default text-text-primary`.
   - `src/components/Navbar.tsx`: Replaced raw hex colors with `border-border-default`, `text-brand-blue`, `text-brand-rose`, `text-text-secondary`, `text-text-tertiary`, `hover:bg-bg-subtle`, `bg-action-secondary-bg`, `text-action-secondary-text`, `bg-action-primary`, `text-text-inverse`.
   - `src/components/Footer.tsx`: Replaced raw hex colors with `bg-neutral-charcoal`, `border-border-inverse`, `text-neutral-cream`, `text-brand-blue` (for consolidated `#A5B8C8`), `text-text-tertiary`.
   - `src/components/ProductCard.tsx`: Replaced raw hex colors with `bg-bg-surface`, `bg-bg-subtle`, `from-bg-brand via-bg-surface to-bg-accent`, `text-text-secondary`, `text-brand-rose`, `bg-status-purple-base`, `text-text-inverse`, `bg-action-primary`, `text-brand-blue`, `text-text-primary`, `border-border-default`, `bg-action-secondary-bg hover:bg-action-primary text-action-secondary-text hover:text-text-inverse`.
   - `src/components/home/HeroSection.tsx`: Replaced raw hex colors with `border-border-default`, `bg-brand-blue/18`, `bg-brand-rose/18`, `bg-bg-subtle`, `border-border-input`, `text-text-secondary`, `text-brand-rose`, `text-text-primary`, `text-brand-blue`, `bg-brand-blue/25`, `bg-brand-rose/25`, `bg-bg-accent`, `border-brand-rose/25`, `text-action-primary hover:text-action-primary-hover`.
   - `src/components/CartDrawer.tsx`: Replaced raw hex colors with `border-border-default`, `bg-bg-default`, `text-text-primary`, `text-text-tertiary`, `bg-bg-subtle`, `hover:bg-brand-blue-light`, `text-text-secondary`, `bg-bg-accent`, `text-action-primary`, `text-status-danger-text bg-status-danger-bg`, `text-status-success-text bg-status-success-bg`, `border-brand-rose/25`.
   - `src/components/CustomizationUploader.tsx`: Replaced raw hex colors with `bg-bg-accent`, `border-brand-rose/25`, `text-brand-rose`, `text-text-primary`, `text-text-secondary`, `border-brand-rose bg-brand-rose-subtle`, `border-border-default hover:border-border-brand`, `bg-action-secondary-bg text-action-secondary-text`, `border-action-primary`, `text-action-primary hover:text-action-primary-hover`, `text-text-tertiary`, `bg-status-danger-bg text-status-danger-text border-status-danger-accent/30`, `border-border-input`.
   - `src/components/OrderStatusTimeline.tsx`: Replaced generic Tailwind slate/pink/sky/red/amber classes with `border-status-danger-accent/30 bg-status-danger-bg text-status-danger-text`, `border-status-warning-accent/30 bg-status-warning-bg text-status-warning-text`, `border-border-default bg-bg-surface shadow-card text-text-primary`, `bg-linear-to-r from-brand-rose to-brand-blue`, `bg-brand-rose text-text-inverse ring-brand-rose-light shadow-action-rose`, `bg-brand-blue text-text-inverse shadow-action-blue`, `border-border-input text-text-placeholder`, `text-brand-rose-deep`, `text-text-secondary`, `text-text-tertiary`.
   - `src/components/admin/OrderStatusBadge.tsx`: Replaced generic slate/emerald/amber/red/purple classes with semantic status tokens (`bg-status-success-bg text-status-success-text border-status-success-accent/30`, `bg-status-warning-bg text-status-warning-text border-status-warning-accent/30`, `bg-status-danger-bg text-status-danger-text border-status-danger-accent/30`, `bg-status-purple-base/10 text-status-purple-base border-status-purple-base/30`, `bg-action-secondary-bg text-action-secondary-text border-border-brand/40`, `bg-status-info-bg text-status-info-text border-status-info-accent/30`, `bg-bg-subtle text-text-secondary border-border-default`).
   - `src/app/admin/AdminLayoutClient.tsx`: Replaced `bg-[#F4F7F9]` with `bg-bg-subtle`, `bg-[#1E293B]` with `bg-neutral-charcoal`.
   - `src/components/ReviewModal.tsx`, `StockNotificationButton.tsx`, `NotificationBell.tsx`, `FeaturedProductsSection.tsx`, `CategoryGrid.tsx`, `ReviewsSection.tsx`, `BrandPhilosophySection.tsx`, `NewsletterSection.tsx`: Replaced raw hex colors and borders with design system tokens.

## Why
In Step 7B.1, a full read-only audit revealed discrepancies between the Figma design system and the code implementation (such as 30+ occurrences of `#E2ECF2` vs `#EDF3F7`, 14+ occurrences of `#F0DCE0`, 8+ occurrences of `#1E293B` vs `#243342`, and missing semantic status/action tokens in Tailwind v4 `@theme`). Reconciling the codebase to the verified Figma token specification ensures visual consistency, design system parity, and effortless theme updates.

## Files Touched
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/Navbar.tsx`
- `src/components/Footer.tsx`
- `src/components/ProductCard.tsx`
- `src/components/home/HeroSection.tsx`
- `src/components/CartDrawer.tsx`
- `src/components/CustomizationUploader.tsx`
- `src/components/OrderStatusTimeline.tsx`
- `src/components/admin/OrderStatusBadge.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `src/components/ReviewModal.tsx`
- `src/components/StockNotificationButton.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/home/FeaturedProductsSection.tsx`
- `src/components/home/CategoryGrid.tsx`
- `src/components/home/ReviewsSection.tsx`
- `src/components/home/BrandPhilosophySection.tsx`
- `src/components/home/NewsletterSection.tsx`
- `docs/changes/README.md`

## Follow-ups / Known Issues
- Screen-level pages (`src/app/products/[slug]/page.tsx`, `cart/page.tsx`, `checkout/page.tsx`, etc.) contain screen-specific markup that will be refactored during Step 7C / screen design implementation.
- Unreferenced legacy `tailwind.config.ts` remains intact per destructive action rules (confirm before file deletion).

## Commit Message
```text
feat(tokens): reconcile Next.js codebase with Figma design tokens

- Extend globals.css @theme with 3-tier design token hierarchy (Primitives, Semantics, Utilities)
- Consolidate legacy borders, neutrals, and status colors to canonical tokens
- Reconcile Navbar, Footer, ProductCard, HeroSection, CartDrawer, and Admin badges to use token classes
- Maintain 100% type safety and zero regressions in test suite
```
