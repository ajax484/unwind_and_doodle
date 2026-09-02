# System Architecture & Technical Specification

This document provides a technical deep-dive into the architectural patterns, security models, data flows, and transactional workflows of the **Unwind & Doodle** application.

---

## 🏗️ High-Level System Architecture

```mermaid
graph TD
    Client["Client Browser / Mobile PWA"] --> NextApp["Next.js App Router (SSR / API)"]
    NextApp --> AuthLayer["Authentication & User Context Service"]
    NextApp --> ServiceLayer["Domain Services Layer"]
    
    subgraph "Domain Services Layer"
        CheckoutSvc["Checkout & Pricing Service"]
        InvSvc["Inventory & Reservation Engine"]
        OrderSM["Order State Machine"]
        TeamSvc["Team & Permission Service"]
        NotifSvc["Nodemailer Notification Service"]
    end
    
    ServiceLayer --> SupabaseDB[("Supabase PostgreSQL (RLS / Schema)")]
    ServiceLayer --> PaystackAPI["Paystack Payment Gateway"]
    ServiceLayer --> SMTP["SMTP Mail Server"]
    
    PaystackAPI --> WebhookRoute["/api/webhooks/paystack"]
    WebhookRoute --> OrderSM
    OrderSM --> InvSvc
    OrderSM --> NotifSvc
```

---

## 🔐 Authentication & Access Control (RBAC)

The application implements a strict two-tier authentication architecture separating **Storefront Customers** from **Backoffice Merchant Team Members**:

```mermaid
graph LR
    User["Incoming Request"] --> ExtractToken["Extract Cookie / Bearer Header"]
    ExtractToken --> ResolveContext["user-context.service.ts"]
    ResolveContext -->|Role in organization_members| AdminCtx["AdminOrganizationContext (owner / admin / staff)"]
    ResolveContext -->|Role in customers| CustCtx["CustomerUserContext (authenticated customer)"]
    ResolveContext -->|No session / cookie| AnonCtx["AnonymousContext (guest shopper)"]
```

### Roles & Permissions Matrix

| Resource / Action | Guest | Customer | Staff | Admin | Owner |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Browse Catalog & Products | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add to Cart & Process Checkout | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Customer Account & Orders | ❌ | ✅ (Own) | ❌ | ❌ | ❌ |
| View Admin Dashboard & Analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage Products & Stock Receipts (GRN) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create Manual Orders & Payment Links | ❌ | ❌ | ✅ | ✅ | ✅ |
| Invite Team Members & Assign Roles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete Team Members / Transfer Ownership | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 💳 Commerce Transaction Pipeline

To prevent overselling and race conditions during high-traffic drops, Unwind & Doodle uses a **Two-Phase Reservation & Commit** model:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant API as Checkout API
    participant Inv as Inventory Service
    participant Pay as Paystack Provider
    participant DB as Supabase DB
    
    Customer->>API: POST /api/checkout (items, shipping, delivery)
    API->>Inv: reserveSingleInventory(warehouseId, items)
    Note over Inv: Creates reservation hold with 30-min TTL
    Inv-->>API: Reservations hold confirmed
    API->>DB: Create order (status: 'created', payment: 'pending')
    API->>Pay: initializeTransaction(amount, reference, email)
    Pay-->>API: authorizationUrl & reference
    API-->>Customer: Return authorizationUrl
    
    Customer->>Pay: Pays via Card / Bank Transfer
    Pay->>API: POST /api/webhooks/paystack (HMAC verified)
    API->>DB: transitionOrderStatus(order, 'paid')
    API->>Inv: commitOrderReservations(reference)
    Note over Inv: Deducts physical stock, archives reservation hold
    API->>DB: Dispatch domain event (order.paid)
```

---

## 📦 Multi-Warehouse Inventory & Fulfillment

- **Physical Inventory**: Tracked at specific physical hubs (e.g. Lagos Mainland Hub) with `quantity` and `reserved_quantity`.
- **Virtual Bundles**: Bundles do not have standalone stock rows. Instead, their buildable quantity is dynamically calculated from physical component availability via SQL RPC (`compute_buildable_bundles`).
- **Abandoned Hold Reclaim**: Expired reservations older than 30 minutes are automatically freed by `expireOldReservations()` or background revalidation tasks.

---

## 📬 Transactional Domain Events & Outbox

All key state changes emit structured domain events to the `domain_events` table within the active database transaction:
- `order.created`
- `order.paid`
- `order.status_changed`
- `order.cancelled`
- `customization.asset_processed`
- `stock_notification.eligible`

Background workers process pending outbox events asynchronously, guaranteeing that external services (email notifications, fulfillment triggers) never block user-facing HTTP request cycles.
