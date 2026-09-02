# Fix Mobile Font Loading and Rendering Issues

## What Changed
1. **Next.js Google Fonts Integration**:
   - Updated [src/app/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx) to import and configure `Fredoka` (for headings) and `Plus_Jakarta_Sans` (for body text) using Next.js native `next/font/google` font loader.
   - Assigned CSS variables `--font-heading` and `--font-body` to the font instances with `display: 'swap'`.
   - Applied font variable class names (`fredoka.variable`, `plusJakartaSans.variable`) to the root `<html>` element.

2. **CSS `@import` Order & Fallback Font Cleanup**:
   - Updated [src/app/globals.css](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css) to remove the invalid `@import url('https://fonts.googleapis.com/css2...')` statement that was incorrectly placed after `@import "tailwindcss";`.
   - Re-configured `@theme`, `:root`, `html`, `body`, and heading selectors (`h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `.font-heading`) to reference `var(--font-heading)` and `var(--font-body)` with system fallback fonts (`Fredoka`, `Plus Jakarta Sans`, `-apple-system`, `BlinkMacSystemFont`, `cursive`, `sans-serif`).

## Why
1. **CSS Specification Violation**: Mobile Safari (WebKit on iOS) and Google Chrome (Blink on Android) strictly discard CSS `@import` rules that occur after other CSS statements/imports in the stylesheet.
2. **Elimination of Remote CDN Dependencies**: Loading fonts directly via remote Google CDN (`fonts.googleapis.com`) on mobile connections often fails or times out due to carrier proxying, DNS privacy extensions (e.g., iOS Private Relay or Lockdown Mode), or ad blockers.
3. **Optimized Zero-Layout-Shift Loading**: Native `next/font/google` self-hosts font binaries as static deployment assets, preloads font files, prevents layout shifts, and ensures fonts display reliably on all mobile devices and network conditions.

## Files Touched
- [src/app/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx)
- [src/app/globals.css](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css)
- [docs/changes/2026-09-02-fix-mobile-fonts.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-02-fix-mobile-fonts.md)

## Follow-ups / Known Issues
- None for font loading.
- Note: Pre-existing test failure in `tests/auth-redesign-matrix.test.ts` was flagged during verification as unrelated to font styling.

## Suggested Commit Message
```text
fix: resolve mobile font rendering issues using next/font/google

- Migrate Google Fonts imports to next/font/google in RootLayout
- Remove invalid CSS @import order in globals.css
- Self-host Fredoka and Plus Jakarta Sans for zero layout shift and offline mobile support
```
