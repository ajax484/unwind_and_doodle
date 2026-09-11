# Option 2: Persistent In-App Notification Center & Domain Event Feed

## What Changed
1. **Database Migration ([supabase/migrations/20260903000000_in_app_notifications.sql](file:///c:/Users/USER/work/unwind_and_doodle/supabase/migrations/20260903000000_in_app_notifications.sql))**:
   - Created multi-tenant `notifications` table storing `organization_id`, `recipient_type` (`'customer'`, `'admin'`, `'broadcast'`), `recipient_id`, `title`, `message`, `type`, `category`, `link`, `metadata`, `read_at`, and timestamp columns.
   - Added indexes on `(organization_id, recipient_type, recipient_id, read_at)` and `(organization_id, created_at DESC)` for efficient retrieval and unread counters.
   - Configured Row Level Security (RLS) policies for administrators and organization staff.

2. **TypeScript Domain Types ([src/types/notification.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/notification.ts))**:
   - Defined interfaces for `InAppNotification`, `NotificationRecipientType`, `NotificationType`, `NotificationCategory`, `CreateInAppNotificationInput`, and `NotificationListResponse`.

3. **In-App Notification Service ([src/services/in-app-notification.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/in-app-notification.service.ts))**:
   - Implemented `createInAppNotification`: inserts notification records with proper tenant and recipient boundaries.
   - Implemented `getInAppNotifications`: fetches notifications for customer or admin callers with pagination and accurate unread counts.
   - Implemented `markInAppNotificationRead`: marks a single notification as read (`read_at = now()`).
   - Implemented `markAllInAppNotificationsRead`: batch-marks all pending notifications as read for a recipient.

4. **Domain Event Handlers ([src/services/notification.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/notification.service.ts))**:
   - Extended existing domain event subscribers (`order.pending`, `order.shipped`, `stock_notification.eligible`) to automatically record in-app notifications in parallel with transactional emails.
   - Added `setServiceSupabaseClient` to [`src/lib/supabase/client.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/supabase/client.ts) for clean dependency injection in test environments.

5. **Server-Side API Routes (Strict No-Supabase-on-Frontend)**:
   - **`GET /api/notifications`** ([src/app/api/notifications/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/notifications/route.ts)): Resolves caller via `getAuthenticatedUserContext(req)` and fetches scoped notifications.
   - **`PATCH /api/notifications/[id]/read`** ([src/app/api/notifications/[id]/read/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/notifications/[id]/read/route.ts)): Marks an individual notification read.
   - **`POST /api/notifications/read-all`** ([src/app/api/notifications/read-all/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/notifications/read-all/route.ts)): Batch-marks all user notifications read.

6. **Interactive UI Component ([src/components/NotificationBell.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/NotificationBell.tsx))**:
   - Created a responsive notification bell button with an animated unread badge.
   - Built a floating popover drawer with:
     - Header displaying unread badge count and "Mark all read" button.
     - Filter tabs for "All" and "Unread".
     - Cards showing category icons (`📦`, `🎨`, `⭐`, `📋`, `🔔`), title, body, relative time, and unread indicator dot.
     - Deep-link support: clicking a notification marks it read and navigates to the associated route.
     - Empty state with friendly copy when all caught up.
     - Outside click and Escape key listeners.
   - Mounted in customer header ([src/components/Navbar.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/Navbar.tsx)) when authenticated.
   - Mounted in admin top bar ([src/app/admin/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/layout.tsx)) for store staff and managers.

7. **Test Suite ([tests/services/in-app-notification.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/services/in-app-notification.test.ts))**:
   - Unit and integration tests covering CRUD operations, unread count calculations, filtering, and domain event triggering.

## Why
- Provides a persistent in-app notification center for customers (order status, shipping, restock alerts) and administrators (new orders, stock alerts), seamlessly connected to the platform's domain event outbox.

## Files Touched
- [supabase/migrations/20260903000000_in_app_notifications.sql](file:///c:/Users/USER/work/unwind_and_doodle/supabase/migrations/20260903000000_in_app_notifications.sql) (New)
- [src/types/notification.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/types/notification.ts) (New)
- [src/services/in-app-notification.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/in-app-notification.service.ts) (New)
- [src/services/notification.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/notification.service.ts)
- [src/lib/supabase/client.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/lib/supabase/client.ts)
- [src/app/api/notifications/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/notifications/route.ts) (New)
- [src/app/api/notifications/[id]/read/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/notifications/[id]/read/route.ts) (New)
- [src/app/api/notifications/read-all/route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/notifications/read-all/route.ts) (New)
- [src/components/NotificationBell.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/NotificationBell.tsx) (New)
- [src/components/Navbar.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/components/Navbar.tsx)
- [src/app/admin/layout.tsx](file:///c:/Users/USER/work/unwind_and_doodle/src/app/admin/layout.tsx)
- [tests/mocks/supabase.mock.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/mocks/supabase.mock.ts)
- [tests/services/in-app-notification.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/services/in-app-notification.test.ts) (New)
- [docs/changes/2026-09-03-persistent-in-app-notification-center.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/2026-09-03-persistent-in-app-notification-center.md) (New)
- [docs/changes/README.md](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md)

## Follow-ups / Known Issues
- If desired in the future, Supabase Realtime or Server-Sent Events (SSE) can be attached to push live toasts directly when in-app notifications are inserted.

## Suggested Commit Message
```text
feat(notifications): implement persistent in-app notification center and event feed

- Add in_app_notifications SQL migration with tenant isolation and indexes
- Implement in-app notification service and domain event handlers for orders & stock
- Add secure API routes for notifications (/api/notifications, /read, /read-all)
- Create responsive NotificationBell component with popover drawer for customers and admins
- Mount NotificationBell in Navbar and AdminLayout
- Add comprehensive test coverage in in-app-notification.test.ts
```
