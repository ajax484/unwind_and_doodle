'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CampaignAnalytics,
  MarketingCampaignRecipient,
  MarketingRecipientStatus,
  MarketingCampaignStatus,
} from '@/types/marketing';
import Spinner from '@/components/Spinner';
import Badge from '@/components/Badge';
import Button from '@/components/Button';

interface CampaignAnalyticsViewProps {
  campaignId: string;
  campaignStatus: MarketingCampaignStatus;
  scheduledAt?: string | null;
  audienceEstimate?: number;
}

export function CampaignAnalyticsView({
  campaignId,
  campaignStatus,
  scheduledAt,
  audienceEstimate,
}: CampaignAnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [recipients, setRecipients] = useState<MarketingCampaignRecipient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/analytics`);
      const json = await res.json();
      if (json.success && json.data) {
        setAnalytics(json.data);
      }
    } catch {
      // Handled silently
    }
  }, [campaignId]);

  const fetchRecipients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      params.set('page', String(page));
      params.set('limit', '15');

      const res = await fetch(
        `/api/admin/marketing/campaigns/${campaignId}/recipients?${params.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setRecipients(json.data.data || []);
        setTotalPages(json.data.totalPages || 1);
      }
    } catch {
      // Handled silently
    }
  }, [campaignId, statusFilter, searchQuery, page]);

  useEffect(() => {
    if (campaignStatus === 'sent' || campaignStatus === 'sending' || campaignStatus === 'failed') {
      setLoading(true);
      Promise.all([fetchAnalytics(), fetchRecipients()]).finally(() => setLoading(false));

      // Polling while campaign is actively sending
      if (campaignStatus === 'sending') {
        const interval = setInterval(() => {
          fetchAnalytics();
          fetchRecipients();
        }, 3000);
        return () => clearInterval(interval);
      }
    } else {
      setLoading(false);
    }
  }, [campaignId, campaignStatus, fetchAnalytics, fetchRecipients]);

  // Helper formatting for percentage
  const formatPercent = (rate: number | null | undefined): string => {
    if (rate === null || rate === undefined || isNaN(rate)) {
      return '—';
    }
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecipientBadgeStatus = (status: MarketingRecipientStatus) => {
    switch (status) {
      case 'delivered':
      case 'opened':
      case 'clicked':
        return 'success';
      case 'bounced':
      case 'failed':
        return 'danger';
      case 'sending':
      case 'sent':
        return 'info';
      case 'unsubscribed':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  // State 1: Draft
  if (campaignStatus === 'draft') {
    return (
      <div className="p-5 rounded-2xl bg-bg-surface border border-border-default space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-heading text-text-primary">
            Campaign Audience &amp; Analytics
          </h3>
          <Badge variant="status" statusType="neutral" size="sm">
            DRAFT
          </Badge>
        </div>
        <p className="text-xs text-text-tertiary">
          This campaign is in draft mode. Target audience estimate:{' '}
          <strong className="text-text-primary">{audienceEstimate ?? 'Calculating...'}</strong>.
          Delivery lifecycle metrics and recipient engagement rates will appear here once the
          campaign is dispatched.
        </p>
      </div>
    );
  }

  // State 2: Scheduled
  if (campaignStatus === 'scheduled') {
    return (
      <div className="p-5 rounded-2xl bg-status-info-bg/40 border border-status-info-accent/30 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-heading text-status-info-text">
            Scheduled Campaign
          </h3>
          <Badge variant="status" statusType="info" size="sm">
            SCHEDULED
          </Badge>
        </div>
        <p className="text-xs text-text-secondary">
          Scheduled to dispatch on{' '}
          <strong className="text-text-primary">{formatDate(scheduledAt)}</strong>. Target
          audience size:{' '}
          <strong className="text-text-primary">{audienceEstimate ?? 'Pending evaluation'}</strong>
          .
        </p>
      </div>
    );
  }

  // State 3: Sending / Sent / Failed
  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="p-5 rounded-2xl bg-bg-surface border border-border-default shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold font-heading text-text-primary">
              Campaign Delivery &amp; Analytics
            </h3>
            <p className="text-xs text-text-tertiary">
              Real-time delivery verification, engagement milestones, and conversion rates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="status"
              statusType={
                campaignStatus === 'sent'
                  ? 'success'
                  : campaignStatus === 'failed'
                  ? 'danger'
                  : 'purple'
              }
              size="sm"
            >
              {campaignStatus.toUpperCase()}
            </Badge>
            {campaignStatus === 'sending' && (
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <Spinner size="sm" />
                <span>Sending in progress...</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchAnalytics();
                fetchRecipients();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* 8 Primary Recipient Volume Metrics */}
        {analytics ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
            <div className="p-3 bg-bg-subtle rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-text-primary">
                {analytics.recipients.toLocaleString()}
              </div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">
                Recipients
              </div>
            </div>

            <div className="p-3 bg-bg-subtle rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-text-primary">
                {analytics.sent.toLocaleString()}
              </div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">
                Sent
              </div>
            </div>

            <div className="p-3 bg-status-success-bg/40 border border-status-success-accent/20 rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-status-success-text">
                {analytics.delivered.toLocaleString()}
              </div>
              <div className="text-[10px] text-status-success-text uppercase tracking-wider font-semibold">
                Delivered
              </div>
            </div>

            <div className="p-3 bg-action-primary/10 border border-action-primary/20 rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-action-primary">
                {analytics.opened.toLocaleString()}
              </div>
              <div className="text-[10px] text-action-primary uppercase tracking-wider font-semibold">
                Opened
              </div>
            </div>

            <div className="p-3 bg-status-purple-base/10 border border-status-purple-base/20 rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-status-purple-base">
                {analytics.clicked.toLocaleString()}
              </div>
              <div className="text-[10px] text-status-purple-base uppercase tracking-wider font-semibold">
                Clicked
              </div>
            </div>

            <div className="p-3 bg-status-warning-bg/40 border border-status-warning-accent/20 rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-status-warning-text">
                {analytics.bounced.toLocaleString()}
              </div>
              <div className="text-[10px] text-status-warning-text uppercase tracking-wider font-semibold">
                Bounced
              </div>
            </div>

            <div className="p-3 bg-status-danger-bg/40 border border-status-danger-accent/20 rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-status-danger-text">
                {analytics.failed.toLocaleString()}
              </div>
              <div className="text-[10px] text-status-danger-text uppercase tracking-wider font-semibold">
                Failed
              </div>
            </div>

            <div className="p-3 bg-bg-subtle rounded-xl text-center">
              <div className="text-xl font-bold font-heading text-text-secondary">
                {analytics.unsubscribed.toLocaleString()}
              </div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">
                Unsub
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-6">
            <Spinner size="md" />
          </div>
        )}

        {/* 5 Conversion & Delivery Rates */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            <div className="p-3 bg-bg-subtle border border-border-default rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Delivery Rate</span>
                <span className="font-bold text-text-primary font-heading">
                  {formatPercent(analytics.deliveryRate)}
                </span>
              </div>
              <div className="w-full bg-border-default rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-status-success-accent h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (analytics.deliveryRate || 0) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-text-tertiary text-right">delivered / sent</div>
            </div>

            <div className="p-3 bg-bg-subtle border border-border-default rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Open Rate</span>
                <span className="font-bold text-action-primary font-heading">
                  {formatPercent(analytics.openRate)}
                </span>
              </div>
              <div className="w-full bg-border-default rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-action-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (analytics.openRate || 0) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-text-tertiary text-right">opened / delivered</div>
            </div>

            <div className="p-3 bg-bg-subtle border border-border-default rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Click Rate</span>
                <span className="font-bold text-status-purple-base font-heading">
                  {formatPercent(analytics.clickRate)}
                </span>
              </div>
              <div className="w-full bg-border-default rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-status-purple-base h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (analytics.clickRate || 0) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-text-tertiary text-right">clicked / delivered</div>
            </div>

            <div className="p-3 bg-bg-subtle border border-border-default rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Bounce Rate</span>
                <span className="font-bold text-status-warning-text font-heading">
                  {formatPercent(analytics.bounceRate)}
                </span>
              </div>
              <div className="w-full bg-border-default rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-status-warning-accent h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (analytics.bounceRate || 0) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-text-tertiary text-right">bounced / sent</div>
            </div>

            <div className="p-3 bg-bg-subtle border border-border-default rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-medium">Unsubscribe Rate</span>
                <span className="font-bold text-text-tertiary font-heading">
                  {formatPercent(analytics.unsubscribeRate)}
                </span>
              </div>
              <div className="w-full bg-border-default rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-text-tertiary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (analytics.unsubscribeRate || 0) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-text-tertiary text-right">unsub / delivered</div>
            </div>
          </div>
        )}
      </div>

      {/* Recipient Detail & Delivery Audit Table */}
      <div className="p-5 rounded-2xl bg-bg-surface border border-border-default shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold font-heading text-text-primary">
              Recipient Delivery &amp; Event Log
            </h4>
            <p className="text-xs text-text-tertiary">
              Audit individual recipient delivery milestones, engagement, and errors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search recipient email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-bg-subtle border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-action-primary"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-bg-subtle border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-action-primary"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="bounced">Bounced</option>
              <option value="failed">Failed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Spinner size="md" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-tertiary">
            No recipient records match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-default text-text-tertiary font-heading">
                  <th className="py-2.5 px-3 font-semibold">Recipient</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Sent</th>
                  <th className="py-2.5 px-3 font-semibold">Delivered</th>
                  <th className="py-2.5 px-3 font-semibold">Opened</th>
                  <th className="py-2.5 px-3 font-semibold">Clicked</th>
                  <th className="py-2.5 px-3 font-semibold">Note / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-subtle/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-text-primary">
                      {r.email}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant="status"
                        statusType={getRecipientBadgeStatus(r.status)}
                        size="sm"
                      >
                        {r.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                      {formatDate(r.sent_at)}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                      {formatDate(r.delivered_at)}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                      {formatDate(r.opened_at)}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                      {formatDate(r.clicked_at)}
                    </td>
                    <td className="py-2.5 px-3 text-text-tertiary max-w-[200px] truncate">
                      {r.error || (r.unsubscribed_at ? `Unsub at ${formatDate(r.unsubscribed_at)}` : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-border-default/50 text-xs">
            <span className="text-text-tertiary">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
