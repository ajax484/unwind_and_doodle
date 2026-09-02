# Unwind & Doodle Documentation

Welcome to the **Unwind & Doodle** engineering documentation. Unwind & Doodle is an e-commerce platform specializing in mindful coloring books, customizable journals, bundles, and personalized artwork generation.

---

## 📚 Quick Navigation

- [System Architecture](file:///c:/Users/USER/work/unwind_and_doodle/docs/architecture.md) — Core subsystems, data flow, auth matrix, and payment integrations.
- [Changelog Directory](file:///c:/Users/USER/work/unwind_and_doodle/docs/changes/README.md) — Comprehensive index of all 60+ feature change logs.
- [Testing Guide](#testing-structure) — Test suite organization, Vitest configuration, and mock conventions.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Server Components, API routes, streaming SSR |
| **Frontend UI** | React 19, Tailwind CSS v4 | Responsive UI, design token theme system |
| **Typography** | `next/font/google` (`Fredoka`, `Plus Jakarta Sans`) | Zero-layout-shift self-hosted Google fonts |
| **Database & Auth** | Supabase (PostgreSQL 15+, Supabase Auth) | Multi-tenant schema, RLS, service role client |
| **Payments** | Paystack (Primary), Flutterwave (Fallback) | NGN transactions, cards, bank transfers, webhooks |
| **Email/Notifications**| Nodemailer (SMTP / transactional templates) | Order confirmations, invitations, stock alerts |
| **Validation** | Zod v3 | Schema validation for checkout, admin APIs, inputs |
| **Test Runner** | Vitest 3 | Unit, service, and API route integration testing |

---

## 🏛️ Service Layer Map

All business logic lives inside [`src/services/`](file:///c:/Users/USER/work/unwind_and_doodle/src/services):

- **Commerce & Purchasing**:
  - [`checkout.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/checkout.service.ts) — Stock verification, pricing calculation, reservation hold, order creation.
  - [`cart.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/cart.service.ts) — Guest and authenticated customer shopping cart mutations.
  - [`pricing.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/pricing.service.ts) — Add-on pricing, bundles, discounts, and delivery fee calculation.
  - [`discount.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/discount.service.ts) — Coupon evaluation, percentage/fixed discounts, usage limits.
  - [`order-state-machine.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/order-state-machine.service.ts) — Atomic order status transitions (`pending` $\rightarrow$ `paid` $\rightarrow$ `shipped` $\rightarrow$ `delivered` / `cancelled`).
  - [`manual-order.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/manual-order.service.ts) — Admin telephone/custom orders and secure customer payment links.

- **Inventory & Fulfillment**:
  - [`inventory.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/inventory.service.ts) — Multi-warehouse inventory holds, reservation expiration, release, and commit.
  - [`warehouse.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/warehouse.service.ts) — Location-based warehouse routing and delivery rate lookup.
  - [`admin-inventory.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/admin-inventory.service.ts) — Goods Received Notes (GRN), stock movements, low-stock tracking.

- **Authentication & Multi-Tenancy**:
  - [`auth.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/auth.service.ts) — Admin login, session cookies (`sb-access-token`), merchant context.
  - [`team.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/team.service.ts) — Organization member management, email invitation lifecycle.
  - [`permission.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/permission.service.ts) — Role-Based Access Control (RBAC) verification (`owner`, `admin`, `staff`).

- **Products & Themes**:
  - [`theme.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/theme.service.ts) — Cover themes, personalizations, line-art generation prompts.
  - [`admin-product.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/admin-product.service.ts) — Catalog management, SKU generation, soft archival.
  - [`bundle.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/bundle.service.ts) — Virtual bundle products, component deduction, auto-cost calculation.

- **Payments & Async Processing**:
  - [`payment/paystack.provider.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/payment/paystack.provider.ts) — Paystack standard checkout & HMAC-SHA512 webhook verification.
  - [`payment-revalidation.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/payment-revalidation.service.ts) — Background polling of abandoned/pending checkouts.
  - [`events.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/events.service.ts) — Transactional outbox pattern for domain events (`order.created`, `payment.confirmed`).
  - [`notification.service.ts`](file:///c:/Users/USER/work/unwind_and_doodle/src/services/notification.service.ts) — Transactional email dispatching via Nodemailer.

---

## 🧪 Testing Structure

The test suite is located in [`tests/`](file:///c:/Users/USER/work/unwind_and_doodle/tests) and categorized by domain:

```text
tests/
├── admin/               # Admin CRM, bundles, dashboard, products, inventory, reviews
├── auth/                # Login, authorization, RBAC, team invitations
├── commerce/            # Checkout pipeline, cart, orders, manual orders, discounts
├── customer/            # Storefront catalog, product details, personalization, account
├── services/            # Low-level service unit tests (inventory, warehouse, notification)
├── payment/             # Paystack and Flutterwave payment providers
├── integration/         # External live network tests (supabase-live.test.ts)
└── mocks/               # Shared Supabase client mock
```

### Running Tests
```bash
# Run all unit and service tests
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## 🔒 Security & Rules Reminder

1. **Frontend Supabase Isolation**: Never call Supabase directly from frontend components. Always route requests through Next.js API endpoints (`src/app/api/...`).
2. **Environment Variables**: Never hardcode API keys, secrets, or service role keys. Always reference `process.env` and keep `.env.local` out of version control.
3. **Responsive Design**: Ensure mobile viewport compatibility across all pages and test font rendering with system fallbacks.
