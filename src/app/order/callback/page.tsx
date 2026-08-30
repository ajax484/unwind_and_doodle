'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const txRef = searchParams.get('tx_ref') || searchParams.get('reference');
  const transactionId = searchParams.get('transaction_id') || searchParams.get('id');
  const status = searchParams.get('status');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!txRef) {
        setErrorMessage('Missing transaction reference');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.append('tx_ref', txRef);
        if (transactionId) params.append('transaction_id', transactionId);

        const res = await fetch(`/api/orders/verify?${params.toString()}`);
        const json = await res.json();

        if (res.ok && json.success && json.orderNumber) {
          // Clear cart upon successful order payment
          try {
            await fetch('/api/cart?clear=true', { method: 'DELETE' });
            window.dispatchEvent(new Event('cart-updated'));
          } catch {
            // Non-blocking
          }

          // Redirect to confirmation page
          router.replace(`/order/${json.orderNumber}`);
        } else {
          setErrorMessage(json.error || 'Payment verification pending. Please check order status.');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Error verifying transaction');
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [txRef, transactionId, router]);

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-6">
      {loading ? (
        <div className="card-soft p-12 space-y-6">
          <div className="w-16 h-16 rounded-full border-4 border-pink-400 border-t-transparent animate-spin mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-heading text-slate-800">
              Verifying Payment...
            </h2>
            <p className="text-slate-500 text-sm">
              Please wait while we confirm your payment.
            </p>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="card-soft p-10 space-y-6 bg-red-50/50 border-red-100">
          <span className="text-5xl">⚠️</span>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-heading text-red-800">
              Verification Issue
            </h2>
            <p className="text-slate-600 text-sm">{errorMessage}</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/" className="btn-pink text-xs px-6!">
              Return Home
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function OrderCallbackPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto py-24 text-center">Processing...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
