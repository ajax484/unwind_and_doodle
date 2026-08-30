'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  AdminCustomerDetail,
  AdminCustomerOrderSummary,
  AdminCustomerAddress,
  AdminCustomerNoteItem,
  AdminCustomerActivityItem,
} from '@/types/admin-customer';

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);

  const [data, setData] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Edit State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Marketing Consent Toggle State
  const [consentUpdating, setConsentUpdating] = useState<string | null>(null);

  // Internal CRM Notes State
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/customers/${customerId}`);
      const json = await res.json();

      if (res.ok && json.success) {
        const cust: AdminCustomerDetail = json.data;
        setData(cust);
        setFirstName(cust.firstName || '');
        setLastName(cust.lastName || '');
        setPhone(cust.phone || '');
        setWhatsappNumber(cust.whatsappNumber || '');
      } else {
        throw new Error(json.error || 'Failed to fetch customer');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileSuccess(null);
      setProfileError(null);

      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setProfileSuccess('Profile updated successfully!');
        await fetchCustomer();
      } else {
        throw new Error(json.error || 'Failed to update profile');
      }
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleToggleConsent = async (channel: 'email' | 'whatsapp', currentConsent: boolean) => {
    const nextConsent = !currentConsent;
    const confirmed = window.confirm(
      `Are you sure you want to change ${channel.toUpperCase()} marketing consent to ${
        nextConsent ? 'SUBSCRIBED' : 'UNSUBSCRIBED'
      }? This action is audit-logged.`
    );
    if (!confirmed) return;

    try {
      setConsentUpdating(channel);
      const res = await fetch(`/api/admin/customers/${customerId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          consent: nextConsent,
          reason: 'Explicit admin manual override from CRM',
        }),
      });

      if (res.ok) {
        await fetchCustomer();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to update consent');
      }
    } catch {
      alert('Error updating consent');
    } finally {
      setConsentUpdating(null);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setNoteSaving(true);
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setNewNote('');
        await fetchCustomer();
      } else {
        throw new Error(json.error || 'Failed to add note');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding note');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this internal note?')) return;

    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchCustomer();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to delete note');
      }
    } catch {
      alert('Error deleting note');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-red-200 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h3 className="font-heading font-bold text-lg text-slate-800">Customer Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/admin/customers"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          ← Return to Customers
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/customers" className="hover:text-slate-600">
              ← Customers
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-bold">{data.fullName}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
              {data.fullName}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                data.hasAccount
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {data.hasAccount ? 'Registered Account' : 'Guest Shopper'}
            </span>

            {data.hasAbandonedCart && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                🛒 Active Cart / In Checkout
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500">
            {data.email} {data.phone ? `• ${data.phone}` : ''} • Customer since{' '}
            {new Date(data.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/customers"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            All Customers
          </Link>
        </div>
      </div>

      {/* 2. Customer Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Total Orders
          </span>
          <div className="text-2xl font-bold font-heading text-slate-900">
            {data.metrics.totalOrders}
          </div>
          <p className="text-[11px] text-slate-400">{data.metrics.completedOrders} completed</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Lifetime Value (LTV)
          </span>
          <div className="text-2xl font-bold font-heading text-rose-600">
            {formatCurrency(data.metrics.lifetimeValue)}
          </div>
          <p className="text-[11px] text-slate-400">Total paid revenue</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Average Order Value
          </span>
          <div className="text-2xl font-bold font-heading text-slate-900">
            {formatCurrency(data.metrics.averageOrderValue)}
          </div>
          <p className="text-[11px] text-slate-400">Per completed order</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
            Last Order Date
          </span>
          <div className="text-sm font-bold font-mono text-slate-800 pt-1">
            {data.metrics.lastOrderDate
              ? new Date(data.metrics.lastOrderDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Never ordered'}
          </div>
          <p className="text-[11px] text-slate-400">Most recent checkout</p>
        </div>
      </div>

      {/* 3. Two Column Layout: Profile & Marketing (Left), Orders & Addresses (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact Profile & Marketing Consent */}
        <div className="space-y-6">
          {/* Profile Form */}
          <form
            onSubmit={handleUpdateProfile}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
          >
            <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Customer Contact Profile
            </h3>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                ✓ {profileSuccess}
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {profileError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Email (Identity Locked)</label>
                <input
                  type="email"
                  value={data.email}
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">WhatsApp Number</label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 2348012345678"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {profileSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>

          {/* Marketing Consent */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 text-xs">
            <h3 className="font-heading font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Marketing Consent
            </h3>

            <div className="space-y-3">
              {/* Email Marketing */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Email Marketing</div>
                  <div className="text-[11px] text-slate-400">
                    Status:{' '}
                    <strong
                      className={
                        data.emailMarketingConsent ? 'text-emerald-600' : 'text-slate-500'
                      }
                    >
                      {data.emailMarketingConsent ? 'Subscribed' : 'Unsubscribed'}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleConsent('email', data.emailMarketingConsent)}
                  disabled={consentUpdating === 'email'}
                  className={`px-3 py-1 rounded-xl font-semibold text-[11px] cursor-pointer transition-colors ${
                    data.emailMarketingConsent
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {consentUpdating === 'email'
                    ? 'Updating...'
                    : data.emailMarketingConsent
                    ? 'Unsubscribe'
                    : 'Subscribe'}
                </button>
              </div>

              {/* WhatsApp Marketing */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">WhatsApp Marketing</div>
                  <div className="text-[11px] text-slate-400">
                    Status:{' '}
                    <strong
                      className={
                        data.whatsappMarketingConsent ? 'text-emerald-600' : 'text-slate-500'
                      }
                    >
                      {data.whatsappMarketingConsent ? 'Subscribed' : 'Unsubscribed'}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleToggleConsent('whatsapp', data.whatsappMarketingConsent)
                  }
                  disabled={consentUpdating === 'whatsapp'}
                  className={`px-3 py-1 rounded-xl font-semibold text-[11px] cursor-pointer transition-colors ${
                    data.whatsappMarketingConsent
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {consentUpdating === 'whatsapp'
                    ? 'Updating...'
                    : data.whatsappMarketingConsent
                    ? 'Unsubscribe'
                    : 'Subscribe'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (2 cols wide on desktop): Orders, Addresses, Notes & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order History */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Order History ({data.orders.length})
              </h3>
              <span className="text-xs text-slate-400">Historical customer purchases</span>
            </div>

            {data.orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No orders placed by this customer yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Order</th>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Items</th>
                      <th className="py-2.5 px-3 font-semibold">Total</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.orders.map((ord: AdminCustomerOrderSummary) => (
                      <tr key={ord.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          #{ord.orderNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === 'confirmed' || ord.status === 'shipped' || ord.status === 'received'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ord.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{ord.itemsCount}</td>
                        <td className="py-2.5 px-3 font-heading font-bold text-slate-900">
                          {formatCurrency(ord.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/admin/orders/${ord.id}`}
                            className="text-rose-500 font-bold hover:underline"
                          >
                            View Order →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Saved Addresses */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Saved Shipping Addresses ({data.addresses.length})
              </h3>
              <p className="text-xs text-slate-400">
                Addresses saved in the customer account (read-only in CRM).
              </p>
            </div>

            {data.addresses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No saved shipping addresses.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {data.addresses.map((addr: AdminCustomerAddress) => (
                  <div
                    key={addr.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{addr.recipientName}</span>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600">{addr.addressLine1}</div>
                    {addr.addressLine2 && (
                      <div className="text-slate-500">{addr.addressLine2}</div>
                    )}
                    <div className="text-slate-400 text-[11px]">
                      {addr.lga ? `${addr.lga}, ` : ''}
                      {addr.state} • {addr.phone}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal CRM Notes */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Internal CRM Notes ({data.notes.length})
              </h3>
              <p className="text-xs text-slate-400">
                Private administrative notes. Never visible to customers.
              </p>
            </div>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an administrative note or customer support note..."
                rows={2}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={noteSaving || !newNote.trim()}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  {noteSaving ? 'Adding...' : '+ Add Note'}
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-100">
              {data.notes.map((n: AdminCustomerNoteItem) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-800">{n.note}</p>
                    <span className="text-[11px] text-slate-400">
                      {n.authorName || 'Admin'} • {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(n.id)}
                    className="text-slate-400 hover:text-red-600 text-xs p-1"
                    title="Delete note"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-900">
                Customer Activity Timeline
              </h3>
              <p className="text-xs text-slate-400">
                Chronological timeline of customer account and shopping events.
              </p>
            </div>

            <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {data.activity.map((act: AdminCustomerActivityItem) => (
                <div key={act.id} className="relative space-y-1 text-xs">
                  <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-rose-400 border-2 border-white shadow-2xs" />
                  <div className="font-bold text-slate-800">{act.title}</div>
                  <div className="text-slate-500">{act.description}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(act.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
