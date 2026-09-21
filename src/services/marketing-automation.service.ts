import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  MarketingAutomation,
  MarketingAutomationUpdate,
  CreateMarketingAutomationInput,
  UpdateMarketingAutomationInput,
  MarketingAutomationFilter,
  MarketingAutomationStatus,
  MarketingAutomationType,
  MarketingAutomationConfig,
  MarketingAutomationDelay,
  MarketingJourneyStep,
  AutomationTriggerEventType,
  AutomationTypeMetadata,
  PaginationParams,
  PaginatedResult,
} from '@/types/marketing';

/**
 * Metadata and compatible trigger definitions for each automation type.
 */
export const AUTOMATION_TYPE_METADATA: Record<MarketingAutomationType, AutomationTypeMetadata> = {
  welcome: {
    type: 'welcome',
    label: 'Welcome Series',
    description: 'Greet new customers after they register or subscribe to marketing.',
    compatibleEventTypes: ['customer.created'],
    defaultDelay: { amount: 0, unit: 'minutes' },
  },
  abandoned_checkout: {
    type: 'abandoned_checkout',
    label: 'Abandoned Checkout Recovery',
    description: 'Recover shoppers who started checkout but did not complete payment.',
    compatibleEventTypes: ['checkout.abandoned'],
    defaultDelay: { amount: 1, unit: 'hours' },
  },
  post_purchase: {
    type: 'post_purchase',
    label: 'Post-Purchase Follow-up',
    description: 'Engage customers with instructions, care tips, or cross-sells after purchase.',
    compatibleEventTypes: ['order.paid', 'order.created'],
    defaultDelay: { amount: 1, unit: 'days' },
  },
  win_back: {
    type: 'win_back',
    label: 'Customer Win-Back',
    description: 'Re-engage customers who have been inactive for an extended period.',
    compatibleEventTypes: ['customer.inactive'],
    defaultDelay: { amount: 30, unit: 'days' },
  },
};

/**
 * Returns metadata for a specific automation type.
 */
export function getAutomationTypeMetadata(type: MarketingAutomationType): AutomationTypeMetadata {
  const meta = AUTOMATION_TYPE_METADATA[type];
  if (!meta) {
    throw new Error(`Unknown automation type: "${type}"`);
  }
  return meta;
}

/**
 * Returns all supported automation trigger event types.
 */
export function getAutomationTriggerTypes(): AutomationTriggerEventType[] {
  return [
    'customer.created',
    'checkout.abandoned',
    'order.created',
    'order.paid',
    'customer.inactive',
  ];
}

/**
 * Validates automation configuration server-side against database state and business rules.
 */
export async function validateAutomationConfig(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  type: MarketingAutomationType,
  config: unknown
): Promise<MarketingAutomationConfig> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required for automation validation.');
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Automation configuration must be a valid object.');
  }

  const raw = config as Partial<MarketingAutomationConfig>;

  // 1. Validate Trigger
  if (!raw.trigger || typeof raw.trigger !== 'object') {
    throw new Error('Trigger configuration is required.');
  }
  const validTriggerEvents = getAutomationTriggerTypes();
  if (!raw.trigger.type || !validTriggerEvents.includes(raw.trigger.type)) {
    throw new Error(`Invalid trigger event type: "${raw.trigger.type}".`);
  }

  const meta = AUTOMATION_TYPE_METADATA[type];
  if (!meta) {
    throw new Error(`Unknown automation type: "${type}".`);
  }
  if (!meta.compatibleEventTypes.includes(raw.trigger.type)) {
    throw new Error(
      `Trigger event "${raw.trigger.type}" is not compatible with automation type "${type}". Compatible triggers: ${meta.compatibleEventTypes.join(', ')}.`
    );
  }

  // 2. Validate Delay (if present)
  let delay: MarketingAutomationDelay | undefined;
  if (raw.delay !== undefined && raw.delay !== null) {
    if (typeof raw.delay !== 'object') {
      throw new Error('Delay configuration must be an object.');
    }
    const { amount, unit } = raw.delay;
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      throw new Error('Delay amount must be a non-negative number.');
    }
    if (!['minutes', 'hours', 'days'].includes(unit)) {
      throw new Error('Delay unit must be "minutes", "hours", or "days".');
    }

    // Maximum delay: 90 days (or equivalent in hours/minutes)
    const maxMinutes = 90 * 24 * 60;
    let totalMinutes = amount;
    if (unit === 'hours') totalMinutes = amount * 60;
    if (unit === 'days') totalMinutes = amount * 24 * 60;

    if (totalMinutes > maxMinutes) {
      throw new Error('Delay cannot exceed 90 days.');
    }

    delay = {
      amount: Math.round(amount),
      unit,
    };
  }

  // 3. Validate Action
  if (!raw.action || typeof raw.action !== 'object') {
    throw new Error('Action configuration is required.');
  }
  if (raw.action.type !== 'email') {
    throw new Error('Only "email" action type is currently supported.');
  }
  if (!raw.action.campaignId || typeof raw.action.campaignId !== 'string' || !raw.action.campaignId.trim()) {
    throw new Error('A valid campaign ID is required for email actions.');
  }

  const campaignId = raw.action.campaignId.trim();

  // Verify campaign exists and belongs to the same organization
  const { data: campaign, error: campErr } = await supabase
    .from('marketing_campaigns')
    .select('id, organization_id, name, subject, sender_email, sender_name')
    .eq('id', campaignId)
    .maybeSingle();

  if (campErr) {
    throw new Error(`Failed to verify campaign: ${campErr.message}`);
  }
  if (!campaign) {
    throw new Error('Referenced campaign does not exist.');
  }
  if (campaign.organization_id !== organizationId) {
    throw new Error('Referenced campaign does not belong to your organization.');
  }
  if (!campaign.subject?.trim()) {
    throw new Error('Referenced campaign must have a valid subject line.');
  }
  if (!campaign.sender_email?.trim()) {
    throw new Error('Referenced campaign must have a valid sender email.');
  }

  return {
    trigger: {
      type: raw.trigger.type,
      ...(raw.trigger.filters ? { filters: raw.trigger.filters } : {}),
    },
    ...(delay ? { delay } : {}),
    action: {
      type: 'email',
      campaignId,
    },
    ...(raw.steps && Array.isArray(raw.steps) ? { steps: raw.steps } : {}),
    ...(typeof raw.version === 'number' ? { version: raw.version } : {}),
  };
}

