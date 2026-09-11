# Admin Manual Order UI & Real-Time Preview API

## Summary of Changes
Implemented the admin user interface and preview API for manual order creation:
1. **Preview API Endpoint**: Created `POST /api/admin/orders/manual/preview` in `src/app/api/admin/orders/manual/preview/route.ts` which consumes `previewManualOrderPricing` to return server-authoritative breakdown (subtotal, discountTotal, deliveryFee, total).
2. **Stock-Aware Multi-Product Picker**: Built `MultiProductPickerModal.tsx` supporting search filtering, multi-product draft selections, quantity inputs capped by physical stock or max buildable bundle stock, and an "Add selected" batch action without auto-closing on single item selection.
3. **Admin Order Editor Form**: Refactored `ManualOrderForm.tsx` to:
   - Feature an order items table with line item subtotals.
   - Include a discount radio selector ("No Discount", "Discount Code", "Manual Discount" with Percentage/Fixed Amount options) that automatically clears inactive inputs on mode switch.
   - Integrate delivery location selection with automatic canonical delivery fee resolution.
   - Implement debounced (300ms) real-time server preview calls with loading indicators and inline error handling.
   - Submit complete order payload to the backend RPC.
4. **Testing**: Created automated test suite in `tests/manual-order-ui.test.ts` covering preview calculations, location changes, discount mode switching, and error rejections.

## Why Changes Were Made
- Provide a modern, wow-factor admin experience for creating manual orders with real-time server feedback.
- Guarantee that all discounts, delivery fees, and order totals are calculated server-authoritatively without trusting client-side math.
- Streamline multi-item and bundle order entry for admins over DM/phone channels.

## Files Touched
- [route.ts (preview)](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/admin/orders/manual/preview/route.ts)
- [MultiProductPickerModal.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/admin/MultiProductPickerModal.tsx)
- [ManualOrderForm.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/admin/manual-order/ManualOrderForm.tsx)
- [manual-order-ui.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/manual-order-ui.test.ts)

## Follow-ups / Known Issues
None.

## Suggested Commit Message
`feat(admin-orders): implement stock-aware multi-product picker, discount controls, and real-time preview API`
