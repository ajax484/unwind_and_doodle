# Unwind & Doodle — Website Improvements & Technical Roadmap Tracker

**Last Updated:** 2026-11-22  
**Source Documents:**
- [Unwind & Doodle _ My Website Issues and What I Want Improved.pdf](./Unwind%20%26%20Doodle%20_%20My%20Website%20Issues%20and%20What%20I%20Want%20Improved.pdf)
- [Unwind & Doodle Technical Requirements.pdf](./Unwind%20%26%20Doodle%20Technical%20Requirements.pdf)

---

## Locked-In Scope & Architecture Decisions

| # | Decision | Agreed Direction |
| :-: | :--- | :--- |
| 1 | **Execution Order** | **Tier 1 → Tier 2 → Tier 3** |
| 2 | **Homepage & Content CMS (`CAT-4`, `CAT-5`)** | Lightweight admin-editable form per page/section (structured fields, no heavy drag-and-drop page builder). |
| 3 | **Flutterwave (`CHK-3`)** | **Keep** as an optional fallback toggled off in Admin Payment Settings; Paystack remains primary. |
| 4 | **Order Status Model (`STK-3`)** | **Keep** the existing order state machine (`created → pending → confirmed → shipped → received`) + separate `customizations` queue; improve customer-facing status labels and notifications so customized orders don't send premature/confusing delivery messages. |
| 5 | **Storefront Copy (`CAT-4`, `CAT-5`, `CHK-1`)** | Build editable structure with clean **placeholder copy** now; owner will replace copy via Admin once ready. |

---

## Baseline: Already Implemented (Regression Watchlist)

Audited on `2026-11-22` (`npx tsc --noEmit` passing; `1,077 / 1,079` Vitest tests passing — only 2 live Supabase Storage video upload timeout tests in `tests/admin/upload-route.test.ts` failed on 5s timeout).

- [x] **PERF-1 / PERF-2** — Storefront LCP, font loading, metadata, and image loading optimizations
- [x] **CAT-1 / CAT-2 / CAT-3** — Manual product `display_order`, homepage `is_featured` / `featured_order`, 6 canonical categories with `sort_order`, price/image/stock display
- [x] **REV-1 to REV-4** — Review model, verified purchase linking, manual admin review creation/moderation, placeholder reviews removed
- [x] **CHK-2 / CHK-3 / CHK-4** — Linear checkout, cart-preserving payment retry, Paystack integration with webhook signature verification & idempotency (`payment_events`), atomic CAS payment-to-order transitions
- [x] **ADM-ORD-1 to ADM-ORD-3** — Bulk order status updates with transition guards & audit logs, order search/filters/CSV export, customer order history
- [x] **ADM-FEE-1** — Location-based delivery fees table, map, bulk edits, and rate templates
- [x] **ADM-PROD-1** — Direct single-product editing (price, stock, description, categories, order, availability)
- [x] **EML-CMP-1 to EML-CMP-3** — Configurable Reply-To (`organization_email_settings`), delivery logs (`email_delivery_logs`), dynamic email builder blocks (Reviews, Product, Cart Items, Order Items)
- [x] **STK-1 / STK-2** — 45-minute stock reservation hold, bundle component expansion, single-warehouse matching
- [x] **TRK-2** — Meta Pixel + Conversions API (`event_id = order_id`) deduplication

---

## Tier 1 — High Impact & Broken Behavior

### 1.1 Email Automations: Consent, Triggers, Exits & Visibility (`EML-AUTO-1` to `EML-AUTO-6`)
- [x] **EML-AUTO-1 (Subscription Model & Welcome Trigger):** Decouple marketing subscription from `customer.created`. Stop triggering `welcome` on order placement/customer record creation; trigger only on explicit subscribe event with consent timestamp & source recorded. Ensure existing subscribers who place another order never re-enter `welcome`.
- [x] **EML-AUTO-2 (Welcome Sequence Exit on Purchase):** Exit or branch out of first-purchase encouragement emails immediately if a subscriber completes a paid order while inside the welcome sequence.
- [x] **EML-AUTO-3 (Abandoned Checkout Exit Verification):** Verify pending abandoned-checkout reminders cancel immediately upon verified payment for that cart or any order created from it, and confirm dynamic cart items resolve at send time.
- [x] **EML-AUTO-4 (Transactional & Post-Delivery Follow-ups):** Verify order confirmation sends once per verified payment, post-purchase follow-ups/review requests trigger on `received` (delivered) status rather than `shipped`, and review requests fire at most once per order item.
- [x] **EML-AUTO-5 (De-duplication & Overlap Guards):** Enforce idempotency key `(automation, customer, trigger_event_id)` on enrollment and prevent overlapping marketing automations (or enforce explicit priority).
- [x] **EML-AUTO-6 (Per-Customer Visibility & Test Mode):** Add per-customer automation history view (automations entered, current step, emails sent/failed, trigger reason) and an admin test-run mode targeting a single test recipient before enabling.

### 1.2 Checkout Error Reliability & Diagnostics (`PERF-4`)
- [x] **PERF-4 (Structured Checkout Logging):** Add/verify structured error logging with traceable request IDs across cart, checkout (`POST /api/checkout`), payment initialization, webhook/verify, and order creation; log failed/abandoned payment reason codes.
- [x] **CHK-3 (Flutterwave Fallback Verification):** Confirm Flutterwave remains cleanly disabled by default in Payment Settings and only appears on checkout if explicitly enabled.

