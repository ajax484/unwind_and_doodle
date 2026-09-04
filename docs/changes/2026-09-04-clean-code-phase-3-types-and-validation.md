# 2026-09-04 — Clean Code Phase 3: Type Safety, Zod Validation & Cart Model Deduplication

## What Changed
1. **Cart Model Deduplication & Architectural Clean Boundaries (`src/types/cart.ts` & `src/services/cart.service.ts`)**:
   - Consolidated authoritative definitions for `CartItemDetail`, `CartResponse`, `CartAddonInput`, `CartCustomizationInput`, `CartThemeCustomizationInput`, and `AddToCartInput` in `src/types/cart.ts`.
   - Re-exported these interfaces from `src/services/cart.service.ts` for full backward compatibility.
   - Refactored frontend client components (`CartContext.tsx`, `CartDrawer.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`) to import types directly from `@/types/cart`, preventing client components from importing backend service modules.

2. **In-App Notification Type Safety & Elimination of `any` (`src/services/in-app-notification.service.ts`)**:
   - Strongly typed `notifications` table schema with `Database['public']['Tables']['notifications']` in `src/lib/supabase/types.ts` (ensuring a single authoritative table definition).
   - Defined `NotificationRow`, `NotificationInsert`, and `NotificationUpdate` in `src/types/notification.ts`.
   - Removed all 6 instances of `(supabase as any)` and `row: any` in `src/services/in-app-notification.service.ts`, replacing them with native typed table queries and strongly-typed mapper functions.
   - Added `notifications` property to `createMockSupabaseClient` initial data type in `tests/mocks/supabase.mock.ts`.

3. **Zod Validation on Invitation Acceptance (`src/app/api/invitations/[token]/accept/route.ts`)**:
   - Created `AcceptInvitationBodySchema` and `AcceptInvitationBodyInput` in `src/types/admin-team.ts` validating password length (min 6 characters) and optional full name.
   - Replaced untyped `let body: any = null` with `AcceptInvitationBodySchema.safeParse(rawJson)` in the route handler.
   - Added automated test in `tests/auth/teams-and-permissions.test.ts`.

## Why
- Remove architectural layer leaks where client components imported from database-bound service files.
- Ensure strict TypeScript compile-time safety and eliminate untyped `any` query chains in the notification service.
- Prevent unvalidated and malformed JSON payloads from reaching backend auth and user creation logic during team invitation acceptance.

## Files Touched
- `src/types/cart.ts` (MODIFIED)
- `src/services/cart.service.ts` (MODIFIED)
- `src/context/CartContext.tsx` (MODIFIED)
- `src/components/CartDrawer.tsx` (MODIFIED)
- `src/app/cart/page.tsx` (MODIFIED)
- `src/app/checkout/page.tsx` (MODIFIED)
- `src/types/notification.ts` (MODIFIED)
- `src/lib/supabase/types.ts` (MODIFIED)
- `src/services/in-app-notification.service.ts` (MODIFIED)
- `src/types/admin-team.ts` (MODIFIED)
- `src/app/api/invitations/[token]/accept/route.ts` (MODIFIED)
- `tests/mocks/supabase.mock.ts` (MODIFIED)
- `tests/auth/teams-and-permissions.test.ts` (MODIFIED)
- `docs/changes/2026-09-04-clean-code-phase-3-types-and-validation.md` (NEW)
- `docs/changes/README.md` (MODIFIED)

## Follow-ups / Known Issues
- Pre-existing flagged failure: `tests/api-routes.test.ts` (`GET /api/products/[slug]`) expects `test-coloring-book` which is absent in the live/mock test environment. Kept untouched outside scope.

## Commit Message
```text
refactor(clean-code): enforce type safety, consolidate cart types, and add zod invitation validation

- Relocate and consolidate CartItemDetail and CartResponse in types/cart.ts
- Update client components to import cart types from @/types/cart instead of cart.service.ts
- Add notifications table to Database['public']['Tables'] in types.ts and eliminate (supabase as any)
- Add AcceptInvitationBodySchema and integrate safeParse into invitation accept route
```
