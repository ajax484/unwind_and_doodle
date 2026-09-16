'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MarketingAutomation, MarketingAutomationExecution } from '@/types/marketing';
import { AutomationForm } from '@/components/admin/marketing/AutomationForm';
import Spinner from '@/components/Spinner';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

export default function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [automation, setAutomation] = useState<MarketingAutomation | null>(null);
  const [executions, setExecutions] = useState<MarketingAutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExecutions, setLoadingExecutions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAutomation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/marketing/automations/${id}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load automation');
      }

      setAutomation(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching automation');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      setLoadingExecutions(true);
      const res = await fetch(`/api/admin/marketing/automations/${id}/executions?limit=25`);
      const json = await res.json();
      if (res.ok && json.success) {
        setExecutions(json.data || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingExecutions(false);
    }
  };

  useEffect(() => {
    fetchAutomation();
    fetchExecutions();
  }, [id]);

  const handleDelete = async () => {
    if (!automation) return;
    if (!confirm(`Are you sure you want to delete automation "${automation.name}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/marketing/automations/${automation.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete automation');
      }

      toast.success('Automation deleted successfully');
      router.push('/admin/marketing/automations');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete automation');
    } finally {
      setDeleting(false);
    }
  };

  const getExecutionStatusBadge = (status: MarketingAutomationExecution['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="status" statusType="success" size="sm">Sent</Badge>;
      case 'skipped':
        return <Badge variant="status" statusType="warning" size="sm">Skipped</Badge>;
      case 'processing':
        return <Badge variant="status" statusType="info" size="sm">Processing</Badge>;
      case 'failed':
        return <Badge variant="status" statusType="danger" size="sm">Failed</Badge>;
      default:
        return <Badge variant="status" statusType="neutral" size="sm">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <span className="text-xs text-text-tertiary mt-3">Loading automation...</span>
      </div>
    );
  }

  if (error || !automation) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-2xl bg-status-danger-bg border border-status-danger-accent/30 text-status-danger-text text-sm">
          {error || 'Automation not found.'}
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/admin/marketing/automations">
            <Button variant="secondary" size="sm">
              Back to Automations
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchAutomation}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
            <Link
              href="/admin/marketing/automations"
              className="hover:text-text-secondary transition-colors"
            >
              Automations
            </Link>
            <span>/</span>
            <span className="text-text-primary font-medium">{automation.name}</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-tight">
            {automation.name}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Created on {new Date(automation.created_at).toLocaleDateString()} · Last updated {new Date(automation.updated_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-status-danger-accent hover:bg-status-danger-bg border-status-danger-accent/30"
          >
            {deleting ? 'Deleting...' : 'Delete Automation'}
          </Button>
        </div>
      </div>

      <AutomationForm initialAutomation={automation} />

      {/* Execution History Table */}
      <div className="bg-bg-surface border border-border-default rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold font-heading text-text-primary">
              Recent Execution History
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Real-time audit log of triggers, eligibility checks, and email delivery dispatches.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchExecutions}
            disabled={loadingExecutions}
          >
            {loadingExecutions ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {loadingExecutions ? (
          <div className="flex items-center justify-center p-8">
            <Spinner size="sm" />
            <span className="text-xs text-text-tertiary ml-2">Loading execution records...</span>
          </div>
        ) : executions.length === 0 ? (
          <div className="p-8 text-center bg-bg-subtle/50 rounded-xl border border-border-default text-xs text-text-secondary">
            No executions recorded yet. When a matching commerce domain event occurs, the execution and delivery state will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-default bg-bg-subtle/50 text-text-secondary font-semibold">
                  <th className="py-3 px-3">Recipient</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Scheduled For</th>
                  <th className="py-3 px-3">Executed At</th>
                  <th className="py-3 px-3">Notes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/60">
                {executions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-bg-subtle/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-text-primary">
                      {ex.customer_email}
                    </td>
                    <td className="py-3 px-3">
                      {getExecutionStatusBadge(ex.status)}
                    </td>
                    <td className="py-3 px-3 text-text-secondary">
                      {new Date(ex.scheduled_for).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 text-text-secondary">
                      {ex.executed_at
                        ? new Date(ex.executed_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-text-tertiary">
                      {ex.skip_reason
                        ? `Skipped: ${ex.skip_reason}`
                        : ex.error_message
                        ? `Error: ${ex.error_message}`
                        : ex.provider_message_id
                        ? `Msg: ${ex.provider_message_id.substring(0, 16)}...`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
