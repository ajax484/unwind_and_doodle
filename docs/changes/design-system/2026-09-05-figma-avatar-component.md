# 2026-09-05 — Step 3G: Avatar Component System in Figma

## What Changed
1. **Master `Avatar` Component Set on `Components` Page**:
   - Created a single, reusable Component Set `Avatar` with **32 production variants** at `x: 50200, y: 0` (`848px × 388px`) on the `Components` page.
   - Configured with 3 component properties:
     - `Size`: `SM` (32px diameter) | `MD` (40px diameter) | `LG` (48px diameter) | `XL` (64px diameter)
     - `Content`: `Image` | `Initials`
     - `Status`: `None` | `Online` | `Offline` | `Away`
   - Default master variant configured to:
     - `Size=MD, Content=Image, Status=None`
   - **Geometry & Shape Standards**:
     - Container maintains a strict 1:1 aspect ratio across all variants.
     - Border radius bound directly to `Radius/Circle` (`VariableID:13:1595`, 9999px).
     - No shadows, decorative outlines, or non-circular shapes.
   - **Content Modes**:
     - `Image`: High-fidelity image fill (`scaleMode: 'FILL'`) using `https://placehold.net/default.png` as standard placeholder image, clipped within the circular container.
     - `Initials`: Perfectly centered 2-letter monograms (`BY`, `JD`, `AM`) with `Semantic/Text/Primary` (`#223342`) on `Semantic/Background/Subtle` (`#F4F8FA`) background fill.
     - Typography scaled proportionately:
       - `SM` (32px): `Typography/Caption` (12px, Plus Jakarta Sans Bold)
       - `MD` (40px): `Typography/Body` (14px, Plus Jakarta Sans Bold)
       - `LG` (48px): `Typography/Subheading` (16px, Plus Jakarta Sans Bold)
       - `XL` (64px): `Typography/Heading/3` (20px, Plus Jakarta Sans Bold)
   - **Status Indicator Standards**:
     - Circular indicator anchored to bottom-right without modifying the avatar container's external layout dimensions.
     - Scaled proportionately per size:
       - `SM`: 8px diameter, 1.5px white knockout stroke
       - `MD`: 10px diameter, 2px white knockout stroke
       - `LG`: 12px diameter, 2px white knockout stroke
       - `XL`: 16px diameter, 2.5px white knockout stroke
     - Semantic token color bindings:
       - `Online` → `Semantic/Status/Success/Accent` (`#52A374`)
       - `Away` → `Semantic/Status/Warning/Accent` (`#D88A32`)
       - `Offline` → `Semantic/Text/Tertiary` (`#94A6B8`)
       - `None` → Indicator hidden

2. **`Avatars` Documentation Board (`Components` Page)**:
   - Created a 1200px wide Auto Layout documentation board (`1200px × 2245px`) at `x: 48600, y: 0` on the `Components` page.
   - Populated with **28 live component instances** across structured sections:
     - **Header**: Step pill badge (`STEP 3G · IDENTITY & PROFILE AVATARS`), title, and descriptive subtitle.
     - **01 / OVERVIEW**: Component architecture card highlighting image fills, initials fallbacks, circular geometry, and status dots.
     - **02 / SIZES**: Visual showcase of SM (32px), MD (40px), LG (48px), and XL (64px) in both Image and Initials treatments.
     - **03 / CONTENT MODES**: Side-by-side comparison of Image avatar and Initials fallback with centered monogram typography.
     - **04 / STATUS INDICATORS**: 4-column matrix illustrating None, Online, Away, and Offline indicators across all four avatar sizes.
     - **05 / REALISTIC APPLICATION EXAMPLES**: 4 audited production workflow implementations using live `Avatar` instances:
       - Example 01: Testimonial Author card (`Sarah Jenkins · Verified Buyer`)
       - Example 02: Storefront Navbar Account Pill (`Bella Vance`)
       - Example 03: Admin / Team Member Management Row (`Amara Nwosu · Operations Lead`)
       - Example 04: Notification Center Sender Item (`New review submitted by Chloe M.`)
     - **06 / ACCESSIBILITY & USAGE GUIDELINES**: Implementation rules for `alt` text, accessible naming (`aria-label`), avoiding color-only status communication, and keyboard focus delegation.

## Why
- Unifies disparate, ad-hoc avatar implementations across the codebase (storefront customer accounts, testimonials, notification bell items, and admin team/order management) into a single reusable component set.
- Eliminates hardcoded arbitrary widths and heights (`w-8 h-8`, `w-10 h-10`, `rounded-full`) in favor of standardized design-system sizing tokens (SM, MD, LG, XL).
- Ensures consistent fallback handling with initials rendered on subtle semantic background tokens.
- Standardizes status indicator placement and semantic status token mapping without introducing custom ad-hoc colors.

## Files Touched
- `docs/changes/2026-09-05-figma-avatar-component.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Programmatic validation passed 100% across all 17 automated criteria in Figma.

## Commit Message
```text
feat(design-system): implement Step 3G Avatar component set and documentation in Figma

- Create reusable Avatar component set with 32 production variants (SM/MD/LG/XL, Image/Initials, None/Online/Offline/Away)
- Enforce strict 1:1 aspect ratio and Radius/Circle circular clipping
- Support centered initials fallback with Semantic/Background/Subtle and scaled typography
- Implement bottom-right anchored status indicators with semantic success, warning, and neutral tokens
- Build 1200px Avatars documentation board on Components page with 28 live instances across 4 audited workflows
```
