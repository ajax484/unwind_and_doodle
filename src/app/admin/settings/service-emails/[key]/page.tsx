'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ServiceEmailTemplateDetail } from '@/types/service-email';
import { ServiceEmailVisualEditor } from '@/components/admin/settings/service-emails/ServiceEmailVisualEditor';
import Spinner from '@/components/Spinner';
import Button from '@/components/Button';

export default function ServiceEmailEditorPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);

  const [detail, setDetail] = useState<ServiceEmailTemplateDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/settings/service-emails/${key}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load email template');
      }

      setDetail(json.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" />
        <span className="text-xs text-text-tertiary">Loading email template...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-bg-surface border border-status-danger-border rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-status-danger-bg text-status-danger-accent flex items-center justify-center mx-auto text-xl font-bold">
          ⚠️
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-text-primary">Template Not Found</h2>
          <p className="text-xs text-text-secondary">
            {error || `Unable to load email template "${key}".`}
          </p>
        </div>
        <div className="pt-2">
          <Link href="/admin/settings/service-emails">
            <Button variant="primary" size="sm">
              ← Return to Service Emails
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <ServiceEmailVisualEditor initialDetail={detail} />;
}
