import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  MarketingSegment,
  MarketingSegmentUpdate,
  CreateMarketingSegmentInput,
  UpdateMarketingSegmentInput,
  MarketingSegmentFilter,
  PaginationParams,
  PaginatedResult,
  SegmentRules,
} from '@/types/marketing';

/**
 * Lists marketing segments for an organization with optional filtering and pagination.
 */
export async function getSegments(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  filters?: MarketingSegmentFilter,
  pagination?: PaginationParams
): Promise<PaginatedResult<MarketingSegment>> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to fetch marketing segments');
  }

  const page = Math.max(1, pagination?.page || 1);
  const limit = Math.max(1, Math.min(100, pagination?.limit || 50));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('marketing_segments')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  if (filters?.search && filters.search.trim()) {
    query = query.ilike('name', `%${filters.search.trim()}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list marketing segments: ${error.message}`);
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
 * Retrieves a single marketing segment by ID, strictly scoped to the organization.
 */
export async function getSegmentById(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string
): Promise<MarketingSegment | null> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required');
  }
  if (!id?.trim()) {
    throw new Error('Segment ID is required');
  }

  const { data, error } = await supabase
    .from('marketing_segments')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch marketing segment: ${error.message}`);
  }

  return data;
}

/**
 * Creates a new marketing segment for an organization.
 */
export async function createSegment(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  input: CreateMarketingSegmentInput
): Promise<MarketingSegment> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to create a segment');
  }
  if (!input.name?.trim()) {
    throw new Error('Segment name is required');
  }

  const payload = {
    organization_id: organizationId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    rules: (input.rules ?? {}) as unknown as Database['public']['Tables']['marketing_segments']['Insert']['rules'],
    active: input.active ?? true,
  };

  const { data, error } = await supabase
    .from('marketing_segments')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create marketing segment: ${error.message}`);
  }

  return data;
}

/**
 * Updates an existing marketing segment, strictly scoped to the organization.
 */
export async function updateSegment(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string,
  input: UpdateMarketingSegmentInput
): Promise<MarketingSegment> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to update a segment');
  }
  if (!id?.trim()) {
    throw new Error('Segment ID is required to update a segment');
  }

  // Verify existence and tenant ownership
  const existing = await getSegmentById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing segment ${id} not found for this organization`);
  }

  const updates: MarketingSegmentUpdate = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error('Segment name cannot be empty');
    }
    updates.name = input.name.trim();
  }
  if (input.description !== undefined) {
    updates.description = input.description ? input.description.trim() : null;
  }
  if (input.rules !== undefined) {
    updates.rules = input.rules as unknown as Database['public']['Tables']['marketing_segments']['Update']['rules'];
  }
  if (input.active !== undefined) {
    updates.active = input.active;
  }

  const { data, error } = await supabase
    .from('marketing_segments')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update marketing segment: ${error.message}`);
  }

  return data;
}

/**
 * Deletes a marketing segment, strictly scoped to the organization.
 */
export async function deleteSegment(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  id: string
): Promise<void> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to delete a segment');
  }
  if (!id?.trim()) {
    throw new Error('Segment ID is required to delete a segment');
  }

  const existing = await getSegmentById(supabase, organizationId, id);
  if (!existing) {
    throw new Error(`Marketing segment ${id} not found for this organization`);
  }

  const { error } = await supabase
    .from('marketing_segments')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to delete marketing segment: ${error.message}`);
  }
}

// ============================================================================
// SEED / STARTER SEGMENT DEFINITIONS
// ============================================================================

export interface SeedSegmentDefinition {
  name: string;
  description: string;
  rules: SegmentRules;
}

/**
 * Returns the 6 canonical seed segment definitions with pre-configured rules.
 */
export function getSeedSegmentDefinitions(): SeedSegmentDefinition[] {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return [
    {
      name: 'All Email Subscribers',
      description: 'All customers who have opted in to email marketing communications.',
      rules: {
        match: 'all',
        conditions: [
          { field: 'email_marketing_consent', operator: 'equals', value: true },
        ],
      },
    },
    {
      name: 'New Customers',
      description: 'First-time buyers who have placed exactly 1 order.',
      rules: {
        match: 'all',
        conditions: [
          { field: 'order_count', operator: 'equals', value: 1 },
        ],
      },
    },
    {
      name: 'Never Purchased',
      description: 'Opted-in subscribers who have not placed any orders yet.',
      rules: {
        match: 'all',
        conditions: [
          { field: 'order_count', operator: 'equals', value: 0 },
        ],
      },
    },
    {
      name: 'Repeat Customers',
      description: 'Loyal customers who have placed 2 or more orders.',
      rules: {
        match: 'all',
        conditions: [
          { field: 'order_count', operator: 'greater_than_or_equal', value: 2 },
        ],
      },
    },
    {
      name: 'High-Value Customers',
      description: 'Top spending customers with cumulative purchases of ₦50,000 or more.',
      rules: {
        match: 'all',
        conditions: [
          { field: 'total_spent', operator: 'greater_than_or_equal', value: 50000 },
        ],
      },
    },
    {
      name: "Customers Who Haven't Purchased Recently",
      description: 'Lapsed customers with prior purchases whose last order was placed more than 90 days ago.',
      rules: {
        match: 'all',
        conditions: [
          { field: 'order_count', operator: 'greater_than_or_equal', value: 1 },
          { field: 'last_order_at', operator: 'before', value: ninetyDaysAgo },
        ],
      },
    },
  ];
}

/**
 * Seeds default marketing segments for an organization idempotently.
 * Any segment that already exists by name for the organization will be skipped.
 */
export async function seedDefaultSegments(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<MarketingSegment[]> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required to seed segments');
  }

  // Fetch all current segments for the org
  const { data: existingSegments, error: fetchErr } = await supabase
    .from('marketing_segments')
    .select('name')
    .eq('organization_id', organizationId);

  if (fetchErr) {
    throw new Error(`Failed to check existing segments: ${fetchErr.message}`);
  }

  const existingNames = new Set((existingSegments || []).map((s) => s.name));
  const definitions = getSeedSegmentDefinitions();
  const toInsert = definitions.filter((def) => !existingNames.has(def.name));

  if (toInsert.length === 0) {
    return [];
  }

  const created: MarketingSegment[] = [];
  for (const def of toInsert) {
    const segment = await createSegment(supabase, organizationId, {
      name: def.name,
      description: def.description,
      rules: def.rules,
      active: true,
    });
    created.push(segment);
  }

  return created;
}
