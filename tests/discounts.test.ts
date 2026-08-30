import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  validateAndCalculateDiscount,
  incrementDiscountUsageAtomic,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getDiscounts,
  getDiscountById,
} from '../src/services/discount.service';
import { calculateOrderPricing } from '../src/services/pricing.service';
import { processPaymentWebhook } from '../src/services/webhook.service';

describe('Phase 6G: Discounts & Coupons Engine', () => {
  const ORG_ID = 'org-88888';
  const ACTOR_ID = 'usr-admin-01';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: ORG_ID, name: 'Unwind Store', slug: 'unwind' }],
      categories: [
        { id: 'cat-books', name: 'Coloring Books', organization_id: ORG_ID, slug: 'coloring-books' },
        { id: 'cat-tools', name: 'Art Tools', organization_id: ORG_ID, slug: 'art-tools' },
      ],
      products: [
        { id: 'prod-book-a', name: 'Coloring Book A', selling_price: 5000, organization_id: ORG_ID, status: 'published' },
        { id: 'prod-book-b', name: 'Coloring Book B', selling_price: 5000, organization_id: ORG_ID, status: 'published' },
        { id: 'prod-[#pencil-c]', id_clean: 'prod-pencil-c', id_real: 'prod-pencil-c', id: 'prod-pencil-c', name: 'Pencil Set C', selling_price: 3000, organization_id: ORG_ID, status: 'published' },
      ],
      product_categories: [
        { product_id: 'prod-book-a', category_id: 'cat-books' },
        { product_id: 'prod-book-b', category_id: 'cat-books' },
        { product_id: 'prod-pencil-c', category_id: 'cat-tools' },
      ],
      warehouses: [{ id: 'wh-01', name: 'Lagos Hub', organization_id: ORG_ID, active: true }],
      delivery_rates: [{ id: 'del-01', warehouse_id: 'wh-01', location_id: 'loc-01', price: 2000, active: true }],
      discounts: [
        {
          id: 'disc-pct-20',
          organization_id: ORG_ID,
          code: 'SUMMER20',
          type: 'percentage',
          value: 20,
          minimum_order_amount: null,
          usage_limit: 100,
          usage_count: 15,
          starts_at: null,
          expires_at: null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'disc-fixed-2000',
          organization_id: ORG_ID,
          code: 'FLAT2000',
          type: 'fixed',
          value: 2000,
          minimum_order_amount: 10000,
          usage_limit: 10,
          usage_count: 0,
          starts_at: null,
          expires_at: null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'disc-expired',
          organization_id: ORG_ID,
          code: 'EXPIRED10',
          type: 'percentage',
          value: 10,
          minimum_order_amount: null,
          usage_limit: null,
          usage_count: 0,
          starts_at: null,
          expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'disc-future',
          organization_id: ORG_ID,
          code: 'FUTURE10',
          type: 'percentage',
          value: 10,
          minimum_order_amount: null,
          usage_limit: null,
          usage_count: 0,
          starts_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          expires_at: null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'disc-inactive',
          organization_id: ORG_ID,
          code: 'INACTIVE10',
          type: 'percentage',
          value: 10,
          minimum_order_amount: null,
          usage_limit: null,
          usage_count: 0,
          starts_at: null,
          expires_at: null,
          active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'disc-exhausted',
          organization_id: ORG_ID,
          code: 'LIMITREACHED',
          type: 'fixed',
          value: 1000,
          minimum_order_amount: null,
          usage_limit: 5,
          usage_count: 5,
          starts_at: null,
          expires_at: null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      discount_products: [],
      discount_categories: [],
    });
  });

  describe('1. Basic Validation & Discount Calculations', () => {
    it('validates percentage discount correctly (case-insensitive code search)', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'summer20', [
        { productId: 'prod-book-a', quantity: 2, unitPrice: 5000 }, // subtotal 10000
      ]);

      expect(result.valid).toBe(true);
      expect(result.code).toBe('SUMMER20');
      expect(result.discountAmount).toBe(2000); // 20% of 10,000 = 2,000
    });

    it('validates fixed amount discount correctly', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'FLAT2000', [
        { productId: 'prod-book-a', quantity: 2, unitPrice: 5000 },
        { productId: 'prod-book-b', quantity: 1, unitPrice: 5000 }, // subtotal 15000
      ]);

      expect(result.valid).toBe(true);
      expect(result.code).toBe('FLAT2000');
      expect(result.discountAmount).toBe(2000);
    });

    it('rejects invalid promo code', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'INVALIDCODE', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid promo code.');
    });

    it('rejects expired coupon code', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'EXPIRED10', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This coupon has expired.');
    });

    it('rejects future scheduled coupon code', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'FUTURE10', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This coupon has not started yet.');
    });

    it('rejects inactive coupon code', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'INACTIVE10', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This coupon is currently inactive.');
    });
  });

  describe('2. Minimum Order Amount Rules', () => {
    it('rejects coupon if subtotal is below minimum order amount', async () => {
      // FLAT2000 requires ₦10,000 minimum
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'FLAT2000', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 }, // subtotal 5000
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires a minimum order of ₦10,000');
    });

    it('accepts coupon if subtotal is exactly at minimum order amount', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'FLAT2000', [
        { productId: 'prod-book-a', quantity: 2, unitPrice: 5000 }, // subtotal 10000
      ]);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(2000);
    });

    it('accepts coupon if subtotal is above minimum order amount', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'FLAT2000', [
        { productId: 'prod-book-a', quantity: 3, unitPrice: 5000 }, // subtotal 15000
      ]);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(2000);
    });
  });

  describe('3. Usage Limit & Concurrency Protection', () => {
    it('rejects coupon when usage limit is reached', async () => {
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'LIMITREACHED', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This coupon has reached its usage limit.');
    });

    it('increments usage_count atomically on payment verification', async () => {
      const discBefore = mockSupabase._store.discounts.find((d: any) => d.id === 'disc-fixed-2000');
      expect(discBefore.usage_count).toBe(0);

      const success = await incrementDiscountUsageAtomic(mockSupabase, 'disc-fixed-2000', ORG_ID);
      expect(success).toBe(true);

      const discAfter = mockSupabase._store.discounts.find((d: any) => d.id === 'disc-fixed-2000');
      expect(discAfter.usage_count).toBe(1);
    });

    it('prevents incrementing beyond usage limit', async () => {
      // disc-exhausted is 5 / 5
      const success = await incrementDiscountUsageAtomic(mockSupabase, 'disc-exhausted', ORG_ID);
      expect(success).toBe(false);

      const discAfter = mockSupabase._store.discounts.find((d: any) => d.id === 'disc-exhausted');
      expect(discAfter.usage_count).toBe(5);
    });
  });

  describe('4. Scope & Merchandise Targeting (Products & Categories)', () => {
    it('applies product-specific discount only to eligible items in cart', async () => {
      // Create product-specific discount for Coloring Book A only
      mockSupabase._store.discounts.push({
        id: 'disc-book-a-only',
        organization_id: ORG_ID,
        code: 'BOOKA20',
        type: 'percentage',
        value: 20,
        minimum_order_amount: null,
        usage_limit: null,
        usage_count: 0,
        starts_at: null,
        expires_at: null,
        active: true,
      });
      mockSupabase._store.discount_products.push({
        discount_id: 'disc-book-a-only',
        product_id: 'prod-book-a',
      });

      // Cart contains Book A (₦5,000) and Book B (₦5,000)
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'BOOKA20', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
        { productId: 'prod-book-b', quantity: 1, unitPrice: 5000 },
      ]);

      expect(result.valid).toBe(true);
      expect(result.eligibleSubtotal).toBe(5000); // Only Book A qualifies
      expect(result.discountAmount).toBe(1000); // 20% of 5000 = 1000
    });

    it('applies category-specific discount to matching products', async () => {
      // Create category discount for Coloring Books category (prod-book-a & prod-book-b)
      mockSupabase._store.discounts.push({
        id: 'disc-books-cat',
        organization_id: ORG_ID,
        code: 'ALLBOOKS10',
        type: 'percentage',
        value: 10,
        minimum_order_amount: null,
        usage_limit: null,
        usage_count: 0,
        starts_at: null,
        expires_at: null,
        active: true,
      });
      mockSupabase._store.discount_categories.push({
        discount_id: 'disc-books-cat',
        category_id: 'cat-books',
      });

      // Cart contains Book A (5,000) and Pencil Set C (3,000 - Art Tools category)
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'ALLBOOKS10', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
        { productId: 'prod-pencil-c', quantity: 1, unitPrice: 3000 },
      ]);

      expect(result.valid).toBe(true);
      expect(result.eligibleSubtotal).toBe(5000); // Only Book A
      expect(result.discountAmount).toBe(500); // 10% of 5000
    });

    it('handles combined product + category targeting with deterministic OR logic', async () => {
      mockSupabase._store.discounts.push({
        id: 'disc-combined',
        organization_id: ORG_ID,
        code: 'SPECIALOR',
        type: 'percentage',
        value: 10,
        minimum_order_amount: null,
        usage_limit: null,
        usage_count: 0,
        starts_at: null,
        expires_at: null,
        active: true,
      });
      // Specific product: Pencil C
      mockSupabase._store.discount_products.push({
        discount_id: 'disc-combined',
        product_id: 'prod-pencil-c',
      });
      // Specific category: Books
      mockSupabase._store.discount_categories.push({
        discount_id: 'disc-combined',
        category_id: 'cat-books',
      });

      // Cart has Book A (5000), Pencil C (3000)
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'SPECIALOR', [
        { productId: 'prod-book-a', quantity: 1, unitPrice: 5000 },
        { productId: 'prod-pencil-c', quantity: 1, unitPrice: 3000 },
      ]);

      expect(result.valid).toBe(true);
      expect(result.eligibleSubtotal).toBe(8000); // Both match via OR logic
      expect(result.discountAmount).toBe(800);
    });

    it('rejects coupon if cart contains no eligible products', async () => {
      mockSupabase._store.discounts.push({
        id: 'disc-books-only',
        organization_id: ORG_ID,
        code: 'BOOKSONLY',
        type: 'percentage',
        value: 20,
        minimum_order_amount: null,
        usage_limit: null,
        usage_count: 0,
        starts_at: null,
        expires_at: null,
        active: true,
      });
      mockSupabase._store.discount_categories.push({
        discount_id: 'disc-books-only',
        category_id: 'cat-books',
      });

      // Cart contains only Pencil Set C (cat-tools)
      const result = await validateAndCalculateDiscount(mockSupabase, ORG_ID, 'BOOKSONLY', [
        { productId: 'prod-pencil-c', quantity: 1, unitPrice: 3000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This coupon does not apply to the products in your cart.');
    });
  });

  describe('5. Pricing Integration & Authoritative Security', () => {
    it('caps fixed discount so order total never becomes negative', async () => {
      mockSupabase._store.discounts.push({
        id: 'disc-huge',
        organization_id: ORG_ID,
        code: 'HUGE100000',
        type: 'fixed',
        value: 100000,
        minimum_order_amount: null,
        usage_limit: null,
        usage_count: 0,
        starts_at: null,
        expires_at: null,
        active: true,
      });

      const pricing = await calculateOrderPricing({
        supabase: mockSupabase,
        warehouseId: 'wh-01',
        locationId: 'loc-01',
        items: [{ productId: 'prod-book-a', quantity: 1 }], // price 5,000 + shipping 2,000 = 7,000
        discountCode: 'HUGE100000',
        organizationId: ORG_ID,
      });

      expect(pricing.subtotal).toBe(5000);
      expect(pricing.discountTotal).toBe(5000); // capped at subtotal
      expect(pricing.deliveryFee).toBe(2000);
      expect(pricing.total).toBe(2000); // 5000 - 5000 + 2000 = 2000 (never negative)
    });

    it('ensures shipping fee is never discounted accidentally', async () => {
      const pricing = await calculateOrderPricing({
        supabase: mockSupabase,
        warehouseId: 'wh-01',
        locationId: 'loc-01',
        items: [{ productId: 'prod-book-a', quantity: 2 }], // 10,000
        discountCode: 'SUMMER20', // 20% off 10,000 = 2,000
        organizationId: ORG_ID,
      });

      expect(pricing.subtotal).toBe(10000);
      expect(pricing.discountTotal).toBe(2000);
      expect(pricing.deliveryFee).toBe(2000);
      expect(pricing.total).toBe(10000); // 10,000 - 2,000 + 2,000 = 10,000
    });

    it('enforces organization isolation for coupon validation', async () => {
      const OTHER_ORG = 'org-other-999';
      // Attempting to validate SUMMER20 (which belongs to ORG_ID) under OTHER_ORG
      const result = await validateAndCalculateDiscount(mockSupabase, OTHER_ORG, 'SUMMER20', [
        { productId: 'prod-book-a', quantity: 2, unitPrice: 5000 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid promo code.');
    });
  });

  describe('6. Admin Management & Audit Logging', () => {
    it('creates a new discount and records audit log', async () => {
      const newDisc = await createDiscount(mockSupabase, ORG_ID, ACTOR_ID, {
        code: 'NEWYEAR50',
        type: 'fixed',
        value: 5000,
        minimum_order_amount: 20000,
        scope: 'store_wide',
      });

      expect(newDisc.code).toBe('NEWYEAR50');
      expect(newDisc.value).toBe(5000);

      const auditLogs = mockSupabase._store.audit_logs;
      const log = auditLogs.find((l: any) => l.entity_id === newDisc.id);
      expect(log).toBeDefined();
      expect(log.action).toBe('create');
      expect(log.entity_type).toBe('discount');
    });

    it('updates a discount and logs changes', async () => {
      const updated = await updateDiscount(mockSupabase, ORG_ID, ACTOR_ID, 'disc-pct-20', {
        value: 25,
      });

      expect(updated.value).toBe(25);
      const log = mockSupabase._store.audit_logs.find(
        (l: any) => l.entity_id === 'disc-pct-20' && l.action === 'update'
      );
      expect(log).toBeDefined();
    });

    it('soft-disables a discount if it has historical redemptions', async () => {
      // disc-pct-20 has usage_count = 15
      const res = await deleteDiscount(mockSupabase, ORG_ID, ACTOR_ID, 'disc-pct-20');
      expect(res.softDisabled).toBe(true);

      const disc = mockSupabase._store.discounts.find((d: any) => d.id === 'disc-pct-20');
      expect(disc.active).toBe(false);
    });

    it('hard-deletes an unused discount', async () => {
      // disc-fixed-2000 has usage_count = 0
      const res = await deleteDiscount(mockSupabase, ORG_ID, ACTOR_ID, 'disc-fixed-2000');
      expect(res.softDisabled).toBe(false);

      const disc = mockSupabase._store.discounts.find((d: any) => d.id === 'disc-fixed-2000');
      expect(disc).toBeUndefined();
    });
  });

  describe('7. Historical Order Integrity', () => {
    it('preserves historical order discount snapshot when admin edits or disables discount', async () => {
      // Simulate historical order created with SUMMER20 discount snapshot
      mockSupabase._store.orders.push({
        id: 'ord-hist-01',
        order_number: 'ORD-HIST-01',
        organization_id: ORG_ID,
        discount_id: 'disc-pct-20',
        discount_code: 'SUMMER20',
        discount_total: 2000,
        subtotal: 10000,
        shipping_fee: 2000,
        total: 10000,
        status: 'confirmed',
      });

      // Admin updates discount to 50% and deactivates it
      await updateDiscount(mockSupabase, ORG_ID, ACTOR_ID, 'disc-pct-20', {
        value: 50,
        active: false,
      });

      // Verify historical order retains original snapshot
      const histOrder = mockSupabase._store.orders.find((o: any) => o.id === 'ord-hist-01');
      expect(histOrder.discount_code).toBe('SUMMER20');
      expect(histOrder.discount_total).toBe(2000);
      expect(histOrder.total).toBe(10000);
    });
  });
});
