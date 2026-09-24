import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  validateSegmentRules,
  getSegmentCustomers,
  getSegmentCustomerCount,
  previewSegment,
  previewSegmentRules,
} from '@/services/marketing-segmentation.service';
import { SegmentRuleValidationError } from '@/types/marketing';

describe('Step 17B: Product-Aware & Location-Aware Marketing Audiences', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgA = 'org-11111111-1111-1111-1111-111111111111';
  const orgB = 'org-22222222-2222-2222-2222-222222222222';

  const prodBookA = 'prod-aaaa-1111-1111-1111-111111111111';
  const prodBookB = 'prod-bbbb-2222-2222-2222-222222222222';
  const prodKitC = 'prod-cccc-3333-3333-3333-333333333333';
  const prodOrgB = 'prod-orgb-9999-9999-9999-999999999999';

  const custAlice = 'cust-alice-111';
  const custBob = 'cust-bob-222';
  const custCarol = 'cust-carol-333';
  const custDave = 'cust-dave-444';
  const custEve = 'cust-eve-555';
  const custFrank = 'cust-frank-666';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Organization Alpha' },
        { id: orgB, name: 'Organization Beta' },
      ],
      products: [
        { id: prodBookA, organization_id: orgA, name: 'Cozy Animals Coloring Book', status: 'published' },
        { id: prodBookB, organization_id: orgA, name: 'Vent to Me Journal', status: 'published' },
        { id: prodKitC, organization_id: orgA, name: 'Unwind Kit', status: 'published' },
        { id: prodOrgB, organization_id: orgB, name: 'Beta Only Product', status: 'published' },
      ],
      customers: [
        {
          id: custAlice,
          organization_id: orgA,
          email: 'alice@example.com',
          first_name: 'Alice',
          last_name: 'Adeyemi',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2026-01-10T10:00:00Z',
        },
        {
          id: custBob,
          organization_id: orgA,
          email: 'bob@example.com',
          first_name: 'Bob',
          last_name: 'Okafor',
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          created_at: '2026-01-15T10:00:00Z',
        },
        {
          id: custCarol,
          organization_id: orgA,
          email: 'carol@example.com',
          first_name: 'Carol',
          last_name: 'Danjuma',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2026-02-01T10:00:00Z',
        },
        {
          id: custDave,
          organization_id: orgA,
          email: 'dave@example.com',
          first_name: 'Dave',
          last_name: 'Bello',
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          created_at: '2026-02-10T10:00:00Z',
        },
        {
          id: custFrank, // Customer with no orders, only default customer_address
          organization_id: orgA,
          email: 'frank@example.com',
          first_name: 'Frank',
          last_name: 'Eze',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2026-02-15T10:00:00Z',
        },
        {
          id: custEve,
          organization_id: orgB, // Different Org
          email: 'eve@example.com',
          first_name: 'Eve',
          last_name: 'Audu',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2026-01-01T10:00:00Z',
        },
      ],
      customer_addresses: [
        {
          id: 'addr-frank',
          customer_id: custFrank,
          recipient_name: 'Frank Eze',
          phone: '08012345678',
          address_line_1: '12 Marina Road',
          state: 'Lagos',
          lga: 'Lagos Island',
          is_default: true,
        },
      ],
      orders: [
        // Alice: Bought Book A (Lagos, Ikeja)
        {
          id: 'ord-alice-1',
          organization_id: orgA,
          customer_id: custAlice,
          status: 'confirmed',
          total: 8500,
          shipping_address: { state: 'Lagos', city: 'Ikeja', streetAddress: '10 Allen Ave' },
          created_at: '2026-03-01T10:00:00Z',
        },
        // Bob: Bought Book A AND Book B in same order (Abuja, Garki)
        {
          id: 'ord-bob-1',
          organization_id: orgA,
          customer_id: custBob,
          status: 'confirmed',
          total: 16000,
          shipping_address: { state: 'Federal Capital Territory', city: 'Abuja (Garki)' },
          created_at: '2026-03-05T10:00:00Z',
        },
        // Carol: Order 1 in Kano (earlier order), Order 2 in Lagos (most recent qualifying order!)
        {
          id: 'ord-carol-1',
          organization_id: orgA,
          customer_id: custCarol,
          status: 'confirmed',
          total: 25000,
          shipping_address: { state: 'Kano', city: 'Kano' },
          created_at: '2026-01-15T10:00:00Z',
        },
        {
          id: 'ord-carol-2',
          organization_id: orgA,
          customer_id: custCarol,
          status: 'shipped',
          total: 25000,
          shipping_address: { state: 'Lagos', city: 'Lekki' },
          created_at: '2026-03-20T10:00:00Z',
        },
        // Dave: Has unpaid and cancelled orders (must not qualify!)
        {
          id: 'ord-dave-unpaid',
          organization_id: orgA,
          customer_id: custDave,
          status: 'created', // UNPAID
          total: 8500,
          shipping_address: { state: 'Lagos', city: 'Yaba' },
          created_at: '2026-03-21T10:00:00Z',
        },
        {
          id: 'ord-dave-cancelled',
          organization_id: orgA,
          customer_id: custDave,
          status: 'cancelled', // CANCELLED
          total: 16000,
          shipping_address: { state: 'Lagos', city: 'Yaba' },
          created_at: '2026-03-22T10:00:00Z',
        },
        // Eve (in Org B): Bought Org B product
        {
          id: 'ord-eve-1',
          organization_id: orgB,
          customer_id: custEve,
          status: 'confirmed',
          total: 5000,
          shipping_address: { state: 'Lagos', city: 'Victoria Island' },
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
      order_items: [
        { id: 'item-1', order_id: 'ord-alice-1', product_id: prodBookA, quantity: 1 },
        { id: 'item-2', order_id: 'ord-bob-1', product_id: prodBookA, quantity: 1 },
        { id: 'item-3', order_id: 'ord-bob-1', product_id: prodBookB, quantity: 1 },
        { id: 'item-4', order_id: 'ord-carol-1', product_id: prodKitC, quantity: 1 },
        { id: 'item-5', order_id: 'ord-carol-2', product_id: prodKitC, quantity: 1 },
        { id: 'item-6', order_id: 'ord-dave-unpaid', product_id: prodBookA, quantity: 1 },
        { id: 'item-7', order_id: 'ord-dave-cancelled', product_id: prodBookB, quantity: 1 },
        { id: 'item-8', order_id: 'ord-eve-1', product_id: prodOrgB, quantity: 1 },
      ],
      marketing_segments: [],
    });
  });

  // ==========================================================================
  // 1. RULE VALIDATION
  // ==========================================================================
  describe('Rule Validation', () => {
    it('accepts valid purchased_product and not_purchased_product rules', () => {
      const validSingle = {
        match: 'all',
        conditions: [
          { field: 'purchased_product', operator: 'equals', value: prodBookA },
          { field: 'not_purchased_product', operator: 'equals', value: prodBookB },
        ],
      };
      expect(() => validateSegmentRules(validSingle)).not.toThrow();
    });

    it('accepts valid purchased_any_product and purchased_all_products rules', () => {
      const validMulti = {
        match: 'all',
        conditions: [
          { field: 'purchased_any_product', operator: 'in', value: [prodBookA, prodBookB] },
          { field: 'purchased_all_products', operator: 'in', value: [prodBookA, prodKitC] },
        ],
      };
      expect(() => validateSegmentRules(validMulti)).not.toThrow();
    });

    it('accepts valid shipping_state and shipping_city rules', () => {
      const validLocation = {
        match: 'all',
        conditions: [
          { field: 'shipping_state', operator: 'equals', value: 'Lagos' },
          { field: 'shipping_city', operator: 'contains', value: 'Ikeja' },
          { field: 'shipping_state', operator: 'in', value: ['Lagos', 'Abuja'] },
          { field: 'shipping_state', operator: 'is_not_null' },
        ],
      };
      expect(() => validateSegmentRules(validLocation)).not.toThrow();
    });

    it('rejects product rules with missing or empty values', () => {
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'purchased_product', operator: 'equals', value: '' }],
        })
      ).toThrow(/requires a non-empty product ID string/);

      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'purchased_any_product', operator: 'in', value: [] }],
        })
      ).toThrow(/requires a non-empty array of product ID strings/);

      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'purchased_all_products', operator: 'in', value: ['   '] }],
        })
      ).toThrow(/requires a non-empty array of product ID strings/);
    });

    it('rejects unsupported operators for product fields', () => {
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'purchased_product', operator: 'contains', value: prodBookA }],
        })
      ).toThrow(/does not support operator "contains"/);

      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'purchased_any_product', operator: 'equals', value: prodBookA }],
        })
      ).toThrow(/does not support operator "equals"/);
    });
  });

  // ==========================================================================
  // 2. PRODUCT-AWARE AUDIENCE EVALUATION
  // ==========================================================================
  describe('Product-Aware Purchases & Predicates', () => {
    it('evaluates purchased_product: matches customers with qualifying orders', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [{ field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA }],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = customers.customers.map((c) => c.email);

      // Alice and Bob bought Book A.
      // Carol only bought Kit C.
      // Dave only has unpaid/cancelled orders for Book A (must NOT match).
      // Eve is in Org B (must NOT match).
      expect(customers.total).toBe(2);
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@example.com');
      expect(emails).not.toContain('carol@example.com');
      expect(emails).not.toContain('dave@example.com');
    });

    it('evaluates not_purchased_product: matches customers who have not purchased the product', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [{ field: 'not_purchased_product' as const, operator: 'equals' as const, value: prodBookB }],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = customers.customers.map((c) => c.email);

      // Bob purchased Book B.
      // Alice and Carol have NOT purchased Book B.
      // Dave has a cancelled order for Book B (not a qualifying purchase, so Dave has not purchased).
      // Frank has no orders at all.
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('carol@example.com');
      expect(emails).toContain('dave@example.com');
      expect(emails).toContain('frank@example.com');
      expect(emails).not.toContain('bob@example.com');
    });

    it('evaluates cross-sell audience: Purchased A AND Has NOT purchased B', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
          { field: 'not_purchased_product' as const, operator: 'equals' as const, value: prodBookB },
        ],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(customers.total).toBe(1);
      expect(customers.customers[0].email).toBe('alice@example.com');
    });

    it('evaluates purchased_any_product against order history', async () => {
      // Purchased any of [Book B, Kit C]
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_any_product' as const, operator: 'in' as const, value: [prodBookB, prodKitC] },
        ],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = customers.customers.map((c) => c.email);

      // Bob bought Book B; Carol bought Kit C. Alice only bought Book A.
      expect(customers.total).toBe(2);
      expect(emails).toContain('bob@example.com');
      expect(emails).toContain('carol@example.com');
      expect(emails).not.toContain('alice@example.com');
    });

    it('evaluates purchased_all_products against order history', async () => {
      // Purchased all of [Book A, Book B]
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_all_products' as const, operator: 'in' as const, value: [prodBookA, prodBookB] },
        ],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);

      // Only Bob bought both Book A and Book B
      expect(customers.total).toBe(1);
      expect(customers.customers[0].email).toBe('bob@example.com');
    });

    it('handles multiple products purchased in a single order', async () => {
      // Bob bought Book A and Book B in the exact same order ord-bob-1
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookB },
        ],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(customers.total).toBe(1);
      expect(customers.customers[0].email).toBe('bob@example.com');
    });

    it('handles repeated purchases of the same product without duplicate errors', async () => {
      // Carol bought Kit C in order 1 and order 2
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodKitC },
        ],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(customers.total).toBe(1);
      expect(customers.customers[0].email).toBe('carol@example.com');
    });

    it('verifies product identity uses stable UUIDs (name changes do not break matching)', async () => {
      // Change the product display name in store
      const prodA = (mockSupabase as any)._store.products.find((p: any) => p.id === prodBookA);
      prodA.name = 'Completely Renamed Deluxe Edition 2026';

      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
        ],
      };

      const customers = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = customers.customers.map((c) => c.email);

      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@example.com');
    });

    it('strictly excludes unpaid, pending, cancelled, and refunded orders', async () => {
      // Dave has created (unpaid) for Book A, and cancelled for Book B
      const rulesA = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
        ],
      };
      const resA = await previewSegmentRules(mockSupabase as any, orgA, rulesA);
      expect(resA.customers.map((c) => c.email)).not.toContain('dave@example.com');

      const rulesB = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookB },
        ],
      };
      const resB = await previewSegmentRules(mockSupabase as any, orgA, rulesB);
      expect(resB.customers.map((c) => c.email)).not.toContain('dave@example.com');
    });
  });

  // ==========================================================================
  // 3. LOCATION-AWARE SEGMENTATION
  // ==========================================================================
  describe('Location-Aware Segmentation', () => {
    it('matches by latest order shipping_state', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'shipping_state' as const, operator: 'equals' as const, value: 'Lagos' },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = res.customers.map((c) => c.email);

      // Alice's latest order is Lagos
      // Carol's most recent order (ord-carol-2) is Lagos (her older order was Kano)
      // Frank has no orders, but his customer_address default is Lagos
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('carol@example.com');
      expect(emails).toContain('frank@example.com');
      // Bob's latest order is Federal Capital Territory (Abuja)
      expect(emails).not.toContain('bob@example.com');
    });

    it('strictly enforces latest-location semantics over historical locations', async () => {
      // Carol ordered in Kano in January, but her latest order in March was in Lagos.
      // Therefore, a rule targeting Kano must NOT match Carol under latest-location semantics.
      const rulesKano = {
        match: 'all' as const,
        conditions: [
          { field: 'shipping_state' as const, operator: 'equals' as const, value: 'Kano' },
        ],
      };

      const resKano = await previewSegmentRules(mockSupabase as any, orgA, rulesKano);
      expect(resKano.customers.map((c) => c.email)).not.toContain('carol@example.com');
    });

    it('matches by latest order shipping_city with case and whitespace normalization', async () => {
      // Alice is in "Ikeja"
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'shipping_city' as const, operator: 'equals' as const, value: '  IKEJA  ' },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(res.total).toBe(1);
      expect(res.customers[0].email).toBe('alice@example.com');
    });

    it('supports shipping_state with operator "in"', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [
          {
            field: 'shipping_state' as const,
            operator: 'in' as const,
            value: ['lagos', 'federal capital territory'],
          },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = res.customers.map((c) => c.email);

      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@example.com');
      expect(emails).toContain('carol@example.com');
    });

    it('falls back cleanly to default customer_addresses for customers with no orders', async () => {
      // Frank has zero orders, but a default customer_address in Lagos Island
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'shipping_city' as const, operator: 'equals' as const, value: 'Lagos Island' },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(res.total).toBe(1);
      expect(res.customers[0].email).toBe('frank@example.com');
    });
  });

  // ==========================================================================
  // 4. RULE COMPOSITION (AND / OR)
  // ==========================================================================
  describe('Rule Composition', () => {
    it('composes Product + Location: Purchased Book A AND Shipping State is Lagos', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
          { field: 'shipping_state' as const, operator: 'equals' as const, value: 'Lagos' },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);

      // Both Alice and Bob bought Book A, but only Alice's shipping state is Lagos (Bob is Abuja)
      expect(res.total).toBe(1);
      expect(res.customers[0].email).toBe('alice@example.com');
    });

    it('composes OR logic: Purchased Book A OR Purchased Kit C', async () => {
      const rules = {
        match: 'any' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodKitC },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = res.customers.map((c) => c.email);

      // Alice, Bob (Book A) and Carol (Kit C)
      expect(res.total).toBe(3);
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@example.com');
      expect(emails).toContain('carol@example.com');
    });

    it('composes Product + Customer Attribute: Purchased Book A AND first_name = Alice', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
          { field: 'first_name' as const, operator: 'equals' as const, value: 'Alice' },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(res.total).toBe(1);
      expect(res.customers[0].email).toBe('alice@example.com');
    });
  });

  // ==========================================================================
  // 5. DYNAMIC EVALUATION
  // ==========================================================================
  describe('Dynamic Evaluation', () => {
    it('re-evaluates audience membership dynamically when new orders are placed', async () => {
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodKitC },
        ],
      };

      // 1. Initial check: Only Carol has bought Kit C
      const initial = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(initial.total).toBe(1);
      expect(initial.customers[0].email).toBe('carol@example.com');

      // 2. Alice now places an order for Kit C
      (mockSupabase as any)._store.orders.push({
        id: 'ord-alice-new',
        organization_id: orgA,
        customer_id: custAlice,
        status: 'confirmed',
        total: 25000,
        shipping_address: { state: 'Lagos', city: 'Ikeja' },
        created_at: '2026-04-10T10:00:00Z',
      });
      (mockSupabase as any)._store.order_items.push({
        id: 'item-new',
        order_id: 'ord-alice-new',
        product_id: prodKitC,
        quantity: 1,
      });

      // 3. Re-evaluate audience without manual audience rebuild
      const updated = await previewSegmentRules(mockSupabase as any, orgA, rules);
      const emails = updated.customers.map((c) => c.email);

      expect(updated.total).toBe(2);
      expect(emails).toContain('carol@example.com');
      expect(emails).toContain('alice@example.com');
    });
  });

  // ==========================================================================
  // 6. TENANT ISOLATION & FAIL-SAFE HANDLING
  // ==========================================================================
  describe('Tenant Isolation & Fail-Safe Handling', () => {
    it('fails safely when referencing a cross-tenant product ID (Org A cannot match Org B product)', async () => {
      // Attempting to segment Org A using Org B's product
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodOrgB },
        ],
      };

      const res = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(res.total).toBe(0);
      expect(res.customers.length).toBe(0);
    });

    it('fails safely when referencing a non-existent or deleted product ID', async () => {
      const nonExistentProductId = 'prod-dead-0000-0000-0000-000000000000';

      // 1. purchased_product with non-existent product should return 0 matches
      const rulesPurchased = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: nonExistentProductId },
        ],
      };
      const resPurchased = await previewSegmentRules(mockSupabase as any, orgA, rulesPurchased);
      expect(resPurchased.total).toBe(0);

      // 2. not_purchased_product with non-existent product must FAIL SAFELY to 0 matches
      // rather than accidentally matching ALL customers in the system!
      const rulesNotPurchased = {
        match: 'all' as const,
        conditions: [
          { field: 'not_purchased_product' as const, operator: 'equals' as const, value: nonExistentProductId },
        ],
      };
      const resNotPurchased = await previewSegmentRules(mockSupabase as any, orgA, rulesNotPurchased);
      expect(resNotPurchased.total).toBe(0);
    });

    it('strictly isolates customer data between tenants', async () => {
      // Eve is in Org B and bought prodOrgB
      const rules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodOrgB },
        ],
      };

      // In Org B, Eve matches
      const resB = await previewSegmentRules(mockSupabase as any, orgB, rules);
      expect(resB.total).toBe(1);
      expect(resB.customers[0].email).toBe('eve@example.com');

      // In Org A, Eve NEVER appears
      const resA = await previewSegmentRules(mockSupabase as any, orgA, rules);
      expect(resA.total).toBe(0);
    });
  });
});
