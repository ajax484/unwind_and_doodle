# Customer Accounts & Post-Purchase Experience (Phase 5)

## 1. What Changed
Implemented the end-to-end customer account system and post-purchase experience:
- **Passwordless Authentication**: Implemented email OTP verification and Google OAuth login via server-side API routes.
- **Guest → Account Linking**: Deterministic reconciliation of past guest orders upon authentication using normalized email identity.
- **Account Dashboard & Navigation**: Added responsive account shell with overview, order history, saved addresses, profile management, and marketing preferences.
- **Secure Guest & Customer Order Tracking**: Tokenized access verification for guest orders and authenticated order details with status timelines from `order_status_history`.
- **Dynamic Reorder Engine**: Allows customers to reorder past purchases with live inventory checking, updated catalog prices, and unavailable item notices.
- **Address Management**: CRUD operations on `customer_addresses` enforcing a single default address guarantee.
- **Verified Product Reviews**: Server-side validation ensuring only customers who placed received orders containing a product can submit reviews with ratings (1-5), optional text, and images in `pending` moderation state.
- **Stock Notifications**: Customer subscription to out-of-stock products with outbox domain event dispatching on inventory replenishment.
- **Post-Purchase Domain Events & Notifications**: Handlers for `order.pending`, `order.shipped`, `order.received`, and `stock_notification.eligible`.
- **Account Deletion & Data Retention**: Privacy-compliant account deactivation with personal data anonymization while preserving commerce, payment, and inventory records.

## 2. Why
To provide customers with a seamless post-purchase experience (order tracking, order history, reordering, reviews, and address management) while maintaining strict authorization boundaries, preventing IDOR vulnerabilities, and preserving financial audit integrity.

## 3. Files Touched
### Services & Utilities
- `src/lib/order-token.ts`
- `src/lib/auth-helpers.ts`
- `src/services/customer-account.service.ts`
- `src/services/reorder.service.ts`
- `src/services/review.service.ts`
- `src/services/stock-notification.service.ts`
- `src/services/notification.service.ts`

### API Routes
- `src/app/api/auth/otp/send/route.ts`
- `src/app/api/auth/otp/verify/route.ts`
- `src/app/api/auth/google/route.ts`
- `src/app/api/auth/callback/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/signout/route.ts`
- `src/app/api/auth/delete-account/route.ts`
- `src/app/api/account/orders/route.ts`
- `src/app/api/account/orders/[orderNumber]/route.ts`
- `src/app/api/account/reorder/route.ts`
- `src/app/api/account/addresses/route.ts`
- `src/app/api/account/addresses/[id]/route.ts`
- `src/app/api/account/addresses/[id]/default/route.ts`
- `src/app/api/account/profile/route.ts`
- `src/app/api/account/preferences/route.ts`
- `src/app/api/reviews/route.ts`
- `src/app/api/notifications/stock/route.ts`
- `src/app/api/orders/[orderNumber]/route.ts`
- `src/app/api/orders/access-token/route.ts`

### Frontend Pages & Components
- `src/components/Navbar.tsx`
- `src/components/ReviewModal.tsx`
- `src/components/StockNotificationButton.tsx`
- `src/app/auth/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/app/account/layout.tsx`
- `src/app/account/page.tsx`
- `src/app/account/orders/page.tsx`
- `src/app/account/orders/[orderNumber]/page.tsx`
- `src/app/account/addresses/page.tsx`
- `src/app/account/profile/page.tsx`
- `src/app/account/preferences/page.tsx`
- `src/app/order/[orderNumber]/page.tsx`

### Tests & Mocks
- `tests/mocks/supabase.mock.ts`
- `tests/customer-account.test.ts`
- `tests/security-authorization.test.ts`

## 4. Known Issues / Follow-ups
- In production, configure Google OAuth client ID and Secret in Supabase dashboard.
- Outbox domain events can be drained by a scheduled cron job or serverless trigger calling `processPendingDomainEvents`.

## 5. Commit Message
`feat: implement customer accounts, passwordless auth, and post-purchase experience`
