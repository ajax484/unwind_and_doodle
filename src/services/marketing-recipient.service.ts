import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  MarketingCampaignRecipient,
  MarketingRecipientFilter,
  RecipientStatusCounts,
  MarketingEmailEvent,
  MarketingEmailEventFilter,
  CampaignEventCounts,
  PaginationParams,
  PaginatedResult,
} from '@/types/marketing';

// ============================================================================
// RECIPIENTS DATA ACCESS
// ============================================================================

/**
 * Lists campaign recipients with optional status filtering and pagination.
 */
export async function getCampaignRecipients(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  filters?: MarketingRecipientFilter,
  pagination?: PaginationParams
): Promise<PaginatedResult<MarketingCampaignRecipient>> {
  if (!campaignId?.trim()) {
    throw new Error('Campaign ID is required to fetch recipients');
  }

  const page = Math.max(1, pagination?.page || 1);
  const limit = Math.max(1, Math.min(100, pagination?.limit || 50));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('marketing_campaign_recipients')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search && filters.search.trim()) {
    query = query.ilike('email', `%${filters.search.trim()}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list campaign recipients: ${error.message}`);
  }

  const total = count ?? (data?.length || 0);

  return {
    data: data || [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves a single recipient by ID, scoped to a campaign.
 */
export async function getCampaignRecipientById(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  id: string
): Promise<MarketingCampaignRecipient | null> {
  if (!campaignId?.trim()) {
    throw new Error('Campaign ID is required');
  }
  if (!id?.trim()) {
    throw new Error('Recipient ID is required');
  }

  const { data, error } = await supabase
    .from('marketing_campaign_recipients')
    .select('*')
    .eq('id', id)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch recipient: ${error.message}`);
  }

  return data;
}

/**
 * Aggregates counts for all recipient statuses for a given campaign.
 */
export async function getCampaignRecipientCounts(
  supabase: SupabaseClient<Database>,
  campaignId: string
): Promise<RecipientStatusCounts> {
  if (!campaignId?.trim()) {
    throw new Error('Campaign ID is required');
  }

  const { data, error } = await supabase
    .from('marketing_campaign_recipients')
    .select('status')
    .eq('campaign_id', campaignId);

  if (error) {
    throw new Error(`Failed to fetch recipient counts: ${error.message}`);
  }

  const counts: RecipientStatusCounts = {
    total: 0,
    pending: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    unsubscribed: 0,
  };

  for (const row of data || []) {
    counts.total++;
    if (row.status in counts) {
      counts[row.status as keyof Omit<RecipientStatusCounts, 'total'>]++;
    }
  }

  return counts;
}

// ============================================================================
// EMAIL EVENTS DATA ACCESS
// ============================================================================

/**
 * Lists email events for a campaign with optional event type filtering and pagination.
 */
export async function getCampaignEvents(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  filters?: MarketingEmailEventFilter,
  pagination?: PaginationParams
): Promise<PaginatedResult<MarketingEmailEvent>> {
  if (!campaignId?.trim()) {
    throw new Error('Campaign ID is required to fetch events');
  }

  const page = Math.max(1, pagination?.page || 1);
  const limit = Math.max(1, Math.min(100, pagination?.limit || 50));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('marketing_email_events')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId);

  if (filters?.event_type) {
    query = query.eq('event_type', filters.event_type);
  }

  query = query
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list campaign events: ${error.message}`);
  }

  const total = count ?? (data?.length || 0);

  return {
    data: data || [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Lists all events associated with a specific recipient.
 */
export async function getRecipientEvents(
  supabase: SupabaseClient<Database>,
  recipientId: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<MarketingEmailEvent>> {
  if (!recipientId?.trim()) {
    throw new Error('Recipient ID is required to fetch recipient events');
  }

  const page = Math.max(1, pagination?.page || 1);
  const limit = Math.max(1, Math.min(100, pagination?.limit || 50));
  const offset = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from('marketing_email_events')
    .select('*', { count: 'exact' })
    .eq('campaign_recipient_id', recipientId)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch recipient events: ${error.message}`);
  }

  const total = count ?? (data?.length || 0);

  return {
    data: data || [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Aggregates email event counts by type for a campaign.
 */
export async function getCampaignEventCounts(
  supabase: SupabaseClient<Database>,
  campaignId: string
): Promise<CampaignEventCounts> {
  if (!campaignId?.trim()) {
    throw new Error('Campaign ID is required');
  }

  const { data, error } = await supabase
    .from('marketing_email_events')
    .select('event_type')
    .eq('campaign_id', campaignId);

  if (error) {
    throw new Error(`Failed to fetch campaign event counts: ${error.message}`);
  }

  const counts: CampaignEventCounts = {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    unsubscribed: 0,
  };

  for (const row of data || []) {
    if (row.event_type in counts) {
      counts[row.event_type as keyof CampaignEventCounts]++;
    }
  }

  return counts;
}
