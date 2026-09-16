# Figma Design System Changelog

All updates to individual Figma canvas components, frames, variant iterations, and token adjustments are documented here per design system governance rules.

## 2026-09-16 — RichTextEditor Component Set & Standardization

### What Changed

- **New Component Set in Figma Canvas**: `RichTextEditor` (`250:10990`) on the `Components` page (`16:2942`)
  - **Coordinates**: `x: 5644, y: 1400` (placed directly below `Textarea` `16:3977` in the form controls column).
  - **Variant Dimensions**:
    - `State`: `Default`, `Focus`, `Error`, `Disabled`
    - `Size`: `SM` (320px wide, min-h 120px), `MD` (360px wide, min-h 150px), `LG` (400px wide, min-h 190px)
    - `Message`: `None`, `Helper`, `Error`
  - **Structure & Layout**: Auto-layout vertical frame containing accessible `Label` ("Description"), `Editor Container` with rounded-xl corners (`12px`), responsive `Toolbar` (`#FFFDF7` background with 1px `#DCE7EE` bottom border and icon buttons for Bold, Italic, Strike, Headings, Lists, Blockquotes, Links, and Dividers), `Content Area` with typography tokens, and optional `Message` footer (Helper in `#8295A8`, Error in `#EF4444`).
  - Total variants: **13 canonical variants**.

- **Canonical React Component (`src/components/RichTextEditor.tsx`)**:
  - Promoted from admin-specific component to the canonical design system layer.
  - Implements `cva` container variants with sizing scales (`sm`, `md`, `lg`), accessible `label`, `helperText`, `errorMessage`, and semantic design tokens (`border-border-input`, `focus-within:ring-border-brand`, `bg-bg-surface`, `text-text-primary`).
  - Preserves backwards compatibility via re-export in `src/components/admin/RichTextEditor.tsx`.

- **Storybook Interactive Documentation (`src/components/RichTextEditor.stories.tsx`)**:
  - Registered under `Design System/Molecules/RichTextEditor` with autodocs, size variants, label/helper/error states, and interactive user event play tests.

---

## 2026-09-11 — Phase 9A.2: Product Listing Page (PLP) Design in Figma

### What Changed

- **New Page in Figma Canvas**: `Storefront — Products` (`162:12819`)
  - **`Desktop — 1440`** (1440px wide): Full editorial catalog experience featuring 120px horizontal margin, `Navbar` (Desktop), Editorial Header, Category Filter Pills, Search/Filter Toolbar, 4-column `ProductCard` grid (24px gap, 2 rows = 8 products), centered `Pagination` (Size=MD), and `Footer` (Desktop).
  - **`Desktop — 1280`** (1280px wide): Scaled 4-column layout with 80px horizontal padding, preserving the complete feature set for standard desktop viewports.
  - **`Tablet — 768`** (768px wide): Responsive 3-column product grid with 40px horizontal padding, compact toolbar, `Navbar` (Mobile/Tablet variant), and `Footer` (`Layout=Tablet`).
  - **`Mobile — 390`** (390px wide): Responsive 2-column product grid with 16px padding (matching `grid-cols-2` in code), stacked full-width search input with secondary filter row, `Pagination` (Size=SM), and `Footer` (`Layout=Mobile`).
  - **`📖 Page Documentation`** (1000px wide): Complete technical documentation board detailing Information Architecture, Breakpoint Rules, Design System component reuse, and Token mappings.

- **Design System Components Reused**:
  - `Navbar` (`36:19249`) — Desktop (`36:17729`) & Mobile (`36:18481`)
  - `ProductCard` (`17:5625`) — Standard, Custom, and Bundle variants with Rating and Actions
  - `Pagination` (`32:15803`) — Size=MD (`32:14925`) & Size=SM (`32:15355`)
  - `Footer` (`37:20278`) — Desktop (`37:19766`), Tablet (`160:10944`), and Mobile (`160:10468`)

### No React/Code Changes

Figma design task only. The layout mirrors the existing React implementation in [`src/app/products/page.tsx`](../../src/app/products/page.tsx).

---

## 2026-09-11 — Footer Responsive Variant Expansion (Mobile + Tablet)

### What Changed

- **Footer Component Set (`37:20278`) — Figma only, no React changes**:
  - Renamed all 16 existing variants from `Pledge=…` to `Layout=Desktop, Pledge=…` to make the layout dimension explicit.
  - Added **16 `Layout=Mobile` variants** (390px wide): stacked vertical layout — Brand column (logo + description + optional pledge), 2-column nav row (Shop + Support side-by-side at 163px each), About column full-width below, Divider, stacked Bottom Bar (copyright + legal links).
  - Added **16 `Layout=Tablet` variants** (768px wide): Brand column full-width on top, then 3 horizontal nav columns (Shop | Support | About at 192px each), Divider, horizontal Bottom Bar (copyright left, legal right).
  - Total variant count: 16 → **48** (16 Desktop + 16 Tablet + 16 Mobile).
  - All 4 boolean properties preserved across layouts: `Pledge=Visible|Hidden`, `CatalogLinks=Visible|Hidden`, `SupportLinks=Visible|Hidden`, `Legal=Visible|Hidden`.
  - Layout tokens consistent with React implementation: `paddingLeft/Right 20px` (mobile), `40px` (tablet), `48px` (desktop).

- **Storefront — Home page (`138:9287`)**:
  - Replaced footer instance in `Tablet — 768` frame with `Layout=Tablet, Pledge=Visible, CatalogLinks=Visible, SupportLinks=Visible, Legal=Visible` (457px height).
  - Replaced footer instance in `Mobile — 390` frame with `Layout=Mobile, Pledge=Visible, CatalogLinks=Visible, SupportLinks=Visible, Legal=Visible` (616px height).

- **Footers Documentation Board (`37:20678`)**:
  - Appended a **Responsive Behavior** section describing the Layout property, width constraints, grid structure, padding, and bottom bar behavior for each of the three layouts.

### No React/Storybook Changes

The React [`Footer.tsx`](../../src/components/Footer.tsx) implementation already handled responsive layout correctly via `layout="responsive"` (collapses `md:grid-cols-5` to single-column below the `md` breakpoint). No code changes were required.

---

## 2026-09-07 — Step 6A: DataTable Organism Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `DataTable` Organism (`src/components/DataTable.tsx`)**:
  - Reconciled the administrative tabular data organism directly against canonical Figma Component Set `DataTable` (`52:60334` with 18 consolidated production variants) and Documentation Board `Data Tables` (`52:63775`) on `Components` page (`16:2942`).
  - Organic atomic composition consuming established design system primitives:
    - Composes canonical [`Checkbox`](src/components/Checkbox.tsx) for header select-all (with indeterminate state) and per-row selection controls.
    - Composes canonical [`Pagination`](src/components/Pagination.tsx) for integrated bottom pagination controls (`size="sm"`).
    - Composes canonical [`EmptyState`](src/components/EmptyState.tsx) for zero-data callouts with customizable action buttons.
  - Generic TypeScript `<TData>` Architecture:
    - Type-safe column descriptors: `id`, `header`, `accessorKey`, `cell`, `align`, `width`, `sortable`, `className`.
    - Flexible row key extraction via `getRowId`.
  - Implemented CVA variant definitions bound to design tokens:
    - Vertical Density Scale: `default` (~52px row height, `py-3.5 px-4`, 14px body text) and `compact` (~40px row height, `py-2 px-3`, 12px caption text).
    - State Lifecycle: `default` (populated data rows), `loading` (animated pulse skeleton rows), and `empty` (centered `EmptyState` callout).
    - Selection Modes: `none`, `single`, and `multiple` (with select-all checkbox and row highlight `bg-brand-blue-light/35`).
    - Column Sorting: Interactive sort direction toggle with dual chevron vector and `aria-sort` announcements.
    - Container & Token Bindings: `bg-bg-surface` (`#FFFFFF`), `border-border-default` (`#EDF3F7`), `rounded-2xl` (16px / `Radius/LG`), `shadow-xs`, header `bg-bg-subtle/90` (`#FAFAFC`), row divider `border-b border-border-default`.
    - Integrated Pagination Footer: Displays range summary (`"Showing 1 to 10 of 48 orders"`) and canonical `Pagination` navigator.
    - Responsive Strategy: Full-width presentation with `overflow-x-auto` smooth horizontal scroll container preserving mobile viewports (Figma Section 06).
- **Storybook Suite (`src/components/DataTable.stories.tsx`)**:
  - Authored 12 comprehensive stories covering all variant combinations, density scales, selection modes, domain-specific administrative demos, Vitest play tests, and token style checks:
    - `Default`, `CompactDensity`, `MultiSelect`, `SingleSelect`, `LoadingState`, `EmptyStateStory`, `SortableColumns`, `OrdersDomainDemo`, `CustomersDomainDemo`, `ProductsDomainDemo`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- DataTable.stories.tsx`: 12/12 tests passed in 2.87s.
  - `npx vitest --project storybook run`: 363/363 tests passed across all 34 story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 22.36s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-organisms-datatable--default`.

### Why
- Step 6A of the Design System Reconciliation Roadmap.
- Administrative backoffice views previously lacked a centralized, authoritative tabular component pattern, causing visual drift across Orders, Customers, Inventory, and Reviews.
- `DataTable` establishes an accessible, responsive, token-compliant organism for all high-volume operational screens.

### Nodes & Files Touched
- Figma: `DataTable` (`52:60334`), `Data Tables` board (`52:63775`)
- React: `src/components/DataTable.tsx`
- Stories: `src/components/DataTable.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-datatable-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 5H: TestimonialCard Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `TestimonialCard` Molecule (`src/components/TestimonialCard.tsx`)**:
  - Reconciled the social proof / customer review card molecule directly against canonical Figma Component Set `TestimonialCard` (`19:10006` with 16 production variants) and Documentation Board `Ratings & Testimonials` on `Components` page (`16:2942`).
  - Organic atomic composition consuming established design system primitives:
    - Composes canonical [`RatingStars`](src/components/RatingStars.tsx) for numeric star rating score display (`showValue={true}`, `size="md"` / `size="sm"`).
    - Composes canonical [`Avatar`](src/components/Avatar.tsx) for user photography and initials monogram fallback (`size="md"` / `size="sm"`).
  - Implemented CVA variant definitions bound to design tokens:
    - Sizing: `md` (24px padding / `p-6`, 18px quote, 16px gap, 40px avatar, `size="md"` RatingStars) and `sm` (16px padding / `p-4`, 14px quote, 12px gap, 32px avatar, `size="sm"` RatingStars).
    - Card Container: `bg-bg-surface` (`#FFFFFF`), `border-border-default` (`#EDF3F7`), `rounded-lg` (20px / `Radius/LG`), `shadow-card`, hover `hover:shadow-card-hover`.
    - Typography: `text-text-primary` (`#243342`) italic quote, `font-heading font-semibold text-sm` author name, `text-xs text-text-tertiary` supporting meta.
  - Standard W3C & Accessibility Semantics:
    - Semantic `<figure>`, `<blockquote>`, and `<figcaption>` markup with accessible star rating announcements.
- **Storybook Suite (`src/components/TestimonialCard.stories.tsx`)**:
  - Authored 10 comprehensive stories covering all variant combinations, sizing options, initials fallback, hidden rating mode, long quote wrapping, production storefront grid showcase, Vitest play tests, and token style checks:
    - `Default`, `SmallSize`, `InitialsAvatar`, `WithoutRating`, `SmallWithoutRating`, `LongQuote`, `SmallLongQuote`, `StorefrontShowcase`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- TestimonialCard.stories.tsx`: 10/10 tests passed in 1.66s.
  - `npx vitest --project storybook run`: 351/351 tests passed across all 33 story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 22.07s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-testimonialcard--default`.

### Why
- Step 5H of the Design System Reconciliation Roadmap.
- Customer reflections and social proof are primary trust and e-commerce conversion drivers across the storefront homepage, product detail pages, and custom gift bundles.
- Centralizes testimonial card architecture into a canonical, token-bound molecule while eliminating ad-hoc card duplication.

