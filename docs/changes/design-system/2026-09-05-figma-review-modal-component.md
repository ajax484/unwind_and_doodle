# 2026-09-05 — Step 5D ReviewModal Component System in Figma

## What Changed

Created the complete **ReviewModal** component set (`id: 43:51475`) and accompanying **Review Modals** documentation frame (`id: 43:53132`) in the Unwind & Doodle Figma design system (`pageId: 16:2942`).

### 1. Component Set: `ReviewModal` (`id: 43:51475`)
- **Location**: `x: 125600, y: 0` (width: 3,080px, height: 4,806px).
- **Variant Count**: Exactly 96 variants across 4 component properties:
  - `State`: `Default` | `Loading` | `Success` | `Error` (4 options)
  - `Rating`: `0` | `1` | `2` | `3` | `4` | `5` (6 options)
  - `Product`: `Visible` | `Hidden` (2 options)
  - `Message`: `Hidden` | `Visible` (2 options)
- **Default Variant**: `State=Default, Rating=0, Product=Visible, Message=Hidden` (at index 0 of component set).

### 2. Visual Anatomy & Auto Layout Architecture
- **Modal Dialog Shell**:
  - Inherits the 480px MD Modal dialog architecture: 24px padding (`Spacing/6`), 18px corner radius (`Radius/LG`), `Semantic/Background/Surface` white fill, 1px `Semantic/Border/Default` stroke, and `Elevation/Card` drop shadow (`0 8px 16px -4px rgba(0,0,0,0.08)`).
- **Header**:
  - Horizontal Auto Layout with space-between alignment.
  - Heading 2 display title ("Write a review", 20px Fredoka SemiBold) paired with Body Small description ("Share your experience with this product.", 14px Plus Jakarta Sans Regular).
  - Circular Close Action button with subtle X vector icon (`Radius/Circle`).
- **Product Context**:
  - Compact 52px horizontal card row near the top of the form with 36×36px artwork thumbnail, `Typography/Body/Small` bold product title ("Mindful Coloring Book"), and `Typography/Caption` purchase indicator ("Purchased product").
  - Toggled via `Product=Visible | Hidden`.
- **Interactive Rating Picker**:
  - 5 star positions utilizing the exact vector star geometry established in `RatingStars` (`M 10.35 0 L 13.59 6.57 L 20.7 7.62 ...`).
  - Selected stars filled with `Semantic/Action/Primary` (#D99BA3 Rose).
  - Unselected stars filled with `Semantic/Border/Default` with subtle input border stroke.
  - Accompanied by accessible textual rating labels ("Select a rating", "1 out of 5 · Poor" ... "5 out of 5 · Excellent") ensuring non-reliance on color alone.
- **Form Controls Reuse**:
  - Review Title: Reuses existing `TextInput` component (`Size=MD`, label "Review title", placeholder "Give your review a title").
  - Review Body: Reuses existing `Textarea` component (`Size=MD`, label "Your review", placeholder "Tell us what you liked, what stood out, or what could be better.").
- **Lifecycle & Feedback States**:
  - `Loading`: Preserves entered content, dims inputs, disables Cancel, and displays active `Spinner` (`Size=SM, Color=Rose`) with "Submitting review...".
  - `Success`: Replaces form with a dedicated green Success card (`Semantic/Status/Success/Background`, 1px `Semantic/Status/Success/Accent` border, checkmark icon, "Review submitted successfully!"), rating summary, and single Primary "Done" button.
  - `Error`: Preserves entered form fields with a top danger alert banner (`Semantic/Status/Danger/Background`, 1px `Semantic/Status/Danger/Accent` border, warning icon, "Couldn't submit your review"), Cancel button, and Primary "Try again" button.
  - `Message`: When visible on Default state, displays an inline validation warning alert ("Please select a rating and complete your review before submitting.").

### 3. Documentation Frame: `Review Modals` (`id: 43:53132`)
- **Location**: `x: 124000, y: 0` (width: 1,200px, height: 4,775px).
- **Aesthetic**: Cream background (`Color/Neutral/Cream` #FFFDF7), 64px padding, 48px section spacing, 1px divider lines.
- **Sections**:
  1. **Hero Header**: Category badge, display title (40px Fredoka Bold), and storefront usage overview.
  2. **01 · Anatomy & Architecture**: Enlarged MD ReviewModal specimen with 8 circular numbered callout pins and breakdown cards.
  3. **02 · Lifecycle States**: 2×2 grid showing Default, Loading, Success, and Error states.
  4. **03 · Rating Selection**: Star state progression across 0 stars, 1 star (Poor), 3 stars (Good), and 5 stars (Excellent).
  5. **04 · Product Context Toggle**: Side-by-side comparison of Product Visible vs Product Hidden.
  6. **05 · Real-World Storefront Usage Example**: Full live modal instance configured with real customer review data for "Custom Coloring Book (Botanical Edition)" with a 5-star rating and authentic review text.
  7. **06 · Accessibility & Governance**: WCAG 2.1 AA dialog role, focus trapping, Escape-to-close, keyboard star selection (Arrow keys/Space/Enter), and screen reader textual announcements.

---

## Why

1. **Storefront Feedback Mechanism**: Customers need a clear, reassuring way to submit product and bundle reviews with ratings, titles, and comments after purchase.
2. **Component Reuse**: Inherits the `Modal` MD dialog shell and directly composes existing `TextInput`, `Textarea`, `Button`, and `Spinner` components rather than recreating visual systems.
3. **Rating Visual Consistency**: The internal interactive rating picker exactly matches the established `RatingStars` vector iconography while adding accessible textual feedback.
4. **Resilient UX**: Error states preserve customer input so reviews are never lost on network failure; loading states clearly communicate asynchronous submission.

---

## Files Touched
- Figma Document: `Untitled` (Page: `Components`, `pageId: 16:2942`)
  - Created `ReviewModal` Component Set (`id: 43:51475`, 96 variants)
  - Created `Review Modals` Documentation Frame (`id: 43:53132`)
- [docs/changes/2026-09-05-figma-review-modal-component.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-05-figma-review-modal-component.md) [NEW]
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) [MODIFY]

---

## Follow-ups / Known Issues
- None. Phase 5D is fully validated and self-contained.

---

## Commit Message
```text
feat(design-system): create ReviewModal component set and documentation frame in Figma (Step 5D)

- Create ReviewModal component set with 96 variants across State, Rating, Product, and Message properties
- Compose 480px MD Modal dialog shell with interactive 5-star rating picker matching RatingStars iconography
- Reuse TextInput, Textarea, Button (Outline, Primary), and Spinner components
- Support complete lifecycle states: Default, Loading (with Spinner), Success confirmation, and resilient Error recovery
- Build 1200px Review Modals documentation frame with anatomy breakdown, states, rating matrix, and accessibility specs
```
