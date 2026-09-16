'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { EmptyState } from '@/components/EmptyState';

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <EmptyState
        title="We encountered an unexpected issue"
        description={
          error?.digest
            ? `Our team has been automatically alerted (Error ID: ${error.digest}). Please try again or return to the shop.`
            : 'Our team has been automatically alerted. Please try again or return to the shop.'
        }
        icon={<span>⚠️</span>}
        size="md"
        primaryAction={{
          label: 'Try Again',
          onClick: () => reset(),
        }}
        secondaryAction={{
          label: 'Back to Home',
          onClick: () => {
            window.location.href = '/';
          },
        }}
      />
    </div>
  );
}
