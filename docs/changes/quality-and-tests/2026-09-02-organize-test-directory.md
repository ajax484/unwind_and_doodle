# Organize Tests Folder into Domain Subdirectories

## What Changed
1. **Domain-Driven Subdirectory Organization**:
   - Reorganized 31 test files sitting in `tests/` into 7 domain subdirectories:
     - `tests/admin/`: Admin analytics, bundles, CRM, dashboard, inventory, products, and reviews.
     - `tests/auth/`: Admin authentication, authorization, redesign matrix, security headers, and team permissions.
     - `tests/commerce/`: Cart, checkout, customer payment editing, discounts, manual orders, order state machine, and transaction pipeline.
     - `tests/customer/`: Product catalog, cover personalization/coloring books, customer accounts, and product details.
     - `tests/services/`: Low-level service unit tests (inventory, notifications, payment revalidation, warehouse resolution).
     - `tests/payment/`: Payment providers (Paystack, Flutterwave).
     - `tests/integration/`: External live network tests (`supabase-live.test.ts`).

2. **Path Alias Configuration**:
   - Added `"@tests/*": ["./tests/*"]` to `compilerOptions.paths` in [tsconfig.json](file:///c:/Users/USER/work/unwind_and_doodle/tsconfig.json).
   - Added `@tests` path alias resolving to `./tests` in [vitest.config.ts](file:///c:/Users/USER/work/unwind_and_doodle/vitest.config.ts).
   - Updated mock imports across all relocated test files to reference `@tests/mocks/supabase.mock`.

## Why
- **Clean Architecture & Maintainability**: Grouping test files by feature domain simplifies navigation as the codebase grows.
- **Isolated Integration Testing**: Placing `supabase-live.test.ts` in `tests/integration/` prevents live network dependencies from breaking offline unit test runs.

## Files Touched
- [tsconfig.json](file:///c:/Users/USER/work/unwind_and_doodle/tsconfig.json)
- [vitest.config.ts](file:///c:/Users/USER/work/unwind_and_doodle/vitest.config.ts)
- Relocated 31 test files under `tests/` into `tests/{admin,auth,commerce,customer,services,payment,integration}/`
- [docs/changes/2026-09-02-organize-test-directory.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-02-organize-test-directory.md)

## Suggested Commit Message
```text
refactor(tests): organize test files into domain-driven subdirectories

- Restructure tests/ into admin, auth, commerce, customer, services, payment, and integration
- Add @tests path alias in tsconfig.json and vitest.config.ts
- Update shared mock import paths across test suites
```