### 1.3 Storefront Content & Policy Pages (`CAT-5`, `CHK-1`)
- [x] **CMS Storage & Admin Editor:** Create a lightweight `storefront_pages` (or equivalent) table + Admin editor for structured page content with immediate storefront updates (no deploy).
- [x] **Storefront Routes (with placeholder copy):**
  - [x] `/about` — Brand story & screen-free relaxation philosophy
  - [x] `/delivery` — Regular vs. customized timelines, production lead times, dispatch schedule, location-based timelines
  - [x] `/returns` — Returns & refunds policy
  - [x] `/faq` — Frequently asked questions
  - [x] `/contact` — Contact details & support channels
- [x] **Navigation & Footer Links:** Wire all 5 pages into storefront navigation/footer cleanly.

---

## Tier 2 — Brand Positioning & Daily Admin Efficiency

### 2.1 Homepage Repositioning & Editable Sections (`CAT-4`)
- [x] **Section Reordering & Brand Framing:** Update [src/app/page.tsx](../src/app/page.tsx) so the homepage leads with:
  1. Brand introduction (warm, calm, playful — *"A little less scrolling. A lot more living."*)
  2. Category tiles (Coloring Books, Journals, Game Books, Customized Books, Coloring Tools, Kits)
  3. Featured ready-to-buy products
  4. Customization section (secondary, not dominating)
  5. Brand philosophy, real customer reviews, newsletter signup
- [x] **Admin-Editable Homepage Copy & Section Order:** Provide a simple Admin settings form to edit hero/section copy and toggle/order homepage sections without a deploy.

### 2.2 Product Structured Specs & Data Audit (`CAT-6`)
- [x] **Database & API:** Add structured spec columns to `products` (`paper_gsm`, `binding`, `page_count`, `dimensions`) via migration and expose in catalog & admin product APIs.
- [x] **Admin Form & Storefront Display:** Add structured spec inputs to Admin Product Create/Edit and render consistent spec blocks on product detail pages.
- [x] **Catalog Copy Audit:** Audit all live products for inaccurate `150gsm` claims, missing specs, descriptions, and typos (e.g., fix `"Park Of 12 Color Pencils"` → `"Pack Of 12 Color Pencils"`).

### 2.3 Admin Operations Polish (`ADM-PROD-2`, `ADM-IMG-1` to `3`, `PERF-3`)
- [x] **ADM-PROD-2 (Bulk Product Edits):** Multi-select products in `/admin/products` to bulk-update price, category, or active/hidden status, with a preview step before applying and audit logging.
- [x] **ADM-IMG-1 to ADM-IMG-3 (Multi-Image Upload Reliability):** Investigate intermittent multi-attempt upload failures (payload size limits, timeouts, retries), add per-file progress + individual retry for failed files, verify drag-to-reorder primary image, and verify server-side/upload resize & compression. Also stabilize the 2 timing-out tests in `tests/admin/upload-route.test.ts`.
- [x] **PERF-3 (Admin Responsiveness):** Profile slow admin transitions (orders, products, section switches), ensure pagination/server-side filtering and cached reference data (categories, delivery zones) keep navigation snappy.

---

## Tier 3 — Growth, Governance & Exploratory

### 3.1 Granular Staff RBAC (`ADM-RBAC-1`)
- [ ] **Per-Area Permissions:** Extend [src/services/permission.service.ts](../src/services/permission.service.ts) and team management UI so the owner can assign granular access by area (`orders`, `products`, `reviews`, `email`, `delivery_fees`, `settings`, `reports`) and create/edit/disable staff accounts with full audit-log attribution.

### 3.2 Customized Order Customer Messaging (`STK-3`)
- [ ] **Customer-Facing Status & Notifications:** Keep existing order statuses + `customizations` queue, and update customer-facing order tracking pages and transactional emails to clearly reflect customization production progress (e.g., showing production status for customized items vs. standard dispatch for regular items, avoiding premature delivery messages on mixed orders).

### 3.3 Funnel Reporting (`TRK-1`)
- [ ] **Admin Funnel Report:** Verify/surface end-to-end funnel events (`product_viewed`, `added_to_cart`, `checkout_started`, `payment_initiated`, `purchase_completed`) in `/admin/analytics`.

### 3.4 Colored by You Gallery & Exploratory Features (`REV-5`, `FUT`)
- [ ] **REV-5 (Colored by You Gallery):** Add customer-submitted colored pages gallery (image, optional caption, linked product, customer first name only, mandatory permission flag) with admin moderation flow.
- [ ] **FUT (Shop by Mood / Occasion):** Lightweight curated collections via simple product tagging (e.g., *"I need some quiet"*, *"Girls' Night In"*, *"Date Night In"*, *"Solo Sunday"*, *"Gift"*).
- [ ] **FUT (Product Demonstrations & Activity Ideas):** Optional lightweight CMS content blocks on product detail pages showing how to enjoy game books/journals.

---

## Owner Inputs Needed Later (Non-Blocking for Engineering)

These do not block building the features, but are needed from the owner before going live with final content:
- [ ] Final copy for **About Us**, **Delivery**, **Returns & Refunds**, **FAQ**, and **Contact** pages
- [ ] Full **delivery timelines by location** and **production lead times** for customized products
- [ ] Specific **examples of intermittent checkout errors** customers reported
- [ ] List of **staff members** and which admin areas each should access
- [ ] Final **consent wording** for customer reviews and Colored by You photos
- [ ] Confirmation of **monitored Reply-To inbox** and domain **SPF/DKIM/DMARC** DNS verification