### Nodes & Files Touched
- Figma: `TestimonialCard` (`19:10006`), `Ratings & Testimonials` board (`16:2942`)
- React: `src/components/TestimonialCard.tsx`
- Stories: `src/components/TestimonialCard.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-testimonial-card-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 5G: Breadcrumbs Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `Breadcrumbs` Molecule (`src/components/Breadcrumbs.tsx`)**:
  - Reconciled the hierarchical navigation molecule directly against canonical Figma Component Set `Breadcrumbs` (`52:56481` with 24 variants) and Documentation Board `Breadcrumbs` (`52:56482`) on `Components` page (`16:2942`).
  - Implemented CVA variant definitions bound to design tokens:
    - Sizing: `md` (14px Plus Jakarta Sans Body/Small, 16×16px Home icon, 14×14px chevron separator, 8px spacing / `gap-2`) and `sm` (12px Plus Jakarta Sans Caption, 14×14px Home icon, 12×12px chevron separator, 6px spacing / `gap-1.5`).
    - Semantic Colors: Trailing links in `text-text-secondary` (`#52657A`), active page in `text-text-primary` (`#243342`, `font-semibold`), separators in `text-text-tertiary` (`#8295A8`), disabled in `text-text-tertiary/60`.
  - Scalable Home Vector Icon:
    - Integrated SVG home icon matching Figma Token `Size/Icon/SM` (16px) on MD and `Size/Icon/XS` (14px) on SM, configurable via `showHome`, `homeHref`, and `homeLabel`.
  - Middle Truncation & Progressive Disclosure:
    - Supported `maxItems` collapsing intermediate ancestors into an accessible `"…"` expand button with `aria-label="Show all breadcrumbs"` and `onExpandMiddle` callback.
  - Standard W3C / WAI-ARIA Semantics:
    - `<nav aria-label="Breadcrumb">` landmark wrapper with semantic `<ol>` and `<li>` elements, `aria-current="page"` on leaf, `aria-hidden="true"` separators, and 44px minimum touch targets.
- **Storybook Suite (`src/components/Breadcrumbs.stories.tsx`)**:
  - Authored 11 comprehensive stories covering all variant combinations, sizing options, truncation behaviors, production contexts, Vitest play tests, and token style checks:
    - `Default`, `SmallSize`, `WithoutHome`, `MiddleTruncated`, `DisabledItem`, `CustomSeparator`, `ProductDetailPage`, `AdminOrderFulfillment`, `DeepHierarchy`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- Breadcrumbs.stories.tsx`: 11/11 tests passed in 1.44s.
  - `npx vitest --project storybook run`: 341/341 tests passed across all 32 story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 25.25s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-breadcrumbs--default`.

### Why
- Step 5G of the Design System Reconciliation Roadmap.
- Establishes an accessible, responsive, token-compliant navigation molecule for storefront catalog exploration, product detail views, and administrative backoffice workflows.
- Eliminates ad-hoc inline breadcrumbs across storefront and admin views by centralizing semantic hierarchy patterns into a single canonical molecule.

### Nodes & Files Touched
- Figma: `Breadcrumbs` (`52:56481`), `Breadcrumbs` board (`52:56482`)
- React: `src/components/Breadcrumbs.tsx`
- Stories: `src/components/Breadcrumbs.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-breadcrumbs-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 4H: AlertBanner Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `AlertBanner` Molecule (`src/components/AlertBanner.tsx`)**:
  - Reconciled the inline feedback banner molecule directly against canonical Figma Component Set `AlertBanner` (`53:13000` with 32 variants) and Documentation Board `Alert Banners` (`53:13001`) on `Components` page (`16:2942`).
  - Implemented CVA variant definitions bound to design tokens:
    - Status Colorways: `info` (`#EEF2FF`), `success` (`#EBF8F2`), `warning` (`#FFFBEB`), and `danger` (`#FDF0F2`) with respective 35% opacity semantic border accents.
    - Sizing: `md` (14px radius / `Radius/MD`, 14px padding / `py-3.5 px-4`, 16px title, 14px description) and `sm` (8px radius / `Radius/SM`, 10px padding / `py-2.5 px-3`, 14px title, 12px description).
  - Status Icons: Embedded dedicated SVG icons for all 4 states (`info`, `success`, `warning`, `danger`).
  - Trailing Controls:
    - Contextual action button/anchor link (`actionLabel`, `onAction`, `actionHref`).
    - Accessible dismiss close button with cross icon `×` (`dismissible={true}`, `onDismiss`, `aria-label="Dismiss alert"`).
  - Full WCAG 2.1 AA Accessibility:
    - `role="alert"`, `aria-live="polite"`, accessible close button labels, and 44px minimum touch targets.
- **Storybook Suite (`src/components/AlertBanner.stories.tsx`)**:
  - Authored 12 comprehensive stories covering all variant combinations, sizing options, action and dismiss combinations, production storefront/admin scenarios, Vitest play tests, and token style checks:
    - `Info`, `Success`, `Warning`, `Danger`, `SmallSize`, `SmallDanger`, `WithAction`, `WithDismiss`, `WithActionAndDismiss`, `SemanticColorways`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- AlertBanner.stories.tsx`: 12/12 tests passed in 1.56s.
  - `npx vitest --project storybook run`: 330/330 tests passed across all 31 component story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 20.44s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-alertbanner--info`.

### Why
- Step 4H of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant feedback and alert molecule for inline status updates, form validations, checkout announcements, and order tracking notifications.
- Delineates inline persistent feedback (`AlertBanner`) from floating transient messages (`Toast`), fulfilling Figma Section 06 architectural guidance.

### Nodes & Files Touched
- Figma: `AlertBanner` (`53:13000`), `Alert Banners` board (`53:13001`)
- React: `src/components/AlertBanner.tsx`
- Stories: `src/components/AlertBanner.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-alert-banner-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 4G: AddonCompanionCard Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `AddonCompanionCard` Molecule (`src/components/AddonCompanionCard.tsx`)**:
  - Reconciled the storefront companion card molecule directly against canonical Figma Component Set `AddonCompanionCard` (`41:25498` with 32 variants) and Documentation Board `Addon Companion Cards` (`41:26969`) on `Components` page (`16:2942`).
  - Implemented CVA variant definitions bound to design tokens:
    - Sizing: `md` (380px fixed width/grid, 16px padding / `p-4`, 72×72px image, 24×24px indicator) and `sm` (320px fixed width/grid, 12px padding / `p-3`, 56×56px image, 20×20px indicator).
    - States: `Default` (border `#EDF3F7`, surface `#FFFFFF`), `Hover` (`bg-bg-subtle/60` with subtle elevation `shadow-xs`), `Selected` (2px brand border `#A7C2D4`, surface `#FFFFFF`, Rose checkbox indicator), and `Disabled` (`bg-bg-subtle` `#F4F8FA`, 60% opacity, pointer events disabled).
  - Adaptive Sizing & Collapse Modes:
    - `showImage={false}` (`Image=Hidden` in Figma): Image viewport hides and content smoothly expands full width without dead space.
    - `showDescription={false}` (`Description=Hidden` in Figma): Description hides, yielding a compact single-row card.
  - Image Viewport & Built-In Vector Motifs:
    - 72×72px (MD) or 56×56px (SM) square viewport with `Radius/MD` (14px / `rounded-md`) and `bg-bg-subtle` (`#F4F8FA`).
    - Built-in vector motifs for zero-asset fallback matching Figma Section 4: `gift` (Gift Wrapping), `card` (Greeting Card), `stickers` (Sticker Pack), and `prints` (Extra Prints).
  - Selection Indicator (Checkbox):
    - Square checkbox with rounded corners (24×24px on MD, 20×20px on SM).
    - Selected: `bg-action-primary` (`#D99BA3`) fill, 2px Rose stroke, and crisp white SVG checkmark (`text-text-inverse`).
  - Content Area:
    - Add-on Name: 16px Fredoka SemiBold (`font-heading font-semibold text-text-primary`), dimmed to tertiary when disabled.
    - Description: 14px Plus Jakarta Sans Regular (`text-text-secondary text-sm line-clamp-2`).
    - Price: 14px Plus Jakarta Sans SemiBold (`font-semibold text-text-primary text-sm`), formatted with `+₦` prefix.
  - Full WCAG 2.1 AA Accessibility:
    - `role="checkbox"`, `aria-checked`, `aria-disabled`, `tabIndex`, full keyboard navigation (`Space` / `Enter`), and 44px minimum touch targets.
- **Storybook Suite (`src/components/AddonCompanionCard.stories.tsx`)**:
  - Authored 12 comprehensive stories covering all variant combinations, sizing options, adaptive collapse modes, the 4 canonical specimens from Figma Section 4, a live interactive customization panel reproducing Figma Section 5, Vitest play tests, and token style checks:
    - `Default`, `Selected`, `Hover`, `Disabled`, `SmallSize`, `SmallSelected`, `DescriptionHidden`, `ImageHidden`, `CanonicalSpecimens`, `InteractiveCustomizationFlow`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- AddonCompanionCard.stories.tsx`: 12/12 tests passed in 1.91s.
  - `npx vitest --project storybook run`: 318/318 tests passed across all 30 component story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 27.25s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-addoncompanioncard--default`.

### Why
- Step 4G of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant companion card for selecting complementary accessories, gift packaging, and coloring tools in storefront customization flows and bundle builder experiences.
- Replaces ad-hoc inline companion markup and unifies add-on representations across the application.

### Nodes & Files Touched
- Figma: `AddonCompanionCard` (`41:25498`), `Addon Companion Cards` board (`41:26969`)
- React: `src/components/AddonCompanionCard.tsx`
- Stories: `src/components/AddonCompanionCard.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-addon-companion-card-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 4F: ThemeSelectorCard Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `ThemeSelectorCard` Molecule (`src/components/ThemeSelectorCard.tsx`)**:
  - Reconciled the storefront customization molecule directly against canonical Figma Component Set `ThemeSelectorCard` (`41:24918` with 16 variants) and Documentation Board `Theme Selector Cards` (`41:24919`) on `Components` page (`16:2942`).
  - Implemented CVA variant definitions bound to design tokens:
    - Sizing: `md` (260px fixed width/grid, 16px padding / `p-4`, 226×226px 1:1 preview) and `sm` (200px fixed width/grid, 12px padding / `p-3`, 174×174px 1:1 preview).
    - States: `Default` (border `#EDF3F7`, surface `#FFFFFF`), `Hover` (`bg-bg-subtle/60` with subtle elevation `shadow-xs`), `Selected` (2px brand border `#A7C2D4` with Rose check indicator), and `Disabled` (`bg-bg-subtle` `#F4F8FA`, 60% opacity, pointer events disabled).
  - 1:1 Aspect Ratio Preview Viewport:
    - Bound to `Radius/MD` (14px / `rounded-md`) and `bg-bg-subtle` (`#F4F8FA`).
    - Integrated artistic SVG fallback illustration for graceful rendering when no theme imagery is provided.
  - Absolute Selection Indicator:
    - Pinned top-right circular badge (`w-6 h-6` on MD, `w-5 h-5` on SM).
    - Selected state features `bg-action-primary` (`#D99BA3`) fill, 2px Rose stroke, and crisp white SVG checkmark.
  - Content Frame:
    - Theme Name: 16px Fredoka SemiBold (`font-heading font-semibold text-text-primary`), dimmed to tertiary when disabled.
    - Optional Description: 14px Plus Jakarta Sans Regular (`text-text-secondary text-sm line-clamp-2`), controlled via `showDescription` prop.
  - Full WCAG 2.1 AA Accessibility:
    - Supports `role="checkbox"` (multi-select up to 3 themes) and `role="radio"` (single theme selection).
    - Full keyboard navigation (`Space` / `Enter`), dynamic `aria-checked`, and 44px minimum touch targets.
- **Storybook Suite (`src/components/ThemeSelectorCard.stories.tsx`)**:
  - Authored 11 comprehensive stories covering all variant combinations, sizing options, description toggling, catalog specimens, interactive storefront scenario, Vitest play tests, and token style checks:
    - `Default`, `Selected`, `Hover`, `Disabled`, `SmallSize`, `SmallSelected`, `DescriptionHidden`, `ThemeCatalog`, `StorefrontCustomizationStep`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- ThemeSelectorCard.stories.tsx`: 11/11 tests passed in 1.32s.
  - `npx vitest --project storybook run`: 306/306 tests passed across all 29 component story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 25.54s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-themeselectorcard--default`.

### Why
- Step 4F of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant card molecule for theme selection across storefront product detail pages, custom keepsake creation, and bundle builder workflows.
- Eliminates one-off inline theme button markup and unifies theme representations across the application.

