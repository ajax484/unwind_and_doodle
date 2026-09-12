# 2026-09-12 Admin Manual Order Creation Without Customer Email & Payment Link Email Update

## What Changed
- **Schema & Validation**: Updated `ManualOrderCustomerSchema` in `src/types/manual-order.ts` to make `email` optional when a customer `phone` or `whatsappNumber` is provided. Added `email` to `UpdateCustomerOrderSchema` to allow customers to provide or update their email on payment links.
- **Service & Synthetic Email Generation**: Added `resolveManualOrderCustomerEmail` in `src/services/manual-order.service.ts` to generate deterministic sub-addressed placeholder emails (`{admin_user}+{clean_phone}@{admin_domain}`) when customer email is omitted. Updated `createAdminManualOrder` to use the resolved email for customer resolution, RPC execution, and domain event dispatch.
- **Customer Payment Page (`/pay/[token]`)**: Added an editable email input to the customer information section, allowing customers to view or replace the placeholder with their personal email for payment receipts. Updated `updateCustomerOrderDetails` to update `orders.email` and sync the customer's record in the `customers` table.
- **Admin Form UI**: Updated `ManualOrderForm.tsx` to allow form submission without customer email if a phone number is provided, with explanatory helper text.
- **Test Coverage**: Added automated tests verifying phone-based manual order creation and customer payment link email updating.

## Why
- Admin staff frequently receive direct orders through offline channels (phone calls, Instagram DMs, WhatsApp, or in-person walk-ins) where the customer does not have or provide an email address.
- Using a sub-addressed alias ensures compatibility with existing database constraints and Paystack payment gateway requirements, while preventing multiple customers from colliding into a single profile.
- Giving customers the ability to provide their real email when accessing their payment link ensures they receive Paystack payment receipts directly.

## Files Touched
- `src/types/manual-order.ts` [MODIFY]
- `src/services/manual-order.service.ts` [MODIFY]
- `src/app/api/admin/orders/manual/route.ts` [MODIFY]
- `src/components/admin/manual-order/ManualOrderForm.tsx` [MODIFY]
- `src/app/pay/[token]/page.tsx` [MODIFY]
- `tests/commerce/manual-orders.test.ts` [MODIFY]
- `docs/changes/admin/2026-09-12-admin-manual-order-without-email.md` [NEW]
- `docs/changes/README.md` [MODIFY]

## Follow-ups / Known Issues
- None

## Commit Message
```text
feat(admin): support manual orders without customer email and allow email update on payment links

- Relax ManualOrderCustomerSchema to allow empty customer email when phone is provided
- Generate sub-addressed alias ({admin_user}+{phone}@{admin_domain}) for payment gateway and DB compatibility
- Enable customer to provide or update their personal email on /pay/[token] payment page
- Sync order and customer record emails on customer payment link updates
- Add automated tests covering email-less manual orders and payment link email updates
```
