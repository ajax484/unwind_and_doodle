import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock next/headers
const mockHeadersGet = vi.fn();
vi.mock('next/headers', () => ({
  headers: async () => ({
    get: mockHeadersGet,
  }),
  cookies: async () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
  }),
}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
  usePathname: () => '/admin',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// Mock getAuthenticatedAdminServer
const mockGetAuthenticatedAdminServer = vi.fn();
vi.mock('@/lib/auth-helpers-server', () => ({
  getAuthenticatedAdminServer: () => mockGetAuthenticatedAdminServer(),
}));

// Mock AdminLayoutClient to inspect rendered props
vi.mock('@/app/admin/AdminLayoutClient', () => ({
  default: ({ children, session }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'admin-layout-client', 'data-session': JSON.stringify(session) },
      children
    ),
}));

import AdminLayout from '@/app/admin/layout';

describe('Admin Server Component Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children directly without checking auth on /admin/login', async () => {
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-pathname') return '/admin/login';
      return null;
    });

    const result = await AdminLayout({ children: React.createElement('span', null, 'Login Page') });

    expect(mockGetAuthenticatedAdminServer).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('renders children directly without checking auth on /admin/unauthorized', async () => {
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-pathname') return '/admin/unauthorized';
      return null;
    });

    const result = await AdminLayout({ children: React.createElement('span', null, 'Unauthorized Page') });

    expect(mockGetAuthenticatedAdminServer).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('redirects unauthenticated user to /admin/login when accessing /admin', async () => {
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-pathname') return '/admin';
      return null;
    });
    mockGetAuthenticatedAdminServer.mockResolvedValue(null);

    await expect(
      AdminLayout({ children: React.createElement('span', null, 'Dashboard') })
    ).rejects.toThrow('NEXT_REDIRECT: /admin/login');
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login');
  });

  it('redirects unauthenticated user with next query param when accessing nested route', async () => {
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-pathname') return '/admin/products';
      return null;
    });
    mockGetAuthenticatedAdminServer.mockResolvedValue(null);

    await expect(
      AdminLayout({ children: React.createElement('span', null, 'Products') })
    ).rejects.toThrow('NEXT_REDIRECT: /admin/login?next=%2Fadmin%2Fproducts');
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login?next=%2Fadmin%2Fproducts');
  });

  it('redirects to /admin/unauthorized when authenticated user is not in an allowed admin role', async () => {
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-pathname') return '/admin';
      return null;
    });
    mockGetAuthenticatedAdminServer.mockResolvedValue({
      user: { id: 'cust-1', email: 'cust@test.com' },
      organization: { id: 'org-1', name: 'Store', slug: 'store' },
      membership: { id: 'mem-1', role: 'customer' },
    });

    await expect(
      AdminLayout({ children: React.createElement('span', null, 'Dashboard') })
    ).rejects.toThrow('NEXT_REDIRECT: /admin/unauthorized');
    expect(mockRedirect).toHaveBeenCalledWith('/admin/unauthorized');
  });

  it('renders AdminLayoutClient with verified session for authorized admin role', async () => {
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === 'x-pathname') return '/admin';
      return null;
    });
    const fakeSession = {
      user: { id: 'admin-1', email: 'admin@test.com' },
      organization: { id: 'org-1', name: 'Test Store', slug: 'test-store' },
      membership: { id: 'mem-1', role: 'admin' },
      permissions: ['*'],
    };
    mockGetAuthenticatedAdminServer.mockResolvedValue(fakeSession);

    const result = await AdminLayout({
      children: React.createElement('span', null, 'Protected Admin Content'),
    });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
