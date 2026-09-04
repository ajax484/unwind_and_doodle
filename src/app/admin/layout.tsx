'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';

interface AdminSessionData {
  user: {
    id: string;
    email?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: string;
  };
  permissions?: string[];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isLoginPage = pathname === '/admin/login';
  const isUnauthorizedPage = pathname === '/admin/unauthorized';
  const isPublicAdminPage = isLoginPage || isUnauthorizedPage;

  useEffect(() => {
    // If we're already on the login or unauthorized page, skip automatic session redirect guard
    if (isPublicAdminPage) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkAdminSession() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/session');
        const json = await res.json();

        if (!isMounted) return;

        if (res.status === 403 || !json.success) {
          // Authenticated but not an organization admin -> redirect to unauthorized
          router.replace('/admin/unauthorized');
          return;
        }

        if (json.success && json.data) {
          setSession(json.data);
        }
      } catch (err) {
        console.error('Failed to verify admin session:', err);
        if (isMounted) {
          router.replace('/admin/unauthorized');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAdminSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, router, isPublicAdminPage]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      window.dispatchEvent(new Event('auth-updated'));
      router.replace('/admin/login');
    } catch (err) {
      console.error('Error signing out:', err);
      router.replace('/admin/login');
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (loading && !isPublicAdminPage) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2ECF2] shadow-sm flex items-center justify-center text-2xl animate-spin mb-4">
          ⚙️
        </div>
        <p className="text-sm font-heading font-semibold text-slate-600">Verifying administrative access...</p>
        <span className="text-xs text-slate-400 mt-1">Checking organization credentials</span>
      </div>
    );
  }

  // If on login or unauthorized page, render full width without sidebar
  if (isPublicAdminPage) {
    return <>{children}</>;
  }

  const role = session?.membership.role?.toLowerCase() || 'staff';
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;

  const navCommerce = [
    { label: 'Dashboard', href: '/admin', icon: '📊', exact: true },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { label: 'Orders', href: '/admin/orders', icon: '📦' },
    { label: 'Products', href: '/admin/products', icon: '🎨', exact: true },
    { label: 'Bundles', href: '/admin/products/bundles', icon: '🎁' },
    { label: 'Inventory', href: '/admin/inventory', icon: '📋' },
    { label: 'Customers', href: '/admin/customers', icon: '👥' },
    { label: 'Reviews', href: '/admin/reviews', icon: '⭐' },
    { label: 'Customizations', href: '/admin/customizations', icon: '✂️' },
    { label: 'Discounts', href: '/admin/discounts', icon: '🏷️' },
  ];

  const allNavSettings = [
    { label: 'Store Settings', href: '/admin/settings', icon: '⚙️', permission: 'organization.manage' },
    { label: 'Locations', href: '/admin/settings/locations', icon: '📍', permission: 'organization.manage' },
    { label: 'Warehouses', href: '/admin/settings/warehouses', icon: '🏬', permission: 'organization.manage' },
    { label: 'Delivery Rates', href: '/admin/settings/delivery', icon: '🚚', permission: 'organization.manage' },
    { label: 'Team Members', href: '/admin/settings/team', icon: '🛡️', permission: 'team.read' },
  ];

  const navSettings = allNavSettings.filter((item) => {
    if (item.permission === 'team.read') return isAdmin;
    if (item.permission === 'organization.manage') return isAdmin;
    return true;
  });

  const isLinkActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const getPageTitle = () => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/analytics')) return 'Store Analytics';
    if (pathname.startsWith('/admin/orders')) return 'Order Management';
    if (pathname.startsWith('/admin/products/bundles')) return 'Product Bundles';
    if (pathname.startsWith('/admin/products')) return 'Products';
    if (pathname.startsWith('/admin/inventory')) return 'Inventory & Stock';
    if (pathname.startsWith('/admin/customers')) return 'Customer Directory';
    if (pathname.startsWith('/admin/reviews')) return 'Review Moderation';
    if (pathname.startsWith('/admin/customizations')) return 'Customizations';
    if (pathname.startsWith('/admin/discounts')) return 'Discounts & Promotions';
    if (pathname.startsWith('/admin/settings')) return 'Store Settings';
    return 'Admin Console';
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-slate-800 flex flex-col md:flex-row">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1E293B] text-slate-200 shrink-0 min-h-screen border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs">
              <img src="/logo.png" alt="Admin Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-heading font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Unwind &amp; Doodle</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Store Context Badge */}
        <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Active Store</div>
          <div className="text-xs font-bold text-slate-100 truncate">
            {session?.organization.name || 'Unwind & Doodle'}
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Commerce Section */}
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Commerce
            </div>
            <nav className="space-y-1">
              {navCommerce.map((item) => {
                const active = isLinkActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? 'bg-rose-500 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Settings Section */}
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Settings &amp; Config
            </div>
            <nav className="space-y-1">
              {navSettings.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? 'bg-rose-500 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer / View Store */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <span>↗</span>
            <span>View Live Store</span>
          </Link>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Overlay & Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative w-64 max-w-[80vw] bg-[#1E293B] text-slate-200 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="font-heading font-bold text-sm text-white">Unwind &amp; Doodle Admin</div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close Admin Sidebar"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <nav className="space-y-1">
                {navCommerce.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                      isLinkActive(item.href, item.exact)
                        ? 'bg-rose-500 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="pt-2 border-t border-slate-800">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Settings
                </div>
                <nav className="space-y-1">
                  {navSettings.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        isLinkActive(item.href)
                          ? 'bg-rose-500 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 px-3 rounded-xl bg-red-950/40 text-red-300 hover:bg-red-900/60 text-xs font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open Admin Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold font-heading text-slate-800 leading-tight">
                {getPageTitle()}
              </h1>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                {session?.organization.name} • Tenant ID: {session?.organization.slug}
              </div>
            </div>
          </div>

          {/* Right Header Admin Info & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                isOwner
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : isAdmin
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                {isOwner ? '👑' : isAdmin ? '🛡️' : '👤'}
              </div>
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-700 leading-tight">
                  {session?.user.email || 'Admin User'}
                </span>
                <span className={`text-[10px] font-bold capitalize ${
                  isOwner ? 'text-amber-600' : isAdmin ? 'text-rose-500' : 'text-blue-500'
                }`}>
                  {session?.membership.role || 'Staff'}
                </span>
              </div>
            </div>

            <NotificationBell variant="admin" />

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
