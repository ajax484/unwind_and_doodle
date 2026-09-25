# Changelog Index

This directory maintains categorized, per-feature change records following the repository standard: `docs/changes/<domain>/YYYY-MM-DD-feature-name.md`.

> [!NOTE]
> For new major changes affecting $\ge 2$ production code files, use [`_template.md`](./_template.md) as a starting point.
> To re-validate and regenerate this index, run `npm run docs:index`.

---

## 📂 Changes by Feature Domain

### 1. Admin Management & Backoffice
*CRM, warehouse inventory, GRN receipts, and backoffice tooling*

- [2026-08-30 Phase 6A: Admin Authentication & Authorization](./admin/2026-08-30-admin-authentication-and-authorization.md)
- [2026-08-30 Phase 6E — Admin Customer Management & CRM](./admin/2026-08-30-admin-customer-management-and-crm.md)
- [2026-08-30 Phase 6B — Admin Dashboard & Order Management](./admin/2026-08-30-admin-dashboard-and-order-management.md)
- [2026-08-30 Phase 6D — Admin Inventory, Warehouses & Stock Management](./admin/2026-08-30-admin-inventory-and-warehouses.md)
- [2026-08-30 Phase 6C — Admin Product & Catalog Management](./admin/2026-08-30-admin-product-and-catalog-management.md)
- [2026-08-30 Phase 6F — Reviews & Customer Customization Management](./admin/2026-08-30-admin-reviews-and-customizations.md)
- [2026-08-30 Bundle Admin Workflow](./admin/2026-08-30-bundle-admin-workflow.md)
- [2026-08-30 RPC Authorization Hardening for Service Role & Org Admin](./admin/2026-08-30-bundle-authorization-hardening.md)
- [2026-08-30 Auto-calculated Bundle Cost Price](./admin/2026-08-30-bundle-auto-cost-price.md)
- [2026-08-30 Bundle Virtual Inventory Calculation & UI Integration](./admin/2026-08-30-bundle-virtual-inventory-calculation.md)
- [2026-08-30 Phase 6I Manual Orders Admin Frontend Implementation](./admin/2026-08-30-manual-orders-admin-frontend.md)
- [2026-08-31 Admin Product Editor Theme Management Integration](./admin/2026-08-31-admin-product-themes.md)
- [2026-09-02 Admin Manual Order UI & Real-Time Preview API](./admin/2026-09-02-admin-manual-order-ui.md)
- [2026-09-02 Commerce Analytics System — Change Documentation](./admin/2026-09-02-commerce-analytics-dashboard.md)
- [2026-09-02 Manual Orders Enhancements (Backend Core Logic & APIs)](./admin/2026-09-02-manual-orders-enhancements.md)
- [2026-09-04 Refactor Admin Layout to Server Component](./admin/2026-09-04-admin-layout-server-component.md)
- [2026-09-11 Admin Manual Order Page Design System Migration](./admin/2026-09-11-admin-manual-order-design-system-migration.md)
- [2026-09-12 2026-09-12 Admin Manual Order Theme & Cover Customization](./admin/2026-09-12-admin-manual-order-customization.md)
- [2026-09-12 2026-09-12 Admin Manual Order Creation Without Customer Email & Payment Link Email Update](./admin/2026-09-12-admin-manual-order-without-email.md)
- [2026-09-12 Marketing Step 1F — Campaign Composer](./admin/2026-09-12-marketing-campaign-composer.md)
- [2026-09-12 Marketing Customer Segment Builder](./admin/2026-09-12-marketing-customer-segment-builder.md)
- [2026-09-12 Marketing Step 1G — Email Provider Integration](./admin/2026-09-12-marketing-email-provider-integration.md)
- [2026-09-12 Marketing Step 1H — Email Tracking, Webhooks, and Campaign Analytics](./admin/2026-09-12-marketing-email-tracking-analytics.md)
- [2026-09-12 Marketing Native Email Open Pixel & Click Tracking](./admin/2026-09-12-marketing-native-email-tracking.md)
- [2026-09-12 Marketing Starter Seed Segments](./admin/2026-09-12-marketing-seed-segments.md)
- [2026-09-12 Marketing Step 1D: Segmentation Engine](./admin/2026-09-12-marketing-segmentation-engine.md)
- [2026-09-12 Marketing Step 1C: Server-Side Typed Data Access Layer](./admin/2026-09-12-marketing-typed-data-access-layer.md)
- [2026-09-14 Admin Product Media Management](./admin/2026-09-14-admin-product-media-management.md)
- [2026-09-14 2026-09-14: Smart Delivery Location Selection, Status & Configuration](./admin/2026-09-14-delivery-location-smart-selection.md)
- [2026-09-14 Warehouse-Centric Delivery Management Redesign](./admin/2026-09-14-delivery-management-redesign.md)
- [2026-09-14 Reusable Delivery Rate Templates & Bulk Setup Integration](./admin/2026-09-14-delivery-rate-templates.md)
- [2026-09-15 Admin Category Management & Dynamic Homepage Collections](./admin/2026-09-15-admin-category-management.md)
- [2026-09-15 Bundle Media Management and Validation Fix](./admin/2026-09-15-bundle-media-and-validation-fix.md)
- [2026-09-16 Admin Audit Log Viewer (`/admin/audit-logs`)](./admin/2026-09-16-admin-audit-log-viewer.md)
- [2026-09-16 Marketing Step 2B: Marketing Automation Execution](./admin/2026-09-16-marketing-automation-execution.md)
- [2026-09-16 Step 2A: Marketing Automation Foundation](./admin/2026-09-16-marketing-automation-foundation.md)
- [2026-09-16 Order Status History, Audit Trail Logging & Timeline Display Fix](./admin/2026-09-16-order-status-history-and-audit-trail-fix.md)
- [2026-09-16 Rich Text Product and Bundle Descriptions (TipTap & HTML Sanitization)](./admin/2026-09-16-rich-text-description.md)
- [2026-09-20 Migrate Delayed Marketing Automations to Inngest Durable Scheduling](./admin/2026-09-20-inngest-durable-scheduling.md)
- [2026-09-20 Inngest Durable Workflow Infrastructure](./admin/2026-09-20-inngest-durable-workflows.md)
- [2026-09-20 Step 11: Productionize Marketing Automation Background Processing](./admin/2026-09-20-marketing-automation-background-processing.md)
- [2026-09-20 Step 14: Event Cancellation & Multi-Step Marketing Journeys](./admin/2026-09-20-marketing-automation-multi-step-journeys.md)
- [2026-09-20 Marketing Automation Trigger Pipeline Audit & Repair](./admin/2026-09-20-marketing-automation-trigger-repair.md)
- [2026-09-21 2026-09-21 Marketing Automation Idempotency & Inngest Dispatch Fix](./admin/2026-09-21-marketing-automation-idempotency-and-inngest-dispatch-fix.md)
- [2026-09-22 2026-09-22: Delivery Location Resolution for Analytics & Order Management](./admin/2026-09-22-analytics-delivery-locations.md)
- [2026-09-22 Historical Customer, Order & Product Import (Bumpa -> Unwind & Doodle)](./admin/2026-09-22-historical-customer-order-import.md)
- [2026-09-22 Step 17A: Marketing Personalization Context & Dynamic Recommendations](./admin/2026-09-22-marketing-context-and-recommendations.md)
- [2026-09-22 Post-Delivery Retention Journeys & Delivery Fallback](./admin/2026-09-22-post-delivery-retention-journeys.md)
- [2026-09-22 Product-Aware Marketing Audiences & Segmentation](./admin/2026-09-22-product-aware-marketing-audiences.md)
- [2026-09-25 Edit and Delete Delivery Locations](./admin/2026-09-25-edit-and-delete-delivery-locations.md)
- [2026-09-25 Manual Orders: Mandatory Delivery Location & Omitting Payment Link for Confirmed Orders](./admin/2026-09-25-manual-order-mandatory-location-and-no-link.md)

