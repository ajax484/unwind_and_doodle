'use client';

import React, { useState } from 'react';
import Button from '@/components/Button';

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
      <div className="flex items-center gap-2 text-xs text-status-success-text bg-status-success-bg border border-status-success-accent/30 px-4 py-2.5 rounded-xl font-medium">
        <span>✓</span> We will email you when {productName} is back in stock!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="md"
        onClick={handleSubscribe}
        disabled={loading}
        loading={loading}
        leadingIcon={<span>🔔</span>}
        className="w-full rounded-2xl"
      >
        {loading ? 'Subscribing...' : 'Notify Me When Available'}
      </Button>
      {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
    </div>
  );
}