### Nodes & Files Touched
- Figma: `ThemeSelectorCard` (`41:24918`), `Theme Selector Cards` board (`41:24919`)
- React: `src/components/ThemeSelectorCard.tsx`
- Stories: `src/components/ThemeSelectorCard.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-theme-selector-card-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 4E: ProductImageGallery Organism Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `ProductImageGallery` Organism (`src/components/ProductImageGallery.tsx`)**:
  - Reconciled the storefront product image gallery organism directly against canonical Figma Component Set `ProductImageGallery` (`40:24601` with 32 variants) and Documentation Board `Product Image Galleries` (`41:24602`) on `Components` page (`16:2942`).
  - Implemented CVA variant definitions bound to design tokens:
    - `layout`: `'desktop'` (480×480px main viewport, 64×64px thumbnails with 8px gap), `'mobile'` (340×340px main viewport, 56×56px thumbnails with horizontal scroll), and `'auto'` (responsive `w-full max-w-[480px] aspect-square`, responsive 56-64px thumbnails).
    - `thumbnails`: `true` (renders thumbnail strip below main viewport) vs `false` (thumbnails hidden for single images or minimal layout).
    - `showImageCount`: `true` (renders Charcoal pill overlay pinned to bottom-right corner) vs `false`.
  - Main Viewport & Navigation:
    - 1:1 aspect ratio with `rounded-lg` (maps to `--radius-lg: 20px` / `Radius/LG`) and `bg-bg-subtle` (`#F4F8FA`) neutral backdrop.
    - Soft hover chevron navigation buttons (`<` and `>`) with frosted Charcoal pill background, Rose focus rings, and accessible labels.
    - Optional customization badge slot pinned to top-left corner (`badge` prop).
    - Accessible image count badge pill (`bg-neutral-charcoal/75`, caption typography `text-xs font-medium text-text-inverse`, `rounded-full`).
    - Graceful empty placeholder fallback featuring an artistic image icon when no media is provided.
  - Thumbnails Tablist:
    - Styled with `rounded-md` (maps to `--radius-md: 14px` / `Radius/MD`) per Figma specification.
    - Selected thumbnail: 2px Rose stroke (`border-2 border-brand-rose` `#D99BA3`), 100% opacity, subtle rose halo ring (`ring-2 ring-brand-rose/20`).
    - Unselected thumbnail: 1px default stroke (`border border-border-default` `#EDF3F7`), 70% opacity, hover transition to full opacity.
    - Full keyboard navigation: `role="tablist"` container with `ArrowLeft` and `ArrowRight` arrow key navigation, `Enter` / `Space` selection, and 44px minimum touch targets.
- **Storybook Suite (`src/components/ProductImageGallery.stories.tsx`)**:
  - Authored 11 comprehensive stories covering the full variant matrix, layouts, count overlays, customization badges, empty states, automated Vitest play tests, and token style checks:
    - `Default`, `SecondSelected`, `ThirdSelected`, `ImageCountVisible`, `CustomCountText`, `MobileLayout`, `ThumbnailsHidden`, `WithCustomizationBadge`, `EmptyPlaceholder`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- ProductImageGallery.stories.tsx`: 11/11 tests passed in 1.71s.
  - `npx vitest --project storybook run`: 295/295 tests passed across all 28 component story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 22.50s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-organisms-productimagegallery--default`.

### Why
- Step 4E of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant product image gallery organism for storefront product detail pages, quick-view modals, and custom keepsake previews.
- Replaces ad-hoc gallery markup while ensuring full backward compatibility with `src/app/products/[slug]/page.tsx`.

### Nodes & Files Touched
- Figma: `ProductImageGallery` (`40:24601`), `Product Image Galleries` board (`41:24602`)
- React: `src/components/ProductImageGallery.tsx`
- Stories: `src/components/ProductImageGallery.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-product-image-gallery-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 5C: AddressCard Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `AddressCard` Molecule (`src/components/AddressCard.tsx`)**:
  - Reconciled the storefront delivery address card molecule directly against canonical Figma Component Set `AddressCard` (`43:48157` with 8 variants) and Documentation Board `Address Cards` (`43:49054`) on `Components` page (`16:2942`).
  - Strictly composed foundational design system atoms: `<Badge variant="tag" size="sm">Default</Badge>` for primary delivery address tagging and `<Button variant="ghost" size="sm">` for contextual Edit and Remove actions.
  - Implemented CVA variant definitions bound to design tokens:
    - Sizing: `md` (16px padding / `p-4`, 14px gap / `gap-3.5`, 16px heading) and `sm` (12px padding / `p-3`, 10px gap / `gap-2.5`, 14px heading).
    - States: `Default` (border `#EDF3F7`, surface `#FFFFFF`), `Hover` (`bg-bg-subtle` `#F4F8FA` with subtle elevation `shadow-sm`), `Selected` (2px brand border `#A7C2D4` with 10px inner Rose dot `#D99BA3`), and `Disabled` (60% opacity, disabled actions).
  - 3-column architecture matching Figma: Selection Indicator (20px circular radio), Metadata Content (Category label, Recipient Name, Default Tag, Address lines, Phone), and Contextual Actions (Edit and Remove with `e.stopPropagation()` event isolation).
  - Dual data binding interface: Supports either a structured `address: AddressData` object or flat props.
  - Full WCAG 2.1 AA accessibility: `role="radio"`, `aria-checked`, `tabIndex`, full keyboard activation (`Enter` / `Space`), and 44px minimum touch targets.
- **Storybook Suite (`src/components/AddressCard.stories.tsx`)**:
  - Authored 10 comprehensive stories covering all variant combinations, size comparisons, tag permutations, phone omission, read-only display, checkout radio group flow, automated Vitest play tests, and token style checks:
    - `Default`, `Selected`, `SmallSize`, `WithoutDefaultBadge`, `WithoutPhone`, `ReadOnlyDisplay`, `DisabledState`, `CheckoutRadioGroup`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story -- AddressCard.stories.tsx`: 10/10 tests passed in 1.67s.
  - `npx vitest --project storybook run`: 284/284 tests passed across all 27 component story suites (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 21.48s with 0 errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-addresscard--default`.

### Why
- Step 5C of the Design System Reconciliation Roadmap.
- Establishes a canonical, accessible, token-compliant delivery address card for storefront checkout, saved-address management, account profiles, and administrative customer address inspection.
- Unifies address representations across the application while eliminating ad-hoc address markup.

### Nodes & Files Touched
- Figma: `AddressCard` (`43:48157`), `Address Cards` board (`43:49054`)
- React: `src/components/AddressCard.tsx`
- Stories: `src/components/AddressCard.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-address-card-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 2B: Form Controls Component Family Reconciliation (Milestone Complete)

### What Changed
- **Canonical `Form Controls` Component Family (`src/components/`)**:
  - Reconciled the foundational Form Controls component family directly adhering to canonical Figma Component Sets `TextInput` (`16:3840`), `Textarea` (`16:3977`), `Select` (`16:4104`), `Checkbox` (`16:4121`), and Documentation Board `16:4122` ("Form Controls" on `Components` page).
  - Implemented CVA variant definitions and token bindings for each control:
    - **`TextInput` (`src/components/TextInput.tsx`)**: Sizes `sm` (32px), `md` (40px, default), `lg` (48px); tokenized border `#DCE7EE`, focus ring `#A7C2D4`, error border `#EF4444`, radius `Radius/MD` (14px / `rounded-xl`); leading/trailing icon slots; accessible label with `useId()` and error/helper `aria-describedby`.
    - **`Textarea` (`src/components/Textarea.tsx`)**: Sizes `sm` (80px), `md` (104px, default), `lg` (128px); resize modes (`vertical`, `none`, `both`); dynamic character counter (`showCount` or `characterCount`); tokenized borders, radius 14px, accessible messages.
    - **`Select` (`src/components/Select.tsx`)**: Sizes `sm`, `md`, `lg`; custom vector chevron down indicator (`#52657A`); optional leading icon slot; structured `options` array support and native child `<option>` delegation; tokenized borders and focus rings.
    - **`Checkbox` (`src/components/Checkbox.tsx`)**: Optical 20px box (`w-5 h-5`), `Radius/SM` (8px / `rounded-lg`), Rose active fill (`#D99BA3`) with crisp white SVG checkmark; tri-state indeterminate mode with horizontal dash SVG; 44px minimum touch targets.
    - **`FormControls` Barrel (`src/components/FormControls.tsx`)**: Centralized barrel export for all 4 controls and types.
- **Storybook Suites (`src/components/*.stories.tsx`)**:
  - Authored 4 comprehensive 10-story Storybook suites covering the entire variant matrix, size comparisons, icon slots, error states, disabled states, Vitest play tests, and computed token checks:
    - `src/components/TextInput.stories.tsx`: 11 tests passing.
    - `src/components/Textarea.stories.tsx`: 10 tests passing.
    - `src/components/Select.stories.tsx`: 10 tests passing.
    - `src/components/Checkbox.stories.tsx`: 10 tests passing.
- **Validation**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run test:story`: 274/274 tests passing across all 26 test files (100% pass rate).
  - `npm run build-storybook`: Production bundle built in 25.11s with 0 errors.
  - Live preview links:
    - TextInput: `http://localhost:6006/?path=/story/design-system-atoms-textinput--default`
    - Textarea: `http://localhost:6006/?path=/story/design-system-atoms-textarea--default`
    - Select: `http://localhost:6006/?path=/story/design-system-atoms-select--default`
    - Checkbox: `http://localhost:6006/?path=/story/design-system-atoms-checkbox--default`

### Why
- Step 2B of the Design System Reconciliation Roadmap.
- Establishes canonical, accessible, token-compliant form primitives replacing raw inputs across the storefront and admin panels.
- Guarantees WCAG 2.1 AA accessibility compliance across all form interactions.