---

### 2. Commerce, Purchasing & Checkout Pipeline
*Cart, atomic checkout, inventory reservations, bundles, discounts*

- [2026-08-30 Cart Item Deduplication and Checkout Schema Fixes](./commerce/2026-08-30-cart-and-checkout-schema-fixes.md)
- [2026-08-30 Phase 3D: Cart Drawer + Main Cart Page](./commerce/2026-08-30-cart-drawer-and-page.md)
- [2026-08-30 Phase 3E: Checkout Page (`/checkout`)](./commerce/2026-08-30-checkout-page.md)
- [2026-08-30 Phase 4: Commerce Transaction Pipeline](./commerce/2026-08-30-commerce-transaction-pipeline.md)
- [2026-08-30 Customer Purchasing Journey Phase 3](./commerce/2026-08-30-customer-purchasing-journey.md)
- [2026-08-30 Phase 6G — Discounts & Coupons Implementation](./commerce/2026-08-30-discounts-and-coupons.md)
- [2026-08-30 E-Commerce Backend — Phase 1: Foundation, Checkout, Inventory & Paystack](./commerce/2026-08-30-ecommerce-backend-phase1.md)
- [2026-08-30 Phase 6K Manual Order Fulfillment](./commerce/2026-08-30-manual-order-fulfillment.md)
- [2026-08-30 Manual Orders & Customer Payment Links (Phase 6I)](./commerce/2026-08-30-manual-orders-and-customer-payment-links.md)
- [2026-08-30 Manual Orders & Customer Payment Links Hardening Pass (Phase 6I)](./commerce/2026-08-30-manual-orders-hardening-pass.md)
- [2026-08-30 Order Management & Fulfillment Phase](./commerce/2026-08-30-order-management-fulfillment.md)
- [2026-08-31 Fix Add to Cart Session Race Condition & Zero-Quantity Addons](./commerce/2026-08-31-fix-add-to-cart-session-race.md)
- [2026-08-31 Fix Bundle Checkout Warehouse Inventory Resolution](./commerce/2026-08-31-fix-bundle-checkout-warehouse-resolution.md)
- [2026-08-31 Fix Checkout Theme Customization Forwarding](./commerce/2026-08-31-fix-checkout-theme-customization.md)
- [2026-08-31 Order Details Customization Display (Admin & Customer Pages)](./commerce/2026-08-31-order-details-customization.md)
- [2026-09-02 Customer Payment Page & Secure Edit Flow](./commerce/2026-09-02-customer-payment-edit-experience.md)
- [2026-09-02 Fix TypeScript Errors in Customer Account Order Detail Page and Route](./commerce/2026-09-02-fix-account-order-types.md)
- [2026-09-02 Fix TypeScript Errors in Order Status Page and Manual Orders Test](./commerce/2026-09-02-fix-order-page-and-manual-orders-types.md)
- [2026-09-04 Cart System Hardening: Validation, Query Optimization, State Unification, & Lifecycle Integrity](./commerce/2026-09-04-cart-system-hardening.md)
- [2026-09-04 Fix Cart Session Deduplication & Stranded Cart Items](./commerce/2026-09-04-fix-cart-session-deduplication.md)
- [2026-09-13 Inventory RLS & Service Key Hardening](./commerce/2026-09-13-inventory-rls-and-service-key-hardening.md)
- [2026-09-13 2026-09-13 Manual Orders: Voluntary Address for Admins & Compulsory Address for Customers](./commerce/2026-09-13-manual-order-voluntary-address-compulsory-customer.md)
- [2026-09-14 Unified Product Media Architecture](./commerce/2026-09-14-unified-product-media-architecture.md)
- [2026-09-21 2026-09-21: 2-Tier Cascading Delivery Location Picker Across Storefront and Admin](./commerce/2026-09-21-cascading-delivery-location-picker.md)
- [2026-09-24 SEO, Open Graph & Favicon Metadata Infrastructure](./commerce/2026-09-24-seo-and-favicon-setup.md)

