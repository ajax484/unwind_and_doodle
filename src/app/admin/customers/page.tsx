'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AdminCustomerListItem,
  AdminCustomerSummaryKPIs,
} from '@/types/admin-customer';

export default function AdminCustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([]);
  const [summary, setSummary] = useState<AdminCustomerSummaryKPIs>({
    totalCustomers: 0,
    registeredAccounts: 0,
    guestCustomers: 0,
    emailSubscribers: 0,
    whatsappSubscribers: 0,
    totalLifetimeValue: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters initialized from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [accountType, setAccountType] = useState(searchParams.get('accountType') || 'all');
  const [marketingConsent, setMarketingConsent] = useState(searchParams.get('marketingConsent') || 'all');
  const [orderActivity, setOrderActivity] = useState(searchParams.get('orderActivity') || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (accountType !== 'all') params.set('accountType', accountType);
      if (marketingConsent !== 'all') params.set('marketingConsent', marketingConsent);
      if (orderActivity !== 'all') params.set('orderActivity', orderActivity);
      if (page > 1) params.set('page', page.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setCustomers(json.data.customers || []);
        setSummary(json.data.summary);
        setPagination(json.data.pagination);
      } else {
        throw new Error(json.error || 'Failed to fetch customers');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading customers');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, accountType, marketingConsent, orderActivity, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const updateUrl = useCallback(
    (newSearch: string, newAccount: string, newMarketing: string, newOrder: string, newPage: number) => {
      startTransition(() => {
        const params = new URLSearchParams();
        if (newSearch) params.set('search', newSearch);
        if (newAccount !== 'all') params.set('accountType', newAccount);
        if (newMarketing !== 'all') params.set('marketingConsent', newMarketing);
        if (newOrder !== 'all') params.set('orderActivity', newOrder);
        if (newPage > 1) params.set('page', newPage.toString());

        router.replace(`/admin/customers?${params.toString()}`);
      });
    },
    [router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
    updateUrl(val, accountType, marketingConsent, orderActivity, 1);
  };

  const handleAccountTypeChange = (val: string) => {
    setAccountType(val);
    setPage(1);
    updateUrl(searchTerm, val, marketingConsent, orderActivity, 1);
  };

  const handleMarketingChange = (val: string) => {
    setMarketingConsent(val);
    setPage(1);
    updateUrl(searchTerm, accountType, val, orderActivity, 1);
  };

  const handleOrderActivityChange = (val: string) => {
    setOrderActivity(val);
    setPage(1);
    updateUrl(searchTerm, accountType, marketingConsent, val, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(searchTerm, accountType, marketingConsent, orderActivity, newPage);
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (accountType !== 'all') params.set('accountType', accountType);
      if (marketingConsent !== 'all') params.set('marketingConsent', marketingConsent);
      if (orderActivity !== 'all') params.set('orderActivity', orderActivity);

      const res = await fetch(`/api/admin/customers/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export customer data');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Customer Management & CRM
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor customer accounts, purchasing histories, lifetime value, and marketing consent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span>📥</span> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Total Customers
          </span>
          <div className="text-2xl font-bold font-heading text-slate-900">
            {summary.totalCustomers}
          </div>
          <p className="text-[11px] text-slate-400">All registered & guests</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Registered Accounts
          </span>
          <div className="text-2xl font-bold font-heading text-indigo-600">
            {summary.registeredAccounts}
          </div>
          <p className="text-[11px] text-slate-400">With auth accounts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Guest Shoppers
          </span>
          <div className="text-2xl font-bold font-heading text-slate-700">
            {summary.guestCustomers}
          </div>
          <p className="text-[11px] text-slate-400">Guest checkouts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Email Subscribers
          </span>
          <div className="text-2xl font-bold font-heading text-emerald-600">
            {summary.emailSubscribers}
          </div>
          <p className="text-[11px] text-slate-400">Consented to email</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Total Customer LTV
          </span>
          <div className="text-2xl font-bold font-heading text-rose-600">
            {formatCurrency(summary.totalLifetimeValue)}
          </div>
          <p className="text-[11px] text-slate-400">Completed order revenue</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-400"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          {/* Account Type */}
          <select
            value={accountType}
            onChange={(e) => handleAccountTypeChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="all">Account: All</option>
            <option value="registered">Registered Accounts</option>
            <option value="guest">Guests Only</option>
          </select>

          {/* Marketing Consent */}
          <select
            value={marketingConsent}
            onChange={(e) => handleMarketingChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="all">Marketing: All</option>
            <option value="email_subscribed">Email Subscribed</option>
            <option value="whatsapp_subscribed">WhatsApp Subscribed</option>
          </select>

          {/* Order Activity */}
          <select
            value={orderActivity}
            onChange={(e) => handleOrderActivityChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="all">Orders: All</option>
            <option value="has_ordered">Has Ordered</option>
            <option value="never_ordered">Never Ordered</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchCustomers} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 4. Customer Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-3xl mx-auto">
              👥
            </div>
            <h3 className="font-heading font-bold text-base text-slate-800">
              No customers found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || accountType !== 'all' || marketingConsent !== 'all' || orderActivity !== 'all'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Customer profiles will appear here automatically when shoppers place orders or register accounts.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Contact</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Account</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Marketing</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Orders</th>
                    <th className="py-3.5 px-4 font-semibold">Total Spent (LTV)</th>
                    <th className="py-3.5 px-4 font-semibold">Last Order</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="font-semibold text-slate-900 hover:text-rose-500 transition-colors block"
                        >
                          {c.fullName}
                        </Link>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {c.email}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-500">
                        <div>{c.phone || '—'}</div>
                        {c.whatsappNumber && c.whatsappNumber !== c.phone && (
                          <div className="text-[10px] text-emerald-600">WA: {c.whatsappNumber}</div>
                        )}
                      </td>

                      {/* Account Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            c.hasAccount
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {c.hasAccount ? 'Registered' : 'Guest'}
                        </span>
                      </td>

                      {/* Marketing Badges */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              c.emailMarketingConsent
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={c.emailMarketingConsent ? 'Email: Subscribed' : 'Email: Unsubscribed'}
                          >
                            ✉
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              c.whatsappMarketingConsent
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={c.whatsappMarketingConsent ? 'WhatsApp: Subscribed' : 'WhatsApp: Unsubscribed'}
                          >
                            💬
                          </span>
                        </div>
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-800">{c.totalOrdersCount}</span>
                        {c.completedOrdersCount > 0 && (
                          <span className="text-[10px] text-emerald-600 block">
                            ({c.completedOrdersCount} paid)
                          </span>
                        )}
                      </td>

                      {/* LTV */}
                      <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                        {formatCurrency(c.lifetimeValue)}
                      </td>

                      {/* Last Order */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {c.lastOrderDate
                          ? new Date(c.lastOrderDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer shadow-2xs"
                        >
                          View Profile →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-100 p-3 space-y-3">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-bold text-slate-900 hover:text-rose-500 block"
                      >
                        {c.fullName}
                      </Link>
                      <span className="text-[11px] text-slate-400">{c.email}</span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        c.hasAccount
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {c.hasAccount ? 'Registered' : 'Guest'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-600">
                    <div>
                      Spent: <strong className="text-slate-900">{formatCurrency(c.lifetimeValue)}</strong> (
                      {c.totalOrdersCount} orders)
                    </div>

                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="text-rose-500 font-bold hover:underline"
                    >
                      Profile →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} customers
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>

                  <span className="font-semibold text-slate-800">
                    {pagination.page} / {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
