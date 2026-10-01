# 2026-10-01 Modular Email Builder Rebuild

## What Changed
- Rebuilt the Unwind & Doodle visual marketing email builder from scratch into a 3-column modular studio (`ComponentPalette`, `EmailCanvas`, `ContextualSettings`, and `BuilderHeader`).
- Established structured `CampaignBlock[]` as the canonical source of truth for email campaigns, eliminating raw HTML dependence in the campaign creation workflow.
- Implemented strictly discriminated TypeScript types for the 7 V1 blocks: `Text`, `Image`, `Product`, `Product Grid`, `Button`, `Callout`, and `Divider`.
- Integrated real catalog product lookups (`productId` reference with presentation overrides for badge, description, CTA text, and display toggles).
- Added visual block inserters (`+ Add block`), contextual hover/selection toolbars (`Move up`, `Move down`, `Duplicate`, `Delete`), and token insertion chips.
- Upgraded the email renderer (`marketing-renderer.service.ts`) with robust, table-based responsive HTML, Unwind & Doodle brand design tokens (`#D99BA3`, `#A7C2D4`, `#243342`, `#52657A`, `#FFFDF7`, `#FBF0F2`), and centered `public/logo.svg` at the top of every email.
- Integrated a comprehensive Marketing Media System with `MediaLibraryModal`, reusable media assets (`MediaAsset`), multi-file uploads with image validation (JPG, PNG, WEBP, GIF, SVG up to 10MB), and in-place image replacement.
- Enhanced Image Block schema and inspector controls with Width toggles (`Full` 100% max 560px vs `Constrained` max 360px), Alignment (`Left`, `Center`, `Right`), accessibility `altText`, links, and captions.
- Updated `validateCampaignForDelivery` (`marketing-campaign.service.ts`) and `marketing-dispatcher.service.ts` to validate and compile structured blocks (`content.blocks`) during pre-send checks and delivery dispatch.
- Implemented live preview with interactive persona switching (Aisha Bello, Chioma Okonkwo, Zainab Ahmed) rendering real personalized tokens through the single unified delivery renderer.
- Implemented pre-flight campaign validation review checklist and immediate or scheduled dispatch flows.
- Updated V1 template presets (`Product Launch`, `Editorial`, `Welcome`, and `Blank Canvas`).

## Why
- The previous email composer was monolithic, lacked clean 3-column responsive canvas interactions, duplicated product information unnecessarily, and allowed raw HTML mode that risked visual inconsistency.
- The redesign empowers admins to create marketing emails without writing HTML/CSS while strictly enforcing Unwind & Doodle brand aesthetics and responsive design.

## Files Touched
- `src/types/marketing-builder.ts`
- `src/services/marketing-renderer.service.ts`
- `src/lib/marketing-templates.ts`
- `src/components/admin/marketing/builder/EmailBuilder.tsx`
- `src/components/admin/marketing/builder/BuilderHeader.tsx`
- `src/components/admin/marketing/builder/panels/ComponentPalette.tsx`
- `src/components/admin/marketing/builder/panels/ContextualSettings.tsx`
- `src/components/admin/marketing/builder/canvas/EmailCanvas.tsx`
- `src/components/admin/marketing/builder/canvas/BlockWrapper.tsx`
- `src/components/admin/marketing/builder/canvas/BlockInserter.tsx`
- `src/components/admin/marketing/builder/canvas/blocks/CanvasBlocks.tsx`
- `src/components/admin/marketing/builder/modals/ProductPickerModal.tsx`
- `src/components/admin/marketing/builder/modals/CampaignReviewModal.tsx`
- `src/components/admin/marketing/builder/modals/PersonalizationChipInserter.tsx`
- `src/components/admin/marketing/builder/preview/EmailPreviewDrawer.tsx`
- `src/components/admin/marketing/CampaignComposer.tsx`
- `tests/marketing/modular-email-blocks.test.ts`
- `docs/changes/admin/2026-10-01-modular-email-builder-rebuild.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
`feat(marketing): rebuild modular email builder from scratch with 3-column studio and 7 V1 blocks`
