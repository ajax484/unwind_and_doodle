'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface AccountOverviewData {
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    emailMarketingConsent: boolean;
    whatsappMarketingConsent: boolean;
  };
  recentOrder: {
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    itemsPreview: { productName: string; quantity: number }[];
  } | null;
  defaultAddress: {
    recipientName: string;
    addressLine1: string;
    city?: string | null;
    state: string;
  } | null;
}

export default function AccountOverviewPage() {
  const [data, setData] = useState<AccountOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, ordersRes, addressesRes] = await Promise.all([
          fetch('/api/account/profile'),
          fetch('/api/account/orders'),
          fetch('/api/account/addresses'),
        ]);

        const profileJson = await profileRes.json();
        const ordersJson = await ordersRes.json();
        const addressesJson = await addressesRes.json();

        const defaultAddr = (addressesJson.data || []).find((a: { isDefault: boolean }) => a.isDefault) || addressesJson.data?.[0] || null;
        const latestOrder = ordersJson.data?.[0] || null;

        setData({
          customer: profileJson.data,
          recentOrder: latestOrder,
          defaultAddress: defaultAddr,
        });
      } catch {
        // Handled in UI
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="card-soft p-12 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#D99BA3] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading overview...</p>
      </div>
    );
  }

  const firstName = data?.customer?.firstName || 'Friend';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="card-soft p-6 sm:p-8 bg-gradient-to-tr from-[#FBF0F2] via-white to-[#EBF3F8] border-[#E2ECF2] shadow-xs space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-800">
          Welcome back, {firstName}! 🌸
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Manage your mindful coloring book orders, saved delivery addresses, and preferences.
        </p>
      </div>

      {/* Grid of Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Order Card */}
        <div className="card-soft p-6 bg-white border border-[#E2ECF2] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>📦</span> Latest Order
              </h3>
              <Link
                href="/account/orders"
                className="text-[11px] font-semibold text-[#D99BA3] hover:underline"
              >
                View all →
              </Link>
            </div>

            {data?.recentOrder ? (
              <div className="p-4 bg-[#F4F8FA] rounded-2xl space-y-2 border border-[#EDF3F7]">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    #{data.recentOrder.orderNumber}
                  </span>
                  <span className="badge-stock badge-in-stock capitalize text-[10px]">
                    {data.recentOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Total: <strong className="text-slate-900">₦{data.recentOrder.totalAmount.toLocaleString()}</strong>
                </p>
                <div className="pt-2">
                  <Link
                    href={`/account/orders/${data.recentOrder.orderNumber}`}
                    className="btn-pink text-xs !py-2 !px-4 block text-center"
                  >
                    Track / View Order →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>You haven&apos;t placed any orders yet.</p>
                <Link href="/products" className="btn-blue text-xs !py-2 !px-4 inline-block">
                  Explore Catalog
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Primary Address Card */}
        <div className="card-soft p-6 bg-white border border-[#E2ECF2] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>📍</span> Primary Address
              </h3>
              <Link
                href="/account/addresses"
                className="text-[11px] font-semibold text-[#D99BA3] hover:underline"
              >
                Manage →
              </Link>
            </div>

            {data?.defaultAddress ? (
              <div className="p-4 bg-[#F4F8FA] rounded-2xl space-y-1.5 border border-[#EDF3F7] text-xs text-slate-600">
                <p className="font-semibold text-slate-800">{data.defaultAddress.recipientName}</p>
                <p>{data.defaultAddress.addressLine1}</p>
                <p>
                  {data.defaultAddress.city ? `${data.defaultAddress.city}, ` : ''}
                  {data.defaultAddress.state}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>No saved addresses yet.</p>
                <Link href="/account/addresses" className="btn-blue text-xs !py-2 !px-4 inline-block">
                  + Add Address
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/account/orders"
          className="card-soft p-5 bg-white border border-[#E2ECF2] hover:border-[#D99BA3] hover:shadow-sm text-center transition-all group"
        >
          <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">📦</span>
          <span className="font-heading font-semibold text-xs text-slate-800 block">Orders</span>
          <span className="text-[10px] text-slate-400">Order history &amp; tracking</span>
        </Link>

        <Link
          href="/account/addresses"
          className="card-soft p-5 bg-white border border-[#E2ECF2] hover:border-[#D99BA3] hover:shadow-sm text-center transition-all group"
        >
          <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">📍</span>
          <span className="font-heading font-semibold text-xs text-slate-800 block">Addresses</span>
          <span className="text-[10px] text-slate-400">Delivery locations</span>
        </Link>

        <Link
          href="/account/profile"
          className="card-soft p-5 bg-white border border-[#E2ECF2] hover:border-[#D99BA3] hover:shadow-sm text-center transition-all group"
        >
          <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">👤</span>
          <span className="font-heading font-semibold text-xs text-slate-800 block">Profile</span>
          <span className="text-[10px] text-slate-400">Personal details</span>
        </Link>

        <Link
          href="/account/preferences"
          className="card-soft p-5 bg-white border border-[#E2ECF2] hover:border-[#D99BA3] hover:shadow-sm text-center transition-all group"
        >
          <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🔔</span>
          <span className="font-heading font-semibold text-xs text-slate-800 block">Preferences</span>
          <span className="text-[10px] text-slate-400">Email &amp; WhatsApp alerts</span>
        </Link>
      </div>
    </div>
  );
}
