import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  requireOrganizationMember,
  requireAdminAuth,
  recordAdminAuditLog,
  AdminOrganizationContext,
} from '@/services/auth.service';
import { extractAuthToken, getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load .env.local if present
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/(^["']|["']$)/g, '');
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

import { GET as getAdminSession } from '@/app/api/admin/session/route';

describe('Phase 6A: Admin Authentication & Authorization', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const ORG_A_ID = 'org-unwind-lagos-01';
  const ORG_B_ID = 'org-competitor-store-02';

  const ADMIN_USER_A = 'usr-admin-alice-101';
  const ADMIN_USER_B = 'usr-admin-bob-202';
  const STAFF_USER_A = 'usr-staff-charlie-303';
  const CUSTOMER_USER = 'usr-customer-dave-404';

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase = createMockSupabaseClient({
      organizations: [
        {
          id: ORG_A_ID,
          name: 'Unwind & Doodle Lagos',
          slug: 'unwind-lagos',
        },
        {
          id: ORG_B_ID,
          name: 'Other Tenant Books',
          slug: 'other-tenant',
        },
      ],
      organization_members: [
        {
          id: 'mem-alice-01',
          organization_id: ORG_A_ID,
          user_id: ADMIN_USER_A,
          role: 'admin',
        },
        {
          id: 'mem-bob-02',
          organization_id: ORG_B_ID,
          user_id: ADMIN_USER_B,
          role: 'admin',
        },
        {
          id: 'mem-charlie-03',
          organization_id: ORG_A_ID,
          user_id: STAFF_USER_A,
          role: 'staff',
        },
      ],
      customers: [
        {
          id: 'cust-dave-01',
          user_id: CUSTOMER_USER,
          email: 'dave@customer.com',
          first_name: 'Dave',
          last_name: 'Customer',
        },
      ],
      orders: [
        {
          id: 'ord-org-a-101',
          organization_id: ORG_A_ID,
          order_number: 'CB-LAGOS-101',
          customer_id: 'cust-dave-01',
          status: 'received',
          total: 15000,
        },
        {
          id: 'ord-org-b-202',
          organization_id: ORG_B_ID,
          order_number: 'CB-TENANT-202',
          customer_id: 'cust-other-02',
          status: 'received',
          total: 25000,
        },
      ],
      audit_logs: [],
    });
  });

  describe('1. Organization Membership & Role Authorization', () => {
    it('grants access to valid Organization A admin and derives full organization context', async () => {
      const context: AdminOrganizationContext = await requireOrganizationMember(mockSupabase as any, {
        userId: ADMIN_USER_A,
        userEmail: 'alice@unwindanddoodle.com',
      });

      expect(context.user.id).toBe(ADMIN_USER_A);
      expect(context.user.email).toBe('alice@unwindanddoodle.com');
      expect(context.organization.id).toBe(ORG_A_ID);
      expect(context.organization.name).toBe('Unwind & Doodle Lagos');
      expect(context.membership.role).toBe('admin');
    });

    it('supports staff role for organization members', async () => {
      const context = await requireOrganizationMember(mockSupabase as any, {
        userId: STAFF_USER_A,
      });

      expect(context.membership.role).toBe('staff');
      expect(context.organization.id).toBe(ORG_A_ID);
    });

    it('rejects unauthenticated requests with missing user ID', async () => {
      await expect(
        requireOrganizationMember(mockSupabase as any, {
          userId: '',
        })
      ).rejects.toThrow('Authentication required: Missing user ID');
    });

    it('denies access to an authenticated customer who is not an organization member', async () => {
      await expect(
        requireOrganizationMember(mockSupabase as any, {
          userId: CUSTOMER_USER,
        })
      ).rejects.toThrow('Forbidden: Administrative privileges required');
    });

    it('rejects users with invalid or unauthorized roles', async () => {
      mockSupabase._store.organization_members.push({
        id: 'mem-guest-99',
        organization_id: ORG_A_ID,
        user_id: 'usr-guest-99',
        role: 'viewer_guest',
      });

      await expect(
        requireOrganizationMember(mockSupabase as any, {
          userId: 'usr-guest-99',
          allowedRoles: ['owner', 'admin', 'manager'],
        })
      ).rejects.toThrow(/Forbidden: Administrative privileges required/);
    });
  });

  describe('2. Multi-Tenant Isolation & Cross-Organization Security', () => {
    it('prevents Organization A admin from accessing Organization B context', async () => {
      await expect(
        requireOrganizationMember(mockSupabase as any, {
          userId: ADMIN_USER_A,
          requestedOrgId: ORG_B_ID, // Attempting to switch/access Org B
        })
      ).rejects.toThrow('Forbidden: Administrative privileges required');
    });

    it('prevents Organization B admin from accessing Organization A context', async () => {
      await expect(
        requireOrganizationMember(mockSupabase as any, {
          userId: ADMIN_USER_B,
          requestedOrgId: ORG_A_ID,
        })
      ).rejects.toThrow('Forbidden: Administrative privileges required');
    });

    it('allows requireAdminAuth backward compatible helper with context derivation', async () => {
      const auth = await requireAdminAuth(mockSupabase as any, ADMIN_USER_A);
      expect(auth.authorized).toBe(true);
      expect(auth.organizationId).toBe(ORG_A_ID);
      expect(auth.role).toBe('admin');
      expect(auth.context?.organization.name).toBe('Unwind & Doodle Lagos');
    });
  });

  describe('3. Request Helper & Token Extraction', () => {
    it('extracts bearer token correctly from headers', () => {
      const req = new NextRequest('http://localhost:3000/api/admin/session', {
        headers: { authorization: 'Bearer mock-valid-jwt-token' },
      });
      const token = extractAuthToken(req);
      expect(token).toBe('mock-valid-jwt-token');
    });

    it('extracts token from cookies when header is absent', () => {
      const req = new NextRequest('http://localhost:3000/api/admin/session', {
        headers: { cookie: 'sb-access-token=cookie-jwt-token-value' },
      });
      const token = extractAuthToken(req);
      expect(token).toBe('cookie-jwt-token-value');
    });

    it('resolves authenticated admin context via getAuthenticatedAdmin in test mode', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/session', {
        headers: {
          'x-test-admin-id': ADMIN_USER_A,
          'x-test-admin-email': 'alice@unwindanddoodle.com',
        },
      });

      const context = await getAuthenticatedAdmin(req, undefined, mockSupabase as any);
      expect(context.user.id).toBe(ADMIN_USER_A);
      expect(context.organization.id).toBe(ORG_A_ID);
      expect(context.membership.role).toBe('admin');
    });

    it('throws unauthenticated error when no token and no test header is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/session');
      await expect(
        getAuthenticatedAdmin(req, undefined, mockSupabase as any)
      ).rejects.toThrow('Authentication required: No session token provided');
    });
  });

  describe('4. Admin Session API Route (GET /api/admin/session)', () => {
    it('returns 401 when no session token or auth headers are provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/session');
      const res = await getAdminSession(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('5. Admin Audit Logging Architecture', () => {
    it('records structured audit log for admin mutations', async () => {
      await recordAdminAuditLog(mockSupabase as any, {
        organizationId: ORG_A_ID,
        actorId: ADMIN_USER_A,
        action: 'status_change',
        entityType: 'order',
        entityId: 'ord-org-a-101',
        beforeData: { status: 'received' },
        afterData: { status: 'confirmed' },
      });

      const auditEntries = mockSupabase._store.audit_logs;
      expect(auditEntries.length).toBe(1);
      expect(auditEntries[0].organization_id).toBe(ORG_A_ID);
      expect(auditEntries[0].actor_id).toBe(ADMIN_USER_A);
      expect(auditEntries[0].action).toBe('status_change');
      expect(auditEntries[0].entity_type).toBe('order');
      expect(auditEntries[0].before_data).toEqual({ status: 'received' });
      expect(auditEntries[0].after_data).toEqual({ status: 'confirmed' });
    });
  });

  describe('6. Multi-Tenant Order Protection & IDOR Defense', () => {
    it('rejects unauthorized direct mutation attempt without admin membership', async () => {
      await expect(
        requireAdminAuth(mockSupabase as any, CUSTOMER_USER)
      ).rejects.toThrow('Forbidden: Administrative privileges required');
    });
  });
});
