# Step 2A: Marketing Automation Foundation

Introduced the event-driven marketing automation foundation for the Unwind & Doodle marketing add-on, connecting the `marketing_automations` schema with the existing `domain_events` outbox system, typed server-side validation, full CRUD API routes, and a responsive marketing admin interface.

---

## What Changed

1. **Typed Configuration Schema (`src/types/marketing.ts`)**:
   - Defined `MarketingAutomationTrigger`, `MarketingAutomationDelay`, `MarketingAutomationAction`, and `MarketingAutomationConfig` interfaces.
   - Defined `AutomationTriggerEventType` mapping to real domain events (`order.paid`, `order.created`, `checkout.abandoned`, `customer.created`, `customer.inactive`).
   - Defined `AutomationTypeMetadata` and refined input interfaces for automation management.

2. **Server-Side Validation & Service Layer (`src/services/marketing-automation.service.ts`)**:
   - Implemented `validateAutomationConfig()` validating trigger compatibility against automation types, enforcing positive delay constraints (up to 90 days), and verifying that referenced email campaigns exist, belong to the same organization, and contain valid subject and sender credentials.
   - Implemented `matchesAutomationTrigger()` for event-driven trigger matching against incoming `domain_events`, checking organization scoping, active operational status, event type compatibility, and mandatory payload context.
   - Enhanced `createAutomation`, `updateAutomation`, and `updateAutomationStatus` with organization scoping and conditional config validation upon activation.
   - Added `getAutomationTypeMetadata()` and `getAutomationTriggerTypes()` helpers.

3. **Admin API Routes**:
   - `src/app/api/admin/marketing/automations/route.ts`: List automations with pagination and type/status filters; create automations with server-side validation.
   - `src/app/api/admin/marketing/automations/[id]/route.ts`: Retrieve, update, and delete individual automations scoped to the admin's organization.
   - `src/app/api/admin/marketing/automations/[id]/status/route.ts`: Quick operational status toggle (`draft`, `active`, `paused`) with activation pre-flight validation.

4. **Marketing Admin UI & Navigation**:
   - `src/components/admin/marketing/AutomationForm.tsx`: Reusable, responsive configuration builder with real-time sequence preview card (`Trigger ➔ Delay ➔ Action`), dynamic compatible event selectors, and campaign picker.
   - `src/app/admin/marketing/automations/page.tsx`: Automations list view with search, type and status filters, status toggles, responsive desktop table, and mobile card layout.
   - `src/app/admin/marketing/automations/new/page.tsx`: New automation creation page.
   - `src/app/admin/marketing/automations/[id]/page.tsx`: Automation detail and editing page with deletion support.
   - `src/app/admin/AdminLayoutClient.tsx`: Added "Automations" link to the "Marketing & Growth" section in the admin sidebar.

5. **Automated Test Suite (`tests/marketing/marketing-automation.test.ts`)**:
   - 24 automated unit and integration tests covering configuration validation, trigger matching rules, organization scoping, data access, and API route endpoints.

---

## Why

To prepare Unwind & Doodle for event-driven marketing without executing emails prematurely or introducing duplicate marketing event stores. By integrating directly with the existing `domain_events` system, commercial events (orders, checkouts, and customer signups) cleanly map to marketing automations that can be scheduled and dispatched in Step 2B.

---

## Files Touched

- `src/types/marketing.ts`
- `src/services/marketing-automation.service.ts`
- `src/app/api/admin/marketing/automations/route.ts`
- `src/app/api/admin/marketing/automations/[id]/route.ts`
- `src/app/api/admin/marketing/automations/[id]/status/route.ts`
- `src/components/admin/marketing/AutomationForm.tsx`
- `src/app/admin/marketing/automations/page.tsx`
- `src/app/admin/marketing/automations/new/page.tsx`
- `src/app/admin/marketing/automations/[id]/page.tsx`
- `src/app/admin/AdminLayoutClient.tsx`
- `tests/marketing/marketing-automation.test.ts`
- `docs/changes/admin/2026-09-16-marketing-automation-foundation.md`
- `docs/changes/README.md`

---

## Follow-ups / Known Issues

- **None** for Step 2A.
- Step 2B will implement the background automation execution worker, idempotency tracking, and email dispatch integration.

---

## Commit Message

```text
feat(marketing): implement Step 2A marketing automation foundation

- add typed automation configuration and trigger mapping to domain_events
- add server-side configuration validation and trigger matching helpers
- implement organization-scoped admin API routes for automations
- create responsive marketing automations admin UI (list, create, edit/detail)
- integrate automations into admin sidebar navigation
- add comprehensive test suite covering validation, trigger matching, and APIs
```
