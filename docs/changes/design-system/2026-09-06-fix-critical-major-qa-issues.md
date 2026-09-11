# 2026-09-06 Fix Critical & Major Figma Design System QA Issues

Comprehensive remediation pass addressing all Critical (🔴) and Major (🟠) findings identified during the Step 7A Full Figma Design System QA Audit.

---

## What Changed

1. **Re-parented `TestimonialCard` Component Set (🔴 Critical)**:
   - Re-attached component set node `19:10006` (16 variants) to the `Components` canvas page (`id: 16:2942`).
   - Positioned in Row 1 directly below `RatingStars` at `x: 20434, y: 600`.
   - Restored full visibility in Figma canvas and asset library while retaining all links to instances inside the `Ratings & Testimonials` documentation frame.

2. **Constructed `AlertBanner` Component Set & Documentation Frame (🔴 Critical + 🟠 Major)**:
   - Created `AlertBanner` component set (`id: 53:13000`, 32 variants) across:
     - `Variant`: `Info`, `Success`, `Warning`, `Danger`
     - `Size`: `MD` (560px × 68px, 16px title, 14px description), `SM` (480px × 46px, 12px caption)
     - `Dismiss`: `None`, `Visible` (with accessible close icon button)
     - `Action`: `None`, `Visible` (with contextual action button)
   - Integrated semantic status tokens: `Semantic/Status/{Variant}/Background`, `Semantic/Status/{Variant}/Text`, and `Semantic/Status/{Variant}/Accent`.
   - Created 1200px `Alert Banners` documentation frame (`id: 53:13001`) with:
     - 01 · Header & Overview
     - 02 · Four Semantic Status Colorways
     - 03 · Sizing & Scale (MD vs SM)
     - 04 · Interaction Permutations Matrix
     - 05 · Production Storefront & Admin Scenarios
     - 06 · Architectural Guidance (AlertBanner vs Toast decision matrix)

3. **Constructed `HeroSection` Component Set & Documentation Frame (🔴 Critical + 🟠 Major)**:
   - Created `HeroSection` component set (`id: 53:13460`, 8 variants) across:
     - `Layout`: `Desktop` (1280px × 680px), `Mobile` (390px × 540px/900px)
     - `Media`: `Card` (Mindful Edition keepsake preview card with logo and CTA), `None` (editorial focus)
     - `Badge`: `Visible` ("♡ Mindful Coloring Books & Custom Photo Keepsakes"), `Hidden`
   - Reused design system foundations:
     - Headline: `Typography/Display/1` (56px Fredoka Bold) and `Typography/Display/2` (36px/40px)
     - Subtitle: `Typography/Body/Large` (18px Plus Jakarta Sans) and `Typography/Body/Base` (15px)
     - CTAs: Composed with `Button` instances (`Variant=Primary` Rose + `Variant=Secondary` Blue)
     - Elevation: `Elevation/Card` effect style token
     - Trust points: 3-column verification grid (160gsm Archival Paper, Custom Photos, Nigeria Nationwide)
   - Created 1200px `Hero Sections` documentation frame (`id: 53:13461`) at `x: 45000, y: 9000`.

4. **Product Model Alignment on `CartItemRow` (🟠 Major)**:
   - Added Component Properties v2 `Configuration` and `Type` to `CartItemRow` (`id: 18:7714`).
   - Bound `Supporting Information` text layer to `Configuration` property ("Theme: Botanical · Name: Bilal · 3 photos") to accurately reflect configured keepsake items.

5. **Figma Canvas Hygiene & Scratch Cleanup (🟠 Major / 🟡 Minor)**:
   - **`Tokens` Page**: Removed 19 orphaned duplicate `COMPONENT` nodes (`16:2943`..`16:3032`) and stray frames (`Hover Row` `17:6244`, `Motion Specs Panel` `17:6305`).
   - **`Components` Page**: Removed 34 stray scratch nodes at `(0, 0)` and `(-2000, -2000)` (temporary test nodes, unparented primitive test instances, scrap vectors).
   - Zero stray nodes remain on both canvas pages.

---

## Why

1. **System Completeness**: Eliminates all blockers preventing Phase 7B (Code ↔ Figma Token Reconciliation) by ensuring all 36 roadmap component sets and 38 documentation frames exist as true design-system single sources of truth.
2. **Design-to-Code Parity**: `HeroSection` and `AlertBanner` exist in the Next.js production codebase (`HeroSection.tsx`, inline status alert components); their addition to Figma establishes 1:1 component parity.
3. **Hygiene & Maintainability**: Eliminates detached/unparented components and scratch test artifacts that caused asset panel clutter and ambiguity.

---

## Files Touched

- Figma Document: `Tokens` page (`id: 9:759`)
  - Cleaned up 21 orphaned components and frames at `(0, 0)`.
- Figma Document: `Components` page (`id: 16:2942`)
  - Re-parented `TestimonialCard` (`id: 19:10006`, 16 variants) to `x: 20434, y: 600`.
  - Created `AlertBanner` component set (`id: 53:13000`, 32 variants) at `x: 43600, y: 0`.
  - Created `Alert Banners` documentation frame (`id: 53:13001`) at `x: 42200, y: 0`.
  - Created `HeroSection` component set (`id: 53:13460`, 8 variants) at `x: 46400, y: 9000`.
  - Created `Hero Sections` documentation frame (`id: 53:13461`) at `x: 45000, y: 9000`.
  - Enhanced `CartItemRow` (`id: 18:7714`) with `Configuration` and `Type` properties.
  - Cleaned up 34 stray scratch elements.
- [docs/changes/2026-09-06-fix-critical-major-qa-issues.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-06-fix-critical-major-qa-issues.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Verification Results

A full automated verification query was executed across the entire Figma document:
- **Component Sets**: Exactly **36 of 36** expected component sets present and parented (`missingSets: []`).
- **Documentation Frames**: Exactly **38 of 38** expected documentation frames present and parented (`missingDocs: []`).
- **Hygiene**: `strayTokensCount: 0`, `strayComponentsCount: 0`.
- **Readiness**: The Figma design system is 100% structurally validated and ready for Phase 7B.

---

## Commit Message

```text
fix(design-system): resolve all Critical and Major QA audit issues in Figma

- Re-parent TestimonialCard (19:10006) to Components page canvas under RatingStars
- Construct AlertBanner component set (32 variants) and 1200px Alert Banners doc frame
- Construct HeroSection component set (8 variants) and 1200px Hero Sections doc frame
- Enhance CartItemRow with Component Properties v2 Configuration and Type
- Clean up 55 stray scratch nodes and orphaned components across Tokens and Components pages
- Verify 36/36 component sets and 38/38 documentation frames are 100% present and valid
```
