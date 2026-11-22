'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

interface EmailSettingsData {
  settings: {
    organizationId: string;
    replyToEmail: string | null;
    defaultSenderName: string | null;
    defaultSenderEmail: string | null;
    updatedAt?: string | null;
    source: 'database' | 'env_default';
  };
  transport: {
    mode: 'smtp' | 'json_fallback';
    host: string;
    port: number;
    secure: boolean;
    service?: string;
    userConfigured: boolean;
    from: string;
    replyTo?: string;
  };
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  summary: {
    last7Days: {
      sent: number;
      failed: number;
      simulated: number;
      total: number;
    };
    marketingLast30Days: {
      sent: number;
      delivered: number;
      bounced: number;
      failed: number;
    };
  };
  logs: Array<{
    id: string;
    channel: string;
    templateKey: string | null;
    toEmail: string;
    fromEmail: string | null;
    replyToEmail: string | null;
    subject: string;
    status: 'sent' | 'failed' | 'simulated';
    providerMessageId: string | null;
    transportMode: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

export default function AdminEmailSettingsPage() {
  const [data, setData] = useState<EmailSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [replyToEmail, setReplyToEmail] = useState('');
  const [defaultSenderName, setDefaultSenderName] = useState('');
  const [defaultSenderEmail, setDefaultSenderEmail] = useState('');

  // Diagnostics state
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    error?: string;
    mode?: string;
  } | null>(null);

  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadSettings = useCallback(async (filterStatus?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '40' });
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/settings/email?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load email settings');
      }
      setData(json.data);
      setReplyToEmail(json.data.settings.replyToEmail || '');
      setDefaultSenderName(json.data.settings.defaultSenderName || 'Unwind & Doodle');
      setDefaultSenderEmail(json.data.settings.defaultSenderEmail || '');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load email settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings(statusFilter);
  }, [loadSettings, statusFilter]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyToEmail: replyToEmail.trim() || null,
          defaultSenderName: defaultSenderName.trim() || null,
          defaultSenderEmail: defaultSenderEmail.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save email settings');
      }
      toast.success('Email settings saved');
      await loadSettings(statusFilter);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyConnection = async () => {
    try {
      setVerifying(true);
      setVerifyResult(null);
      const res = await fetch('/api/admin/settings/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const json = await res.json();
      setVerifyResult(json.data || { ok: false, error: json.error });
      if (json.success) {
        toast.success('SMTP connection verified');
      } else {
        toast.error(json.error || 'SMTP verification failed');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) {
      toast.error('Enter a recipient email address');
      return;
    }
    try {
      setSendingTest(true);
      const res = await fetch('/api/admin/settings/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          to: testRecipient.trim(),
          replyTo: replyToEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send test email');
      }
      if (json.data?.simulated) {
        toast.warning('Test email simulated — SMTP is not configured in this environment');
      } else {
        toast.success(`Test email sent to ${testRecipient.trim()}`);
      }
      await loadSettings(statusFilter);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  const transport = data?.transport;
  const summary = data?.summary;
  const logs = data?.logs || [];

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
          Email &amp; Deliverability
        </h1>
        {transport && (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              transport.mode === 'smtp'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {transport.mode === 'smtp' ? 'SMTP Active' : 'Simulated Fallback Mode'}
          </span>
        )}
      </div>

      {/* Warning banner if running in fallback mode */}
      {transport?.mode === 'json_fallback' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <strong>SMTP is not configured.</strong> Outbound emails are currently simulated locally and not delivered to customer inboxes. Set <code className="font-mono">SMTP_HOST</code>, <code className="font-mono">SMTP_USER</code>, and <code className="font-mono">SMTP_PASS</code> in your environment.
        </div>
      )}

      {/* Delivery Metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Sent (7d)</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{summary.last7Days.sent}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Failed (7d)</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{summary.last7Days.failed}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Marketing Delivered (30d)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{summary.marketingLast30Days.delivered}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Marketing Bounced (30d)</div>
            <div className="text-2xl font-black text-amber-700 mt-1">{summary.marketingLast30Days.bounced}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reply-To & Sender Identity */}
        <form
          onSubmit={handleSaveSettings}
          className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs"
        >
          <h2 className="font-heading font-bold text-base text-slate-900">
            Reply-To &amp; Sender Identity
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Monitored Reply-To Email
            </label>
            <TextInput
              type="email"
              placeholder="hello@unwindanddoodle.com"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Customer replies to order, automation, and campaign emails will go to this inbox.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Default Sender Name
            </label>
            <TextInput
              placeholder="Unwind & Doodle"
              value={defaultSenderName}
              onChange={(e) => setDefaultSenderName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Default Sender Email
            </label>
            <TextInput
              type="email"
              placeholder="orders@unwindanddoodle.com"
              value={defaultSenderEmail}
              onChange={(e) => setDefaultSenderEmail(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>

        {/* Connection Diagnostics & Live Test */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-slate-900">
              Delivery Diagnostics
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVerifyConnection}
              disabled={verifying}
            >
              {verifying ? 'Testing...' : 'Verify SMTP'}
            </Button>
          </div>

          {transport && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Host</span>
                <span className="font-mono font-semibold text-slate-800">
                  {transport.host || 'Not configured'}:{transport.port}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TLS / Secure</span>
                <span className="font-semibold text-slate-800">
                  {transport.secure ? 'TLS (465)' : 'STARTTLS'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credentials</span>
                <span className="font-semibold text-slate-800">
                  {transport.userConfigured ? 'Configured' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Webhook Endpoint</span>
                <span className="font-mono text-[11px] text-slate-700 truncate max-w-[220px]">
                  {data?.webhookUrl}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Webhook Secret</span>
                <span className="font-semibold text-slate-800">
                  {data?.webhookSecretConfigured ? 'Configured' : 'Not set'}
                </span>
              </div>
            </div>
          )}

          {verifyResult && (
            <div
              className={`rounded-xl p-3 text-xs font-medium ${
                verifyResult.ok
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {verifyResult.ok
                ? `Connected to SMTP server in ${verifyResult.latencyMs}ms.`
                : verifyResult.error || 'Connection failed.'}
            </div>
          )}

          <form onSubmit={handleSendTest} className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">
              Send Live Test Email
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <TextInput
                  type="email"
                  placeholder="your-inbox@example.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={sendingTest}>
                {sendingTest ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Recent Delivery Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading font-bold text-base text-slate-900">
            Recent Delivery Log
          </h2>
          <div className="flex items-center gap-2 text-xs">
            {(['', 'sent', 'failed', 'simulated'] as const).map((st) => (
              <button
                key={st || 'all'}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st ? st.charAt(0).toUpperCase() + st.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            No delivery logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Recipient</th>
                  <th className="py-2 pr-3 font-semibold">Subject</th>
                  <th className="py-2 pr-3 font-semibold">Reply-To</th>
                  <th className="py-2 pr-3 font-semibold">Channel</th>
                  <th className="py-2 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-slate-800">{log.toEmail}</td>
                    <td className="py-2.5 pr-3 text-slate-700 max-w-[240px] truncate">
                      <div>{log.subject}</div>
                      {log.errorMessage && (
                        <div className="text-[11px] text-rose-600 truncate">{log.errorMessage}</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 font-mono text-[11px]">
                      {log.replyToEmail || '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500 capitalize">{log.channel}</td>
                    <td className="py-2.5 text-right text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
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
