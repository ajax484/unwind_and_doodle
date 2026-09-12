import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  MarketingAutomation,
  MarketingAutomationUpdate,
  CreateMarketingAutomationInput,
  UpdateMarketingAutomationInput,
  MarketingAutomationFilter,
  MarketingAutomationStatus,
  PaginationParams,
  PaginatedResult,
} from '@/types/marketing';

/**
 * Lists marketing automations for an organization with optional filtering and pagination.
 */
export async function getAutomations(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  filters?: MarketingAutomationFilter,
  pagination?: PaginationParams
): Promise<PaginatedResult<MarketingAutomation>> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to fetch automations');
  }

  const page = Math.max(1, pagination?.page || 1);
  const limit = Math.max(1, Math.min(100, pagination?.limit || 50));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('marketing_automations')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list marketing automations: ${error.message}`);
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
 * Retrieves a single automation by ID, strictly scoped to the organization.
 */
export async function getAutomationById(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string
): Promise<MarketingAutomation | null> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required');
  }
  if (!id?.trim()) {
    throw new Error('Automation ID is required');
  }

  const { data, error } = await supabase
    .from('marketing_automations')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch automation: ${error.message}`);
  }

  return data;
}

/**
 * Creates a new marketing automation configuration for an organization.
 */
export async function createAutomation(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  input: CreateMarketingAutomationInput
): Promise<MarketingAutomation> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to create an automation');
  }
  if (!input.name?.trim()) {
    throw new Error('Automation name is required');
  }
  if (!input.type) {
    throw new Error('Automation type is required');
  }

  const payload = {
    organization_id: organizationId,
    name: input.name.trim(),
    type: input.type,
    status: input.status || 'draft',
    config: input.config ?? {},
    created_by: input.created_by || null,
  };

  const { data, error } = await supabase
    .from('marketing_automations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create marketing automation: ${error.message}`);
  }

  return data;
}

/**
 * Updates a marketing automation configuration, strictly scoped to the organization.
 */
export async function updateAutomation(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string,
  input: UpdateMarketingAutomationInput
): Promise<MarketingAutomation> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to update an automation');
  }
  if (!id?.trim()) {
    throw new Error('Automation ID is required to update an automation');
  }

  const existing = await getAutomationById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing automation ${id} not found for this organization`);
  }

  const updates: MarketingAutomationUpdate = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Automation name cannot be empty');
    updates.name = input.name.trim();
  }
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.config !== undefined) updates.config = input.config;

  const { data, error } = await supabase
    .from('marketing_automations')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update marketing automation: ${error.message}`);
  }

  return data;
}

/**
 * Updates the operational status of an automation (draft, active, paused).
 */
export async function updateAutomationStatus(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string,
  status: MarketingAutomationStatus
): Promise<MarketingAutomation> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to update automation status');
  }
  if (!id?.trim()) {
    throw new Error('Automation ID is required to update automation status');
  }
  if (!status) {
    throw new Error('Status is required');
  }

  const existing = await getAutomationById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing automation ${id} not found for this organization`);
  }

  const { data, error } = await supabase
    .from('marketing_automations')
    .update({ status })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update marketing automation status: ${error.message}`);
  }

  return data;
}

/**
 * Deletes a marketing automation configuration, strictly scoped to the organization.
 */
export async function deleteAutomation(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string
): Promise<void> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to delete an automation');
  }
  if (!id?.trim()) {
    throw new Error('Automation ID is required to delete an automation');
  }

  const existing = await getAutomationById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing automation ${id} not found for this organization`);
  }

  const { error } = await supabase
    .from('marketing_automations')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to delete marketing automation: ${error.message}`);
  }
}