---

### 3. Payments & Gateway Integration
*Paystack, Flutterwave migration, webhooks, transaction verification*

- [2026-08-30 Phase 6 Customer Payment Page Implementation](./payments/2026-08-30-customer-payment-page-implementation.md)
- [2026-08-30 Payment Provider Migration: Decoupled PaymentProvider Interface & Flutterwave Integration](./payments/2026-08-30-flutterwave-payment-provider.md)
- [2026-08-30 Phase 6 Payment/Webhook Integration](./payments/2026-08-30-payment-webhook-integration.md)
- [2026-08-30 Payment Revalidation Subsystem & Admin Order Details Integration](./payments/2026-08-30-pending-payment-revalidation.md)
- [2026-08-30 Replace Flutterwave with Paystack Integration](./payments/2026-08-30-replace-flutterwave-with-paystack.md)
- [2026-09-04 Clean Code Phase 2: Payment Fulfillment Pipeline Unification](./payments/2026-09-04-clean-code-phase-2-payment-fulfillment-unification.md)
- [2026-09-20 Admin Manual Orders: Offline Payment & Admin-Controlled Payment Method (Step 10)](./payments/2026-09-20-admin-manual-orders-offline-payment.md)
- [2026-09-20 Checkout Payment Method Selection & Dynamic Payment Initialization (Step 3)](./payments/2026-09-20-checkout-payment-method-selection.md)
- [2026-09-20 Failed Payment Recovery & Retry (Step 7)](./payments/2026-09-20-failed-payment-recovery-and-retry.md)
- [2026-09-20 Manual / Bank Transfer Payment Lifecycle + Admin Verification (Step 4)](./payments/2026-09-20-manual-bank-transfer-payment-lifecycle.md)
- [2026-09-20 Payment History, Provider-Aware Refunds & Admin Payment Management (Step 5)](./payments/2026-09-20-payment-history-and-refund-management.md)
- [2026-09-20 Payment Production Hardening & End-to-End Audit (Step 9)](./payments/2026-09-20-payment-production-hardening-and-audit.md)
- [2026-09-20 Payment Provider Architecture Refactor & Centralized Factory](./payments/2026-09-20-payment-provider-architecture-refactor.md)
- [2026-09-20 Payment Settings & Multi-Provider Method Configuration (Step 2)](./payments/2026-09-20-payment-settings-configuration.md)
- [2026-09-20 Payment Webhook Hardening, Reconciliation & State Transitions (Step 6)](./payments/2026-09-20-payment-webhook-hardening-and-idempotency.md)

