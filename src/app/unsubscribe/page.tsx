'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage('Invalid or missing unsubscribe token.');
      return;
    }

    async function doUnsubscribe() {
      try {
        const res = await fetch(`/api/marketing/unsubscribe?token=${encodeURIComponent(token!)}`);
        const json = await res.json();

        if (res.ok && json.success) {
          setSuccess(true);
          setMessage(json.message || 'You have been unsubscribed from our marketing updates.');
          if (json.customerEmail) setEmail(json.customerEmail);
        } else {
          setSuccess(false);
          setMessage(json.error || 'Failed to process unsubscribe request.');
        }
      } catch {
        setSuccess(false);
        setMessage('A network error occurred while processing your request.');
      } finally {
        setLoading(false);
      }
    }

    doUnsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-subtle/50">
      <div className="w-full max-w-md p-8 bg-bg-surface rounded-3xl border border-border-default shadow-lg text-center space-y-5">
        <div className="text-4xl">
          {loading ? '⏳' : success ? '👋' : '⚠️'}
        </div>

        <h1 className="text-xl font-bold font-heading text-text-primary">
          {loading
            ? 'Processing your request...'
            : success
            ? 'Unsubscribed Successfully'
            : 'Unsubscribe Error'}
        </h1>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Spinner size="md" />
            <span className="text-xs text-text-tertiary mt-2">Updating your preferences...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              {message}
            </p>

            {email && (
              <p className="text-xs font-mono font-medium text-text-primary bg-bg-subtle p-2 rounded-xl">
                {email}
              </p>
            )}

            <p className="text-[11px] text-text-tertiary">
              You will no longer receive marketing or promotional emails from this sender. Transactional receipts for orders will still be delivered.
            </p>
          </div>
        )}

        {!loading && (
          <div className="pt-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                Return to Store
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-subtle/50">
          <Spinner size="lg" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
