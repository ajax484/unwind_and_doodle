'use client';

import React, { useState } from 'react';

interface StockNotificationButtonProps {
  productId: string;
  productName: string;
}

export default function StockNotificationButton({
  productId,
  productName,
}: StockNotificationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/notifications/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, channel: 'email' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSubscribed(true);
      } else if (res.status === 401) {
        // Redirect to auth with return url
        window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`;
      } else {
        setError(json.error || 'Failed to subscribe to notifications');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error subscribing');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl font-medium">
        <span>✓</span> We will email you when {productName} is back in stock!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full bg-[#EBF3F8] hover:bg-[#D9E9F2] text-[#243342] border border-[#CBDDE8] px-4 py-3 rounded-2xl font-heading font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
      >
        <span>🔔</span>
        {loading ? 'Subscribing...' : 'Notify Me When Available'}
      </button>
      {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
    </div>
  );
}
