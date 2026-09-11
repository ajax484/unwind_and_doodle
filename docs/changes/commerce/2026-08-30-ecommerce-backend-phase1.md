# E-Commerce Backend — Phase 1: Foundation, Checkout, Inventory & Paystack

## What Changed
Implemented the backend foundation for the e-commerce store selling physical stationery and coloring products:
1. **Supabase Database Types & Service Client**: Type-safe definitions for all 35+ tables and Postgres reservation RPCs.
2. **Single-Warehouse Inventory Resolution (`warehouse.service.ts`)**: Resolves active warehouses serving customer delivery locations and verifies complete stock availability across main items and add-ons without order splitting.
3. **Database-Authoritative Pricing Service (`pricing.service.ts`)**: Computes subtotal, add-on pricing (with override support), discounts (percentage and fixed amount with constraints), delivery fees, and total.
4. **Customer & Address Resolution (`customer.service.ts`)**: Resolves guest or authenticated customers and stores shipping addresses in `customer_addresses`.
5. **PostgreSQL Inventory Reservation Wrapper (`inventory.service.ts`)**: Invokes database functions `reserve_inventory`, `commit_inventory_reservation`, `release_inventory_reservation`, and `expire_inventory_reservations` with automatic batch rollback on failure.
6. **Atomic Checkout Service & Endpoint (`checkout.service.ts`, `POST /api/checkout`)**: Orchestrates customer creation, warehouse resolution, atomic order creation, inventory reservation (45-minute expiry), payment record creation, domain event publication, and Paystack transaction initialization.
7. **Paystack Payment Integration & Webhook Handler (`paystack.service.ts`, `webhook.service.ts`, `POST /api/webhooks/paystack`)**: Implements HMAC SHA-512 signature validation, Paystack API cross-verification, currency/amount verification, idempotency protection, order transition to `pending`, and inventory reservation commit.
8. **Domain Events & Outbox (`events.service.ts`)**: Publishes structured events `order.created` and `payment.completed` to the `domain_events` table for downstream consumers.
9. **Strict TypeScript Typing**: Fully typed database client with `Relationships` mapping and zero compile errors (`tsc --noEmit`).
10. **Automated Test Suite (`vitest`)**: 28 unit, integration, and live database tests covering inventory reservations, warehouse routing, pricing/discounts, order creation, and Paystack payment/webhook handling.

## Why
To provide a secure, server-authoritative e-commerce backend preventing inventory overselling, securing price calculations against client tampering, ensuring atomic order creation, and handling Paystack payments with idempotency.

## Files Touched
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `.env.example`
- `src/lib/constants.ts`
- `src/lib/config.ts`
- `src/lib/supabase/types.ts`
- `src/lib/supabase/client.ts`
- `src/types/checkout.ts`
- `src/types/paystack.ts`
- `src/types/events.ts`
- `src/services/warehouse.service.ts`
- `src/services/inventory.service.ts`
- `src/services/pricing.service.ts`
- `src/services/customer.service.ts`
- `src/services/events.service.ts`
- `src/services/paystack.service.ts`
- `src/services/checkout.service.ts`
- `src/services/webhook.service.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/paystack/route.ts`
- `tests/mocks/supabase.mock.ts`
- `tests/inventory.test.ts`
- `tests/warehouse.test.ts`
- `tests/checkout.test.ts`
- `tests/paystack.test.ts`

## Follow-ups & Known Issues
- Image upload and processing pipeline for customizable products (`requires_customization = true`) will be wired in Phase 2.
- Admin dashboard transitions for moving orders from `pending` to `confirmed` and `shipped` will be built in subsequent phases.

## Commit Message
```text
feat(backend): implement e-commerce backend with checkout, inventory reservations, and paystack webhooks

- Add type-safe Supabase database schemas and server client
- Implement single-warehouse location and inventory stock resolution
- Implement database-authoritative pricing with add-ons, discounts, and delivery rates
- Add atomic checkout service with 45-minute inventory reservations
- Add Paystack payment initialization and secure HMAC SHA512 webhook handler
- Publish domain events for order.created and payment.completed
- Add 26 unit and integration tests with Vitest
```
