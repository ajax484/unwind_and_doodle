# Payment Settings & Multi-Provider Method Configuration (Step 2)

Allows merchant organizations to configure which payment methods are enabled at checkout (`paystack`, `flutterwave`, `manual` / Bank Transfer), configure bank account transfer details with progressive disclosure, and expose active methods to checkout without modifying historical payment records.

## What Changed

1. **Database Migration (`supabase/migrations/20260920190000_organization_payment_methods.sql`)**:
   - Created `organization_payment_methods` table with `id`, `organization_id`, `provider`, `enabled`, `display_title`, `display_description`, `bank_name`, `account_name`, `account_number`, `instructions`, and timestamps.
   - Enforced provider constraint (`paystack`, `flutterwave`, `manual`), unique constraint `(organization_id, provider)`, and RLS policies restricting write access to organization owners/admins.
   - Backfilled default configuration for all existing organizations (Paystack enabled, Flutterwave and Bank Transfer disabled).

2. **Types & Validation (`src/types/payment-settings.ts`)**:
   - Defined `BankTransferConfig`, `OrganizationPaymentMethod`, `PublicPaymentMethod`, and `UpdatePaymentMethodInput`.
   - Added Zod schemas `bankTransferConfigSchema` and `updatePaymentMethodSchema`.

3. **Payment Settings Service (`src/services/payment-settings.service.ts`)**:
   - Added `getPaymentMethods(supabase, orgId)`: fetches all configured payment methods with safe fallbacks.
   - Added `getEnabledPaymentMethods(supabase, orgId)`: returns list of enabled `PaymentProviderName`s.
   - Added `getPublicPaymentMethods(supabase, orgId)`: returns safe checkout-facing payment methods.
   - Added `getBankTransferSettings(supabase, orgId)`: returns bank name, account name, and account number for manual transfer.
   - Added `updatePaymentMethod(supabase, orgId, input, actorId)`: validates that at least one payment method remains enabled and enforces bank details before enabling bank transfer.

4. **API Routes**:
   - `src/app/api/admin/settings/payment-methods/route.ts`: Authenticated admin GET/PUT endpoint for updating organization payment methods.
   - `src/app/api/payment-methods/route.ts`: Public/checkout GET endpoint for retrieving enabled payment methods and transfer details.

5. **Admin UI & Navigation**:
   - `src/app/admin/settings/payments/page.tsx`: Interactive payment settings interface with individual toggles for Paystack, Flutterwave, and Bank Transfer, plus progressive disclosure form for bank account configuration.
   - `src/app/admin/settings/page.tsx`: Store settings hub overview page linking to Payment Methods, Delivery, Locations, Warehouses, and Team settings.
   - `src/app/admin/AdminLayoutClient.tsx`: Added "Payment Methods" link to admin navigation settings list.

6. **Testing & Integrity**:
   - Added comprehensive tests in `tests/payment/payment-settings.test.ts` covering safe defaults, multiple enabled methods, prevention of disabling all methods, bank details validation, historical payment immutability, and admin API RBAC.

## Why

Merchants need autonomy to decide which payment gateways to offer their customers. Bank transfer configuration must belong strictly to the store/organization and not an individual order, while preserving complete immutability for all historical payment records.

## Files Touched

- `supabase/migrations/20260920190000_organization_payment_methods.sql`
- `src/types/payment-settings.ts`
- `src/services/payment-settings.service.ts`
- `src/app/api/admin/settings/payment-methods/route.ts`
- `src/app/api/payment-methods/route.ts`
- `src/app/admin/settings/payments/page.tsx`
- `src/app/admin/settings/page.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/payment/payment-settings.test.ts`
- `docs/changes/payments/2026-09-20-payment-settings-configuration.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None (Ready for Step 3: Customer Checkout payment-method selection and routing to provider resolver).

## Commit Message

feat(payments): implement merchant payment settings and multi-provider configuration
