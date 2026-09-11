# 2026-09-05 — Step 2F: RatingStars & TestimonialCard Components in Figma

## What Changed
1. **Master `RatingStars` Component Set on `Components` Page**:
   - Created a single unified Figma Component Set `RatingStars` (48 production variants) positioned at `x: 18400, y: 0` on the `Components` page.
   - Configured with 4 component properties:
     - `Rating`: `0` | `1` | `2` | `3` | `4` | `5`
     - `Size`: `SM` (16px stars, 2px gap) | `MD` (20px stars, 4px gap)
     - `ShowValue`: `True` | `False`
     - `ReviewCount`: `None` | `Visible`
   - Default master variant configured to `Rating=5, Size=SM, ShowValue=False, ReviewCount=None`.
   - Stars implemented as proper 5-point vector path geometry (not Unicode characters `★`).
   - Token bindings:
     - Filled stars: `Semantic/Action/Primary` (`#1B7695`)
     - Empty stars: `Semantic/Border/Default` (`#EDF3F7`)
     - Numeric value: `Semantic/Text/Secondary` (`#52657A`), `Typography/Caption` (SM) / `Typography/Body/Small` (MD)
     - Review count: `Semantic/Text/Tertiary` (`#8898AA`), `Typography/Caption`

2. **Master `TestimonialCard` Component Set on `Components` Page**:
   - Created a single unified Figma Component Set `TestimonialCard` (16 production variants) positioned at `x: 20000, y: 0` on the `Components` page.
   - Configured with 4 component properties:
     - `Size`: `SM` | `MD`
     - `Rating`: `Visible` | `Hidden`
     - `Avatar`: `Image` | `Initials`
     - `Quote`: `Short` | `Long`
   - Default master variant configured to `Size=MD, Rating=Visible, Avatar=Image, Quote=Short`.
   - **Atomic Composition**: Consumes real `RatingStars` component instances in its top rating slot rather than duplicating star vectors.
   - **Card Container Tokens**:
     - Background: `Semantic/Background/Surface` (`#FFFFFF`)
     - Border: `Border/Default` (`#EDF3F7`, 1px `Border/Width/Thin`)
     - Radius: `Radius/LG` (18px)
     - Elevation: `Elevation/Card` (0 8px 16px -4px rgba(0,0,0,0.08))
     - Padding: `Spacing/6` (24px) for MD; `Spacing/4` (16px) for SM
   - **Quote Treatment**:
     - `Typography/Body/Large` for MD, `Typography/Body/Small` for SM
     - Color: `Semantic/Text/Primary` (`#243342`)
     - Dynamic wrapping: Auto Layout vertical expansion (`textAutoResize = HEIGHT`, `layoutAlign = STRETCH`) prevents clipping or text truncation on long quotes
   - **Author Row**:
     - Avatar: 40px circle (MD) or 32px circle (SM) with `Radius/Circle`, supporting subtle photographic gradient fill or initials (`BY`) fallback
     - Author Name: `Typography/Body/Small` (500 medium weight), `Semantic/Text/Primary`
     - Supporting Info / Product Context: `Typography/Caption`, `Semantic/Text/Tertiary` (e.g. `Verified customer · Custom Coloring Book`)

3. **`Ratings & Testimonials` Documentation Board (`Components` Page)**:
   - Created a dedicated 1200px documentation frame (`1200px × 2561px`) at `x: 17100, y: 0` on the `Components` page.
   - Populated with **18 live RatingStars instances** and **10 live TestimonialCard instances** across 5 structured sections:
     - **Header**: Category tag, title, and descriptive subtitle.
     - **01 / RatingStars Component Scale & Progression**: Shows ratings 0, 3, 4, 5, with value and review count across SM and MD sizes.
     - **02 / TestimonialCard Core Sizes**: Side-by-side comparison of MD (24px padding, 40px avatar) and SM (16px padding, 32px avatar).
     - **03 / TestimonialCard Variants & Options**: Matrix covering Long Quote natural wrapping, Initials avatar fallback, Hidden rating state, and SM long quote.
     - **04 / Component Anatomy & Token Mapping**: Annotated live card instance paired with a 6-item breakdown table (Rating, Quote, Avatar, Author Name, Supporting Information, Product Context).
     - **05 / Storefront Customer Review Grid**: Responsive 3-column storefront review showcase demonstrating realistic customer quotes for Unwind & Doodle products.

## Why
- Customer reviews and social proof are core e-commerce conversion drivers for Unwind & Doodle's standard, customized, and bundle product experiences.
- Establishes a flexible, accessible star rating indicator reusable across ProductCards, PDPs, and review sections.
- Composes TestimonialCard organically from existing primitives while adhering strictly to existing color, typography, border, elevation, and spacing tokens without introducing new tokens.

## Files Touched
- `docs/changes/2026-09-05-figma-ratings-and-testimonials.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- None. Both component sets and documentation frame are 100% token-compliant and validated in Figma.

## Commit Message
```text
feat(design-system): implement Step 2F RatingStars and TestimonialCard in Figma

- Create unified RatingStars component set with 48 production variants (ratings 0-5, SM/MD, optional value and count)
- Create unified TestimonialCard component set with 16 production variants (SM/MD, rating toggle, image/initials avatar, short/long quote)
- Consume real RatingStars component instances inside TestimonialCard
- Implement vector star paths, natural quote wrapping, and author verification metadata
- Build 1200px Ratings & Testimonials documentation board on Components page with 28 live instances
```