/**
 * Normalizes any MarketingAutomationConfig (legacy single-step or modern multi-step)
 * into a canonical sequence of MarketingJourneySteps.
 */
export function normalizeAutomationSteps(config: MarketingAutomationConfig): MarketingJourneyStep[] {
  if (config.steps && Array.isArray(config.steps) && config.steps.length > 0) {
    return config.steps;
  }

  const steps: MarketingJourneyStep[] = [];

  // If delay configured and > 0, create delay step
  if (config.delay && typeof config.delay.amount === 'number' && config.delay.amount > 0) {
    steps.push({
      id: 'step-delay-1',
      type: 'delay',
      amount: config.delay.amount,
      unit: config.delay.unit,
    });
  }

  // If action configured, create send email step
  if (config.action && config.action.type === 'email' && config.action.campaignId) {
    steps.push({
      id: 'step-send-1',
      type: 'send_email',
      campaignId: config.action.campaignId,
    });
  }

  return steps;
}

/**
 * Checks if a domain event matches an automation's trigger configuration.
 *
 * Ground rules:
 * 1. Automation must be active.
 * 2. Organization ID must match.
 * 3. Event type must match automation trigger definition.
 * 4. Automation type must be compatible with event type.
 * 5. Event payload must satisfy minimal required context.
 */
export function matchesAutomationTrigger(
  automation: MarketingAutomation,
  event: {
    event_type: string;
    organization_id?: string | null;
    payload?: Json;
  }
): boolean {
  if (automation.status !== 'active') {
    return false;
  }

  if (!automation.organization_id || !event.organization_id) {
    return false;
  }

  if (automation.organization_id !== event.organization_id) {
    return false;
  }

  // Map incoming commerce event to canonical marketing trigger event type
  const canonicalTriggerType: string =
    event.event_type === 'payment.completed' ? 'order.paid' : event.event_type;

  const meta = AUTOMATION_TYPE_METADATA[automation.type];
  if (!meta || !meta.compatibleEventTypes.includes(canonicalTriggerType as AutomationTriggerEventType)) {
    return false;
  }

  const config = automation.config as unknown as MarketingAutomationConfig | null;
  if (!config || typeof config !== 'object' || !config.trigger) {
    return false;
  }

  const isTypeMatched =
    config.trigger.type === event.event_type ||
    (config.trigger.type === 'order.paid' && event.event_type === 'payment.completed');

  if (!isTypeMatched) {
    return false;
  }

  const payload = (
    event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
      ? event.payload
      : {}
  ) as Record<string, unknown>;

  // Validate required payload context per event type
  if (
    event.event_type === 'order.paid' ||
    event.event_type === 'order.created' ||
    event.event_type === 'payment.completed'
  ) {
    const hasOrder = Boolean(payload.orderId || payload.order_id || payload.orderNumber || payload.id);
    const hasCustomer = Boolean(payload.customerId || payload.customer_id || payload.customerEmail || payload.email);
    if (!hasOrder || !hasCustomer) {
      return false;
    }
  } else if (event.event_type === 'checkout.abandoned') {
    const hasCheckout = Boolean(payload.checkoutId || payload.checkout_id || payload.cartId || payload.cart_id || payload.id);
    const hasEmail = Boolean(payload.email || payload.customerEmail || payload.customerId || payload.customer_id);
    if (!hasCheckout && !hasEmail) {
      return false;
    }
  } else if (event.event_type === 'customer.created' || event.event_type === 'customer.inactive') {
    const hasIdentifier = Boolean(payload.customerId || payload.customer_id || payload.email || payload.id);
    if (!hasIdentifier) {
      return false;
    }
  }

  return true;
}

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

  let finalConfig = input.config ?? {};
  if (input.config && typeof input.config === 'object' && 'trigger' in input.config) {
    finalConfig = await validateAutomationConfig(supabase, organizationId, input.type, input.config);
  } else if (input.status === 'active') {
    finalConfig = await validateAutomationConfig(supabase, organizationId, input.type, input.config);
  }

  const payload = {
    organization_id: organizationId,
    name: input.name.trim(),
    type: input.type,
    status: input.status || 'draft',
    config: finalConfig as unknown as Json,
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

  if (input.config !== undefined) {
    const targetType = input.type || existing.type;
    if (input.config && typeof input.config === 'object' && 'trigger' in input.config) {
      const validated = await validateAutomationConfig(supabase, organizationId, targetType, input.config);
      updates.config = validated as unknown as Json;
    } else {
      updates.config = input.config as unknown as Json;
    }
  }

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
  status: MarketingAutomationStatus,
  options?: { validateConfig?: boolean }
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

  if (status === 'active' && options?.validateConfig) {
    await validateAutomationConfig(supabase, organizationId, existing.type, existing.config);
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
