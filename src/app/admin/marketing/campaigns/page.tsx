'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MarketingCampaignListItem, MarketingCampaignStatus } from '@/types/marketing';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/admin/marketing/campaigns?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load campaigns');
      }

      setCampaigns(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  const handleDelete = async (campaign: MarketingCampaignListItem) => {
    if (!confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
      return;
    }

    try {
      setActionLoadingId(campaign.id);
      const res = await fetch(`/api/admin/marketing/campaigns/${campaign.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete campaign');
      }

      toast.success('Campaign deleted successfully.');
      fetchCampaigns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter campaigns by search query client-side
  const filteredCampaigns = campaigns.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.subject && c.subject.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-text-primary">
            Marketing Campaigns
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Create, compose, and manage customer email marketing campaigns.
          </p>
        </div>

        <div>
          <Link href="/admin/marketing/campaigns/new">
            <Button variant="primary" size="md">
              + Create Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-bg-surface rounded-2xl border border-border-default shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'All', value: 'all' },
            { label: 'Drafts', value: 'draft' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Sent', value: 'sent' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.value
                  ? 'bg-action-primary text-text-inverse shadow-xs'
                  : 'text-text-secondary hover:bg-bg-subtle'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="sm:w-64">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-border-default bg-bg-surface text-text-primary placeholder:text-text-placeholder focus:outline-hidden focus:ring-2 focus:ring-border-brand"
          />
        </div>
      </div>

      {/* Campaigns Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-bg-surface rounded-2xl border border-border-default">
          <Spinner size="md" />
          <span className="text-xs text-text-tertiary mt-2">Loading campaigns...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchCampaigns}>
            Retry
          </Button>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-bg-surface rounded-2xl border border-border-default text-center space-y-3">
          <div className="text-4xl">✉️</div>
          <h2 className="text-base font-bold font-heading text-text-primary">
            {searchQuery ? 'No matching campaigns' : 'No campaigns yet'}
          </h2>
          <p className="text-xs text-text-secondary max-w-sm">
            {searchQuery
              ? 'Try modifying your search term or status filter.'
              : 'Draft your first email campaign, target customer segments, and schedule delivery.'}
          </p>
          {!searchQuery && (
            <Link href="/admin/marketing/campaigns/new">
              <Button variant="primary" size="sm">
                Create First Campaign
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-bg-surface rounded-2xl border border-border-default shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-default bg-bg-subtle/50 text-text-secondary font-semibold">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Scheduled / Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/60">
                {filteredCampaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-bg-subtle/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-text-primary">
                      <Link
                        href={`/admin/marketing/campaigns/${c.id}`}
                        className="hover:underline hover:text-action-primary"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary truncate max-w-xs">
                      {c.subject || <span className="text-text-placeholder italic">No subject</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="status"
                        statusType={
                          c.status === 'scheduled'
                            ? 'purple'
                            : c.status === 'sent'
                            ? 'success'
                            : c.status === 'failed'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {c.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-text-tertiary">
                      {c.scheduled_at ? (
                        <span title="Scheduled Date">
                          ⏰ {new Date(c.scheduled_at).toLocaleDateString()} {new Date(c.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/marketing/campaigns/${c.id}`}>
                          <Button variant="outline" size="sm">
                            {c.status === 'draft' ? 'Edit' : 'View'}
                          </Button>
                        </Link>
                        {c.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoadingId === c.id}
                            onClick={() => handleDelete(c)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
