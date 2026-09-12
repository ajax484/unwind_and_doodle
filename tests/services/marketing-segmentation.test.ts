import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  validateSegmentRules,
  getSegmentCustomers,
  getSegmentCustomerCount,
  previewSegment,
} from '@/services/marketing-segmentation.service';
import { SegmentRuleValidationError } from '@/types/marketing';

describe('Marketing Segmentation Engine', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgA = 'org-11111111-1111-1111-1111-111111111111';
  const orgB = 'org-22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Organization Alpha' },
        { id: orgB, name: 'Organization Beta' },
      ],
      marketing_segments: [],
      customers: [],
      orders: [],
    });
  });

  // ==========================================================================
  // 1. RULE VALIDATION
  // ==========================================================================
  describe('Rule Validation (validateSegmentRules)', () => {
    it('accepts valid "all" and "any" rule definitions', () => {
      const validAll = {
        match: 'all',
        conditions: [
          { field: 'email', operator: 'contains', value: 'example.com' },
          { field: 'order_count', operator: 'greater_than', value: 2 },
        ],
      };
      expect(() => validateSegmentRules(validAll)).not.toThrow();

      const validAny = {
        match: 'any',
        conditions: [
          { field: 'last_order_at', operator: 'is_null' },
          { field: 'email_marketing_consent', operator: 'equals', value: true },
        ],
      };
      expect(() => validateSegmentRules(validAny)).not.toThrow();
    });

    it('rejects missing or invalid match parameter', () => {
      expect(() => validateSegmentRules({ conditions: [] })).toThrow(
        SegmentRuleValidationError
      );
      expect(() =>
        validateSegmentRules({ match: 'invalid', conditions: [{ field: 'email', operator: 'equals', value: 'a' }] })
      ).toThrow(/match must be either "all" or "any"/);
    });

    it('rejects empty or non-array conditions', () => {
      expect(() => validateSegmentRules({ match: 'all', conditions: [] })).toThrow(
        /conditions must be a non-empty array/
      );
      expect(() => validateSegmentRules({ match: 'all', conditions: 'not-an-array' })).toThrow(
        /conditions must be a non-empty array/
      );
    });

    it('rejects unsupported fields and operators', () => {
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'unsupported_field', operator: 'equals', value: 123 }],
        })
      ).toThrow(/unsupported field/);

      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'email', operator: 'unsupported_operator', value: 'test' }],
        })
      ).toThrow(/does not support operator/);
    });

    it('rejects invalid field and operator combinations', () => {
      // Numeric operator on string field
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'email', operator: 'greater_than', value: 10 }],
        })
      ).toThrow(/does not support operator/);

      // String operator on numeric field
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'order_count', operator: 'contains', value: '2' }],
        })
      ).toThrow(/does not support operator/);

      // Numeric operator on boolean field
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'email_marketing_consent', operator: 'greater_than', value: 1 }],
        })
      ).toThrow(/does not support operator/);

      // String operator on date field
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'created_at', operator: 'contains', value: '2026' }],
        })
      ).toThrow(/does not support operator/);
    });

    it('validates value types and between boundaries', () => {
      // Invalid date string
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'created_at', operator: 'before', value: 'not-a-date' }],
        })
      ).toThrow(/requires a valid ISO date string/);

      // Invalid numeric value
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'order_count', operator: 'greater_than', value: 'three' }],
        })
      ).toThrow(/requires a finite number value/);

      // Invalid numeric between (not array of 2)
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'total_spent', operator: 'between', value: [100] }],
        })
      ).toThrow(/requires an array of 2 finite numbers/);

      // Invalid date between
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'last_order_at', operator: 'between', value: ['2026-01-01', 'bad-date'] }],
        })
      ).toThrow(/requires an array of 2 valid date strings/);

      // is_null and is_not_null do not require a value
      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'first_name', operator: 'is_null' }],
        })
      ).not.toThrow();

      expect(() =>
        validateSegmentRules({
          match: 'all',
          conditions: [{ field: 'last_order_at', operator: 'is_not_null' }],
        })
      ).not.toThrow();
    });
  });

  // ==========================================================================
  // 2. CUSTOMER & PURCHASE SEGMENTATION EVALUATION
  // ==========================================================================
  describe('Segmentation Audience Evaluation', () => {
    beforeEach(() => {
      // Seed customers in Org A
      (mockSupabase as any)._store.customers = [
        {
          id: 'cust-1',
          organization_id: orgA,
          email: 'alice@gmail.com',
          first_name: 'Alice',
          last_name: 'Smith',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2026-01-15T10:00:00Z',
        },
        {
          id: 'cust-2',
          organization_id: orgA,
          email: 'bob@yahoo.com',
          first_name: 'Bob',
          last_name: null,
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          created_at: '2026-06-01T10:00:00Z',
        },
        {
          id: 'cust-3',
          organization_id: orgA,
          email: 'charlie@gmail.com',
          first_name: 'Charlie',
          last_name: 'Brown',
          email_marketing_consent: false, // NO CONSENT
          whatsapp_marketing_consent: true,
          created_at: '2026-07-01T10:00:00Z',
        },
        {
          id: 'cust-4',
          organization_id: orgA,
          email: 'dave@corporate.org',
          first_name: null,
          last_name: 'Miller',
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          created_at: '2026-08-01T10:00:00Z',
        },
        // Customer in Org B
        {
          id: 'cust-5',
          organization_id: orgB,
          email: 'eve@gmail.com',
          first_name: 'Eve',
          last_name: 'Adams',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2026-01-01T10:00:00Z',
        },
      ];

      // Seed orders in Org A
      (mockSupabase as any)._store.orders = [
        // Alice: 2 completed orders, total = 15000
        {
          id: 'ord-1',
          organization_id: orgA,
          customer_id: 'cust-1',
          status: 'confirmed',
          total: 5000,
          created_at: '2026-02-01T10:00:00Z',
        },
        {
          id: 'ord-2',
          organization_id: orgA,
          customer_id: 'cust-1',
          status: 'shipped',
          total: 10000,
          created_at: '2026-08-10T10:00:00Z',
        },
        // Bob: 1 completed order = 3000, 1 cancelled order = 99999
        {
          id: 'ord-3',
          organization_id: orgA,
          customer_id: 'cust-2',
          status: 'confirmed',
          total: 3000,
          created_at: '2026-06-15T10:00:00Z',
        },
        {
          id: 'ord-4',
          organization_id: orgA,
          customer_id: 'cust-2',
          status: 'cancelled',
          total: 99999,
          created_at: '2026-06-20T10:00:00Z',
        },
        // Charlie (no consent): 1 order
        {
          id: 'ord-5',
          organization_id: orgA,
          customer_id: 'cust-3',
          status: 'confirmed',
          total: 50000,
          created_at: '2026-08-01T10:00:00Z',
        },
        // Dave: 0 orders (never purchased)
      ];
    });

    it('filters by customer email contains and consent enforcement', async () => {
      // Segment: email contains 'gmail.com'
      const segmentId = 'seg-gmail';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segmentId,
          organization_id: orgA,
          name: 'Gmail Users',
          rules: {
            match: 'all',
            conditions: [{ field: 'email', operator: 'contains', value: 'gmail.com' }],
          },
          active: true,
        },
      ];

      const customers = await getSegmentCustomers(mockSupabase as any, orgA, segmentId);

      // Alice (consented) should match.
      // Charlie (gmail.com, but email_marketing_consent = false) must be strictly excluded!
      // Eve (gmail.com, but in Org B) must not be included!
      expect(customers.length).toBe(1);
      expect(customers[0].email).toBe('alice@gmail.com');
      expect(customers[0].first_name).toBe('Alice');
    });

    it('filters by customer name nullability and string operators', async () => {
      const segmentId = 'seg-no-first-name';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segmentId,
          organization_id: orgA,
          name: 'Missing First Name',
          rules: {
            match: 'all',
            conditions: [{ field: 'first_name', operator: 'is_null' }],
          },
          active: true,
        },
      ];

      const customers = await getSegmentCustomers(mockSupabase as any, orgA, segmentId);
      expect(customers.length).toBe(1);
      expect(customers[0].email).toBe('dave@corporate.org');
    });

    it('filters by purchase-derived order_count and total_spent', async () => {
      const segmentId = 'seg-repeat-buyers';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segmentId,
          organization_id: orgA,
          name: 'Repeat Buyers (order_count >= 2)',
          rules: {
            match: 'all',
            conditions: [{ field: 'order_count', operator: 'greater_than_or_equal', value: 2 }],
          },
          active: true,
        },
      ];

      const customers = await getSegmentCustomers(mockSupabase as any, orgA, segmentId);
      expect(customers.length).toBe(1);
      expect(customers[0].email).toBe('alice@gmail.com');
    });

    it('correctly handles customers with zero orders (order_count = 0, last_order_at is null)', async () => {
      const segmentId = 'seg-never-ordered';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segmentId,
          organization_id: orgA,
          name: 'Never Ordered',
          rules: {
            match: 'all',
            conditions: [
              { field: 'order_count', operator: 'equals', value: 0 },
              { field: 'last_order_at', operator: 'is_null' },
            ],
          },
          active: true,
        },
      ];

      const customers = await getSegmentCustomers(mockSupabase as any, orgA, segmentId);
      // Dave has 0 orders and email_marketing_consent = true
      expect(customers.length).toBe(1);
      expect(customers[0].email).toBe('dave@corporate.org');
    });

    it('excludes cancelled orders from total_spent and order_count', async () => {
      // Bob has 1 confirmed order of 3000, and 1 cancelled order of 99999.
      // His total_spent is 3000, NOT 102999.
      const segmentId = 'seg-high-spenders';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segmentId,
          organization_id: orgA,
          name: 'Big Spenders (> 10000)',
          rules: {
            match: 'all',
            conditions: [{ field: 'total_spent', operator: 'greater_than', value: 10000 }],
          },
          active: true,
        },
      ];

      const customers = await getSegmentCustomers(mockSupabase as any, orgA, segmentId);
      // Only Alice has total_spent = 15000
      expect(customers.length).toBe(1);
      expect(customers[0].email).toBe('alice@gmail.com');
    });

    it('evaluates logical "any" (OR) matching', async () => {
      const segmentId = 'seg-any';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segmentId,
          organization_id: orgA,
          name: 'Alice OR Dave',
          rules: {
            match: 'any',
            conditions: [
              { field: 'first_name', operator: 'equals', value: 'Alice' },
              { field: 'last_name', operator: 'equals', value: 'Miller' },
            ],
          },
          active: true,
        },
      ];

      const customers = await getSegmentCustomers(mockSupabase as any, orgA, segmentId);
      expect(customers.length).toBe(2);
      const emails = customers.map((c) => c.email);
      expect(emails).toContain('alice@gmail.com');
      expect(emails).toContain('dave@corporate.org');
    });

    it('enforces organization isolation: cannot access segments or customers of other orgs', async () => {
      const segB = 'seg-org-b';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segB,
          organization_id: orgB,
          name: 'Beta Segment',
          rules: {
            match: 'all',
            conditions: [{ field: 'email', operator: 'contains', value: 'eve' }],
          },
          active: true,
        },
      ];

      // Requesting from Org A must throw not found
      await expect(
        getSegmentCustomers(mockSupabase as any, orgA, segB)
      ).rejects.toThrow(/not found for this organization/);

      await expect(
        getSegmentCustomerCount(mockSupabase as any, orgA, segB)
      ).rejects.toThrow(/not found for this organization/);

      await expect(
        previewSegment(mockSupabase as any, orgA, segB)
      ).rejects.toThrow(/not found for this organization/);
    });

    it('provides previewSegment with limit and matches getSegmentCustomerCount', async () => {
      const segmentId = 'seg-all-org-a';
      (mockSupabase as any)._store.marketing_segments = [
        {
          id: segmentId,
          organization_id: orgA,
          name: 'All Consented Org A',
          rules: {
            match: 'any',
            conditions: [
              { field: 'created_at', operator: 'after', value: '2025-01-01T00:00:00Z' },
            ],
          },
          active: true,
        },
      ];

      // Total consented customers in Org A: Alice, Bob, Dave (Charlie has no consent) = 3
      const totalCount = await getSegmentCustomerCount(mockSupabase as any, orgA, segmentId);
      expect(totalCount).toBe(3);

      // Preview with limit = 2
      const preview = await previewSegment(mockSupabase as any, orgA, segmentId, { limit: 2 });
      expect(preview.total).toBe(3);
      expect(preview.customers.length).toBe(2);
    });
  });
});
