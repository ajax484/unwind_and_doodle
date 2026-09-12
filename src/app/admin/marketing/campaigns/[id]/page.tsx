'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { MarketingCampaign } from '@/types/marketing';
import { CampaignComposer } from '@/components/admin/marketing/CampaignComposer';
import Spinner from '@/components/Spinner';
import Button from '@/components/Button';

export default function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/marketing/campaigns/${id}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load campaign');
      }

      setCampaign(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching campaign');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <span className="text-xs text-text-tertiary mt-3">Loading campaign...</span>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-2xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-sm">
          {error || 'Campaign not found.'}
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/admin/marketing/campaigns">
            <Button variant="outline" size="sm">
              ← Back to Campaigns
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={fetchCampaign}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <CampaignComposer initialCampaign={campaign} />;
}
