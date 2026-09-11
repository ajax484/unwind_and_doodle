import React from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedAdminServer } from '@/lib/auth-helpers-server';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';

  const isLoginPage = pathname === '/admin/login';
  const isUnauthorizedPage = pathname === '/admin/unauthorized';
  const isPublicAdminPage = isLoginPage || isUnauthorizedPage;

  // If on public admin pages (login or unauthorized), render full width without sidebar
  if (isPublicAdminPage) {
    return <>{children}</>;
  }

  const session = await getAuthenticatedAdminServer();

  if (!session) {
    const nextParam = pathname && pathname !== '/admin' ? `?next=${encodeURIComponent(pathname)}` : '';
    redirect(`/admin/login${nextParam}`);
  }

  const role = session.membership.role?.toLowerCase() || '';
  const allowedRoles = ['owner', 'admin', 'manager', 'staff'];
  if (!allowedRoles.includes(role)) {
    redirect('/admin/unauthorized');
  }

  return <AdminLayoutClient session={session}>{children}</AdminLayoutClient>;
}
