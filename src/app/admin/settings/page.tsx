'use client';

import React from 'react';
import Link from 'next/link';

interface SettingsTile {
  title: string;
  description: string;
  href: string;
  icon: string;
  badge?: string;
}

const SETTINGS_SECTIONS: SettingsTile[] = [
  {
    title: 'Payment Methods',
    description: 'Configure active checkout payment providers (Paystack, Flutterwave) and direct bank transfer details.',
    href: '/admin/settings/payments',
    icon: '💳',
    badge: 'Updated',
  },
  {
    title: 'Delivery Management',
    description: 'Manage delivery zones, warehouse coverage, flat and tiered delivery rates.',
    href: '/admin/settings/delivery',
    icon: '🚚',
  },
  {
    title: 'Locations',
    description: 'Configure serviceable states, cities, and local government areas for fulfillment.',
    href: '/admin/settings/locations',
    icon: '📍',
  },
  {
    title: 'Warehouses',
    description: 'Manage physical warehouse facilities, stock locations, and inventory distribution points.',
    href: '/admin/settings/warehouses',
    icon: '🏬',
  },
  {
    title: 'Team & Permissions',
    description: 'Invite team members, assign administrative roles, and manage store operational access.',
    href: '/admin/settings/team',
    icon: '👥',
  },
];

export default function AdminSettingsHubPage() {
  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <div>
        <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
          Store Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your store configurations, checkout payment methods, delivery zones, and team permissions.
        </p>
      </div>

      {/* Grid of Settings Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:border-rose-200 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  {section.icon}
                </div>
                {section.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {section.badge}
                  </span>
                )}
              </div>
              <h3 className="font-heading font-bold text-sm text-slate-900 group-hover:text-rose-600 transition-colors">
                {section.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {section.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-500 group-hover:translate-x-1 transition-transform">
              <span>Configure</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
