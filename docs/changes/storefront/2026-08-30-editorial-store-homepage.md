# Modern Brand-Aligned Storefront Homepage

## What Changed
1. **Official Brand Logo Integration**:
   - Copied official Unwind & Doodle logo to `public/logo.png`.
   - Embedded logo into [Navbar.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/Navbar.tsx), [Footer.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/Footer.tsx), and the hero showcase in [page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/page.tsx).
2. **Signature Palette & Design System Tokens (`src/app/globals.css`)**:
   - Aligned theme tokens with the official logo colors:
     - **Cloud / Powder Blue**: `#A7C2D4` (main), `#7FA6BF` (dark), `#EBF3F8` (subtle wash)
     - **Dusty Blush Rose**: `#D99BA3` (main), `#C67D87` (dark), `#FBF0F2` (subtle wash)
     - **Soothing Slate Charcoal**: `#243342` (high-contrast accessible text)
   - Introduced the organic fluid corner background gradients (powder blue top-left, dusty blush rose bottom-right) matching the logo composition.
   - Preserved rounded, friendly typographic accents (`Fredoka` & `Plus Jakarta Sans`) and doodle hearts (`♡`).
3. **Product Card & Category Showcase**:
   - Refined [ProductCard.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/ProductCard.tsx) and category cards in [page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/page.tsx) with the updated brand palette.

## Why
To faithfully embody the visual identity, colors, and comforting personality established in the official **Unwind & Doodle** brand logo.

## Files Touched
- `public/logo.png` [NEW]
- `src/app/globals.css` [MODIFIED]
- `src/components/Navbar.tsx` [MODIFIED]
- `src/components/Footer.tsx` [MODIFIED]
- `src/components/ProductCard.tsx` [MODIFIED]
- `src/app/page.tsx` [MODIFIED]
- `docs/changes/2026-08-30-editorial-store-homepage.md` [MODIFIED]

## Follow-ups / Known Issues
- None.

## Commit Message
```text
feat(branding): align storefront aesthetic with official Unwind & Doodle logo

- Add official logo image to public/logo.png
- Extract and apply exact powder blue (#A7C2D4) and dusty blush rose (#D99BA3) color tokens
- Add organic corner gradient blobs and doodle heart accents matching the logo
- Update Navbar and Footer with official logo and signature color-split typography
- Ensure all 83 automated test suites pass cleanly
```
