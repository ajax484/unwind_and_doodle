# Full-Width Sections and Padding-Based Separation

## What Changed
1. **Container Margin Removal in [src/app/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/page.tsx)**:
   - Removed `space-y-24 sm:space-y-36 pb-16` on the main page wrapper.
   - Converted the wrapper to `<div className="w-full flex flex-col">` so section background colors meet seamlessly with zero gutter gaps.

2. **Full-Width Edge-to-Edge Layout Across All Homepage Sections**:
   - **[HeroSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/HeroSection.tsx)**: Made outer section `w-full bg-white relative pt-12 sm:pt-20 lg:pt-28 pb-16 sm:pb-24 border-b border-[#EDF3F7]` with full-bleed background blur orbs and inner `max-w-7xl` container.
   - **[FeaturedProductsSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/FeaturedProductsSection.tsx)**: Outer section `w-full bg-[#FAFDFE] py-16 sm:py-24 lg:py-28 border-b border-[#EDF3F7]` with inner `max-w-7xl` container.
   - **[CustomKeepsakeSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/CustomKeepsakeSection.tsx)**: Expanded signature brand charcoal (`bg-[#243342]`) from an enclosed card to the **full screen width** (`w-full bg-[#243342] py-16 sm:py-24 lg:py-32 relative overflow-hidden`) with full-bleed ambient orbs and inner `max-w-7xl` container.
   - **[CategoryGrid.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/CategoryGrid.tsx)**: Expanded pink gradient background across the **full screen width** (`w-full bg-gradient-to-b from-[#FDF7F8] via-[#FBF0F2] to-[#FCEBED] py-16 sm:py-24 lg:py-32 border-b border-[#F2D7DC] relative overflow-hidden`) with full-bleed ambient orbs and inner `max-w-7xl` container.
   - **[BrandPhilosophySection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/BrandPhilosophySection.tsx)**: Outer section `w-full bg-white py-16 sm:py-24 lg:py-32 border-b border-[#EDF3F7]` with inner `max-w-7xl` container.
   - **[ReviewsSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/ReviewsSection.tsx)**: Outer section `w-full bg-[#F4F8FA] py-16 sm:py-24 lg:py-32 border-b border-[#EDF3F7]` with inner `max-w-7xl` container.
   - **[NewsletterSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/NewsletterSection.tsx)**: Outer section `w-full bg-white py-16 sm:py-24 lg:py-32 relative overflow-hidden` with inner `max-w-4xl` container.

3. **Padding-Based Separation**:
   - Replaced all section vertical margins with generous vertical padding (`py-16 sm:py-24 lg:py-32`).

## Why
- Implemented the user's design directive: eliminating narrow centered boxed layouts, expanding background colors edge-to-edge across the entire screen width (100vw), and utilizing padding instead of margins for visual continuity.

## Files Touched
- [src/app/page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/page.tsx)
- [src/components/home/HeroSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/HeroSection.tsx)
- [src/components/home/FeaturedProductsSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/FeaturedProductsSection.tsx)
- [src/components/home/CustomKeepsakeSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/CustomKeepsakeSection.tsx)
- [src/components/home/CategoryGrid.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/CategoryGrid.tsx)
- [src/components/home/BrandPhilosophySection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/BrandPhilosophySection.tsx)
- [src/components/home/ReviewsSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/ReviewsSection.tsx)
- [src/components/home/NewsletterSection.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/home/NewsletterSection.tsx)
- [docs/changes/2026-09-03-full-width-sections-and-padding.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-03-full-width-sections-and-padding.md)
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md)

## Suggested Commit Message
```text
feat(home): convert all homepage sections to edge-to-edge full width with padding separation

- Remove space-y vertical margins in page.tsx for seamless background contact
- Extend background colors to full screen width on all 7 sections
- Retain inner max-w-7xl responsive containers for optimal text and card readability
```
