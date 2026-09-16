import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { setServiceSupabaseClient } from '@/lib/supabase/client';
import { listAdminAuditLogs, getAdminAuditLogById } from '@/services/admin-audit-log.service';
import { GET as listAuditLogsRoute } from '@/app/api/admin/audit-logs/route';
import { GET as getAuditLogDetailRoute } from '@/app/api/admin/audit-logs/[id]/route';
import { NextRequest } from 'next/server';

describe('Admin Audit Log Viewer Service & API', () => {
  const ORG_A_ID = 'org-unwind-lagos-01';
  const ORG_B_ID = 'org-competitor-02';

  const OWNER_USER = 'usr-owner-ada-101';
  const ADMIN_USER = 'usr-admin-bob-202';
  const STAFF_USER = 'usr-staff-charlie-303';
  const RANDOM_USER = 'usr-customer-dave-404';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: ORG_A_ID, name: 'Unwind & Doodle Lagos', slug: 'unwind-lagos' },
        { id: ORG_B_ID, name: 'Competitor Store', slug: 'competitor' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: ORG_A_ID, user_id: OWNER_USER, role: 'owner' },
        { id: 'mem-2', organization_id: ORG_A_ID, user_id: ADMIN_USER, role: 'admin' },
        { id: 'mem-3', organization_id: ORG_A_ID, user_id: STAFF_USER, role: 'staff' },
      ],
      customers: [
        {
          id: 'cust-1',
          user_id: OWNER_USER,
          email: 'ada@unwindanddoodle.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
        },
        {
          id: 'cust-2',
          user_id: ADMIN_USER,
          email: 'bob@unwindanddoodle.com',
          first_name: 'Bob',
          last_name: 'Admin',
        },
      ],
      audit_logs: [
        {
          id: 'log-001',
          organization_id: ORG_A_ID,
          actor_id: OWNER_USER,
          action: 'product.created',
          entity_type: 'product',
          entity_id: 'prod-sketch-01',
          before_data: null,
          after_data: { name: 'Sketchbook Pro', selling_price: 15000 },
          created_at: '2026-09-10T10:00:00Z',
        },
        {
          id: 'log-002',
          organization_id: ORG_A_ID,
          actor_id: ADMIN_USER,
          action: 'order.status_transition',
          entity_type: 'order',
          entity_id: 'ord-lagos-881',
          before_data: { status: 'pending' },
          after_data: { status: 'confirmed', note: 'Payment verified' },
          created_at: '2026-09-12T14:30:00Z',
        },
        {
          id: 'log-003',
          organization_id: ORG_A_ID,
          actor_id: null, // System automated
          action: 'inventory.auto_released',
          entity_type: 'inventory_reservation',
          entity_id: 'res-timeout-441',
          before_data: { status: 'reserved' },
          after_data: { status: 'released', reason: 'TTL expired' },
          created_at: '2026-09-14T08:15:00Z',
        },
        {
          id: 'log-004',
          organization_id: ORG_A_ID,
          actor_id: ADMIN_USER,
          action: 'stock.adjusted',
          entity_type: 'product',
          entity_id: 'prod-sketch-01',
          before_data: { quantity: 20 },
          after_data: { quantity: 25, quantity_delta: 5, reason: 'Cycle count' },
          created_at: '2026-09-15T11:00:00Z',
        },
        {
          id: 'log-005',
          organization_id: ORG_A_ID,
          actor_id: null, // System automated
          action: 'order.status_transition',
          entity_type: 'order',
          entity_id: 'ord-lagos-999',
          before_data: { status: 'shipped' },
          after_data: { status: 'delivered', note: 'Delivery webhook verified' },
          created_at: '2026-09-16T12:00:00Z',
        },
        // Log belonging to Org B (for multi-tenant isolation check)
        {
          id: 'log-org-b',
          organization_id: ORG_B_ID,
          actor_id: 'usr-b-1',
          action: 'product.created',
          entity_type: 'product',
          entity_id: 'prod-competitor-99',
          before_data: null,
          after_data: { name: 'Competitor Book' },
          created_at: '2026-09-16T12:30:00Z',
        },
      ],
    });

    setServiceSupabaseClient(mockSupabase as any);
  });

  afterEach(() => {
    setServiceSupabaseClient(null);
  });

  // ==========================================
  // 1. Service Layer Tests
  // ==========================================
  describe('Service: listAdminAuditLogs', () => {
    it('returns all logs for the organization sorted newest-first by default', async () => {
      const result = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
      });

      expect(result.pagination.total).toBe(5);
      expect(result.items.length).toBe(5);
      // Newest first check
      expect(result.items[0].id).toBe('log-005');
      expect(result.items[4].id).toBe('log-001');

      // Does not leak Org B logs
      const hasOrgB = result.items.some((item) => item.organizationId === ORG_B_ID);
      expect(hasOrgB).toBe(false);
    });

    it('distinguishes system-generated vs admin actors correctly', async () => {
      const result = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
      });

      const systemLog = result.items.find((l) => l.id === 'log-003');
      expect(systemLog?.actor.type).toBe('system');
      expect(systemLog?.actor.displayName).toBe('System');
      expect(systemLog?.actorId).toBeNull();

      const adminLog = result.items.find((l) => l.id === 'log-001');
      expect(adminLog?.actor.type).toBe('admin');
      expect(adminLog?.actor.displayName).toBe('Ada Lovelace');
      expect(adminLog?.actor.email).toBe('ada@unwindanddoodle.com');
    });

    it('filters by action', async () => {
      const result = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        action: 'order.status_transition',
      });

      expect(result.pagination.total).toBe(2);
      expect(result.items.every((i) => i.action === 'order.status_transition')).toBe(true);
    });

    it('filters by entityType', async () => {
      const result = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        entityType: 'product',
      });

      expect(result.pagination.total).toBe(2);
      expect(result.items.every((i) => i.entityType === 'product')).toBe(true);
    });

    it('filters by actorType (system only vs admin only)', async () => {
      const systemResult = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        actorType: 'system',
      });
      expect(systemResult.pagination.total).toBe(2);
      expect(systemResult.items.every((i) => i.actor.type === 'system')).toBe(true);

      const adminResult = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        actorType: 'admin',
      });
      expect(adminResult.pagination.total).toBe(3);
      expect(adminResult.items.every((i) => i.actor.type === 'admin')).toBe(true);
    });

    it('filters by date range', async () => {
      const result = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        startDate: '2026-09-11T00:00:00Z',
        endDate: '2026-09-15T00:00:00Z',
      });

      // log-002 (Sept 12) and log-003 (Sept 14)
      expect(result.pagination.total).toBe(2);
      expect(result.items.map((i) => i.id)).toEqual(['log-003', 'log-002']);
    });

    it('performs search across entity_id, action, and payload contents', async () => {
      const searchEntity = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        search: 'ord-lagos-881',
      });
      expect(searchEntity.pagination.total).toBe(1);
      expect(searchEntity.items[0].id).toBe('log-002');

      const searchPayload = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        search: 'Sketchbook Pro',
      });
      expect(searchPayload.pagination.total).toBe(1);
      expect(searchPayload.items[0].id).toBe('log-001');
    });

    it('supports pagination with custom limits and offsets', async () => {
      const page1 = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        page: 1,
        limit: 2,
      });
      expect(page1.items.length).toBe(2);
      expect(page1.pagination.total).toBe(5);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.items[0].id).toBe('log-005');
      expect(page1.items[1].id).toBe('log-004');

      const page2 = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        page: 2,
        limit: 2,
      });
      expect(page2.items.length).toBe(2);
      expect(page2.items[0].id).toBe('log-003');
      expect(page2.items[1].id).toBe('log-002');
    });

    it('supports sorting by oldest first', async () => {
      const result = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
        sortBy: 'oldest',
      });
      expect(result.items[0].id).toBe('log-001');
      expect(result.items[4].id).toBe('log-005');
    });

    it('returns available distinct filter choices', async () => {
      const result = await listAdminAuditLogs(mockSupabase as any, {
        organizationId: ORG_A_ID,
      });
      expect(result.filterOptions.actions).toContain('product.created');
      expect(result.filterOptions.actions).toContain('order.status_transition');
      expect(result.filterOptions.entityTypes).toContain('product');
      expect(result.filterOptions.entityTypes).toContain('order');
    });
  });

  describe('Service: getAdminAuditLogById', () => {
    it('retrieves single audit record with full before/after data', async () => {
      const detail = await getAdminAuditLogById(mockSupabase as any, 'log-002', ORG_A_ID);
      expect(detail).not.toBeNull();
      expect(detail?.id).toBe('log-002');
      expect(detail?.beforeData).toEqual({ status: 'pending' });
      expect(detail?.afterData).toEqual({ status: 'confirmed', note: 'Payment verified' });
      expect(detail?.actor.displayName).toBe('Bob Admin');
    });

    it('returns null if record belongs to another organization (tenant isolation)', async () => {
      const detail = await getAdminAuditLogById(mockSupabase as any, 'log-org-b', ORG_A_ID);
      expect(detail).toBeNull();
    });

    it('returns null for non-existent ID', async () => {
      const detail = await getAdminAuditLogById(mockSupabase as any, 'non-existent-id', ORG_A_ID);
      expect(detail).toBeNull();
    });
  });

  // ==========================================
  // 2. API Route Authorization & Validation Tests
  // ==========================================
  describe('API Route: GET /api/admin/audit-logs', () => {
    it('allows owner role access', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs', {
        headers: {
          'x-admin-user-id': OWNER_USER,
          'x-organization-id': ORG_A_ID,
        },
      });

      const res = await listAuditLogsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.pagination.total).toBe(5);
    });

    it('allows admin role access', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs', {
        headers: {
          'x-admin-user-id': ADMIN_USER,
          'x-organization-id': ORG_A_ID,
        },
      });

      const res = await listAuditLogsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('denies staff role with 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs', {
        headers: {
          'x-admin-user-id': STAFF_USER,
          'x-organization-id': ORG_A_ID,
        },
      });

      const res = await listAuditLogsRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Forbidden');
    });

    it('denies unauthenticated request with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs');
      const res = await listAuditLogsRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('returns 400 for invalid query parameters', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs?limit=99999', {
        headers: {
          'x-admin-user-id': ADMIN_USER,
          'x-organization-id': ORG_A_ID,
        },
      });

      const res = await listAuditLogsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid audit log filter parameters');
    });
  });

  describe('API Route: GET /api/admin/audit-logs/[id]', () => {
    it('retrieves detail for authorized admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs/log-001', {
        headers: {
          'x-admin-user-id': ADMIN_USER,
          'x-organization-id': ORG_A_ID,
        },
      });

      const res = await getAuditLogDetailRoute(req, {
        params: Promise.resolve({ id: 'log-001' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('log-001');
      expect(json.data.afterData.name).toBe('Sketchbook Pro');
    });

    it('returns 404 for log from different organization', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs/log-org-b', {
        headers: {
          'x-admin-user-id': ADMIN_USER,
          'x-organization-id': ORG_A_ID,
        },
      });

      const res = await getAuditLogDetailRoute(req, {
        params: Promise.resolve({ id: 'log-org-b' }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('denies staff role access with 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/audit-logs/log-001', {
        headers: {
          'x-admin-user-id': STAFF_USER,
          'x-organization-id': ORG_A_ID,
        },
      });

      const res = await getAuditLogDetailRoute(req, {
        params: Promise.resolve({ id: 'log-001' }),
      });

      expect(res.status).toBe(403);
    });
  });
});
