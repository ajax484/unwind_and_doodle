import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import { getConfig } from '@/lib/config';

export interface OrganizationEmailSettings {
  organizationId: string;
  replyToEmail: string | null;
  defaultSenderName: string | null;
  defaultSenderEmail: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  source: 'database' | 'env_default';
}

export interface UpdateOrganizationEmailSettingsInput {
  replyToEmail?: string | null;
  defaultSenderName?: string | null;
  defaultSenderEmail?: string | null;
}

export type EmailDeliveryChannel = 'transactional' | 'marketing' | 'automation' | 'test';
export type EmailDeliveryStatus = 'sent' | 'failed' | 'simulated';

export interface EmailDeliveryLogInput {
  organizationId?: string | null;
  channel: EmailDeliveryChannel;
  templateKey?: string | null;
  campaignId?: string | null;
  toEmail: string;
  fromEmail?: string | null;
  replyToEmail?: string | null;
  subject: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string | null;
  transportMode?: 'smtp' | 'json_fallback';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface EmailDeliveryLogEntry {
  id: string;
  organizationId: string | null;
  channel: EmailDeliveryChannel;
  templateKey: string | null;
  campaignId: string | null;
  toEmail: string;
  fromEmail: string | null;
  replyToEmail: string | null;
  subject: string;
  status: EmailDeliveryStatus;
  providerMessageId: string | null;
  transportMode: string;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EmailDeliverySummary {
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
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SettingsCacheEntry {
  settings: OrganizationEmailSettings;
  cachedAt: number;
}

const settingsCache = new Map<string, SettingsCacheEntry>();
const SETTINGS_CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutes

export function invalidateEmailSettingsCache(organizationId?: string): void {
  if (organizationId) {
    settingsCache.delete(organizationId);
  } else {
    settingsCache.clear();
  }
}

export function isValidEmailAddress(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Extracts a bare email address from either `user@domain.com` or `"Name" <user@domain.com>`.
 */
export function extractEmailAddress(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/<([^>]+)>/);
  const candidate = (match ? match[1] : trimmed).trim();
  return isValidEmailAddress(candidate) ? candidate : null;
}

/**
 * Fetches organization-level email settings with graceful fallback to environment defaults.
 */
export async function getOrganizationEmailSettings(
  supabase: SupabaseClient<Database> | null | undefined,
  organizationId?: string | null
): Promise<OrganizationEmailSettings> {
  const { smtp } = getConfig();
  const envFallback: OrganizationEmailSettings = {
    organizationId: organizationId || '',
    replyToEmail: smtp.replyTo || null,
    defaultSenderName: 'Unwind & Doodle',
    defaultSenderEmail: extractEmailAddress(smtp.from) || 'no-reply@unwindanddoodle.com',
    source: 'env_default',
  };

  if (!supabase || !organizationId) {
    return envFallback;
  }

  const now = Date.now();
  const cached = settingsCache.get(organizationId);
  if (cached && now - cached.cachedAt < SETTINGS_CACHE_TTL_MS) {
    return cached.settings;
  }

  try {
    const { data, error } = await (supabase as any)
      .from('organization_email_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data) {
      return envFallback;
    }

    const resolved: OrganizationEmailSettings = {
      organizationId,
      replyToEmail: data.reply_to_email?.trim() || smtp.replyTo || null,
      defaultSenderName: data.default_sender_name?.trim() || 'Unwind & Doodle',
      defaultSenderEmail:
        data.default_sender_email?.trim() ||
        extractEmailAddress(smtp.from) ||
        'no-reply@unwindanddoodle.com',
      updatedAt: data.updated_at || null,
      updatedBy: data.updated_by || null,
      source: 'database',
    };

    settingsCache.set(organizationId, { settings: resolved, cachedAt: now });
    return resolved;
  } catch (err) {
    console.warn('[email_settings.lookup_failed]', err);
    return envFallback;
  }
}

/**
 * Updates or creates organization-level email settings.
 */
export async function updateOrganizationEmailSettings(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  input: UpdateOrganizationEmailSettingsInput,
  updatedBy?: string | null
): Promise<OrganizationEmailSettings> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required');
  }

  const replyTo = input.replyToEmail?.trim() || null;
  if (replyTo && !isValidEmailAddress(replyTo)) {
    throw new Error('Reply-To must be a valid email address');
  }

  const senderEmail = input.defaultSenderEmail?.trim() || null;
  if (senderEmail && !isValidEmailAddress(senderEmail)) {
    throw new Error('Default sender email must be a valid email address');
  }

  const senderName = input.defaultSenderName?.trim() || null;
  const nowIso = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from('organization_email_settings')
    .upsert(
      {
        organization_id: organizationId,
        reply_to_email: replyTo,
        default_sender_name: senderName,
        default_sender_email: senderEmail,
        updated_by: updatedBy || null,
        updated_at: nowIso,
      },
      { onConflict: 'organization_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to save email settings: ${error.message}`);
  }

  invalidateEmailSettingsCache(organizationId);

  return {
    organizationId,
    replyToEmail: data.reply_to_email || null,
    defaultSenderName: data.default_sender_name || 'Unwind & Doodle',
    defaultSenderEmail: data.default_sender_email || null,
    updatedAt: data.updated_at || nowIso,
    updatedBy: data.updated_by || updatedBy || null,
    source: 'database',
  };
}

/**
 * Resolves the effective Reply-To email address for an outbound email.
 * Priority: explicit override -> organization DB setting -> SMTP_REPLY_TO env var -> undefined.
 */
export async function resolveEffectiveReplyTo(
  supabase: SupabaseClient<Database> | null | undefined,
  organizationId?: string | null,
  overrideReplyTo?: string | null
): Promise<string | undefined> {
  if (overrideReplyTo && isValidEmailAddress(overrideReplyTo)) {
    return overrideReplyTo.trim();
  }

  const settings = await getOrganizationEmailSettings(supabase, organizationId);
  if (settings.replyToEmail && isValidEmailAddress(settings.replyToEmail)) {
    return settings.replyToEmail.trim();
  }

  const { smtp } = getConfig();
  if (smtp.replyTo && isValidEmailAddress(smtp.replyTo)) {
    return smtp.replyTo.trim();
  }

  return undefined;
}

/**
 * Persists an email delivery attempt to email_delivery_logs.
 * Non-blocking: catches DB errors so email delivery never fails due to logging.
 */
export async function recordEmailDeliveryLog(
  supabase: SupabaseClient<Database> | null | undefined,
  entry: EmailDeliveryLogInput
): Promise<void> {
  if (!supabase) return;

  try {
    await (supabase as any).from('email_delivery_logs').insert({
      organization_id: entry.organizationId || null,
      channel: entry.channel,
      template_key: entry.templateKey || null,
      campaign_id: entry.campaignId || null,
      to_email: entry.toEmail.trim().toLowerCase(),
      from_email: entry.fromEmail || null,
      reply_to_email: entry.replyToEmail || null,
      subject: entry.subject,
      status: entry.status,
      provider_message_id: entry.providerMessageId || null,
      transport_mode: entry.transportMode || 'smtp',
      error_message: entry.errorMessage || null,
      metadata: (entry.metadata || {}) as Json,
    });
  } catch (err) {
    console.warn('[email_delivery_logs.insert_failed]', err);
  }
}

/**
 * Lists recent email delivery logs for an organization.
 */
export async function listEmailDeliveryLogs(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  options?: { limit?: number; channel?: EmailDeliveryChannel; status?: EmailDeliveryStatus }
): Promise<EmailDeliveryLogEntry[]> {
  const limit = Math.max(1, Math.min(100, options?.limit || 30));

  try {
    let query = (supabase as any)
      .from('email_delivery_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.channel) {
      query = query.eq('channel', options.channel);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      channel: row.channel,
      templateKey: row.template_key,
      campaignId: row.campaign_id,
      toEmail: row.to_email,
      fromEmail: row.from_email,
      replyToEmail: row.reply_to_email,
      subject: row.subject,
      status: row.status,
      providerMessageId: row.provider_message_id,
      transportMode: row.transport_mode,
      errorMessage: row.error_message,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Computes delivery health metrics across email_delivery_logs and marketing_email_events.
 */
export async function getEmailDeliverySummary(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<EmailDeliverySummary> {
  const summary: EmailDeliverySummary = {
    last7Days: { sent: 0, failed: 0, simulated: 0, total: 0 },
    marketingLast30Days: { sent: 0, delivered: 0, bounced: 0, failed: 0 },
  };

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await (supabase as any)
      .from('email_delivery_logs')
      .select('status')
      .eq('organization_id', organizationId)
      .gte('created_at', sevenDaysAgo);

    if (Array.isArray(logs)) {
      for (const row of logs) {
        summary.last7Days.total++;
        if (row.status === 'sent') summary.last7Days.sent++;
        else if (row.status === 'failed') summary.last7Days.failed++;
        else if (row.status === 'simulated') summary.last7Days.simulated++;
      }
    }
  } catch {
    // Non-fatal if table not yet migrated
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: campaigns } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('organization_id', organizationId);

    const campaignIds = (campaigns || []).map((c) => c.id);
    if (campaignIds.length > 0) {
      const { data: events } = await supabase
        .from('marketing_email_events')
        .select('event_type')
        .in('campaign_id', campaignIds)
        .gte('occurred_at', thirtyDaysAgo);

      if (Array.isArray(events)) {
        for (const ev of events) {
          if (ev.event_type === 'sent') summary.marketingLast30Days.sent++;
          else if (ev.event_type === 'delivered') summary.marketingLast30Days.delivered++;
          else if (ev.event_type === 'bounced') summary.marketingLast30Days.bounced++;
          else if (ev.event_type === 'failed') summary.marketingLast30Days.failed++;
        }
      }
    }
  } catch {
    // Non-fatal
  }

  return summary;
}
