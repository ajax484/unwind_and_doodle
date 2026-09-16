'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  MarketingAutomation,
  MarketingAutomationStatus,
  MarketingAutomationType,
  MarketingAutomationConfig,
} from '@/types/marketing';
import { AUTOMATION_TYPE_METADATA } from '@/services/marketing-automation.service';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';

export default function MarketingAutomationsPage() {
  const [automations, setAutomations] = useState<MarketingAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const res = await fetch(`/api/admin/marketing/automations?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load automations');
      }

      setAutomations(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching automations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, [statusFilter, typeFilter]);

  const handleDelete = async (auto: MarketingAutomation) => {
    if (!confirm(`Are you sure you want to delete automation "${auto.name}"?`)) {
      return;
    }

    try {
      setActionLoadingId(auto.id);
      const res = await fetch(`/api/admin/marketing/automations/${auto.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete automation');
      }

      toast.success('Automation deleted successfully');
      setAutomations((prev) => prev.filter((a) => a.id !== auto.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete automation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (auto: MarketingAutomation) => {
    const nextStatus: MarketingAutomationStatus =
      auto.status === 'active' ? 'paused' : 'active';

    try {
      setActionLoadingId(auto.id);
      const res = await fetch(`/api/admin/marketing/automations/${auto.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update automation status');
      }

      toast.success(
        nextStatus === 'active'
          ? `Automation activated`
          : `Automation paused`
      );
      setAutomations((prev) =>
        prev.map((a) => (a.id === auto.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAutomations = automations.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      (a.config && JSON.stringify(a.config).toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: MarketingAutomationStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="status" statusType="success" size="sm">
            Active
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="status" statusType="warning" size="sm">
            Paused
          </Badge>
        );
      default:
        return (
          <Badge variant="status" statusType="neutral" size="sm">
            Draft
          </Badge>
        );
    }
  };

  const renderTriggerLabel = (auto: MarketingAutomation) => {
    const cfg = auto.config as unknown as Partial<MarketingAutomationConfig> | null;
    return cfg?.trigger?.type || auto.type;
  };

  const renderDelayLabel = (auto: MarketingAutomation) => {
    const cfg = auto.config as unknown as Partial<MarketingAutomationConfig> | null;
    if (!cfg?.delay || cfg.delay.amount === 0) {
      return 'Instant';
    }
    return `${cfg.delay.amount} ${cfg.delay.unit}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-text-tertiary mb-1">
            <Link href="/admin" className="hover:text-text-secondary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-text-secondary">Marketing</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Automations</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-tight">
            Marketing Automations
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Event-driven lifecycle automations matched against commerce domain events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/marketing/automations/new">
            <Button variant="primary" size="sm">
              <span className="text-sm">+</span> New Automation
            </Button>
          </Link>
        </div>
      </div>

      {/* Step 2A Informational Notice */}
      <div className="p-4 rounded-2xl bg-status-info-bg border border-status-info-accent/30 text-status-info-text text-sm flex items-start gap-3">
        <span className="text-lg shrink-0">⚡</span>
        <div>
          <p className="font-medium font-heading">Automation Foundation (Step 2A)</p>
          <p className="text-xs opacity-90 mt-0.5">
            Automations define how domain events map to email triggers with configurable delays.
            Once automated execution (Step 2B) is connected, active automations will dispatch emails automatically.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-bg-surface rounded-2xl border border-border-default shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'All Statuses', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Draft', value: 'draft' },
            { label: 'Paused', value: 'paused' },
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

        {/* Type & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-border-default bg-bg-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-border-brand"
          >
            <option value="all">All Automation Types</option>
            <option value="welcome">Welcome Series</option>
            <option value="abandoned_checkout">Abandoned Checkout</option>
            <option value="post_purchase">Post-Purchase</option>
            <option value="win_back">Customer Win-Back</option>
          </select>

          <div className="sm:w-56">
            <input
              type="text"
              placeholder="Search automations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-border-default bg-bg-surface text-text-primary placeholder:text-text-placeholder focus:outline-hidden focus:ring-2 focus:ring-border-brand"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-bg-surface rounded-2xl border border-border-default">
          <Spinner size="md" />
          <span className="text-xs text-text-tertiary mt-2">Loading automations...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchAutomations}>
            Retry
          </Button>
        </div>
      ) : filteredAutomations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-bg-surface rounded-2xl border border-border-default text-center space-y-3">
          <div className="text-4xl">⚡</div>
          <h2 className="text-base font-bold font-heading text-text-primary">
            {searchQuery ? 'No matching automations' : 'No automations configured yet'}
          </h2>
          <p className="text-xs text-text-secondary max-w-sm">
            {searchQuery
              ? 'Try modifying your search query or filters.'
              : 'Set up your first automated workflow to trigger emails on customer actions like purchases or signups.'}
          </p>
          {!searchQuery && (
            <Link href="/admin/marketing/automations/new">
              <Button variant="primary" size="sm">
                Create First Automation
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
                  <th className="py-3.5 px-4">Automation Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Trigger Event</th>
                  <th className="py-3.5 px-4">Delay</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/60">
                {filteredAutomations.map((a) => {
                  const meta = AUTOMATION_TYPE_METADATA[a.type];
                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-bg-subtle/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-text-primary">
                        <Link
                          href={`/admin/marketing/automations/${a.id}`}
                          className="hover:text-action-primary transition-colors"
                        >
                          {a.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        <Badge variant="brand" size="sm">
                          {meta?.label || a.type}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-bg-subtle border border-border-default text-text-secondary">
                          {renderTriggerLabel(a)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary font-medium">
                        {renderDelayLabel(a)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(a.status)}
                      </td>
                      <td className="py-3.5 px-4 text-text-tertiary">
                        {new Date(a.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(a)}
                            disabled={actionLoadingId === a.id}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border-default hover:bg-bg-subtle transition-colors text-text-secondary"
                            title={a.status === 'active' ? 'Pause Automation' : 'Activate Automation'}
                          >
                            {a.status === 'active' ? 'Pause' : 'Activate'}
                          </button>

                          <Link
                            href={`/admin/marketing/automations/${a.id}`}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-bg-subtle hover:bg-border-default text-text-primary transition-colors"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(a)}
                            disabled={actionLoadingId === a.id}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-status-danger-accent hover:bg-status-danger-bg transition-colors"
                          >
                            Delete
                          </button>
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
