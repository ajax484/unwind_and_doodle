'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MarketingSegment } from '@/types/marketing';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';

export default function MarketingSegmentsPage() {
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/marketing/segments');
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load marketing segments');
      }

      setSegments(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching marketing segments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleDelete = async (segment: MarketingSegment) => {
    if (!confirm(`Are you sure you want to delete segment "${segment.name}"?`)) {
      return;
    }

    try {
      setDeletingId(segment.id);
      const res = await fetch(`/api/admin/marketing/segments/${segment.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete segment');
      }

      toast.success('Segment deleted successfully');
      setSegments((prev) => prev.filter((s) => s.id !== segment.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete segment');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSegments = segments.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/marketing/campaigns"
              className="text-xs font-semibold text-text-tertiary hover:text-text-primary transition-colors"
            >
              Marketing
            </Link>
            <span className="text-xs text-text-tertiary">/</span>
            <span className="text-xs font-semibold text-text-primary">Segments</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-text-primary">
            Customer Segments
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Create and manage dynamic audience cohorts for targeted email campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/marketing/campaigns">
            <Button variant="outline" size="sm">
              ✉️ Campaigns
            </Button>
          </Link>
          <Link href="/admin/marketing/segments/new">
            <Button variant="primary" size="sm">
              + Create Segment
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search segments..."
            className="w-full h-9 px-3 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary focus:ring-2 focus:ring-border-brand focus:border-border-brand"
          />
        </div>
        <div className="text-xs text-text-tertiary">
          Total segments: <strong className="text-text-primary">{segments.length}</strong>
        </div>
      </div>

      {/* Segment Table / Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-bg-surface rounded-2xl border border-border-default">
          <Spinner size="lg" />
          <span className="text-xs text-text-tertiary mt-3">Loading segments...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-status-danger-bg border border-status-danger-accent/30 rounded-2xl text-center space-y-3">
          <p className="text-sm text-status-danger-text">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSegments}>
            Retry
          </Button>
        </div>
      ) : filteredSegments.length === 0 ? (
        <div className="bg-bg-surface p-12 text-center rounded-2xl border border-border-default space-y-4">
          <div className="text-4xl">🎯</div>
          <div>
            <h3 className="text-base font-bold font-heading text-text-primary">
              No customer segments found
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
              Segments help you group customers based on order history, consent, and profile data to send relevant campaigns.
            </p>
          </div>
          <div>
            <Link href="/admin/marketing/segments/new">
              <Button variant="primary" size="sm">
                + Create Your First Segment
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-bg-surface rounded-2xl border border-border-default overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-subtle border-b border-border-default text-text-secondary font-semibold">
                  <th className="py-3 px-4">Segment Name</th>
                  <th className="py-3 px-4">Match Mode</th>
                  <th className="py-3 px-4">Conditions</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredSegments.map((seg) => {
                  const rules = seg.rules as any;
                  const match = rules?.match === 'any' ? 'Match ANY' : 'Match ALL';
                  const condCount = Array.isArray(rules?.conditions) ? rules.conditions.length : 0;

                  return (
                    <tr key={seg.id} className="hover:bg-bg-subtle/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/marketing/segments/${seg.id}`}
                          className="font-bold text-text-primary hover:text-action-primary transition-colors text-sm"
                        >
                          {seg.name}
                        </Link>
                        {seg.description && (
                          <div className="text-text-tertiary text-[11px] line-clamp-1 mt-0.5">
                            {seg.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="status"
                          statusType={rules?.match === 'any' ? 'warning' : 'blue'}
                          size="sm"
                        >
                          {match}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {condCount} {condCount === 1 ? 'condition' : 'conditions'}
                      </td>
                      <td className="py-3.5 px-4 text-text-tertiary">
                        {new Date(seg.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/marketing/segments/${seg.id}`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(seg)}
                            disabled={deletingId === seg.id}
                            className="text-status-danger-accent hover:text-status-danger-text"
                          >
                            {deletingId === seg.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
