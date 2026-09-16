'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Button from '@/components/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { section: 'admin_portal' },
    });
  }, [error]);

  return (
    <div className="p-6 sm:p-10 max-w-2xl mx-auto my-12 bg-bg-surface border border-status-danger-accent/30 rounded-2xl shadow-xs text-center space-y-5">
      <div className="w-12 h-12 rounded-full bg-status-danger-bg text-status-danger-text flex items-center justify-center mx-auto text-xl font-bold">
        ⚠️
      </div>
      <div>
        <h2 className="text-xl font-heading font-bold text-text-primary">
          Admin Console Error
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          An unexpected error occurred while loading this administrative view.
        </p>
        {error?.digest && (
          <p className="text-[11px] font-mono text-text-tertiary mt-2">
            Reference ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Button variant="primary" size="sm" onClick={() => reset()}>
          Reload View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = '/admin';
          }}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
