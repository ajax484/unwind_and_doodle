# Admin Notifications & Real-Time Alerts

## What Changed
- Extended `EmailNotificationPayload['template']` and exported `EmailNotificationTemplate` in `src/types/notification.ts` with `admin_new_order`, `admin_order_cancelled`, and `admin_low_stock`.
- Updated `src/lib/config.ts` to add `adminEmails: string[]` to `AppConfig`, parsed from `ADMIN_NOTIFICATION_EMAILS` or `ADMIN_EMAILS` environment variables.
- Implemented `getAdminNotificationRecipients()` in `src/services/notification.service.ts` to dynamically resolve designated admin email addresses with fallback to organization owners/admins in `organization_members`.
- Created email and plain-text templates for `admin_new_order`, `admin_order_cancelled`, and `admin_low_stock` in `renderEmailTemplate()`.
- Enhanced `getTransporter()` to use test-safe `jsonTransport` during unit/Vitest runs to isolate tests from live external SMTP networks.
- Wired domain event handlers in `src/services/notification.service.ts`:
  - `order.pending`: dispatches transactional `admin_new_order` emails to designated admin recipients alongside customer confirmations and in-app bell notifications.
  - `order.cancelled`: creates admin in-app warning notification and dispatches `admin_order_cancelled` email.
  - `order.refunded`: creates admin in-app notification.
  - `order.created` (manual orders): creates admin in-app notification with total draft amount.
  - `inventory.low_stock`: creates admin in-app warning/error alert and dispatches `admin_low_stock` email with stock count and safety threshold.
- Added `checkAndEmitLowStockAlert()` to `src/services/inventory.service.ts` and integrated threshold evaluation into `commitReservation` and `adjustInventory` (in `src/services/admin-inventory.service.ts`) whenever stock drops to or below 5 units or hits 0.
- Added unit test suite in `tests/services/admin-notification.test.ts` covering template rendering, recipient resolution, domain event listeners, and threshold triggers.

## Why
Store administrators needed immediate visibility into critical business operations:
1. Instant alerting when new orders arrive (both in the in-app notification bell and via email to the store operations team).
2. Proactive alerting when product inventory drops to or below safety thresholds (5 units) or reaches zero, enabling rapid restocking before stockouts impact sales.
3. Rapid notification on order cancellations, refunds, and manual draft order creations.

## Files Touched
- `src/types/notification.ts`
- `src/lib/config.ts`
- `src/services/notification.service.ts`
- `src/services/inventory.service.ts`
- `src/services/admin-inventory.service.ts`
- `tests/services/admin-notification.test.ts`
- `docs/changes/notifications/2026-09-13-admin-notifications-and-alerts.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues
None

## Commit Message
feat(notifications): implement admin inventory alerts and transactional email notifications
