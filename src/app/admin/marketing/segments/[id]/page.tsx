'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { MarketingSegment } from '@/types/marketing';
import { SegmentForm } from '@/components/admin/marketing/SegmentForm';
import Spinner from '@/components/Spinner';
import Button from '@/components/Button';

export default function EditSegmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [segment, setSegment] = useState<MarketingSegment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSegment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/marketing/segments/${id}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load marketing segment');
      }

      setSegment(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching marketing segment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegment();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <span className="text-xs text-text-tertiary mt-3">Loading segment...</span>
      </div>
    );
  }

  if (error || !segment) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-2xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-sm">
          {error || 'Marketing segment not found.'}
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/admin/marketing/segments">
            <Button variant="outline" size="sm">
              ← Back to Segments
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={fetchSegment}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <SegmentForm initialSegment={segment} />;
}
