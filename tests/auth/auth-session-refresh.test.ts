import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  setAuthCookies,
  clearAuthCookies,
  extractRefreshToken,
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAMES,
} from '@/lib/auth-helpers';
import * as supabaseClientModule from '@/lib/supabase/client';
import { POST as refreshRoute } from '@/app/api/auth/refresh/route';
import { GET as sessionRoute } from '@/app/api/auth/session/route';
import { POST as passwordRoute } from '@/app/api/auth/password/route';
import { POST as tokenRoute } from '@/app/api/auth/token/route';
import { middleware } from '@/middleware';

describe('Auth Sliding Session & Refresh Token Rotation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const ORG_ID = 'org-unwind-lagos-01';
  const ADMIN_USER_ID = 'usr-admin-alice-101';
  const CUSTOMER_USER_ID = 'usr_mock_customer_123';

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
          email: 'customer@example.com',
          first_name: 'Mock',
          last_name: 'Customer',
          organization_id: ORG_ID,
        },
      ],
    });

    vi.spyOn(supabaseClientModule, 'getServiceSupabaseClient').mockReturnValue(mockSupabase as any);
  });

  describe('1. Cookie Helpers (setAuthCookies & clearAuthCookies)', () => {
    it('sets both access token and refresh token with 30-day maxAge', () => {
      const res = NextResponse.json({ success: true });
      setAuthCookies(res, {
        accessToken: 'mock-access-token-123',
        refreshToken: 'mock-refresh-token-456',
      });

      const accessCookie = res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
      const refreshCookie = res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN);

      expect(accessCookie).toBeDefined();
      expect(accessCookie?.value).toBe('mock-access-token-123');
      expect(accessCookie?.maxAge).toBe(AUTH_COOKIE_MAX_AGE);
      expect(accessCookie?.httpOnly).toBe(true);
      expect(accessCookie?.path).toBe('/');

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie?.value).toBe('mock-refresh-token-456');
      expect(refreshCookie?.maxAge).toBe(AUTH_COOKIE_MAX_AGE);
      expect(refreshCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.path).toBe('/');
    });

    it('clears all auth cookies including refresh token', () => {
      const res = NextResponse.json({ success: true });
      clearAuthCookies(res);

      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.maxAge).toBe(0);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.maxAge).toBe(0);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.LEGACY_SESSION)?.maxAge).toBe(0);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.LEGACY_SUPABASE)?.maxAge).toBe(0);
    });

    it('extracts refresh token correctly from cookies', () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: { cookie: `${AUTH_COOKIE_NAMES.REFRESH_TOKEN}=sample-refresh-token` },
      });

      expect(extractRefreshToken(req)).toBe('sample-refresh-token');
    });
  });

  describe('2. Refresh Route (/api/auth/refresh)', () => {
    it('refreshes session and rotates cookies when valid refresh token is passed', async () => {
      mockSupabase.auth.refreshSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-rotated-access-token',
            refresh_token: 'new-rotated-refresh-token',
          },
          user: { id: 'usr-123', email: 'user@example.com' },
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `${AUTH_COOKIE_NAMES.REFRESH_TOKEN}=old-refresh-token` },
      });

      const res = await refreshRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value).toBe('new-rotated-access-token');
      expect(res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value).toBe('new-rotated-refresh-token');
    });

    it('returns 401 and clears cookies when refresh token is invalid', async () => {
      mockSupabase.auth.refreshSession = vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: new Error('Invalid refresh token'),
      });

      const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `${AUTH_COOKIE_NAMES.REFRESH_TOKEN}=invalid-token` },
      });

      const res = await refreshRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.maxAge).toBe(0);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.maxAge).toBe(0);
    });

    it('returns 401 and clears cookies when no refresh token is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
      });

      const res = await refreshRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.maxAge).toBe(0);
    });
  });

  describe('3. Seamless Session Verification (/api/auth/session)', () => {
    it('seamlessly refreshes tokens and returns authenticated when access token expired but refresh token valid', async () => {
      // Access token fails (expired)
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('JWT expired'),
      });

      // Refresh succeeds
      mockSupabase.auth.refreshSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'fresh-access-token-999',
            refresh_token: 'fresh-refresh-token-999',
          },
          user: { id: CUSTOMER_USER_ID, email: 'customer@example.com' },
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: `${AUTH_COOKIE_NAMES.ACCESS_TOKEN}=expired-access-token; ${AUTH_COOKIE_NAMES.REFRESH_TOKEN}=valid-refresh-token`,
        },
      });

      const res = await sessionRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.authenticated).toBe(true);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value).toBe('fresh-access-token-999');
      expect(res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value).toBe('fresh-refresh-token-999');
    });

    it('clears cookies and returns authenticated: false when refresh token fails', async () => {
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid JWT'),
      });

      mockSupabase.auth.refreshSession = vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: new Error('Token revoked'),
      });

      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: `${AUTH_COOKIE_NAMES.REFRESH_TOKEN}=revoked-refresh-token`,
        },
      });

      const res = await sessionRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.authenticated).toBe(false);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.maxAge).toBe(0);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.maxAge).toBe(0);
    });
  });

  describe('4. Login Endpoints Set Companion Refresh Token', () => {
    it('sets both access token and refresh token on password login', async () => {
      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: {
          user: { id: CUSTOMER_USER_ID, email: 'customer@example.com', user_metadata: {} },
          session: {
            access_token: 'pwd-access-token',
            refresh_token: 'pwd-refresh-token',
          },
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@example.com',
          password: 'validpassword123',
          intent: 'customer',
        }),
      });

      const res = await passwordRoute(req);
      expect(res.status).toBe(200);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value).toBe('pwd-access-token');
      expect(res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value).toBe('pwd-refresh-token');
    });

    it('sets companion refresh token on token route when refreshToken is passed', async () => {
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: CUSTOMER_USER_ID, email: 'customer@example.com' } },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: 'valid-access-jwt-token',
          refreshToken: 'valid-refresh-jwt-token',
          intent: 'customer',
        }),
      });

      const res = await tokenRoute(req);
      expect(res.status).toBe(200);
      expect(res.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value).toBe('valid-access-jwt-token');
      expect(res.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value).toBe('valid-refresh-jwt-token');
    });
  });

  describe('5. Middleware Route Protection with Refresh Token', () => {
    it('allows access to protected route when only sb-refresh-token is present', () => {
      const req = new NextRequest('http://localhost:3000/account/orders', {
        headers: { cookie: `${AUTH_COOKIE_NAMES.REFRESH_TOKEN}=valid-refresh-token` },
      });

      const res = middleware(req);
      // Not redirected to /auth
      expect(res.headers.get('location')).toBeNull();
      expect(res.status).toBe(200);
    });

    it('redirects to /auth when neither access nor refresh token is present', () => {
      const req = new NextRequest('http://localhost:3000/account/orders');
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/auth');
    });
  });
});
