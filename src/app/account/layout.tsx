'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar } from '@/components/Avatar';

interface CustomerData {
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.authenticated && json.data?.customer) {
            setCustomer(json.data.customer);
          }
        }
      } catch (err) {
        console.error('Failed to load customer profile:', err);
      }
    }

    loadAccount();

    const handleAuthUpdate = () => loadAccount();
    window.addEventListener('auth-updated', handleAuthUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('auth-updated', handleAuthUpdate);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      window.dispatchEvent(new Event('auth-updated'));
      router.replace('/');
    } catch {
      router.replace('/');
    }
  };

  const navItems = [
    { label: 'Overview', href: '/account', icon: '📊' },
    { label: 'Orders', href: '/account/orders', icon: '📦' },
    { label: 'Addresses', href: '/account/addresses', icon: '📍' },
    { label: 'Profile', href: '/account/profile', icon: '👤' },
    { label: 'Preferences', href: '/account/preferences', icon: '🔔' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="card-soft p-6 bg-white border border-border-default shadow-xs space-y-6">
            {/* User Profile Snippet */}
            <div className="flex items-center gap-3 pb-6 border-b border-border-default">
              <Avatar
                size="lg"
                name={
                  customer?.firstName
                    ? `${customer.firstName} ${customer.lastName || ''}`.trim()
                    : customer?.email || undefined
                }
              />
              <div className="overflow-hidden">
                <h3 className="font-heading font-bold text-sm text-text-primary truncate">
                  {customer?.firstName
                    ? `${customer.firstName} ${customer.lastName || ''}`.trim()
                    : 'Customer Account'}
                </h3>
                <p className="text-[11px] text-text-tertiary truncate">{customer?.email}</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/account'
                    ? pathname === '/account'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-bg-accent text-brand-rose shadow-xs'
                        : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Sign Out Button */}
            <div className="pt-4 border-t border-border-default">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-status-danger-accent hover:bg-status-danger-bg transition-colors cursor-pointer"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-3">{children}</main>
      </div>
    </div>
  );
}
