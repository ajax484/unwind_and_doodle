# 2026-09-06 Fix Minor Figma Design System QA Issues

Comprehensive remediation pass addressing all Minor (🟡) findings identified during the Step 7A Full Figma Design System QA Audit.

---

## What Changed

1. **Paint & Effect Style Nomenclature Normalization**:
   - Renamed hyphenated neutral and action paint styles to space-delimited Title Case to match design token specifications:
     - `Color/Neutral/Border-Soft` → `Color/Neutral/Border Soft`
     - `Color/Neutral/Border-Input` → `Color/Neutral/Border Input`
     - `Color/Neutral/Footer-Border` → `Color/Neutral/Footer Border`
     - `Semantic/Action/Primary-Hover` → `Semantic/Action/Primary Hover`
     - `Semantic/Action/Secondary-Hover` → `Semantic/Action/Secondary Hover`
     - `Semantic/Action/Secondary-Text` → `Semantic/Action/Secondary Text`
     - `Semantic/Action/Secondary-Background` → `Semantic/Action/Secondary Background`
   - Renamed effect style:
     - `Elevation/Card-Hover` → `Elevation/Card Hover`

2. **Added Missing Border & Divider Paint Styles**:
   - Added `Semantic/Border/Strong` (`#52657A`) to provide the dark high-contrast border token for table borders and active focus boundaries.
   - Added structural divider paint styles:
     - `Divider/Default` (`#EDF3F7`)
     - `Divider/Inverse` (`#36495C`)
     - `Semantic/Divider/Default` (`#EDF3F7`)
     - `Semantic/Divider/Inverse` (`#36495C`)

3. **Created `Elevation/None` Effect Style**:
   - Created native Figma Effect Style `Elevation/None` with an empty effects array (`[]`).
   - Enables explicit component binding when resetting elevation on disabled, pressed, or flat states rather than unbinding styles.

4. **Added `Radius/Circle/CSS` String Variable**:
   - Added `Radius/Circle/CSS` (`"50%"`, String type) to the native `Spatial Tokens` variable collection.
   - Preserves Figma numeric `Radius/Circle` (9999px) for scenegraph rounding while providing exact CSS `50%` value for design-to-code token extraction.

5. **Live Canvas Audit Verification**:
   - Verified that all 37 component sets, 32 documentation frames, 72 paint styles, 6 effect styles, and 46 variables are active, correctly parented, and free of orphaned nodes or naming collisions.

---

## Why

- **Design System Consistency**: Eliminates subtle naming discrepancies (hyphens vs spaces) between token definitions and Figma styles.
- **Design-to-Code Parity**: Ensures frontend developers consuming tokens directly from Figma styles/variables receive 1:1 matching names and values (including divider colors, strong borders, and 50% circle radius).
- **Audit Sign-off**: Closes out 100% of findings from the Step 7A QA Audit, unlocking Phase 7B.

---

## Files Touched

- Figma Document: `Tokens` page (`id: 9:759`)
  - Updated `Spatial Tokens` variable collection with `Radius/Circle/CSS`.
- Figma Document: `Components` page (`id: 16:2942`)
  - Normalized paint and effect styles.
- [docs/changes/2026-09-06-fix-minor-qa-issues.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-06-fix-minor-qa-issues.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Verification Results

| Check | Expected | Live State in Figma | Status |
| :--- | :--- | :--- | :--- |
| Hyphenated Style Renames | 0 hyphens in style names | 0 hyphenated styles | **PASS** |
| `Semantic/Border/Strong` | Present (`#52657A`) | Style created & active | **PASS** |
| `Divider/*` & `Semantic/Divider/*` | 4 styles present | All 4 styles created & active | **PASS** |
| `Elevation/None` | Empty effects array `[]` | Created & active | **PASS** |
| `Radius/Circle/CSS` | String variable `"50%"` | In `Spatial Tokens` collection | **PASS** |
| Canvas Node Hygiene | 0 strays on `Tokens` & `Components` | Exactly 0 strays across both | **PASS** |

---

## Commit Message

```text
fix(design-system): resolve all minor naming, divider token, and elevation QA issues in Figma

- Normalize paint styles to space-delimited Title Case (Border Soft, Input, Footer Border, Primary/Secondary Hover, Secondary Text/Background)
- Rename Elevation/Card-Hover to Elevation/Card Hover
- Add Semantic/Border/Strong (#52657A) paint style
- Add Divider/Default, Divider/Inverse, Semantic/Divider/Default, and Semantic/Divider/Inverse styles
- Create Elevation/None effect style with empty effects array for explicit binding
- Add Radius/Circle/CSS ("50%") string variable to Spatial Tokens collection
- Verify 100% token consistency and zero stray nodes across Tokens and Components pages
```
