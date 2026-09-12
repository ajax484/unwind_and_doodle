import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  MarketingCampaign,
  MarketingCampaignListItem,
  MarketingCampaignUpdate,
  CreateMarketingCampaignInput,
  UpdateMarketingCampaignInput,
  MarketingCampaignFilter,
  MarketingCampaignStatus,
  PaginationParams,
  PaginatedResult,
} from '@/types/marketing';

const CAMPAIGN_LIST_COLUMNS =
  'id, organization_id, name, type, status, subject, preview_text, segment_id, scheduled_at, started_at, completed_at, created_at, updated_at';

/**
 * Lists marketing campaigns for an organization with explicit column selection, filters, and pagination.
 */
export async function getCampaigns(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  filters?: MarketingCampaignFilter,
  pagination?: PaginationParams
): Promise<PaginatedResult<MarketingCampaignListItem>> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to fetch campaigns');
  }

  const page = Math.max(1, pagination?.page || 1);
  const limit = Math.max(1, Math.min(100, pagination?.limit || 50));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('marketing_campaigns')
    .select(CAMPAIGN_LIST_COLUMNS, { count: 'exact' })
    .eq('organization_id', organizationId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.segment_id) {
    query = query.eq('segment_id', filters.segment_id);
  }

  if (filters?.scheduled_at) {
    query = query.gte('scheduled_at', filters.scheduled_at);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list marketing campaigns: ${error.message}`);
  }

  const total = count ?? (data?.length || 0);

  return {
    data: (data || []) as unknown as MarketingCampaignListItem[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves a single full campaign by ID, strictly scoped to the organization.
 */
export async function getCampaignById(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string
): Promise<MarketingCampaign | null> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required');
  }
  if (!id?.trim()) {
    throw new Error('Campaign ID is required');
  }

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch campaign: ${error.message}`);
  }

  return data;
}

/**
 * Creates a new marketing campaign for an organization.
 */
export async function createCampaign(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  input: CreateMarketingCampaignInput
): Promise<MarketingCampaign> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to create a campaign');
  }
  if (!input.name?.trim()) {
    throw new Error('Campaign name is required');
  }

  // If a segment is specified, verify it belongs to this organization
  if (input.segment_id) {
    const { data: segment, error: segErr } = await supabase
      .from('marketing_segments')
      .select('id')
      .eq('id', input.segment_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (segErr || !segment) {
      throw new Error(`Segment ${input.segment_id} does not exist or belong to this organization`);
    }
  }

  const payload = {
    organization_id: organizationId,
    name: input.name.trim(),
    type: input.type || 'email',
    status: input.status || 'draft',
    subject: input.subject?.trim() || null,
    preview_text: input.preview_text?.trim() || null,
    sender_name: input.sender_name?.trim() || null,
    sender_email: input.sender_email?.trim() || null,
    content: input.content ?? {},
    segment_id: input.segment_id || null,
    scheduled_at: input.scheduled_at || null,
    created_by: input.created_by || null,
  };

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create marketing campaign: ${error.message}`);
  }

  return data;
}

/**
 * Updates a marketing campaign, strictly scoped to the organization.
 */
export async function updateCampaign(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string,
  input: UpdateMarketingCampaignInput
): Promise<MarketingCampaign> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to update a campaign');
  }
  if (!id?.trim()) {
    throw new Error('Campaign ID is required to update a campaign');
  }

  const existing = await getCampaignById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing campaign ${id} not found for this organization`);
  }

  // If updating segment_id, verify it belongs to this organization
  if (input.segment_id) {
    const { data: segment, error: segErr } = await supabase
      .from('marketing_segments')
      .select('id')
      .eq('id', input.segment_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (segErr || !segment) {
      throw new Error(`Segment ${input.segment_id} does not exist or belong to this organization`);
    }
  }

  const updates: MarketingCampaignUpdate = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Campaign name cannot be empty');
    updates.name = input.name.trim();
  }
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.subject !== undefined) updates.subject = input.subject ? input.subject.trim() : null;
  if (input.preview_text !== undefined) updates.preview_text = input.preview_text ? input.preview_text.trim() : null;
  if (input.sender_name !== undefined) updates.sender_name = input.sender_name ? input.sender_name.trim() : null;
  if (input.sender_email !== undefined) updates.sender_email = input.sender_email ? input.sender_email.trim() : null;
  if (input.content !== undefined) updates.content = input.content;
  if (input.segment_id !== undefined) updates.segment_id = input.segment_id;
  if (input.scheduled_at !== undefined) updates.scheduled_at = input.scheduled_at;
  if (input.started_at !== undefined) updates.started_at = input.started_at;
  if (input.completed_at !== undefined) updates.completed_at = input.completed_at;

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update marketing campaign: ${error.message}`);
  }

  return data;
}

/**
 * Updates the status of a marketing campaign.
 * Does not enforce lifecycle state machine rules yet (reserved for campaign execution).
 */
export async function updateCampaignStatus(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string,
  status: MarketingCampaignStatus
): Promise<MarketingCampaign> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to update campaign status');
  }
  if (!id?.trim()) {
    throw new Error('Campaign ID is required to update campaign status');
  }
  if (!status) {
    throw new Error('Status is required');
  }

  const existing = await getCampaignById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing campaign ${id} not found for this organization`);
  }

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .update({ status })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update marketing campaign status: ${error.message}`);
  }

  return data;
}

/**
 * Deletes a marketing campaign, strictly scoped to the organization.
 */
export async function deleteCampaign(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string
): Promise<void> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to delete a campaign');
  }
  if (!id?.trim()) {
    throw new Error('Campaign ID is required to delete a campaign');
  }

  const existing = await getCampaignById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing campaign ${id} not found for this organization`);
  }

  const { error } = await supabase
    .from('marketing_campaigns')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to delete marketing campaign: ${error.message}`);
  }
}