---

### 4. Storefront & Customer Experience
*Customer accounts, PDP, storefront home, typography, mobile layout*

- [2026-08-30 Customer Accounts & Post-Purchase Experience (Phase 5)](./storefront/2026-08-30-customer-accounts-and-post-purchase.md)
- [2026-08-30 Modern Brand-Aligned Storefront Homepage](./storefront/2026-08-30-editorial-store-homepage.md)
- [2026-08-30 Phase 6M — Frontend Bundle Integration](./storefront/2026-08-30-phase-6m-frontend-bundle-integration.md)
- [2026-08-30 Phase 3C: Product Catalog (`/products`)](./storefront/2026-08-30-product-catalog.md)
- [2026-08-30 Phase 3B: Product Detail Page](./storefront/2026-08-30-product-detail-page.md)
- [2026-08-31 Bundle Support in Admin Order Info and Customer Tracking Pages](./storefront/2026-08-31-bundle-order-info-and-tracking-support.md)
- [2026-08-31 Category and Theme Retrieval & Creation Fixes](./storefront/2026-08-31-category-and-theme-retrieval-fixes.md)
- [2026-08-31 2026-08-31 Phase 6L — Coloring Book Themes & Cover Personalization](./storefront/2026-08-31-phase6l-coloring-books.md)
- [2026-09-02 Fix Mobile Font Loading and Rendering Issues](./storefront/2026-09-02-fix-mobile-fonts.md)
- [2026-09-02 Restore Original Landing Page Design and Brand Aesthetics](./storefront/2026-09-02-restore-landing-page-design.md)
- [2026-09-03 Brand Philosophy 2-Column Grid Layout](./storefront/2026-09-03-brand-philosophy-2col-layout.md)
- [2026-09-03 Category Grid Pink Theme Redesign](./storefront/2026-09-03-category-grid-pink-theme.md)
- [2026-09-03 Full-Width Sections and Padding-Based Separation](./storefront/2026-09-03-full-width-sections-and-padding.md)
- [2026-09-14 ProductCard Hover Video Playback](./storefront/2026-09-14-product-card-hover-video-playback.md)
- [2026-09-14 Product Video as First Item in Product Media Carousel](./storefront/2026-09-14-product-media-carousel-video.md)

