# Change Document: Phase 6E — Admin Customer Management & CRM

**Date:** 2026-08-30  
**Feature:** Phase 6E — Admin Customer Management & CRM  
**Status:** Completed & Verified  

---

## 1. What Changed

1. **Admin Customer Types & Zod Schemas**:
   - Created `src/types/admin-customer.ts` defining `AdminCustomerFilterSchema`, `UpdateCustomerProfileSchema`, `UpdateCustomerConsentSchema`, `CreateCustomerNoteSchema`, and TypeScript interfaces for customer list items, summary KPIs, profile details, saved addresses, order summaries, internal CRM notes, and activity timeline items.

2. **Customer CRM Service Layer**:
   - Implemented `src/services/admin-customer.service.ts`:
     - `listAdminCustomers`: Server-side filtering by account type (`registered`, `guest`), marketing consent (`email_subscribed`, `whatsapp_subscribed`), and order activity (`has_ordered`, `never_ordered`); searching across name, email, phone, and WhatsApp; server-side pagination; and accurate financial calculations (calculating lifetime value $$\text{LTV} = \sum \text{completed non-refunded orders}$$ excluding unpaid/cancelled/refunded orders).
     - `getAdminCustomerDetail`: Aggregates customer profile, calculated metrics (Total Orders, Completed Orders, LTV, AOV, Last Order Date), complete order history with links to `/admin/orders/[orderId]`, saved shipping addresses from `customer_addresses`, active/abandoned cart indicators from `carts`, internal CRM notes, and activity timeline.
     - `updateAdminCustomerProfile`: Safely edits first name, last name, phone, and WhatsApp numbers with server-side validation and audit logging (`customer.updated`). Email and auth user ID are protected.
     - `updateAdminCustomerConsent`: Explicitly updates email or WhatsApp marketing consent, logs audit trail (`customer.consent_updated`), and publishes domain event (`customer.consent_changed`).
     - `createCustomerNote` & `deleteCustomerNote`: Manages internal administrative notes (`customer_notes`) with organization scoping and audit logs.
     - `exportAdminCustomersCsv`: Generates a sanitized CSV string of customers for the current organization without secrets or tokens, and logs `customer.exported` in `audit_logs`.

3. **RESTful Admin API Endpoints**:
   - `GET /api/admin/customers`: List customers with search, filters, pagination, and KPI summary.
   - `GET /api/admin/customers/[id]`: Customer detail profile, orders, addresses, notes, and activity.
   - `PATCH /api/admin/customers/[id]`: Updates contact profile fields.
   - `POST /api/admin/customers/[id]/consent`: Explicit marketing consent update with audit logging.
   - `POST /api/admin/customers/[id]/notes`: Adds an internal CRM note.
   - `DELETE /api/admin/customers/[id]/notes/[noteId]`: Removes an internal CRM note.
   - `GET /api/admin/customers/export`: Downloads sanitized CSV export.

4. **Responsive Admin UI Pages**:
   - `src/app/admin/customers/page.tsx`: Customer management dashboard with 5 top summary KPI cards, search bar, dropdown filters, desktop table, mobile cards, pagination controls, and CSV export action.
   - `src/app/admin/customers/[customerId]/page.tsx`: Customer profile page with financial KPI cards, contact profile editor, marketing consent toggles with audit confirmation, order history table, saved addresses cards, internal CRM notes feed, and activity timeline.

5. **Automated Testing Suite**:
   - Created `tests/admin-customers-and-crm.test.ts` with 11 unit and integration tests covering customer search, multi-filters, LTV calculations excluding unpaid orders, profile updates, explicit consent management, internal CRM notes, CSV export sanitization, and multi-tenant security barriers.
   - **All 21 test files (208 tests) passed with 0 failures**.

---

## 2. Why the Changes Were Made

Store administrators require a privacy-conscious, operational CRM module to monitor customer accounts, evaluate purchasing patterns, verify marketing consent statuses, manage contact information, take internal support notes, and export sanitized customer data for future marketing automation.

---

## 3. Files Touched

- `src/types/admin-customer.ts`
- `src/services/admin-customer.service.ts`
- `src/app/api/admin/customers/route.ts`
- `src/app/api/admin/customers/[id]/route.ts`
- `src/app/api/admin/customers/[id]/consent/route.ts`
- `src/app/api/admin/customers/[id]/notes/route.ts`
- `src/app/api/admin/customers/[id]/notes/[noteId]/route.ts`
- `src/app/api/admin/customers/export/route.ts`
- `src/app/admin/customers/page.tsx`
- `src/app/admin/customers/[customerId]/page.tsx`
- `tests/mocks/supabase.mock.ts`
- `tests/admin-customers-and-crm.test.ts`

---

## 4. Follow-ups & Known Issues

- None. Customer merging and marketing campaign automation are deferred to the dedicated marketing and communications phases.

---

## 5. Commit Message

```text
feat: implement admin customer management and CRM (Phase 6E)

- Add customer CRM service with LTV aggregation, multi-filters, consent tracking, and notes
- Implement REST API routes for customer listing, profile editing, consent updates, notes, and CSV export
- Build responsive admin customer table and profile pages with order history and activity timeline
- Add 11 integration tests covering search, LTV calculation, audit logging, and multi-tenant isolation
```