### Nodes & Files Touched
- Figma: `TextInput` (`16:3840`), `Textarea` (`16:3977`), `Select` (`16:4104`), `Checkbox` (`16:4121`), `Form Controls` board (`16:4122`)
- React: `src/components/TextInput.tsx`, `src/components/Textarea.tsx`, `src/components/Select.tsx`, `src/components/Checkbox.tsx`, `src/components/FormControls.tsx`
- Stories: `src/components/TextInput.stories.tsx`, `src/components/Textarea.stories.tsx`, `src/components/Select.stories.tsx`, `src/components/Checkbox.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-form-controls-component-family-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Phase 6C: OrderStatusBadge Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `OrderStatusBadge` Molecule (`src/components/OrderStatusBadge.tsx`)**:
  - Reconciled the administrative order fulfillment and payment lifecycle badge molecule directly against canonical Figma Component Set `OrderStatusBadge` (`52:102317` with 40 variants) and Documentation Board `Order Status Badges` (`52:102318`) on `Components` page (`16:2942`).
  - Strictly composed the foundational `<Badge>` atom primitive, preserving token consistency and avoiding duplicate badge components.
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
  - Preserved subtle breathing pulse animation for `pending` fulfillment orders.
- **Admin Compatibility Forwarding (`src/components/admin/OrderStatusBadge.tsx`)**:
  - Re-exported `OrderStatusBadge` and types from `@/components/OrderStatusBadge`, guaranteeing 100% backward API compatibility across all admin pages.
- **Storybook Suite (`src/components/OrderStatusBadge.stories.tsx`)**:
  - Authored 10 comprehensive stories covering all variant combinations, side-by-side size comparisons, icon toggles, context distinction, real-world admin table simulation, Vitest play assertions, and token style checks:
    - `Default`, `OrderStatusesMatrix`, `PaymentStatusesMatrix`, `SizeComparison`, `IconNone`, `DotIndicator`, `OrderVsPaymentPending`, `AdminOrdersTableScenario`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npx tsc --noEmit`: Exited with code 0 (zero errors).
  - `npm run test:story -- OrderStatusBadge.stories.tsx`: 10/10 tests passed in 1.59s.
  - `npx vitest --project storybook run`: 233/233 tests passed across all 22 component story suites in 22.85s.
  - `npm run build-storybook`: Succeeded in 17.95s with zero errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-molecules-orderstatusbadge--default`.

### Why
- Part of Phase 6C administrative status system reconciliation.
- Clearly separates order fulfillment lifecycle workflows from payment settlement transaction semantics while reusing shared design tokens.
- Ensures 100% backward compatibility for all admin pages and orders tables.

### Nodes & Files Touched
- Figma: `OrderStatusBadge` (`52:102317`), `Order Status Badges` (`52:102318`)
- React: `src/components/OrderStatusBadge.tsx`, `src/components/admin/OrderStatusBadge.tsx`
- Stories: `src/components/OrderStatusBadge.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-order-status-badge-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 4C: Footer Organism Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `Footer` Organism (`src/components/Footer.tsx`)**:
  - Reconciled the storefront footer organism directly against canonical Figma Component Set `Footer` (`37:20278`) and Documentation Board `Footers` (`37:20678`) on `Components` page (`16:2942`).
  - Implemented `class-variance-authority` (CVA) variant definitions (`footerVariants`) bound directly to canonical design tokens:
    - Primary Surface: `bg-neutral-charcoal` (`#243342`).
    - Top Border & Inner Dividers: `border-border-inverse` (`#36495C`).
    - Headings/Accents: `font-heading font-semibold text-brand-blue` (`#A7C2D4`) and `text-brand-rose` (`#D99BA3`).
    - Links & Story Copy: `font-body text-text-tertiary` (`#8295A8` / `#A5B8C8`) with `hover:text-white transition-colors`.
    - Brand Title & Wordmark: Signature colorful Fredoka title (`text-brand-blue` / `text-brand-rose`).
    - Service Pledge: `♡` (`text-brand-rose`) + `"Made with care · Delivered with intention"` (`text-text-tertiary`).
  - Supported Figma variant property toggles with 100% backward API compatibility:
    - `showPledge?: boolean` (Figma `Pledge=Visible|Hidden`, default: `true`).
    - `showCatalogLinks?: boolean` (Figma `CatalogLinks=Visible|Hidden`, default: `true`).
    - `showSupportLinks?: boolean` (Figma `SupportLinks=Visible|Hidden`, default: `true`).
    - `showLegal?: boolean` (Figma `Legal=Visible|Hidden`, default: `true`).
    - Customizable props for `layout` (`responsive`, `desktop`, `mobile`), `brandDescription`, `pledgeText`, `catalogLinks`, `supportLinks`, `aboutLinks`, `legalLinks`, and `copyrightYear`.
  - Maintained zero-prop usage for storefront layouts (`src/app/layout.tsx`) and admin route suppression (`pathname?.startsWith('/admin')`).
  - Enforced WCAG 2.1 AA accessibility standards:
    - Semantic `<footer role="contentinfo">` landmark.
    - Navigation link columns wrapped in `<nav aria-labelledby="...">` (`footer-catalog-heading`, `footer-support-heading`, `footer-about-heading`, `aria-label="Legal Information"`).
    - Visible high-contrast focus rings (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-charcoal`).
    - Minimum 44px mobile touch targets for interactive links.
- **Storybook Suite (`src/components/Footer.stories.tsx`)**:
  - Authored 10 comprehensive stories covering all variant combinations, optional module toggles, responsive views, Vitest play tests, and token style assertions:
    - `Default`, `Minimal`, `Mobile`, `DeliveryPledgeHidden`, `LegalLinksHidden`, `CatalogColumnHidden`, `SupportColumnHidden`, `AuthenticScenario`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npm run test:story -- Footer.stories.tsx`: 10/10 tests passed in 1.99s.
  - `npx vitest --project storybook run`: 223/223 tests passed across all 21 component story suites in 20.26s.
  - `npx tsc --noEmit`: Exited with code 0 (zero errors).
  - `npm run build-storybook`: Succeeded in 18.15s with zero errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-organisms-footer--default`.

### Why
- Elevates the storefront footer into a fully reconciled, token-compliant, accessible design-system organism.
- Guarantees 1:1 visual fidelity with canonical Figma Component Set `37:20278` and Documentation Board `37:20678`.
- Guarantees WCAG 2.1 AA accessibility standards with landmark roles, grouped navigation headers, 44px minimum touch targets, and visible focus rings.

### Nodes & Files Touched
- Figma: `Footer` (`37:20278`), `Footers` (`37:20678`)
- React: `src/components/Footer.tsx`
- Stories: `src/components/Footer.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-footer-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 5C: Navbar Organism Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `Navbar` Organism (`src/components/Navbar.tsx`)**:
  - Reconciled the storefront navigation header organism directly against canonical Figma Component Set `Navbar` (`36:19249`) and Documentation Board `Navigation` (`36:19330`) on `Components` page (`16:2942`).
  - Implemented `class-variance-authority` (CVA) variant definitions (`navbarVariants`) bound directly to canonical `@theme` tokens:
    - Header Surface: `bg-white/95 backdrop-blur-md` (95% translucent surface with 12px blur), `#EDF3F7` border (`border-b border-border-default`), `shadow-xs`.
    - Height: Desktop 80px (`h-20`), Mobile 72px (`h-18`).
    - Container: 7xl maximum width (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`).
  - Supported Layout modes (`responsive`, `desktop`, `mobile`):
    - Desktop: Full desktop links (Plus Jakarta Sans Medium 14px, `gap-8`), Search trigger button, Customer Account pill with atomic `<Avatar size="sm" />`, NotificationBell, and Shopping Cart pill with Rose notification count badge.
    - Mobile Resting: 72px height, compact logo emblem, quick Search icon, Cart button with notification badge, and accessible hamburger toggle.
    - Mobile Drawer (Open): Slide-down menu with 44px minimum touch targets (`min-h-[44px]`), 1px `#EDF3F7` divider, and 2-column action grid (Account pill + quick Cart button).
  - Decoupled State & 100% Backward API Compatibility:
    - Replaced hard-throw context dependency with graceful fallback via `useContext(CartContext)` so Navbar renders reliably in isolation.
    - Supported optional control props (`layout`, `showSearch`, `showAccount`, `showCart`, `showCartCount`, `cartCount`, `onCartClick`, `isAuthenticated`, `customerName`, `links`, `currentPath`, `isMobileMenuOpen`, `onToggleMobileMenu`).
    - Maintained zero-prop usage for storefront layouts (`src/app/layout.tsx`).
- **Storybook Suite (`src/components/Navbar.stories.tsx`)**:
  - Authored 11 comprehensive stories covering all variant combinations, interaction flows, and token style assertions:
    - `Default`, `MobileClosed`, `MobileOpen`, `WithoutSearch`, `WithoutAccount`, `EmptyCart`, `AuthenticatedCustomer`, `AuthenticScenario`, `InteractiveMobileToggle`, `InteractiveCartClick`, `CssCheck`.
- **Validation**:
  - `npm run test:story -- Navbar.stories.tsx`: 11/11 tests passed in 2.08s.
  - `npx vitest --project storybook run`: 213/213 tests passed across all 20 component story suites in 22.17s.
  - `npx tsc --noEmit`: Exited with code 0 (zero errors).
  - `npm run build-storybook`: Succeeded in 19.95s with zero errors.
  - Live preview generated via `stories-preview`: `http://localhost:6006/?path=/story/design-system-organisms-navbar--default`.

### Why
- Elevates the storefront header into a fully reconciled, token-compliant, accessible design-system organism.
- Guarantees 1:1 visual fidelity with canonical Figma Component Set `36:19249` and Documentation Board `36:19330`.
- Guarantees WCAG 2.1 AA accessibility standards with 44px minimum touch targets, proper ARIA labeling, and keyboard focus states.

### Nodes & Files Touched
- Figma: `Navbar` (`36:19249`), `Navigation` (`36:19330`)
- React: `src/components/Navbar.tsx`
- Stories: `src/components/Navbar.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-navbar-component-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 5B: OrderStatusTimeline Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `OrderStatusTimeline` Molecule (`src/components/OrderStatusTimeline.tsx`)**:
  - Reconciled the order status timeline molecule directly against canonical Figma Component Set `OrderStatusTimeline` (`43:42961`) and Documentation Board `Order Status Timelines` (`43:46692`) on `Components` page (`16:2942`).
  - Implemented `class-variance-authority` (CVA) variant definitions (`orderStatusTimelineVariants`) bound directly to canonical `@theme` tokens.
  - Aligned card styling: `#FFFFFF` surface (`bg-bg-surface`), `#EDF3F7` border (`border-border-default`), `24px` radius (`rounded-[24px]`), and soft elevation (`shadow-card`).
  - Supported dual layout orientations: Horizontal progression ribbon with segmented line boxes and Vertical stepper with continuous connecting lines.
  - Implemented resolution-independent vector indicator archetypes for completed (checkmark), current (brand blue ring + inner dot), upcoming (subtle dot), and cancelled (`✕`) states.
  - Added integrated top alert banners for active, delivered, cancelled, and refunded statuses without obscuring the underlying progression.
  - Preserved 100% backward API compatibility with storefront order tracking and customer account pages.
- **Storybook Suite (`src/components/OrderStatusTimeline.stories.tsx`)**:
  - Authored 11 comprehensive stories covering all variant combinations, interaction flows, and token style assertions:
    - `Default`, `Vertical`, `AlternativeMode`, `WithAlertBanner`, `Created`, `Shipped`, `Delivered`, `Cancelled`, `Refunded`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npm run test:story -- OrderStatusTimeline.stories.tsx`: 11/11 tests passed in 2.08s.
  - `npx vitest --project storybook run`: 202/202 tests passed across all 19 component story suites in 20.29s.
  - `npx tsc --noEmit`: Exited with code 0 (zero errors).
  - `npm run build-storybook`: Succeeded in 25.88s with zero errors.

### Why
- Elevates the order progression timeline into a fully reconciled, token-compliant, accessible design-system molecule.
- Guarantees 1:1 visual fidelity with canonical Figma Component Set `43:42961` and Documentation Board `43:46692`.
- Eliminates text emojis in favor of accessible vector indicators and top alert banners.

### Nodes & Files Touched
- Figma: `OrderStatusTimeline` (`43:42961`), `Order Status Timelines` (`43:46692`)
- React: `src/components/OrderStatusTimeline.tsx`
- Stories: `src/components/OrderStatusTimeline.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-order-status-timeline-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 5A: CustomizationUploader Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `CustomizationUploader` Molecule (`src/components/CustomizationUploader.tsx`)**:
  - Reconciled the photo & dedication customization molecule directly against canonical Figma Component Set `CustomizationUploader` (`43:29976`) and Documentation Board `Customization Uploaders` (`43:30904`) on `Components` page (`16:2942`).
  - Implemented `class-variance-authority` (CVA) variant definitions (`customizationUploaderVariants` and `dropzoneVariants`) bound directly to canonical `@theme` tokens.
  - Aligned container styling: `#FFFFFF` surface (`bg-bg-surface`), `#EDF3F7` border (`border-border-default`), and `24px` radius (`rounded-[24px]`).
  - Aligned dropzone styling: `20px` radius (`rounded-[20px]`), dashed border, and semantic state backgrounds (`bg-bg-subtle`, `bg-bg-brand`, `bg-status-danger-bg`).
  - Composed canonical `Button` (`variant="secondary"`) for action triggers and canonical `Spinner` (`size="md"`, `color="rose"`) with real progress bar for uploading feedback.
  - Aligned 80×80 thumbnail preview grid with 14px radius, count indicator (`3 / 5 images`), and accessible circular remove controls (`✕`).
  - Added dedicated danger alert banner for validation failure recovery.
  - Preserved 100% backward compatibility with `src/app/products/[slug]/page.tsx`.
- **Storybook Suite (`src/components/CustomizationUploader.stories.tsx`)**:
  - Authored 11 comprehensive stories covering all Figma lifecycle states, scale variants (`SM`, `MD`, `LG`), interaction flows, and token style assertions:
    - `Default`, `Ready`, `AlternativeMode`, `WithOptionalElements`, `Loading`, `Success`, `ErrorState`, `Disabled`, `AuthenticScenario`, `InteractivePlay`, `CssCheck`.
- **Validation**:
  - `npm run test:story -- CustomizationUploader.stories.tsx`: 11/11 tests passed in 2.72s.
  - `npx vitest --project storybook run`: 191/191 tests passed across all 18 component story suites in 19.02s.
  - `npx tsc --noEmit`: Exited with code 0 (zero errors).
  - `npm run build-storybook`: Succeeded in 17.99s with zero errors.

### Why
- Elevates the photo customization uploader into a fully reconciled, token-compliant, accessible design-system molecule.
- Guarantees 1:1 visual fidelity with canonical Figma Component Set `43:29976` and Documentation Board `43:30904`.
- Enforces strict Atomic Design reuse by composing canonical `Button` and `Spinner` primitives.

### Nodes & Files Touched
- Figma: `CustomizationUploader` (`43:29976`), `Customization Uploaders` (`43:30904`)
- React: `src/components/CustomizationUploader.tsx`
- Stories: `src/components/CustomizationUploader.stories.tsx`
- Docs: `docs/changes/design-system/2026-09-07-customization-uploader-reconciliation.md`, `docs/changes/README.md`, `docs/design-system/CHANGELOG.md`

---

## 2026-09-07 — Step 5G: CartDrawer Organism Component Reconciliation (Milestone Complete)

### What Changed
- **Canonical `CartDrawer` Organism (`src/components/CartDrawer.tsx`)**:
  - Reconciled the slide-over cart drawer organism directly against canonical Figma Component Set `CartDrawer` (`39:22262` at `x: 26560, y: 9000`) and Documentation Board `Cart Drawers` (`39:23187` at `x: 25160, y: 9000`) on `Components` page (`16:2942`).
  - Aligned architecture with canonical design tokens and component primitives:
    - **Backdrop Overlay**: `fixed inset-0 bg-black/40 backdrop-blur-xs` matching Figma `560x800px` overlay specimen.
    - **Drawer Surface**: `w-screen max-w-md bg-bg-surface shadow-2xl` matching Figma `448px` drawer container with `#FFFFFF` surface.
    - **Header**: `bg-bg-default` (`#FDFCFB`), `p-6` (24px padding), `border-b border-border-default` (`#EDF3F7`). Composes canonical `<Button variant="ghost" size="md" iconOnly>` for the dismiss control. Displays title (`Fredoka` Bold 20px) and item count metadata.
    - **Scrollable Content**: `p-6` (24px padding) with `space-y-4` (16px spacing between items). Composes canonical `<EmptyState size="sm">` when empty, and canonical `<CartItemRow>` for all active cart line items.
    - **Footer**: `bg-bg-default` (`#FDFCFB`), `p-6` (24px padding), `border-t border-border-default` (`#EDF3F7`). Features subtotal summary with prominent accent pricing (`Fredoka` Bold 18px), canonical Primary LG checkout `<Button>` (`/checkout`), and canonical Outline LG secondary `<Button>` (`/cart`). Conditionally hidden when `State=Empty` matching Figma.
  - Supported all 4 Figma variant properties:
    - `State`: `Open` vs `Empty` (renders canonical EmptyState and hides footer).
    - `Items`: `Multiple` vs `One` (item count grammar).
    - `Checkout`: `Enabled` vs `Disabled` (unavailable items banner with disabled button).
    - `SecondaryAction`: `Visible` vs `Hidden` via `showSecondaryAction` prop.
  - Preserved 100% backwards compatibility with `src/app/layout.tsx` (`<CartDrawer />`) by falling back to `useContext(CartContext)` when props are omitted.
- **Cart Context (`src/context/CartContext.tsx`)**:
  - Exported `CartContext` to allow safe context consumption in standalone and Storybook environments without throwing dispatcher runtime errors.
- **Storybook Suite (`src/components/CartDrawer.stories.tsx`)**:
  - Authored 11 comprehensive stories covering all variant combinations, interaction flows, and token style assertions:
    - `Default`, `SingleItem`, `Empty`, `WithoutSecondaryAction`, `CheckoutDisabled`, `Loading`, `InteractiveQuantityUpdate`, `InteractiveItemRemoval`, `InteractiveClose`, `InteractiveBackdropClose`, `CssCheck`.
- **Workflow & Testing Optimizations**:
  - Added targeted `test:story` npm script for fast single-story test cycles.
  - Created `scripts/scaffold-story.mjs` for rapid story scaffolding.
  - Formulated the 2-tier testing loop and interaction timing rules in workflow guidelines.
- **Validation**:
  - `npm run test:story -- CartDrawer.stories.tsx`: 11/11 tests passed in 7.06s.
  - `npx tsc --noEmit`: Exited with code 0 (zero type errors).
  - `npx vitest --project storybook run`: 180/180 tests passed across all 17 suites in 20.84s.
  - `npm run build-storybook`: Succeeded in 19.28s with zero errors.

### Why
- Elevates the slide-over cart drawer from an ad-hoc implementation into a fully reconciled, token-compliant organism.
- Guarantees 1:1 visual fidelity with canonical Figma Component Set `39:22262` and Documentation Board `39:23187`.
- Establishes full design system primitive composition by unifying `Button`, `EmptyState`, and `CartItemRow`.
- Preserves full runtime compatibility with global application layouts and cart providers.

### Nodes & Files Touched
- Figma: `CartDrawer` (`39:22262`), `Cart Drawers` (`39:23187`)
- React: `src/components/CartDrawer.tsx`, `src/context/CartContext.tsx`
- Stories: `src/components/CartDrawer.stories.tsx`
- Tooling: `package.json`, `scripts/scaffold-story.mjs`, `docs/design-system/reconciliation-workflow.md`, `.agents/skills/component-reconciliation/SKILL.md`

---

## 2026-09-07 — Design System Redundant Variant Consolidation (Milestone Complete)

### What Changed
- **Comprehensive Variant Matrix Consolidation Across 9 Core Component Sets**:
  - Eliminated combinatorial explosion caused by binary visibility toggles (`Visible`/`Hidden`, `None`/`Visible`) that multiplied full component variants.
  - Converted layer visibility toggles into native Figma Boolean Component Properties (`addComponentProperty` + `componentPropertyReferences = { visible: propId }`).
  - Reduced total variant count across the audited component sets from **824 down to 105 variants** (**87.3% reduction**, eliminating **719 redundant variants**).
  - Recovered tens of thousands of square pixels on the `Components` canvas (`pageId: 16:2942`) and eliminated canvas sluggishness.

### Detailed Component Reductions & Architecture

| Component Set | Original Variants | Consolidated Variants | Reduction | Variant Properties Kept | Boolean Properties Added |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`ReviewModal`** (`43:51475`) | 96 | **4** | **-95.8%** | `State [Default, Loading, Success, Error]` | `Show Product Context` (default `true`), `Show Validation Alert` (default `false`) |
| **`AddressCard`** (`43:48157`) | 128 | **8** | **-93.8%** | `State [Default, Hover, Selected, Disabled]`, `Size [MD, SM]` | `Show Actions` (`true`), `Show Type Label` (`true`), `Show Phone Number` (`true`), `Show Default Badge` (`false`) |
| **`EmptyState`** (`21:12048`) | 48 | **3** | **-93.8%** | `Size [SM, MD, LG]` | `Show Icon` (`true`), `Show Description` (`true`), `Show Primary Action` (`true`), `Show Secondary Action` (`false`) |
| **`Navbar`** (`36:19249`) | 64 | **4** | **-93.8%** | `Layout [Desktop, Mobile]`, `MobileMenu [Closed, Open]` | `Show Search` (`true`), `Show Account Link` (`true`), `Show Cart Icon` (`true`), `Show Cart Count` (`true`) |
| **`OrderSummaryCard`** (`41:28794`) | 48 | **6** | **-87.5%** | `State [Default, Loading, Empty]`, `ItemCount [Multiple, One]` | `Show Discount Row` (`false`), `Show Delivery Row` (`true`), `Show Checkout Action` (`true`) |
| **`Toast`** (`46:54032`) | 64 | **16** | **-75.0%** | `Variant [Success, Warning, Error, Info]`, `Size [MD, SM]`, `State [Default, Loading]` | `Show Action Button` (`false`), `Show Dismiss Button` (`true`) |
| **`CustomizationUploader`** (`43:29976`) | 72 | **18** | **-75.0%** | `State [Empty, Ready, Uploading, Uploaded, Error, Disabled]`, `Size [SM, MD, LG]` | `Show Notes Field` (`false`), `Allow Multiple Files` (`true`) |
| **`OrderStatusTimeline`** (`43:42961`) | 160 | **28** | **-82.5%** | `Status [Created, Pending, Confirmed, Shipped, Delivered, Cancelled, Refunded]`, `Orientation [Horizontal, Vertical]`, `Size [MD, SM]` | `Show Alert Banner` (`false`) |
| **`DataTable`** (`52:60334`) | 144 | **18** | **-87.5%** | `State [Default, Loading, Empty]`, `Selection [None, Single, Multiple]`, `Density [Default, Compact]` | `Show Pagination Footer` (`true`) |
| **Total** | **824** | **105** | **-87.3%** | — | **23 Boolean Properties** |

### Documentation Frames Updated & Verified (100% Valid, 0 Unlinked)
- **`Review Modals` (`43:53132`)**: 12 live instances mapped to canonical 4-state component set with alert & product context toggles.
- **`Address Cards` (`43:49054`)**: 15 live instances mapped to 8-state component set with action & label booleans.
- **`Empty States` (`21:12067`)**: 13 live instances mapped to 3-size component set with action & icon toggles.
- **`Navigation` (`36:19330`)**: 6 live instances mapped to desktop/mobile navbar with search, account, and cart count booleans.
- **`Order Summary Cards` (`41:28795`)**: 10 live instances mapped to 6-state component set with discount, delivery, and checkout toggles.
- **`Toasts` (`47:54305`)**: 24 live instances mapped to 16-state matrix with action and dismiss booleans.
- **`Customization Uploaders` (`43:30904`)**: 15 live instances mapped to 18-state matrix with notes textarea and multiple thumbnail booleans.
- **`Order Status Timelines` (`43:46692`)**: 12 live instances mapped to 28-state matrix with alert banner toggles.
- **`Data Tables` (`52:63775`)**: 13 live instances mapped to 18-state matrix with pagination footer toggle and row-level visual state overrides.

### Why
- Eliminates astronomical combinatorial variant bloat in Figma that caused file bloat, memory pressure, and canvas freezing.
- Aligns Figma component models directly with modern frontend React component architecture where visibility and conditional elements are props/render toggles rather than independent static component permutations.
- Preserves 100% design fidelity across all existing documentation frames and design specimens while vastly simplifying component discovery and variant selection for designers.

### Nodes Touched
- `ReviewModal` (`43:51475`) & `Review Modals` (`43:53132`)
- `AddressCard` (`43:48157`) & `Address Cards` (`43:49054`)
- `EmptyState` (`21:12048`) & `Empty States` (`21:12067`)
- `Navbar` (`36:19249`) & `Navigation` (`36:19330`)
- `OrderSummaryCard` (`41:28794`) & `Order Summary Cards` (`41:28795`)
- `Toast` (`46:54032`) & `Toasts` (`47:54305`)
- `CustomizationUploader` (`43:29976`) & `Customization Uploaders` (`43:30904`)
- `OrderStatusTimeline` (`43:42961`) & `Order Status Timelines` (`43:46692`)
- `DataTable` (`52:60334`) & `Data Tables` (`52:63775`)

---

## 2026-09-07 — Step 2A: Button Atom Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Button Atom**:
  - Aligned React implementation (`src/components/Button.tsx`) directly with Figma canonical component set `Button` (`16:2712`, 72 variants) and documentation board `Buttons` (`16:2713`).
  - Implemented all 5 variants (`primary`, `secondary`, `outline`, `ghost`, `stepper`), 3 canonical sizes (`sm`, `md`, `lg`), loading spinner animation, icon slots, and circular/square stepper modes.
  - Composed Button into `src/components/StockNotificationButton.tsx`.
  - Configured Storybook suite (`.storybook/`) with Tailwind `@theme` token loading and implemented `src/components/Button.stories.tsx`.
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 19/19 tests passed (including computed token style validation `CssCheck`).
  - `npm run build-storybook`: Build succeeded with 0 errors.

### Why
- Provides the fundamental interactive atom required for subsequent design system components (Modals, Cards, Banners, Navigation) with strict token compliance and accessibility standards.

### Nodes & Files Touched
- Figma: `Button` (`16:2712`), `Buttons` (`16:2713`)
- React: `src/components/Button.tsx`, `src/components/StockNotificationButton.tsx`
- Stories: `src/components/Button.stories.tsx`

---

## 2026-09-07 — Step 2B: Badge Atom Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Badge Atom**:
  - Aligned React implementation (`src/components/Badge.tsx`) directly with Figma canonical component set `Badge` (45 variants at `x: 9600, y: 0` on `Components` page) and documentation board `Badges` (30 live instances at `x: 8300, y: 0`).
  - Implemented using CVA (`class-variance-authority`) and `cn()`, covering 5 variants (`status`, `bundle`, `tag`, `accent`, `brand`), 6 semantic status types (`success`, `warning`, `danger`, `info`, `purple`, `neutral`), 2 sizes (`sm`, `md`), optical indicator dot (`dot`), pulse animation (`pulse`), and icon slot.
  - Bound styling directly to Tailwind CSS `@theme` tokens without hardcoded colors.
- **Component Composition**:
  - Refactored `src/components/admin/OrderStatusBadge.tsx` to compose canonical `<Badge>`.
  - Refactored `src/components/ProductCard.tsx` to compose canonical `<Badge>` for bundle, custom photo, and out-of-stock badges.
- **Storybook Suite**:
  - Implemented `src/components/Badge.stories.tsx` with 14 stories covering all variants, status colors, sizes, indicators, interactive controls, play smoke test, and token style verification (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 33/33 tests passed across 5 test files.
  - `npm run build-storybook`: Build succeeded with 0 errors.

### Why
- Establishes a standardized, accessible labeling atom reused across storefront product cards, cart items, customer order tracking, and administrative tables.

### Nodes & Files Touched
- Figma: `Badge` (`Components` page `x: 9600, y: 0`), `Badges` (`x: 8300, y: 0`)
- React: `src/components/Badge.tsx`, `src/components/admin/OrderStatusBadge.tsx`, `src/components/ProductCard.tsx`
- Stories: `src/components/Badge.stories.tsx`

---

## 2026-09-07 — Step 2C & 2D: Spinner & Skeleton Atoms Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Spinner Atom**:
  - Aligned React implementation (`src/components/Spinner.tsx`) directly with Figma canonical component set `Spinner` (`x: 42800, y: 0`, 9 production variants) and documentation board `Spinners` (`x: 41200, y: 0`, 17 live instances).
  - Implemented using CVA (`class-variance-authority`), covering 3 sizes (`sm`: 16px, `md`: 24px, `lg`: 40px), 5 colorways (`rose`, `blue`, `charcoal`, `white`, `current`), 360° circular track with low opacity, and 270° active arc rotating with `animate-spin`.
- **Reconciled Skeleton Atom**:
  - Aligned React implementation (`src/components/Skeleton.tsx`) directly with Figma canonical component set `Skeleton` (`x: 35600, y: 0`, 36 variants) and documentation board `Skeletons` (`x: 34000, y: 0`, 30 live instances).
  - Implemented using CVA, covering 5 types (`text`, `image`, `card`, `tableRow`, `custom`), 3 scale tiers (`sm`, `md`, `lg`), multi-line organic rags (`lines={1 | 2 | 3}`), and `--color-bg-subtle` (`#F4F8FA`) with `animate-pulse`.
- **Component Composition**:
  - Refactored `src/components/Button.tsx` to compose canonical `<Spinner size="sm" color="current" />`.
  - Refactored `src/components/home/FeaturedProductsSection.tsx` to compose canonical `<Skeleton type="card" />`.
- **Storybook Suites**:
  - Implemented `src/components/Spinner.stories.tsx` (9 stories) and `src/components/Skeleton.stories.tsx` (9 stories) with full controls and computed token style checks (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 51/51 tests passed across 7 test files.
  - `npm run build-storybook`: Build succeeded with 0 errors.

### Why
- Establishes standardized active operational feedback (`Spinner`) and structural layout placeholders (`Skeleton`) across the storefront and admin panels.

### Nodes & Files Touched
- Figma: `Spinner` (`x: 42800, y: 0`), `Spinners` (`x: 41200, y: 0`), `Skeleton` (`x: 35600, y: 0`), `Skeletons` (`x: 34000, y: 0`)
- React: `src/components/Spinner.tsx`, `src/components/Skeleton.tsx`, `src/components/Button.tsx`, `src/components/home/FeaturedProductsSection.tsx`
- Stories: `src/components/Spinner.stories.tsx`, `src/components/Skeleton.stories.tsx`

---

## 2026-09-07 — Step 2E: Avatar Atom Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Avatar Atom**:
  - Aligned React implementation (`src/components/Avatar.tsx`) directly with Figma canonical component set `Avatar` (`x: 50200, y: 0`, 32 production variants) and documentation board `Avatars` (`x: 48600, y: 0`, 28 live instances).
  - Implemented using CVA (`class-variance-authority`), covering 4 sizes (`sm`: 32px, `md`: 40px, `lg`: 48px, `xl`: 64px), 2 content modes (`image`, `initials`), automatic image load error fallback to initials, and 4 presence indicators (`none`, `online`, `away`, `offline`).
  - Strict 1:1 aspect ratio and `rounded-full` (`Radius/Circle`) geometry with `--color-bg-subtle` surface and `--color-text-primary` bold typography.
  - Presence indicators bound to semantic status tokens (`bg-status-success`, `bg-status-warning`, `bg-text-tertiary`) with white knockout ring (`ring-white`) and accessible announcements.
- **Component Composition**:
  - Refactored `src/app/account/layout.tsx` to compose canonical `<Avatar size="lg" />`.
  - Refactored `src/app/admin/AdminLayoutClient.tsx` to compose canonical `<Avatar size="sm" status="online" />`.
  - Refactored `src/components/Navbar.tsx` to compose canonical `<Avatar size="sm" />` for authenticated customers.
- **Storybook Suite**:
  - Implemented `src/components/Avatar.stories.tsx` (14 stories) covering canonical default, initials, scales, status indicators, status matrix, fallback handling, play test, and computed token style check (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 57/57 tests passed across 5 test files.
  - `npm run build-storybook`: Build succeeded with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation.
  - Storybook MCP `docs-show`: Verified component documentation inspection.

### Why
- Standardizes identity representation across the storefront, customer account dashboard, and administration console, eliminating fragmented and ad-hoc avatar boxes.

### Nodes & Files Touched
- Figma: `Avatar` (`x: 50200, y: 0`), `Avatars` (`x: 48600, y: 0`)
- React: `src/components/Avatar.tsx`, `src/app/account/layout.tsx`, `src/app/admin/AdminLayoutClient.tsx`, `src/components/Navbar.tsx`
- Stories: `src/components/Avatar.stories.tsx`

---

## 2026-09-07 — Step 3A: Modal Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Canonical Modal Molecule**:
  - Implemented `src/components/Modal.tsx` directly aligned with Figma canonical component set `Modal` (`x: 23400, y: 0`, 24 production variants) and documentation board `Modals` (`x: 22000, y: 0`, 9 live instances).
  - Built using CVA (`class-variance-authority`), supporting 3 target sizes: `sm` (360px target for confirmations), `md` (480px target for reviews and forms), and `lg` (640px target for product pickers and checklists).
  - Configured with `neutral-charcoal/40` backdrop overlay with subtle blur (`backdrop-blur-xs`), `bg-bg-surface` (`#FFFFFF`) card, `Radius/LG` (`rounded-2xl`), `Elevation/Card` (`shadow-2xl`), and `Border/Default` (`#EDF3F7`).
  - Added robust WCAG 2.1 AA accessibility features: `role="dialog"`, `aria-modal="true"`, dynamic `aria-labelledby` and `aria-describedby` IDs, focus trapping with Tab cycling, Escape dismissal listener, and body scroll locking.
  - Reused canonical `Button` atom for header close action and footer secondary/primary actions with full loading state integration.
- **Component Composition**:
  - Refactored `src/components/ReviewModal.tsx` to compose canonical `<Modal size="md">` and `<Button>` primitives.
  - Refactored `src/app/account/profile/page.tsx` delete confirmation dialog to compose canonical `<Modal size="sm">` and `<Button>`.
- **Storybook Suite**:
  - Implemented `src/components/Modal.stories.tsx` (10 stories) covering canonical default, `SizeSM`, `SizeMD`, `SizeLG`, `NoFooter`, `NoDescription`, `NoCloseButton`, `CustomFooter`, automated interaction play testing (`InteractivePlay`), and computed CSS token style checking (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 67/67 tests passed across 6 test files (10/10 for Modal).
  - `npm run build-storybook`: Build succeeded in 27s with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation (`http://localhost:6006/?path=/story/design-system-molecules-modal--default`).
  - Storybook MCP `docs-show`: Verified autodocs props table and documentation inspection.

### Why
- Establishes a standardized, highly accessible, and token-compliant modal dialog shell across the application, eliminating dozens of ad-hoc and un-styled dialog implementations.

### Nodes & Files Touched
- Figma: `Modal` (`x: 23400, y: 0`), `Modals` (`x: 22000, y: 0`)
- React: `src/components/Modal.tsx`, `src/components/ReviewModal.tsx`, `src/app/account/profile/page.tsx`
- Stories: `src/components/Modal.stories.tsx`

---

## 2026-09-07 — Step 2F: RatingStars Atom Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Canonical RatingStars Atom**:
  - Implemented `src/components/RatingStars.tsx` directly aligned with Figma canonical component set `RatingStars` (`x: 18400, y: 0`, 48 production variants) and documentation board `Ratings & Testimonials` (`x: 17100, y: 0`, 18 live instances).
  - Built using CVA (`class-variance-authority`), supporting 3 star scales: `sm` (16px stars, 2px gap), `md` (20px stars, 4px gap), and `lg` (24px stars, 6px gap).
  - Integrated 5-point vector star geometry with precision fractional SVG gradient fills (`fill-action-primary` `#D99BA3` and `fill-border-default` `#EDF3F7`).
  - Implemented dual modes:
    - Read-only display mode with accessible `role="img"`, screen-reader `aria-label`, optional numeric value (`showValue`), and review count (`reviewCount`).
    - Interactive rating picker mode with `role="radiogroup"`, `role="radio"` buttons, hover rating previews, keyboard focus rings, and selection callbacks (`onRatingChange`).
- **Component Composition**:
  - Refactored `src/components/home/ReviewsSection.tsx` to replace hardcoded `★★★★★` with `<RatingStars rating={rev.rating} size="sm" />`.
  - Refactored `src/components/ReviewModal.tsx` to replace ad-hoc emoji buttons with `<RatingStars interactive rating={rating} onRatingChange={setRating} size="md" />`.
- **Storybook Suite**:
  - Implemented `src/components/RatingStars.stories.tsx` (11 stories) covering canonical default, `SizeSM`, `SizeMD`, `SizeLG`, `WithNumericValue`, `WithReviewCount`, `FractionalRating`, `ZeroRating`, `Interactive`, automated interaction play testing (`InteractivePlay`), and computed CSS token style verification (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 78/78 tests passed across 7 test files (11/11 for RatingStars).
  - `npm run build-storybook`: Build succeeded in 23.04s with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation (`http://localhost:6006/?path=/story/design-system-atoms-ratingstars--default`).
  - Storybook MCP `docs-show`: Verified autodocs props table and documentation inspection.

### Why
- Establishes a standardized, accessible star rating primitive across customer feedback, product displays, and review dialogs.

### Nodes & Files Touched
- Figma: `RatingStars` (`x: 18400, y: 0`), `Ratings & Testimonials` (`x: 17100, y: 0`)
- React: `src/components/RatingStars.tsx`, `src/components/home/ReviewsSection.tsx`, `src/components/ReviewModal.tsx`
- Stories: `src/components/RatingStars.stories.tsx`

---

## 2026-09-07 — Step 3B: EmptyState Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Canonical EmptyState Molecule**:
  - Implemented `src/components/EmptyState.tsx` directly aligned with Figma canonical component set `EmptyState` (`x: 28400, y: 0`, 48 production variants) and documentation board `Empty States` (`x: 27000, y: 0`, 13 live instances).
  - Built using CVA (`class-variance-authority`), supporting 3 target scales: `sm` (340px target for panels/drawers), `md` (440px target for cart/catalog), and `lg` (560px target for full page and admin views).
  - Used transparent surface inheritance (`bg-transparent`) that naturally adapts to surrounding parent containers without forcing card borders or fixed backgrounds.
  - Embedded canonical 24×24 vector package icon with support for custom illustrations, emojis, or complete suppression with zero leftover spacing.
  - Calibrated typography scale with `Fredoka` bold headings and `Plus Jakarta Sans` body copy.
  - Composed canonical `Button` atoms for primary (`Variant=Primary`) and secondary (`Variant=Outline`) recovery actions, supporting Next.js `href` links, loading states, and callbacks.
- **Component Composition**:
  - Refactored `src/components/CartDrawer.tsx` to replace ad-hoc empty cart markup with canonical `<EmptyState size="sm" ... />`.
  - Refactored `src/app/cart/page.tsx` to replace ad-hoc empty cart card markup with canonical `<EmptyState size="md" ... />`.
- **Storybook Suite**:
  - Implemented `src/components/EmptyState.stories.tsx` (10 stories) covering canonical default, `SizeSM`, `SizeMD`, `SizeLG`, `DualActions`, `NoIcon`, `NoDescription`, `CustomIcon`, automated interaction play testing (`InteractivePlay`), and computed CSS token style verification (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 88/88 tests passed across 8 test files (10/10 for EmptyState).
  - `npm run build-storybook`: Build succeeded in 26.26s with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation (`http://localhost:6006/?path=/story/design-system-molecules-emptystate--default`).
  - Storybook MCP `docs-show`: Verified autodocs props table and documentation inspection.

### Why
- Standardizes empty/zero-data state presentation across 38 views in the application, ensuring consistent messaging and actionable recovery paths.

### Nodes & Files Touched
- Figma: `EmptyState` (`x: 28400, y: 0`), `Empty States` (`x: 27000, y: 0`)
- React: `src/components/EmptyState.tsx`, `src/components/CartDrawer.tsx`, `src/app/cart/page.tsx`
---

## 2026-09-07 — Step 3E: Tabs Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Canonical Tabs Molecule**:
  - Implemented `src/components/Tabs.tsx` directly aligned with Figma canonical component set `Tabs` (`x: 47000, y: 0`, 4 variants), primitive `Tab Item` (`x: 45600, y: 0`, 32 variants), and documentation board `Tabs` (`x: 44000, y: 0`, 38 live instances).
  - Built using CVA (`class-variance-authority`), supporting 2 core styles:
    - `underline`: Editorial and storefront content navigation with transparent baseline container, `border-b border-border-default`, `text-text-secondary` inactive state, and 2px Brand Rose bottom border indicator (`border-action-primary`, `#D99BA3`) on the active tab.
    - `segmented`: Compact pill container with `bg-bg-subtle` (`#F4F8FA`), `Radius/Pill` geometry, `border border-border-default`, and elevated `bg-bg-surface` (`#FFFFFF`) with `Elevation/XS` shadow for the active item.
  - Implemented 2 size scales:
    - `sm`: Min 32px height, `text-xs`, compact padding.
    - `md`: Approx 40px height, `text-sm`, standard padding.
  - Added semantic count badge chips:
    - Underline style: `bg-bg-subtle` (inactive) / `bg-action-secondary-bg text-action-secondary-text` (active).
    - Segmented style: `bg-border-default/70` (inactive) / `bg-action-secondary-bg text-action-secondary-text` (active).
  - Added full WAI-ARIA tablist semantics (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-label`, `tabIndex`), and interactive keyboard navigation (Left/Right arrow key cycling, Home/End jumping).
  - Supported optional embedded tab panels via `panel` prop on each tab item.
- **Component Composition**:
  - Refactored `src/app/products/[slug]/page.tsx` to replace ad-hoc button tab header with canonical `<Tabs style="underline" size="md" ... />`.
  - Refactored `src/components/NotificationBell.tsx` to replace ad-hoc button tabs with canonical `<Tabs style="segmented" size="sm" ... />` passing live notification counts.
- **Storybook Suite**:
  - Implemented `src/components/Tabs.stories.tsx` (9 stories) covering `UnderlineDefault`, `SegmentedDefault`, `Sizes`, `WithCounts`, `WithIcons`, `DisabledTabs`, `FullWidthSegmented`, automated interaction play testing (`InteractivePlay`), and computed CSS token style verification (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 97/97 tests passed across 9 test files (9/9 for Tabs).
  - `npm run build-storybook`: Build succeeded in 29.28s with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation (`http://localhost:6006/?path=/story/design-system-molecules-tabs--underline-default`).
  - Storybook MCP `docs-show`: Verified autodocs props table and documentation inspection.

### Why
- Eliminates ad-hoc button tab rows across storefront, notifications, and administrative filters.
- Enforces strict design-token fidelity matching Figma Step 3E specifications and WAI-ARIA accessibility standards.

---

## 2026-09-07 — Step 3H: Pagination Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Canonical Pagination Molecule**:
  - Implemented `src/components/Pagination.tsx` directly aligned with Figma canonical component set `Pagination` (`x: 53600, y: 0`, 48 production variants) and documentation board `Pagination` (`x: 52000, y: 0`, 17 live instances).
  - Built using CVA (`class-variance-authority`), supporting 2 sizing scales:
    - `sm`: Min 32px touch target (`w-8 h-8`), 4px gap, 16×16px chevron vector, 12px `Fredoka` font for dense admin lists and drawers.
    - `md`: Standard 40px touch target (`w-10 h-10`), 8px gap, 20×20px chevron vector, 14px `Fredoka` font for storefront catalog navigation.
  - Enforced canonical state styling:
    - Active page: `bg-bg-subtle` (`#F4F8FA`), `text-text-primary` (`#223342`), `font-bold` (does not rely on color alone).
    - Inactive page: Transparent background, `text-text-secondary` (`#51667A`, medium weight), hover `bg-bg-subtle/70 text-text-primary`.
    - Non-interactive ellipsis (`…`): Transparent background, `text-text-tertiary` (`#94A6B8`), `aria-hidden="true"`, non-focusable.
    - Ghost Previous / Next buttons: Chevron vectors with optional text labels (`showLabels`), disabled on boundaries (`currentPage <= 1` or `currentPage >= totalPages`).
  - Implemented smart range calculation:
    - Continuous sequence for ≤ 5 pages (`[1, 2, 3, 4, 5]`).
    - Truncated sequences with `…` ellipsis at start, middle, or end for > 5 pages.
  - Added full WAI-ARIA navigation semantics (`role="navigation"`, `aria-label`, `aria-current="page"`, `aria-disabled`, non-focusable `aria-hidden="true"` ellipsis).
- **Component Composition**:
  - Refactored `src/app/products/page.tsx` to replace ad-hoc catalog pagination buttons with canonical `<Pagination size="md" ... />`.
  - Refactored `src/app/admin/orders/page.tsx` to replace ad-hoc admin orders table pagination buttons with canonical `<Pagination size="sm" showLabels ... />`.
- **Storybook Suite**:
  - Implemented `src/components/Pagination.stories.tsx` (9 stories) covering `Default`, `Sizes`, `ShortRange`, `LongRangeFirst`, `LongRangeMiddle`, `LongRangeLast`, `WithLabels`, automated interaction play testing (`InteractivePlay`), and computed CSS token style verification (`CssCheck`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 106/106 tests passed across 10 test files (9/9 for Pagination).
  - `npm run build-storybook`: Build succeeded in 34.93s with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation (`http://localhost:6006/?path=/story/design-system-molecules-pagination--default`).
  - Storybook MCP `docs-show`: Verified autodocs props table and documentation inspection.

### Why
- Unifies fragmented, ad-hoc pagination controls scattered across administrative lists and storefront catalog views into a single token-compliant component.
- Enforces strict design tokens and accessibility guidelines (WAI-ARIA navigation patterns, aria-current, non-color-only active indicators).

### Nodes & Files Touched
- Figma: `Pagination` (`x: 53600, y: 0`), `Pagination` (`x: 52000, y: 0`)
- React: `src/components/Pagination.tsx`, `src/app/products/page.tsx`, `src/app/admin/orders/page.tsx`
- Stories: `src/components/Pagination.stories.tsx`

---

## 2026-09-07 — Step 2D: ProductCard Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Canonical ProductCard Molecule**:
  - Reconciled `src/components/ProductCard.tsx` directly aligned with Figma canonical component set `ProductCard` (`x: 11900, y: 0`, 24 production variants) and documentation board `Product Cards` (`x: 10600, y: 0`, 16 live instances).
  - Aligned media container corner radius with canonical token `Radius/MD` (14px, `rounded-md`).
  - Switched category eyebrow text from `text-brand-blue` to `text-text-brand` (`#4A7A99` / `var(--color-brand-blue-deep)`), resolving WCAG 2.1 AA color contrast violations with 4.8:1 contrast on white surface.
  - Aligned subordinate capability metadata dot with `bg-text-brand/60`.
  - Removed container `opacity-95` on `out_of_stock` variant to maintain 100% text contrast and crisp typography.
  - Enhanced action button composition to dynamically support interactive callbacks (`onActionClick`) as `<button>` while preserving accessible Next.js `<Link role="button">` for catalog browsing.
- **Storybook Suite**:
  - Expanded `src/components/ProductCard.stories.tsx` to 13 stories covering all 6 Figma properties (`Variant`, `State`, `Image`, `Badge`, `Rating`, `Action`) and 2 sizes (`sm`, `md`):
    - `Default`, `Custom`, `Bundle`, `OutOfStock`, `PlaceholderImage`, `WithRating`, `CustomBadge`, `InlineAction`, `WithoutAction`, `SizeSM`, `WithoutRating`, `InteractivePlay`, and `CssCheck`.
  - Fixed `InteractivePlay` test assertion to match application Naira currency format (`₦2,100`).
  - Added computed style verification in `CssCheck` for `#FFFFFF` surface, `#EDF3F7` border, `Fredoka` font, and 14px media `borderRadius`.
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 119/119 tests passed across 11 test files (13/13 for ProductCard).
  - `npm run build-storybook`: Build succeeded in 20.61s with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation (`http://localhost:6006/?path=/story/design-system-molecules-productcard--default`).
  - Storybook MCP `docs-show`: Verified autodocs props table and documentation inspection.

### Why
- Eliminates non-canonical media radii and resolves serious accessibility contrast violations on catalog cards.
- Establishes complete agreement between Figma specifications, active storefront browsing pages, and Storybook interactive documentation.

### Nodes & Files Touched
- Figma: `ProductCard` (`x: 11900, y: 0`), `Product Cards` (`x: 10600, y: 0`)
- React: `src/components/ProductCard.tsx`
- Stories: `src/components/ProductCard.stories.tsx`

---

## 2026-09-07 — Step 2E: CartItemRow Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Canonical CartItemRow Molecule**:
  - Implemented `src/components/CartItemRow.tsx` directly aligned with live Figma canonical component set `CartItemRow` (node `18:7714` at `x: 16474, y: 0`, 16 production variants) and documentation board `Cart Item Rows` (node `18:7715` at `x: 15074, y: 0`).
  - Aligned 3-column architecture:
    - Column 1: 80–86px thumbnail container with canonical `Radius/MD` (14px, `rounded-md`), Next.js image optimization, and fallback book graphic.
    - Column 2: Product details stack with title (`Fredoka` SemiBold 16px, `#243342`), subtitle/unit price, add-on list (`• Gift wrapping +₦2,000`), and quantity controls (`Button` steppers in editable mode, or `Qty 2` text in static mode).
    - Column 3: Vertical price & action column with ghost remove button (SVG trash icon) at the top and line price (`Fredoka` SemiBold 16px) at the bottom.
  - Bound container surface to `--color-bg-surface` (`#FFFFFF`) default, `--color-bg-subtle` (`#F4F8FA`) disabled/unavailable, and `Radius/MD` (14px).
  - Built using CVA (`class-variance-authority`), supporting 2 states (`default`, `disabled`), 2 quantity modes (`editable`, `static`), and boolean toggles (`showRemove`, `showAddons`).
  - Composed canonical `Button` atom for stepper controls (`variant="outline"`, `size="sm"` icon buttons) with minimum 32px touch targets and full disabled state handling.
  - Added subordinate customization slots: `customizationDetails` (attached photos indicator or missing customization alert), `themeDetails` (selected themes chip), and `bundleDetails` (collapsible bundle components breakdown).
  - Integrated canonical `formatPrice` utility with Nigerian Naira (`₦`) currency formatting for line price, unit price, and addons sum.
  - Guaranteed accessible heading hierarchy with semantic `<h3>` wrapped in Next.js `<Link>` for storefront navigation.
- **Component Composition**:
  - Refactored `src/components/CartDrawer.tsx` to replace ~170 lines of inline cart item markup with canonical `<CartItemRow>` component.
- **Storybook Suite**:
  - Implemented `src/components/CartItemRow.stories.tsx` with 11 comprehensive stories:
    - `Default`, `Disabled`, `WithoutAddons`, `StaticQuantity`, `WithoutRemove`, `WithCustomization`, `WithThemeCustomization`, `BundleItem`, `Unavailable`, `InteractivePlay`, and `CssCheck`.
  - Added automated stepper interaction and remove callback testing in `InteractivePlay`.
  - Added computed style verification in `CssCheck` for `#FFFFFF` surface, `#EDF3F7` border, `Fredoka` font, and 14px `borderRadius`.
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 130/130 tests passed across 12 test files (11/11 for CartItemRow).
  - `npm run build-storybook`: Build succeeded in 26.58s with 0 errors.
  - Storybook MCP `stories-preview`: Verified live preview link generation (`http://localhost:6006/?path=/story/design-system-molecules-cartitemrow--default`).
  - Storybook MCP `docs-show`: Verified autodocs props table and documentation inspection.

### Why
- Eliminates fragmented inline cart row code across drawers and storefront interfaces.
- Enforces strict token fidelity matching Figma Step 2E specifications (`Radius/MD` = 14px, 80×80 thumbnail, CVA variants) and WCAG 2.1 AA accessibility guidelines.

### Nodes & Files Touched
- Figma: `CartItemRow` (`18:7714` at `x: 16474, y: 0`), `Cart Item Rows` (`18:7715` at `x: 15074, y: 0`)
- React: `src/components/CartItemRow.tsx`, `src/components/CartDrawer.tsx`
- Stories: `src/components/CartItemRow.stories.tsx`

---

## 2026-09-07 — Step 3C: OrderSummaryCard Organism Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled OrderSummaryCard Organism**:
  - Aligned React implementation (`src/components/OrderSummaryCard.tsx`) directly with Figma canonical component set `OrderSummaryCard` (`41:28794` at `x: 41044, y: 9000` on `Components` page) and documentation board `Order Summary Cards` (`41:28795` at `x: 39644, y: 9000`).
  - Architecture aligned with canonical tokens:
    - **Container**: Fluid 400px maximum width, `p-6 sm:p-8`, `bg-bg-surface` (`#FFFFFF`), `border border-border-default` (`#EDF3F7`), `rounded-[20px]` (`Radius/LG` = 20px).
    - **Header**: Title (`Fredoka` SemiBold 20px, `#243342`), Item Count (`Plus Jakarta Sans` 14px, `#52657A`).
    - **Line Items Preview**: Scrollable list of items with 48px square thumbnail (`Radius/MD` = 14px), linked item title, unit price, quantity count, and optional addons.
    - **Pricing Breakdown**: Subtotal, optional discount line (`text-status-success-accent`), delivery row (numerical, "Free", or "Calculated at checkout"), and emphasized Total line (`Fredoka` Bold 20px, `#D99BA3`).
    - **Checkout Action**: Full-width canonical `Button` (`variant="primary"`, `size="lg"`, `Radius/Pill`).
    - **Loading State**: Wireframe pulse layout composing canonical `Skeleton` primitives (`type="text"`, `type="image"`).
    - **Empty State**: Composes canonical `EmptyState` primitive (`size="sm"`).
  - Composed canonical `<OrderSummaryCard>` into storefront cart page (`src/app/cart/page.tsx`), replacing ~80 lines of inline markup.
- **Storybook Suite (`src/components/OrderSummaryCard.stories.tsx`)**:
  - Authored 9 stories covering all variant combinations (`Default`, `SingleItem`, `WithDiscount`, `FreeShipping`, `WithoutAction`, `Loading`, `Empty`, `InteractivePlay`, `CssCheck`).
  - Added automated button click interaction testing in `InteractivePlay`.
  - Added computed token style assertions in `CssCheck` for background surface (`#FFFFFF`), border (`#EDF3F7`), border radius (`20px`), and heading typography (`Fredoka`).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 139/139 tests passed across 13 test files (9/9 for OrderSummaryCard).
  - `npm run build-storybook`: Build succeeded in 16.76s with 0 errors.

### Why
- Eliminates ad-hoc inline order summary markup on the cart page with a canonical, accessible, and token-compliant organism.
- Enforces strict token fidelity matching Figma Step 3C specifications (`Radius/LG` = 20px, 400px width, Fredoka typography, CVA variants) and WCAG 2.1 AA accessibility guidelines.

### Nodes & Files Touched
- Figma: `OrderSummaryCard` (`41:28794` at `x: 41044, y: 9000`), `Order Summary Cards` (`41:28795` at `x: 39644, y: 9000`)
- React: `src/components/OrderSummaryCard.tsx`, `src/app/cart/page.tsx`
- Stories: `src/components/OrderSummaryCard.stories.tsx`

---

## 2026-09-07 — Step 5E: Toast Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Toast Molecule**:
  - Aligned React implementation (`src/components/Toast.tsx`) directly with Figma canonical component set `Toast` (`46:54032` at `x: 26190, y: 19000` on `Components` page) and documentation board `Toasts` (`47:54305` at `x: 132000, y: 0`).
  - Architecture aligned with canonical tokens:
    - **Container**: Floating auto-layout surface with `rounded-2xl` (`Radius/LG` = 16px), drop shadow `shadow-card`, and 1px accent border.
    - **Variants**:
      - `success`: `bg-status-success-bg` (`#EBF8F2`), `border-status-success-accent` (`#10B981`), `text-status-success-text` (`#1F7A4D`), with checkmark vector icon.
      - `warning`: `bg-status-warning-bg` (`#FFFBEB`), `border-status-warning-accent` (`#F59E0B`), `text-status-warning-text` (`#B45309`), with alert triangle vector icon.
      - `error`: `bg-status-danger-bg` (`#FDF0F2`), `border-status-danger-accent` (`#EF4444`), `text-status-danger-text` (`#B33948`), with circle cross vector icon.
      - `info`: `bg-status-info-bg` (`#EEF2FF`), `border-status-info-accent` (`#6366F1`), `text-status-info-text` (`#4338CA`), with info circle vector icon.
    - **Scales**: `MD` (px-4 py-3, Fredoka SemiBold 15px, 32px touch target) and `SM` (px-3 py-2, Plus Jakarta Sans Bold 13px, 24px touch target).
    - **Design System Atom Reuse**:
      - Composes canonical `<Spinner size="sm" color="current" />` during `state="loading"`.
      - Composes canonical `<Button variant="ghost" size="sm">` for contextual actions.
    - **Global Toaster Options**: Updated `<Toaster />` in `src/app/layout.tsx` to automatically inject `rounded-2xl`, `shadow-card`, `font-heading`, and `font-body` into all runtime Sonner toast notifications.
- **Storybook Suite (`src/components/Toast.stories.tsx`)**:
  - Authored 10 stories covering all Figma variants, scales, states, actions, interactions, and CSS token checks.
  - Added automated action click and dismiss interaction testing in `InteractivePlay`.
  - Added computed token style assertions in `CssCheck` for background color (`#EBF8F2`), border color (`#10B981`), 16px border-radius, and Fredoka typography.
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 149/149 tests passed across 14 test files (10/10 for Toast).
  - `npm run build-storybook`: Build succeeded in 29.38s with 0 errors.

### Why
- Provides the canonical floating transient feedback molecule specified in Figma Step 5E.
- Ensures all application toast notifications adhere strictly to design system tokens and WCAG 2.1 AA accessibility guidelines.

### Nodes & Files Touched
- Figma: `Toast` (`46:54032` at `x: 26190, y: 19000`), `Toasts` (`47:54305` at `x: 132000, y: 0`)
- React: `src/components/Toast.tsx`, `src/app/layout.tsx`
- Stories: `src/components/Toast.stories.tsx`

---

## 2026-09-07 — Step 5F: Accordion Molecule Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled Accordion Molecule**:
  - Aligned React implementation (`src/components/Accordion.tsx`) directly with Figma canonical component set `Accordion` (`49:54939` at `x: 31766, y: 19000` on `Components` page) and documentation board `Accordions` (`49:54955` at `x: 136000, y: 0`).
  - Architecture aligned with canonical tokens:
    - **Container**: Lightweight editorial disclosure architecture omitting heavy card borders in favor of full-row interactive touch targets and 1px bottom hairline dividers (`border-b border-border-default` #EDF3F7).
    - **Variants**:
      - `State`: `Collapsed`, `Expanded`, `Disabled` (with `opacity-60`, `cursor-not-allowed`, and `text-text-tertiary`).
      - `Size`: `MD` (16px padding, min 52px height, 15px Medium heading) and `SM` (12px padding, min 44px height, 13px Medium heading).
      - `Icon`: Optional leading icon (20px MD / 16px SM) rendered in `text-action-primary` (#D99BA3 Rose) or muted gray for disabled state.
      - `Divider`: Optional 1px bottom divider line (`border-b border-border-default`).
    - **Natural-Growing Expandable Content**:
      - Reveals below the trigger when expanded with smooth fade-in motion.
      - Uses `Typography/Body/Small` (`text-[13px] sm:text-sm text-text-secondary leading-relaxed` on MD, `text-[12px] sm:text-xs` on SM).
      - Applies text indentation (`pl-12` on MD, `pl-9.5` on SM) when a leading icon is present to align content directly with the title text.
    - **Trailing Chevron**: Directional SVG arrow with `transition-transform duration-200 ease-out` (`rotate-180` when expanded).
    - **Compound AccordionGroup**: Implemented `<AccordionGroup>` supporting both single-expanded (`type="single"`) and multi-expanded (`type="multiple"`) behaviors.
    - **Accessibility Semantics**:
      - Strict WAI-ARIA disclosure compliance: `type="button"`, `aria-expanded={isExpanded}`, `aria-controls={contentId}`, `id={triggerId}`, `role="region"`, `aria-labelledby={triggerId}`.
- **Storybook Suite (`src/components/Accordion.stories.tsx`)**:
  - Authored 10 stories covering all Figma variants, states, scales, authentic scenarios, and interaction tests:
    - `DefaultCollapsed` (Canonical MD Collapsed state with leading icon and divider)
    - `Expanded` (Canonical MD Expanded state revealing formatted answer)
    - `Disabled` (Muted styling with disabled button and opacity-60)
    - `WithoutIcon` (Icon=None variant)
    - `WithoutDivider` (Divider=Hidden variant)
    - `SizeSM` (Compact 12px padding scale)
    - `ProductSpecifications` (Authentic 200gsm paper stock materials scenario)
    - `AccordionGroupDemo` (Multi-item FAQ group with single expansion behavior)
    - `InteractivePlay` (Automated play function verifying click-to-expand, chevron rotation, and aria-expanded toggle)
    - `CssCheck` (Computed style verification for border color `#EDF3F7`, font family, and trigger typography).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 159/159 tests passed across 15 test files (10/10 for Accordion).
  - `npm run build-storybook`: Build succeeded in 16.99s with 0 errors.

### Why
- Provides the canonical progressive disclosure molecule specified in Figma Step 5F.
- Allows customers and administrators to access rich secondary details (shipping, product specs, FAQs, custom instructions) with minimal visual noise and zero cognitive overload.
- Fully accessible according to WAI-ARIA disclosure patterns.

### Nodes & Files Touched
- Figma: `Accordion` (`49:54939` at `x: 31766, y: 19000`), `Accordions` (`49:54955` at `x: 136000, y: 0`)
- React: `src/components/Accordion.tsx`
- Stories: `src/components/Accordion.stories.tsx`

---

## 2026-09-07 — Step 5D: ReviewModal Organism Component Reconciliation (Milestone Complete)

### What Changed
- **Reconciled ReviewModal Organism**:
  - Aligned React implementation (`src/components/ReviewModal.tsx`) directly with Figma canonical component set `ReviewModal` (`43:51475` at `x: 21310, y: 19000` on `Components` page) and documentation board `Review Modals` (`43:53132` at `x: 124000, y: 0`).
  - Architecture aligned with canonical tokens and composed primitives:
    - **Container & Layout**: Composes canonical `Modal` at `size="md"` (482px max width), `Radius/LG` (18px/rounded-2xl), `Elevation/Card` (`shadow-2xl`), `--color-bg-surface` (`#FFFFFF`), and `--color-border-default` (`#EDF3F7`).
    - **4 Canonical Lifecycle States**:
      - `State=Default`: Clean input form containing optional product context row, interactive RatingStars picker, optional title input, and optional review body textarea with Cancel & Submit Review action buttons.
      - `State=Loading`: Asynchronous submission state disabling all form fields and rendering operational Spinner inside the primary button.
      - `State=Success`: Replaces the form view with a dedicated success screen featuring a green notification banner (`bg-status-success-bg`, `border-status-success-accent`, `text-status-success-text`), checkmark vector icon, product summary, submitted star rating feedback, and a single Primary "Done" action button.
      - `State=Error`: Resilient recovery state preserving entered title and body inputs, displaying a top danger alert banner (`bg-status-danger-bg`, `border-status-danger-accent`, `text-status-danger-text`), with Cancel and "Try Again" buttons.
    - **Figma Component Properties & Booleans**:
      - `Show Product Context` (`showProductContext = true`): 36×36px artwork thumbnail, product title (`font-heading font-semibold text-sm`), and "Purchased product" indicator (`text-xs text-text-tertiary`).
      - `Show Validation Alert` (`showValidationAlert = false`): Inline warning banner (`bg-status-warning-bg`, `border-status-warning-accent`, `text-status-warning-text`) prompting users to provide a rating before submitting.
    - **Interactive RatingStars Atom Composition**:
      - Composes canonical `RatingStars` (`size="md"`).
      - Dynamic textual feedback: `0` -> "Select a rating", `1` -> "1 out of 5 · Poor", `2` -> "2 out of 5 · Fair", `3` -> "3 out of 5 · Good", `4` -> "4 out of 5 · Very Good", `5` -> "5 out of 5 · Excellent".
    - **Full Backwards Compatibility**:
      - Fully compatible with `src/app/account/orders/[orderNumber]/page.tsx` usage (`orderId`, `productId`, `productName`, `isOpen`, `onClose`, `onSuccess`).
    - **Accessibility (WCAG 2.1 AA)**:
      - Inherits canonical `Modal` dialog semantics (`role="dialog"`, `aria-modal="true"`, focus trap, escape listener, backdrop click prevention).
      - Alert regions marked with `role="alert"` and `aria-live="assertive"`.
- **Storybook Suite (`src/components/ReviewModal.stories.tsx`)**:
  - Authored 10 comprehensive stories covering all lifecycle states, boolean properties, and interactive flows:
    - `Default` (Canonical 5-star review modal with product context)
    - `ZeroRating` (Unselected rating state displaying "Select a rating")
    - `WithoutProductContext` (Compact variant with `showProductContext=false`)
    - `WithValidationAlert` (Inline warning alert prompting rating selection)
    - `Loading` (Simulated active submission with spinner)
    - `Success` (Dedicated success confirmation screen with Done button)
    - `ErrorState` (Failure recovery banner with preserved inputs)
    - `InteractiveStarRating` (Automated play test verifying star selection and textual feedback updates)
    - `InteractiveSubmission` (End-to-end play test typing title & body, submitting, verifying success transition, and clicking Done)
    - `CssCheck` (Computed style verification for background `#FFFFFF`, border `#EDF3F7`, and Fredoka heading typography).
- **Validation Passed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npx vitest --project storybook run`: 169/169 tests passed across all 16 test files (10/10 for ReviewModal).
  - `npm run build-storybook`: Build succeeded in 19.53s with 0 errors.

### Why
- Establishes the canonical review submission organism specified in Figma Step 5D (`43:51475` / `43:53132`).
- Elevates customer post-purchase engagement with rich feedback loops, accessible dialog management, and clear recovery states.

### Nodes & Files Touched
- Figma: `ReviewModal` (`43:51475` at `x: 21310, y: 19000`), `Review Modals` (`43:53132` at `x: 124000, y: 0`)
- React: `src/components/ReviewModal.tsx`
- Stories: `src/components/ReviewModal.stories.tsx`












