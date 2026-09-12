import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { setServiceSupabaseClient } from '@/lib/supabase/client';
import {
  GET as getSegmentsHandler,
  POST as createSegmentHandler,
} from '@/app/api/admin/marketing/segments/route';
import { POST as previewSegmentHandler } from '@/app/api/admin/marketing/segments/preview/route';
import {
  GET as getSegmentByIdHandler,
  PATCH as updateSegmentHandler,
  DELETE as deleteSegmentHandler,
} from '@/app/api/admin/marketing/segments/[id]/route';
import {
  validateSegmentRules,
  previewSegmentRules,
} from '@/services/marketing-segmentation.service';
import { SegmentRuleValidationError } from '@/types/marketing';

describe('Marketing Customer Segment Creation & Management', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgAlpha = 'org-11111111-1111-1111-1111-111111111111';
  const orgBeta = 'org-22222222-2222-2222-2222-222222222222';
  const adminAlphaId = 'user-admin-alpha';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgAlpha, name: 'Alpha Org', slug: 'alpha' },
        { id: orgBeta, name: 'Beta Org', slug: 'beta' },
      ],
      organization_members: [
        {
          id: 'mem-alpha',
          organization_id: orgAlpha,
          user_id: adminAlphaId,
          role: 'admin',
        },
      ],
      marketing_segments: [
        {
          id: 'seg-alpha-1',
          organization_id: orgAlpha,
          name: 'Existing Alpha Segment',
          description: 'A pre-existing segment',
          rules: {
            match: 'all',
            conditions: [
              { field: 'order_count', operator: 'greater_than', value: 0 },
            ],
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'seg-beta-1',
          organization_id: orgBeta,
          name: 'Beta Segment',
          description: 'Belongs to Beta',
          rules: {
            match: 'all',
            conditions: [],
          },
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      customers: [
        {
          id: 'cust-1',
          organization_id: orgAlpha,
          email: 'alice@example.com',
          first_name: 'Alice',
          last_name: 'Smith',
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          created_at: '2026-01-10T10:00:00Z',
        },
        {
          id: 'cust-2',
          organization_id: orgAlpha,
          email: 'bob@example.com',
          first_name: 'Bob',
          last_name: 'Jones',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2026-03-15T12:00:00Z',
        },
        {
          id: 'cust-3-no-consent',
          organization_id: orgAlpha,
          email: 'charlie@example.com',
          first_name: 'Charlie',
          last_name: 'Brown',
          email_marketing_consent: false, // Must be excluded by consent rule
          whatsapp_marketing_consent: false,
          created_at: '2026-04-01T10:00:00Z',
        },
      ],
      orders: [
        {
          id: 'ord-1',
          organization_id: orgAlpha,
          customer_id: 'cust-1',
          total: 25000,
          status: 'delivered',
          created_at: '2026-02-01T10:00:00Z',
        },
        {
          id: 'ord-2',
          organization_id: orgAlpha,
          customer_id: 'cust-1',
          total: 35000,
          status: 'delivered',
          created_at: '2026-02-15T10:00:00Z',
        },
        {
          id: 'ord-3',
          organization_id: orgAlpha,
          customer_id: 'cust-2',
          total: 15000,
          status: 'delivered',
          created_at: '2026-03-20T10:00:00Z',
        },
      ],
    });

    setServiceSupabaseClient(mockSupabase as any);
  });

  afterEach(() => {
    setServiceSupabaseClient(null);
  });

  function createAdminRequest(
    url: string,
    options: {
      method?: string;
      body?: any;
      unauthenticated?: boolean;
    } = {}
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!options.unauthenticated) {
      headers['x-admin-user-id'] = adminAlphaId;
      headers['x-test-admin-id'] = adminAlphaId;
      headers['x-organization-id'] = orgAlpha;
      headers['x-test-admin-email'] = 'admin@alpha.com';
    }

    return new NextRequest(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  // ==========================================================================
  // 1. IN-FLIGHT PREVIEW (previewSegmentRules & POST /api/admin/marketing/segments/preview)
  // ==========================================================================
  describe('Audience Preview Engine', () => {
    it('previews customers from in-flight valid rules without saving to DB', async () => {
      const validRules = {
        match: 'all' as const,
        conditions: [
          { field: 'order_count' as const, operator: 'greater_than' as const, value: 1 },
        ],
      };

      const preview = await previewSegmentRules(mockSupabase as any, orgAlpha, validRules);
      expect(preview.total).toBe(1);
      expect(preview.customers).toHaveLength(1);
      expect(preview.customers[0].email).toBe('alice@example.com');
    });

    it('enforces mandatory email marketing consent in in-flight preview', async () => {
      const broadRules = {
        match: 'any' as const,
        conditions: [
          { field: 'email', operator: 'contains', value: 'example.com' },
        ],
      };

      const preview = await previewSegmentRules(mockSupabase as any, orgAlpha, broadRules);
      // cust-1 and cust-2 have consent=true; cust-3 has consent=false -> strictly excluded
      expect(preview.total).toBe(2);
      expect(preview.customers.map((c) => c.email)).not.toContain('charlie@example.com');
    });

    it('API POST /api/admin/marketing/segments/preview returns count and preview list', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments/preview', {
        method: 'POST',
        body: {
          rules: {
            match: 'all',
            conditions: [
              { field: 'total_spent', operator: 'greater_than', value: 20000 },
            ],
          },
          limit: 5,
        },
      });

      const res = await previewSegmentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(1); // Alice total_spent is 60000 > 20000
      expect(json.customers[0].email).toBe('alice@example.com');
    });

    it('API POST /api/admin/marketing/segments/preview rejects malformed rules with 400', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments/preview', {
        method: 'POST',
        body: {
          rules: {
            match: 'invalid_match',
            conditions: [],
          },
        },
      });

      const res = await previewSegmentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('match must be either');
    });
  });

  // ==========================================================================
  // 2. SEGMENT CREATION (POST /api/admin/marketing/segments)
  // ==========================================================================
  describe('Segment Creation API Route', () => {
    it('creates a new segment with valid name, description, and rules', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments', {
        method: 'POST',
        body: {
          name: 'High Spenders',
          description: 'Customers with over 50,000 NGN spent',
          rules: {
            match: 'all',
            conditions: [
              { field: 'total_spent', operator: 'greater_than', value: 50000 },
            ],
          },
        },
      });

      const res = await createSegmentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.name).toBe('High Spenders');
      expect(json.data.organization_id).toBe(orgAlpha);
    });

    it('rejects creation with empty or whitespace-only name', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments', {
        method: 'POST',
        body: {
          name: '   ',
          rules: {
            match: 'all',
            conditions: [
              { field: 'order_count', operator: 'greater_than', value: 0 },
            ],
          },
        },
      });

      const res = await createSegmentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Segment name is required');
    });

    it('rejects creation with name exceeding 100 characters', async () => {
      const longName = 'A'.repeat(101);
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments', {
        method: 'POST',
        body: {
          name: longName,
          rules: {
            match: 'all',
            conditions: [
              { field: 'order_count', operator: 'greater_than', value: 0 },
            ],
          },
        },
      });

      const res = await createSegmentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('cannot exceed 100 characters');
    });

    it('rejects creation with invalid condition operators or fields', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments', {
        method: 'POST',
        body: {
          name: 'Invalid Field Segment',
          rules: {
            match: 'all',
            conditions: [
              { field: 'non_existent_field', operator: 'equals', value: 'xyz' },
            ],
          },
        },
      });

      const res = await createSegmentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('unsupported field');
    });

    it('rejects unauthenticated requests with 403', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments', {
        method: 'POST',
        unauthenticated: true,
        body: {
          name: 'Unauthorized Segment',
          rules: { match: 'all', conditions: [{ field: 'order_count', operator: 'greater_than', value: 0 }] },
        },
      });

      const res = await createSegmentHandler(req);
      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // 3. SEGMENT DETAILS, UPDATES, AND DELETION
  // ==========================================================================
  describe('Segment CRUD Operations', () => {
    it('retrieves single segment by ID scoped to organization', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments/seg-alpha-1');
      const res = await getSegmentByIdHandler(req, {
        params: Promise.resolve({ id: 'seg-alpha-1' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Existing Alpha Segment');
    });

    it('returns 404 when retrieving segment from another organization', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments/seg-beta-1');
      const res = await getSegmentByIdHandler(req, {
        params: Promise.resolve({ id: 'seg-beta-1' }),
      });
      expect(res.status).toBe(404);
    });

    it('updates segment name and conditions with validation', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments/seg-alpha-1', {
        method: 'PATCH',
        body: {
          name: 'Updated Alpha Segment',
          rules: {
            match: 'any',
            conditions: [
              { field: 'order_count', operator: 'greater_than_or_equal', value: 5 },
            ],
          },
        },
      });

      const res = await updateSegmentHandler(req, {
        params: Promise.resolve({ id: 'seg-alpha-1' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Updated Alpha Segment');
      expect(json.data.rules.match).toBe('any');
    });

    it('deletes segment strictly scoped to organization', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/marketing/segments/seg-alpha-1', {
        method: 'DELETE',
      });

      const res = await deleteSegmentHandler(req, {
        params: Promise.resolve({ id: 'seg-alpha-1' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify it is gone
      const getReq = createAdminRequest('http://localhost:3000/api/admin/marketing/segments/seg-alpha-1');
      const getRes = await getSegmentByIdHandler(getReq, {
        params: Promise.resolve({ id: 'seg-alpha-1' }),
      });
      expect(getRes.status).toBe(404);
    });
  });
});
