# 2026-09-05 — Unwind & Doodle Production Design System in Figma

## What Changed
1. **Figma File & Token Architecture**:
   - Created a 6-page design system hierarchy (`00 — Foundations`, `01 — Components`, `02 — Patterns`, `03 — Storefront`, `04 — Admin`, `05 — Documentation`) via `figma-bridge` MCP server.
   - Extracted and codified 30 color tokens into native Figma Variables (`Color Palette`) and 30 Local Paint Styles covering Brand Blue (`#A7C2D4`), Brand Rose (`#D99BA3`), Neutrals, and Semantic status indicators.
   - Created 11 native Local Text Styles pairing display font `Fredoka` (Display 1/2, Headings 1–3, Button Text, Overline) with editorial font `Plus Jakarta Sans` (Body Large/Base/Small, Caption).
   - Created 5 Local Effect Styles for drop shadow elevations (`Shadow XS`, `Shadow Card`, `Shadow Card Hover`, `Shadow Button Rose`, `Shadow Button Blue`).

2. **Component & Pattern Generation**:
   - Built master `Button` component set with 11 variants and states (`Primary Rose`, `Secondary Blue`, `Outline`, `Pill Action`, `Stepper`).
   - Created form primitives (`Input / Default`, `Focused`, `Error`, `Disabled`, and custom checkboxes).
   - Created semantic status badges for stock (`In Stock`, `Out of Stock`), product types (`✨ Custom Photo`, `📦 Bundle`), and order fulfillment states.
   - Built composite patterns: `ProductCard` (4 variants: Standard, Custom Keepsake, Bundle, Out of Stock), `CartItemRow`, `CustomizationUploader`, and `OrderStatusTimeline`.

3. **Storefront & Admin Integration**:
   - Recreated desktop `Navbar` (1280px), `Hero Section` with ambient blobs, `Cart Drawer` (440px), and `Footer` (1280px) on `03 — Storefront`.
   - Created complete merchant `Admin` backoffice screen (1280px) on `04 — Admin` featuring navigation sidebar, metric summary cards, and recent orders data table.
   - Compiled master design system documentation with component taxonomy, usage rules, and do's/don'ts on `05 — Documentation`.

## Why
- Establishes a synchronized visual source of truth between the Next.js/Tailwind CSS codebase and Figma.
- Enables rapid prototyping and feature expansion using production-accurate tokens, Auto Layout, and native components.

## Files Touched
- `docs/changes/2026-09-05-figma-design-system.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. All 6 pages, 30 paint styles, 11 text styles, 5 effect styles, and 30 variables passed verification and are live in the connected Figma document.

## Commit Message
```text
feat(design-system): build complete Figma design system with tokens, components, and layouts

- Establish 6-page design system hierarchy in Figma
- Register 30 color variables and paint styles matching Tailwind tokens
- Register 11 typography styles for Fredoka and Plus Jakarta Sans
- Create Button, Input, Badge, ProductCard, and CartItemRow components
- Compose responsive Storefront screens and Admin backoffice layout
- Add comprehensive design system guidelines and taxonomy documentation
```
