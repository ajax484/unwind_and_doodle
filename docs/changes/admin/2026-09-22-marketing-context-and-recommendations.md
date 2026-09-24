# Step 17A: Marketing Personalization Context & Dynamic Recommendations

## What Changed

1. **Typed Personalization Context (`src/types/marketing-context.ts`):**
   - Introduced `ProductFamily` union representing canonical product classifications (`general_colouring_book`, `unwind_kit`, `ultimate_game_book`, `play_and_color`, `vent_to_me`, `standard_custom`, `full_custom`, `tools`, `other`).
   - Introduced `MarketingRecommendation` structure with product metadata, canonical family, reason, and narrative playbook block.
   - Defined `MarketingContext` containing customer details, order context (`orderNumber`), product context (`productName`, `lastProduct`), and dynamic recommendation blocks (`productRecommendation`, `personalizedRecommendation`).

2. **Dedicated Recommendation Resolver (`src/services/marketing-recommendation.service.ts`):**
   - Implemented `classifyProductFamily` mapping product slug, SKU, name, and customization flags into stable canonical families.
   - Encoded the Unwind & Doodle retention playbook cross-sell transition matrix with prioritized fallback candidates.
   - Built `getCustomerPurchasedFamilies` querying confirmed customer purchase history across paid/delivered orders.
   - Implemented `resolveProductRecommendation` with deterministic prioritization, catalog product resolution, approved narrative blocks, and strict exclusion of already-owned product families (returning `null` when all candidates are owned).

3. **Marketing Context Resolution Service (`src/services/marketing-context.service.ts`):**
   - Implemented `resolveMarketingContext` resolving customer, order, and product data from execution payloads without redundant database queries.
   - Built `selectPrimaryOrderItem` deterministically resolving the primary item from multi-product orders (sorted by line-item total, unit price, and alphanumeric ID).

4. **Marketing Personalization Renderer (`src/services/marketing-renderer.service.ts`):**
   - Implemented `renderMarketingTemplate` replacing scalar tokens (`{{first_name}}`, `{{last_name}}`, `{{email}}`, `{{order_number}}`, `{{product_name}}`, `{{last_product}}`) and dynamic blocks (`{{product_recommendation}}`, `{{personalized_recommendation}}`).
   - Implemented `escapeHtml` preventing XSS injection while running composite HTML through `sanitizeHtml`.
   - Guaranteed clean omission of unrecommended blocks without leaving `undefined`, `null`, or empty paragraph tags.

5. **Execution & Delivery Pipeline Integration:**
   - Updated `executeSingleAutomation` in `src/services/marketing-executor.service.ts` to resolve context and render personalized body and subject lines.
   - Updated `sendCampaignPreview` and `dispatchCampaign` in `src/services/marketing-dispatcher.service.ts` to utilize marketing context and dynamic rendering.
   - Extended `PersonalizationData` and `replacePersonalizationTags` in `src/lib/sanitize-html.ts` for backward compatibility with legacy callers.

6. **Automated Verification Suite (`tests/marketing/marketing-context.test.ts`):**
   - Added 27 unit tests validating basic tokens, order context, product context, multi-item determinism, all playbook recommendation rules, already-owned exclusions, clean omission, security sanitization, and backward compatibility.

## Why

The Unwind & Doodle retention playbook requires dynamic contextual tokens (`{{order_number}}`, `{{product_name}}`, `{{last_product}}`) and intelligent cross-sell recommendation blocks (`{{product_recommendation}}`, `{{personalized_recommendation}}`). Previously, email rendering relied on a basic string replacement function in `sanitize-html.ts` limited to name and email. This change decouples template sanitization from marketing context resolution, preventing hardcoded display names and enforcing the playbook's business rule that customers must never be recommended products they already own.

## Files Touched

- `src/types/marketing-context.ts` (new)
- `src/services/marketing-recommendation.service.ts` (new)
- `src/services/marketing-context.service.ts` (new)
- `src/services/marketing-renderer.service.ts` (new)
- `src/lib/sanitize-html.ts` (modified)
- `src/services/marketing-executor.service.ts` (modified)
- `src/services/marketing-dispatcher.service.ts` (modified)
- `tests/marketing/marketing-context.test.ts` (new)

## Follow-ups / Known Issues

None

## Commit Message

feat(marketing): implement marketing context resolver and dynamic recommendation engine (Step 17A)
