# Fix Font Circular Dependency and Mobile Rendering Fallback

## What Changed
1. **Broken Circular CSS Variable Cycle**:
   - In [src/app/globals.css](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css), replaced the self-referencing `--font-heading: var(--font-heading)...` and `--font-body: var(--font-body)...` declarations with `--font-heading: var(--font-fredoka), 'Fredoka', cursive, sans-serif;` and `--font-body: var(--font-plus-jakarta), 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;`.
   - In [src/app/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx), configured `Fredoka` to output CSS variable `--font-fredoka` and `Plus_Jakarta_Sans` to output `--font-plus-jakarta`.

2. **Added Dual-Layer Mobile Font Fallback**:
   - Added `<link rel="preconnect">` and `<link rel="stylesheet">` tags in `<head>` in [src/app/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx) for Google Fonts (`Fredoka` and `Plus Jakarta Sans`).
   - Applied font variable class names to both `<html>` and `<body>` elements to ensure full inheritance across all mobile browser viewports.

## Why
- Under the W3C CSS Custom Properties specification, any CSS variable referencing itself (such as `--font-heading: var(--font-heading)`) is an invalid cyclic reference at computed-value time and is immediately discarded as `unset`.
- This invalidation caused mobile browsers (iOS WebKit and Android Chrome) to fall back to browser-default serif/times fonts.
- Decoupling Next.js font variables (`--font-fredoka`, `--font-plus-jakarta`) from theme consumer variables (`--font-heading`, `--font-body`) establishes a valid linear dependency chain.

## Files Touched
- [src/app/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/layout.tsx)
- [src/app/globals.css](file:///c:/Users/USER/work/unwind_and_doodle/src/app/globals.css)
- [docs/changes/2026-09-03-fix-font-circular-dependency.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-03-fix-font-circular-dependency.md)
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md)

## Suggested Commit Message
```text
fix(fonts): eliminate circular CSS variable dependency and add mobile link fallback

- Rename next/font variables to --font-fredoka and --font-plus-jakarta
- Fix cyclic variable self-references in globals.css @theme and :root
- Add Google Fonts stylesheet link in head for resilient mobile rendering
```
