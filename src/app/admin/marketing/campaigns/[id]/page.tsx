'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { MarketingCampaign, RecipientStatusCounts } from '@/types/marketing';
import { CampaignComposer } from '@/components/admin/marketing/CampaignComposer';
import Spinner from '@/components/Spinner';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

export default function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delivery Progress Stats (for sending/sent/failed campaigns)
  const [counts, setCounts] = useState<RecipientStatusCounts | null>(null);

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

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${id}/progress`);
      const json = await res.json();
      if (json.success && json.data?.counts) {
        setCounts(json.data.counts);
        if (json.data.campaign?.status && campaign) {
          if (json.data.campaign.status !== campaign.status) {
            setCampaign({
              ...campaign,
              status: json.data.campaign.status,
              started_at: json.data.campaign.started_at,
              completed_at: json.data.campaign.completed_at,
            });
          }
        }
      }
    } catch {
      // Progress fetch error handled silently
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (campaign && (campaign.status === 'sending' || campaign.status === 'sent' || campaign.status === 'failed')) {
      fetchProgress();

      // Poll if actively sending
      if (campaign.status === 'sending') {
        const interval = setInterval(fetchProgress, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [campaign?.status]);

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

  return (
    <div className="space-y-6">
      {/* Active / Completed Campaign Progress Card */}
      {counts && counts.total > 0 && (
        <div className="max-w-7xl mx-auto p-5 rounded-2xl bg-bg-surface border border-border-default shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-heading text-text-primary">
                Campaign Delivery Progress
              </span>
              <Badge
                variant="status"
                statusType={
                  campaign.status === 'sent'
                    ? 'success'
                    : campaign.status === 'failed'
                    ? 'danger'
                    : 'purple'
                }
                size="sm"
              >
                {campaign.status.toUpperCase()}
              </Badge>
            </div>
            {campaign.status === 'sending' && (
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <Spinner size="sm" />
                <span>Sending in progress...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="p-3 bg-bg-subtle rounded-xl text-center">
              <div className="text-lg font-bold font-heading text-text-primary">
                {counts.total.toLocaleString()}
              </div>
              <div className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">
                Total Audience
              </div>
            </div>

            <div className="p-3 bg-status-success-bg/40 border border-status-success-accent/20 rounded-xl text-center">
              <div className="text-lg font-bold font-heading text-status-success-text">
                {counts.sent.toLocaleString()}
              </div>
              <div className="text-[11px] text-status-success-text uppercase tracking-wider font-semibold">
                Sent
              </div>
            </div>

            <div className="p-3 bg-status-danger-bg/40 border border-status-danger-accent/20 rounded-xl text-center">
              <div className="text-lg font-bold font-heading text-status-danger-text">
                {counts.failed.toLocaleString()}
              </div>
              <div className="text-[11px] text-status-danger-text uppercase tracking-wider font-semibold">
                Failed
              </div>
            </div>

            <div className="p-3 bg-bg-subtle rounded-xl text-center">
              <div className="text-lg font-bold font-heading text-text-secondary">
                {(counts.pending + counts.sending).toLocaleString()}
              </div>
              <div className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">
                In Queue
              </div>
            </div>
          </div>
        </div>
      )}

      <CampaignComposer initialCampaign={campaign} />
    </div>
  );
}