---

### 5. Authentication, RBAC & Multi-Tenancy
*Cookie sessions, OTP, Google OAuth, staff roles, permissions*

- [2026-09-02 Authentication System Redesign & Implementation](./auth/2026-09-02-auth-system-redesign.md)
- [2026-09-02 2026-09-02: Separate Admin and User Login](./auth/2026-09-02-separate-admin-and-user-login.md)
- [2026-09-02 2026-09-02: Teams & Permissions System](./auth/2026-09-02-teams-and-permissions.md)
- [2026-09-04 Remove Redundant Client-Side Authentication Checks](./auth/2026-09-04-remove-client-side-auth-checks.md)
- [2026-09-15 Auth Session Longevity & Sliding Refresh Token Rotation](./auth/2026-09-15-auth-session-longevity-and-refresh.md)

---

### 6. Notifications, Outbox & Infrastructure
*Sonner toasts, persistent notification center, Nodemailer SMTP*

- [2026-08-30 API Routes Verification & Schema Synchronization](./notifications/2026-08-30-api-routes-verification.md)
- [2026-08-30 Fix: API 500 Errors and Tailwind v4 Styling Integration](./notifications/2026-08-30-fix-api-and-styling.md)
- [2026-08-30 Phase 6L — Final Testing, Integration Validation & Production Hardening](./notifications/2026-08-30-phase-6l-production-hardening-and-validation.md)
- [2026-09-02 Nodemailer Integration in Notification Service & Team Permissions Test Fix](./notifications/2026-09-02-nodemailer-notification-service.md)
- [2026-09-03 Bespoke Toast Notification System & Event Notification Architecture](./notifications/2026-09-03-bespoke-toast-notification-system.md)
- [2026-09-03 Option 2: Persistent In-App Notification Center & Domain Event Feed](./notifications/2026-09-03-persistent-in-app-notification-center.md)
- [2026-09-03 Switch to Sonner Toast Notification System](./notifications/2026-09-03-switch-to-sonner-toast-system.md)
- [2026-09-13 Admin Notifications & Real-Time Alerts](./notifications/2026-09-13-admin-notifications-and-alerts.md)
- [2026-09-24 Order Notification Dispatch & Enrichment Fix](./notifications/2026-09-24-order-notification-dispatch-fix.md)

---

### 7. Code Quality, TypeScript & Test Suite Refactoring
*Clean code refactors, Vitest optimization, type definitions*

