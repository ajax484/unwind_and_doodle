# 2026-09-21: 2-Tier Cascading Delivery Location Picker Across Storefront and Admin

## What Changed
- Created a canonical, responsive 2-tier cascading location selector [`DeliveryLocationPicker.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/DeliveryLocationPicker.tsx) with companion Storybook documentation [`DeliveryLocationPicker.stories.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/DeliveryLocationPicker.stories.tsx).
- Integrated [`DeliveryLocationPicker`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/DeliveryLocationPicker.tsx) into the Storefront Checkout page ([`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)), providing automatic state-grouped filtering, smart default initialization to primary hubs, real-time fee calculation, and an informative dispatch context summary pill.
- Integrated [`DeliveryLocationPicker`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/DeliveryLocationPicker.tsx) into the Customer Payment Link page ([`src/app/pay/[token]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/pay/%5Btoken%5D/page.tsx)), allowing customers paying for social/manual orders to select their delivery state and area with instant dynamic delivery fee recalculation.
- Integrated [`DeliveryLocationPicker`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/DeliveryLocationPicker.tsx) into the Admin Manual Order entry form ([`src/components/admin/manual-order/ManualOrderForm.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/admin/manual-order/ManualOrderForm.tsx)) with a "Leave blank" option for payment-link orders, plus a validation safeguard requiring either a location or an explicit "Free Shipping / Self-Pickup (₦0)" toggle when marked as "Already Paid".

## Why
- Previous delivery location selection relied on flat `<select>` dropdowns that became increasingly cumbersome and unscalable as regional hubs expanded across Nigerian states and LGAs.
- Customers and administrators needed a streamlined, responsive 2-step selector (State $\rightarrow$ Hub) with live delivery pricing and delivery speed visibility.
- Manual offline orders previously lacked an explicit check preventing accidental ₦0 shipping fee omissions when marked as "Already Paid".

## Files Touched
- [`src/components/DeliveryLocationPicker.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/DeliveryLocationPicker.tsx)
- [`src/components/DeliveryLocationPicker.stories.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/DeliveryLocationPicker.stories.tsx)
- [`src/app/checkout/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/checkout/page.tsx)
- [`src/app/pay/[token]/page.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/app/pay/%5Btoken%5D/page.tsx)
- [`src/components/admin/manual-order/ManualOrderForm.tsx`](file:///c:/Users/USER/work/unwind_and_doodle/src/components/admin/manual-order/ManualOrderForm.tsx)
- [`docs/changes/commerce/2026-09-21-cascading-delivery-location-picker.md`](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/commerce/2026-09-21-cascading-delivery-location-picker.md)
- [`docs/changes/README.md`](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md)

## Follow-ups / Known Issues
None

## Commit Message
feat(delivery): implement 2-tier cascading delivery location picker across storefront and admin
