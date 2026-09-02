import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { NextRequest } from 'next/server';
import { getAuthenticatedUserContext } from '@/services/user-context.service';
import { extractAuthToken } from '@/lib/auth-helpers';
import { POST as passwordSignIn } from '@/app/api/auth/password/route';
import { POST as customerRegister } from '@/app/api/auth/register/customer/route';
import { POST as otpSend } from '@/app/api/auth/otp/send/route';
import { POST as otpVerify } from '@/app/api/auth/otp/verify/route';
import { GET as googleAuth } from '@/app/api/auth/google/route';
import { GET as authCallback } from '@/app/api/auth/callback/route';
import { POST as authSignout } from '@/app/api/auth/signout/route';
import { GET as authSession } from '@/app/api/auth/session/route';
import * as clientModule from '@/lib/supabase/client';

describe('Authentication System Redesign Matrix', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const ORG_ID = 'org-unwind-lagos-01';
  const ADMIN_USER_ID = 'usr-admin-alice-101';
  const CUSTOMER_USER_ID = 'usr_mock_123';
  const INVITED_USER_EMAIL = 'new.admin@store.com';
  const INVITE_TOKEN = 'invite_token_mock_1234567890abcdef';

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase = createMockSupabaseClient({
      organizations: [
        {
          id: ORG_ID,
          name: 'Unwind & Doodle Lagos',
          slug: 'unwind-lagos',
        },
      ],
      organization_members: [
        {
          id: 'mem-alice-01',
          organization_id: ORG_ID,
          user_id: ADMIN_USER_ID,
          role: 'admin',
        },
      ],
      customers: [
        {
          id: 'cust-dave-01',
          user_id: CUSTOMER_USER_ID,
          email: 'mock.customer@example.com',
          first_name: 'Mock',
          last_name: 'Customer',
          organization_id: ORG_ID,
        },
      ],
      organization_invitations: [
        {
          id: 'inv-101',
          organization_id: ORG_ID,
          email: INVITED_USER_EMAIL,
          role: 'staff',
          token: INVITE_TOKEN,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          accepted_at: null,
          invited_by: ADMIN_USER_ID,
          created_at: new Date().toISOString(),
        },
      ],
    });

    vi.spyOn(clientModule, 'getServiceSupabaseClient').mockReturnValue(mockSupabase as any);
  });

  describe('1. Merchant/Admin Password Login & Access Control', () => {
    it('authenticates valid admin and returns merchant context without customer record creation', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@unwindanddoodle.com',
          password: 'validpassword123',
          intent: 'admin',
        }),
      });

      const res = await passwordSignIn(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.userType).toBe('merchant');
      expect(json.data.redirectTo).toBe('/admin');
      expect(json.data.membership.role).toBe('admin');
      expect(res.cookies.get('sb-access-token')).toBeDefined();

      // Ensure no customer profile was created for this admin
      const customerRecord = mockSupabase._store.customers.find((c) => c.user_id === ADMIN_USER_ID);
      expect(customerRecord).toBeUndefined();
    });

    it('denies admin login to unauthorized customer accounts (403 Forbidden)', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@example.com',
          password: 'validpassword123',
          intent: 'admin',
        }),
      });

      const res = await passwordSignIn(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.code).toBe('FORBIDDEN');
      expect(json.error).toContain('Access Denied');
    });

    it('rejects invalid password credentials with 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@unwindanddoodle.com',
          password: 'wrongpassword',
          intent: 'admin',
        }),
      });

      const res = await passwordSignIn(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });
  });

  describe('2. Customer Registration & Storefront Authentication', () => {
    it('registers new customer account and links profile', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Chidinma',
          lastName: 'Eze',
          email: 'chidinma@example.com',
          password: 'securepassword123',
          emailMarketingConsent: true,
        }),
      });

      const res = await customerRegister(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.userType).toBe('customer');
      expect(json.data.redirectTo).toBe('/account');
      expect(json.data.customer.email).toBe('chidinma@example.com');
      expect(json.data.customer.firstName).toBe('Chidinma');
    });

    it('rejects registration for an already registered email with 409 Conflict', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Existing',
          lastName: 'User',
          email: 'existing@example.com',
          password: 'securepassword123',
        }),
      });

      const res = await customerRegister(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain('already registered');
    });

    it('signs in customer via password and redirects to /account', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'mock.customer@example.com',
          password: 'validpassword123',
          intent: 'customer',
        }),
      });

      const res = await passwordSignIn(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.userType).toBe('customer');
      expect(json.data.redirectTo).toBe('/account');
      expect(json.data.customer).toBeDefined();
    });
  });

  describe('3. Passwordless / OTP Flow', () => {
    it('sends OTP verification code', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          intent: 'customer',
        }),
      });

      const res = await otpSend(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain('verification code');
    });

    it('verifies valid OTP and establishes customer session', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          token: '123456',
          intent: 'customer',
        }),
      });

      const res = await otpVerify(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.userType).toBe('customer');
      expect(res.cookies.get('sb-access-token')).toBeDefined();
    });

    it('rejects invalid OTP with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          token: '000000',
          intent: 'customer',
        }),
      });

      const res = await otpVerify(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });
  });

  describe('4. Google OAuth Flow & Callback Resolution', () => {
    it('generates Google OAuth authorization URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/google?intent=customer&next=/cart');
      const res = await googleAuth(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.url).toContain('https://accounts.google.com');
    });

    it('handles OAuth callback with code exchange and establishes session', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/callback?code=mock_code_123&next=/account');
      const res = await authCallback(req);

      expect(res.status).toBe(307); // Redirect to /account
      expect(res.headers.get('location')).toContain('/account');
      expect(res.cookies.get('sb-access-token')).toBeDefined();
    });
  });

  describe('5. Canonical User Context Resolution (getAuthenticatedUserContext)', () => {
    it('resolves anonymous user when no token provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session');
      const context = await getAuthenticatedUserContext(req, mockSupabase as any);

      expect(context.authenticated).toBe(false);
      expect(context.userType).toBe('anonymous');
    });

    it('resolves merchant user context with permissions for organization members', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          'x-test-admin-id': ADMIN_USER_ID,
          'x-test-admin-email': 'alice@unwindanddoodle.com',
        },
      });

      const context = await getAuthenticatedUserContext(req, mockSupabase as any);

      expect(context.authenticated).toBe(true);
      expect(context.userType).toBe('merchant');
      if (context.userType === 'merchant') {
        expect(context.organization.id).toBe(ORG_ID);
        expect(context.membership.role).toBe('admin');
        expect(context.permissions).toContain('products.manage');
      }
    });

    it('resolves customer user context for storefront shoppers', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          'x-test-user-id': CUSTOMER_USER_ID,
          'x-test-email': 'mock.customer@example.com',
        },
      });

      const context = await getAuthenticatedUserContext(req, mockSupabase as any);

      expect(context.authenticated).toBe(true);
      expect(context.userType).toBe('customer');
      if (context.userType === 'customer') {
        expect(context.customer.email).toBe('mock.customer@example.com');
      }
    });
  });

  describe('6. Logout Operation', () => {
    it('clears all session cookies on logout', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      });

      const res = await authSignout(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(res.cookies.get('sb-access-token')?.maxAge).toBe(0);
      expect(res.cookies.get('app_session_token')?.maxAge).toBe(0);
    });
  });

  describe('7. Team Invitation Direct Account Creation & Acceptance', () => {
    it('creates admin account with password and accepts invitation without touching customer table', async () => {
      vi.spyOn(mockSupabase.auth, 'signInWithPassword').mockResolvedValue({
        data: {
          user: { id: 'usr-new-staff-777', email: INVITED_USER_EMAIL, user_metadata: {} },
          session: { access_token: 'mock-staff-token-123' },
        },
        error: null,
      } as any);

      const { POST: acceptInvitation } = await import('@/app/api/invitations/[token]/accept/route');
      const req = new NextRequest(`http://localhost:3000/api/invitations/${INVITE_TOKEN}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'newadminpassword123',
          fullName: 'New Admin Member',
        }),
      });

      const res = await acceptInvitation(req, { params: Promise.resolve({ token: INVITE_TOKEN }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.role).toBe('staff');
      expect(json.data.organizationId).toBe(ORG_ID);
      expect(res.cookies.get('sb-access-token')).toBeDefined();

      // Ensure NO customer record was created
      const customerRecord = mockSupabase._store.customers.find((c) => c.email === INVITED_USER_EMAIL);
      expect(customerRecord).toBeUndefined();

      // Ensure organization_members record was created
      const memberRecord = mockSupabase._store.organization_members.find(
        (m) => m.organization_id === ORG_ID && m.role === 'staff'
      );
      expect(memberRecord).toBeDefined();
    });
  });
});