- [2026-09-02 Clean Code Audit & Refactoring](./quality-and-tests/2026-09-02-clean-code-audit-and-refactoring.md)
- [2026-09-02 Documentation System Enhancement](./quality-and-tests/2026-09-02-documentation-system-enhancement.md)
- [2026-09-02 Fix All TypeScript Errors Across Codebase](./quality-and-tests/2026-09-02-fix-all-typescript-errors.md)
- [2026-09-02 Organize Tests Folder into Domain Subdirectories](./quality-and-tests/2026-09-02-organize-test-directory.md)
- [2026-09-02 Test Suite Optimization and Cleanup](./quality-and-tests/2026-09-02-test-suite-optimization.md)
- [2026-09-03 Fix Font Circular Dependency and Mobile Rendering Fallback](./quality-and-tests/2026-09-03-fix-font-circular-dependency.md)
- [2026-09-04 Clean Code Phase 1: Constants & Unified Formatters](./quality-and-tests/2026-09-04-clean-code-phase-1-constants-and-formatters.md)
- [2026-09-04 Clean Code Phase 3: Type Safety, Zod Validation & Cart Model Deduplication](./quality-and-tests/2026-09-04-clean-code-phase-3-types-and-validation.md)
- [2026-09-04 Clean Code Phase 4: Next.js Performance & Admin Query Projections](./quality-and-tests/2026-09-04-clean-code-phase-4-nextjs-performance-and-architecture.md)
- [2026-09-16 Production Error Monitoring & Runtime Diagnostics (Sentry)](./quality-and-tests/2026-09-16-sentry-error-monitoring.md)

---

### 8. Design System & Figma Synchronization
*Figma canvas components, tokens, QA audit fixes, code reconciliation*

