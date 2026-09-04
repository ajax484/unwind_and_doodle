import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('Next.js Route Protection Middleware', () => {
  it('skips middleware processing for API routes and static assets', () => {
    const apiReq = new NextRequest('http://localhost:3000/api/products');
    const apiRes = middleware(apiReq);
    expect(apiRes.headers.get('location')).toBeNull();

    const staticReq = new NextRequest('http://localhost:3000/_next/static/chunk.js');
    const staticRes = middleware(staticReq);
    expect(staticRes.headers.get('location')).toBeNull();

    const assetReq = new NextRequest('http://localhost:3000/favicon.ico');
    const assetRes = middleware(assetReq);
    expect(assetRes.headers.get('location')).toBeNull();
  });

  describe('Admin Routes Protection (/admin/*)', () => {
    it('redirects unauthenticated user accessing /admin to /admin/login preserving next path', () => {
      const req = new NextRequest('http://localhost:3000/admin');
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/admin/login?next=%2Fadmin');
    });

    it('redirects unauthenticated user accessing nested /admin/orders to /admin/login', () => {
      const req = new NextRequest('http://localhost:3000/admin/orders');
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/admin/login?next=%2Fadmin%2Forders');
    });

    it('permits unauthenticated access to public admin routes (/admin/login, /admin/unauthorized)', () => {
      const loginReq = new NextRequest('http://localhost:3000/admin/login');
      const loginRes = middleware(loginReq);
      expect(loginRes.headers.get('location')).toBeNull();

      const unauthReq = new NextRequest('http://localhost:3000/admin/unauthorized');
      const unauthRes = middleware(unauthReq);
      expect(unauthRes.headers.get('location')).toBeNull();
    });

    it('allows access to /admin when authenticated via direct session cookie', () => {
      const req = new NextRequest('http://localhost:3000/admin', {
        headers: {
          cookie: 'sb-access-token=valid-jwt-token-123',
        },
      });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows access to /admin when authenticated via chunked supabase cookies', () => {
      const req = new NextRequest('http://localhost:3000/admin', {
        headers: {
          cookie: 'sb-xyz123-auth-token.0=chunk0; sb-xyz123-auth-token.1=chunk1',
        },
      });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows access to /admin when authenticated via app_session_token', () => {
      const req = new NextRequest('http://localhost:3000/admin', {
        headers: {
          cookie: 'app_session_token=test-app-session',
        },
      });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('Customer Account Routes Protection (/account/*)', () => {
    it('redirects unauthenticated user accessing /account to /auth preserving next path', () => {
      const req = new NextRequest('http://localhost:3000/account');
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/auth?next=%2Faccount');
    });

    it('redirects unauthenticated user accessing /account/orders/ORD-100 to /auth', () => {
      const req = new NextRequest('http://localhost:3000/account/orders/ORD-100');
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/auth?next=%2Faccount%2Forders%2FORD-100');
    });

    it('allows access to /account when authenticated', () => {
      const req = new NextRequest('http://localhost:3000/account', {
        headers: {
          cookie: 'sb-access-token=customer-token-456',
        },
      });
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });
  });
});
