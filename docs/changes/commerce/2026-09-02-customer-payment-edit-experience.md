# Customer Payment Page & Secure Edit Flow

## Summary of Changes
Implemented editable customer contact details and delivery location selection on the customer payment link page (`/pay/[token]`), backed by server-authoritative delivery fee recalculation and payment synchronization:

1. **Payment Page UI**:
   - Added editable input fields in `src/app/pay/[token]/page.tsx` for First Name, Last Name, and Phone number.
   - Added structured Delivery Location dropdown populated from `/api/locations`.
   - Included a "Save changes" action with loading indicator that submits updates to `PATCH /api/pay/[token]`.
   - Displayed real-time success toasts and delivery fee adjustment notifications (e.g. `Delivery fee updated: ₦1,500 → ₦3,500`).
   - Dynamically synchronized the "Pay ₦XX" CTA button with the updated total.
   - Disabled input fields when an order is no longer in editable status (paid, expired, or cancelled).

2. **Types & Service Data**:
   - Added `firstName`, `lastName`, and `locationId` properties to `PaymentRequestDetail['customer']` in `src/types/manual-order.ts` and `src/services/manual-order.service.ts` to support smooth pre-population.

3. **Testing**:
   - Created test suite `tests/customer-payment-edit.test.ts` verifying name/phone/location updates, delivery fee recalculation, payment request amount synchronization, invalid token rejection, non-editable order locking, and immutability of prices/discounts.

## Why Changes Were Made
- Allow customers paying via payment link to update their contact details and choose their exact delivery location without requiring admin intervention.
- Ensure all delivery fee recalculations and payment request amounts are synchronized server-authoritatively before checkout.
- Protect against price or line-item tampering by strictly enforcing authorization boundaries via payment link tokens.

## Files Touched
- [page.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/pay/[token]/page.tsx)
- [manual-order.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/manual-order.ts)
- [manual-order.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/manual-order.service.ts)
- [customer-payment-edit.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/customer-payment-edit.test.ts)

## Follow-ups / Known Issues
None.

## Suggested Commit Message
`feat(pay): implement editable customer details, delivery location selection, fee recalculation, and payment sync`