- [2026-09-05 Phase 5F Accordion Component System in Figma](./design-system/2026-09-05-figma-accordion-component.md)
- [2026-09-05 2026-09-05 Step 4G AddonCompanionCard Component System in Figma](./design-system/2026-09-05-figma-addon-companion-card-component.md)
- [2026-09-05 Step 5C AddressCard Component System in Figma](./design-system/2026-09-05-figma-address-card-component.md)
- [2026-09-05 Phase 6B: AdminLayout & Navigation in Figma (Lean 40-Variant Architecture)](./design-system/2026-09-05-figma-admin-layout-component.md)
- [2026-09-05 Global Component Documentation Modular Template Upgrade](./design-system/2026-09-05-figma-all-components-documentation-modular-upgrade.md)
- [2026-09-05 Step 3G: Avatar Component System in Figma](./design-system/2026-09-05-figma-avatar-component.md)
- [2026-09-05 Step 2C: Badge Component System in Figma](./design-system/2026-09-05-figma-badge-component.md)
- [2026-09-05 Step 1D: Border & Divider Token System in Figma](./design-system/2026-09-05-figma-border-tokens.md)
- [2026-09-05 Phase 5G: Breadcrumbs Component in Figma](./design-system/2026-09-05-figma-breadcrumbs-component.md)
- [2026-09-05 Step 2A: Button Component System in Figma](./design-system/2026-09-05-figma-button-component.md)
- [2026-09-05 Step 2E: CartItemRow Component Molecule in Figma](./design-system/2026-09-05-figma-cart-item-row-component.md)
- [2026-09-05 2026-09-05 Phase 4D CartDrawer Component System in Figma](./design-system/2026-09-05-figma-cartdrawer-component.md)
- [2026-09-05 Master Component Documentation Template in Figma](./design-system/2026-09-05-figma-component-documentation-template.md)
- [2026-09-05 Figma Components Canvas 3-Row Reorganization](./design-system/2026-09-05-figma-components-canvas-reorganization.md)
- [2026-09-05 Step 5A: CustomizationUploader Component in Figma](./design-system/2026-09-05-figma-customization-uploader-component.md)
- [2026-09-05 Phase 6A: DataTable Component in Figma](./design-system/2026-09-05-figma-datatable-component.md)
- [2026-09-05 Unwind & Doodle Production Design System in Figma](./design-system/2026-09-05-figma-design-system.md)
- [2026-09-05 Step 3B: EmptyState Component System in Figma](./design-system/2026-09-05-figma-empty-state-component.md)
- [2026-09-05 Phase 4C: Footer Component System in Figma](./design-system/2026-09-05-figma-footer-component.md)
- [2026-09-05 Step 2B: Form Controls Component Family in Figma](./design-system/2026-09-05-figma-form-controls.md)
- [2026-09-05 Step 3A: Modal Component System in Figma](./design-system/2026-09-05-figma-modal-component.md)
- [2026-09-05 Step 1F: Motion & Interaction Token System in Figma](./design-system/2026-09-05-figma-motion-tokens.md)
- [2026-09-05 Phase 4B: Navbar Component System in Figma](./design-system/2026-09-05-figma-navbar-component.md)
- [2026-09-05 Phase 6C: OrderStatusBadge Component in Figma](./design-system/2026-09-05-figma-order-status-badge-component.md)
- [2026-09-05 Step 5B OrderStatusTimeline Component System in Figma](./design-system/2026-09-05-figma-order-status-timeline-component.md)
- [2026-09-05 2026-09-05 Step 4H OrderSummaryCard Component System in Figma](./design-system/2026-09-05-figma-order-summary-card-component.md)
- [2026-09-05 Step 3H: Pagination Component System in Figma](./design-system/2026-09-05-figma-pagination-component.md)
- [2026-09-05 Step 2D: ProductCard Component Molecule in Figma](./design-system/2026-09-05-figma-product-card-component.md)
- [2026-09-05 2026-09-05 Phase 4E ProductImageGallery Component System in Figma](./design-system/2026-09-05-figma-product-image-gallery-component.md)
- [2026-09-05 Step 2F: RatingStars & TestimonialCard Components in Figma](./design-system/2026-09-05-figma-ratings-and-testimonials.md)
- [2026-09-05 Step 5D ReviewModal Component System in Figma](./design-system/2026-09-05-figma-review-modal-component.md)
- [2026-09-05 Step 3C: Skeleton Component System in Figma](./design-system/2026-09-05-figma-skeleton-component.md)
- [2026-09-05 Step 3D: Spinner Component System in Figma](./design-system/2026-09-05-figma-spinner-component.md)
- [2026-09-05 Step 3E: Tabs Component System in Figma](./design-system/2026-09-05-figma-tabs-component.md)
- [2026-09-05 2026-09-05 Step 4F ThemeSelectorCard Component System in Figma](./design-system/2026-09-05-figma-theme-selector-card-component.md)
- [2026-09-05 Phase 5E Toast Component System in Figma](./design-system/2026-09-05-figma-toast-component.md)
- [2026-09-06 Code ↔ Figma Token Reconciliation (Step 7B.2)](./design-system/2026-09-06-code-token-reconciliation.md)
- [2026-09-06 2026-09-06 Fix Critical & Major Figma Design System QA Issues](./design-system/2026-09-06-fix-critical-major-qa-issues.md)
- [2026-09-06 2026-09-06 Fix Minor Figma Design System QA Issues](./design-system/2026-09-06-fix-minor-qa-issues.md)
- [2026-09-07 Step 4G: AddonCompanionCard Molecule Component Reconciliation](./design-system/2026-09-07-addon-companion-card-component-reconciliation.md)
- [2026-09-07 Step 5C: AddressCard Molecule Component Reconciliation](./design-system/2026-09-07-address-card-component-reconciliation.md)
- [2026-09-07 Step 4H: AlertBanner Molecule Component Reconciliation](./design-system/2026-09-07-alert-banner-component-reconciliation.md)
- [2026-09-07 Avatar Atom Component Reconciliation](./design-system/2026-09-07-avatar-component-reconciliation.md)
- [2026-09-07 Badge Atom Component Reconciliation & OrderStatusBadge Unification](./design-system/2026-09-07-badge-component-reconciliation.md)
- [2026-09-07 Step 5G: Breadcrumbs Molecule Component Reconciliation](./design-system/2026-09-07-breadcrumbs-component-reconciliation.md)
- [2026-09-07 Button Atom Component Reconciliation & Storybook Setup](./design-system/2026-09-07-button-component-reconciliation.md)
- [2026-09-07 Step 5G: CartDrawer Organism Component Reconciliation](./design-system/2026-09-07-cart-drawer-reconciliation.md)
- [2026-09-07 Step 2E: CartItemRow Component Molecule Reconciliation](./design-system/2026-09-07-cart-item-row-component-reconciliation.md)
- [2026-09-07 Step 5A: CustomizationUploader Molecule Component Reconciliation](./design-system/2026-09-07-customization-uploader-reconciliation.md)
- [2026-09-07 Step 6A: DataTable Organism Component Reconciliation](./design-system/2026-09-07-datatable-component-reconciliation.md)
- [2026-09-07 Step 3B: EmptyState Component Reconciliation](./design-system/2026-09-07-empty-state-component-reconciliation.md)
- [2026-09-07 Step 4C: Footer Organism Component Reconciliation](./design-system/2026-09-07-footer-component-reconciliation.md)
- [2026-09-07 Step 2B: Form Controls Component Family Reconciliation](./design-system/2026-09-07-form-controls-component-family-reconciliation.md)
- [2026-09-07 Step 3A: Modal Component Reconciliation](./design-system/2026-09-07-modal-component-reconciliation.md)
- [2026-09-07 Step 5C: Navbar Organism Component Reconciliation](./design-system/2026-09-07-navbar-component-reconciliation.md)
- [2026-09-07 Phase 6C: OrderStatusBadge Molecule Component Reconciliation](./design-system/2026-09-07-order-status-badge-component-reconciliation.md)
- [2026-09-07 Step 5B: OrderStatusTimeline Molecule Component Reconciliation](./design-system/2026-09-07-order-status-timeline-reconciliation.md)
- [2026-09-07 Step 3C: OrderSummaryCard Component Organism Reconciliation](./design-system/2026-09-07-order-summary-card-component-reconciliation.md)
- [2026-09-07 Step 3H: Pagination Molecule Component Reconciliation](./design-system/2026-09-07-pagination-component-reconciliation.md)
- [2026-09-07 Step 2D: ProductCard Component Molecule Reconciliation](./design-system/2026-09-07-product-card-component-reconciliation.md)
- [2026-09-07 Step 4E: ProductImageGallery Organism Component Reconciliation](./design-system/2026-09-07-product-image-gallery-component-reconciliation.md)
- [2026-09-07 Step 2F: RatingStars Component Reconciliation](./design-system/2026-09-07-rating-stars-component-reconciliation.md)
- [2026-09-07 Spinner & Skeleton Atoms Reconciliation](./design-system/2026-09-07-spinner-and-skeleton-reconciliation.md)
- [2026-09-07 Step 3E: Tabs Molecule Component Reconciliation](./design-system/2026-09-07-tabs-component-reconciliation.md)
- [2026-09-07 Step 5H: TestimonialCard Molecule Component Reconciliation](./design-system/2026-09-07-testimonial-card-component-reconciliation.md)
- [2026-09-07 Step 4F: ThemeSelectorCard Molecule Component Reconciliation](./design-system/2026-09-07-theme-selector-card-component-reconciliation.md)
- [2026-09-07 Step 5E: Toast Component Molecule Reconciliation](./design-system/2026-09-07-toast-component-reconciliation.md)
- [2026-09-08 Step 8B: Design System Post-Audit Cleanups & Token Consolidation](./design-system/2026-09-08-design-system-post-audit-cleanup.md)
- [2026-09-09 Phase 8B - Responsive and Breakpoint Foundation](./design-system/2026-09-09-phase-8b-responsive-breakpoint-foundation.md)
- [2026-09-25 ComboBox Component Implementation](./design-system/2026-09-25-combobox-component.md)

---

## 📊 Summary
- **Total Changelogs**: 199 across 8 domain modules
- **Template Scaffold**: [`docs/changes/_template.md`](./_template.md)
- **Status**: 100% indexed (199 of 199 files registered)
