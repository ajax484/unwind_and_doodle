import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants';
import { publishDomainEvent } from './events.service';

export type MarketingSubscriptionSource =
  | 'newsletter'
  | 'checkout'
  | 'account'
  | 'admin'
  | 'import';

export interface SubscribeToMarketingInput {
  email: string;
  organizationId?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  source: MarketingSubscriptionSource;
}

export interface SubscribeToMarketingResult {
  customerId: string;
  email: string;
  newlySubscribed: boolean;
  alreadySubscribed: boolean;
  subscribedAt: string;
  source: MarketingSubscriptionSource;
}

/**
 * Checks whether a customer (by ID or normalized email) has ever been enrolled in a live welcome automation.
 * Prevents existing or returning subscribers from re-entering the welcome sequence.
 */
export async function hasPreviouslyEnteredWelcome(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  customerId: string | null,
  normalizedEmail: string
): Promise<boolean> {
  try {
    const { data: welcomeAutomations } = await (supabase as any)
      .from('marketing_automations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('type', 'welcome');

    const welcomeIds = (welcomeAutomations || []).map((a: { id: string }) => a.id);
    if (welcomeIds.length === 0) return false;

    let query = (supabase as any)
      .from('marketing_automation_executions')
      .select('id')
      .eq('organization_id', organizationId)
      .in('automation_id', welcomeIds)
      .eq('is_test_run', false)
      .limit(1);

    if (customerId) {
      query = query.or(`customer_id.eq.${customerId},customer_email.ilike.${normalizedEmail}`);
    } else {
      query = query.ilike('customer_email', normalizedEmail);
    }

    const { data } = await query;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Explicit marketing subscription handler (EML-AUTO-1).
 * Persists consent timestamp & source, and emits `marketing.subscribed` ONLY for genuinely new subscribers
 * who have not previously entered a welcome sequence.
 */
export async function subscribeCustomerToMarketing(
  supabase: SupabaseClient<Database>,
  input: SubscribeToMarketingInput
): Promise<SubscribeToMarketingResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  // Resolve organization ID
  let orgId = input.organizationId || DEFAULT_ORGANIZATION_ID;
  if (!input.organizationId) {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (org?.id) {
        orgId = org.id;
      }
    } catch {
      // Fallback to default org ID
    }
  }

  // 1. Check for existing customer record in this org
  const { data: existingCustomer } = await (supabase as any)
    .from('customers')
    .select('id, email, first_name, last_name, email_marketing_consent, marketing_subscribed_at, marketing_subscription_source')
    .eq('organization_id', orgId)
    .ilike('email', normalizedEmail)
    .maybeSingle();

  let customerId: string;
  let alreadySubscribed = false;
  let subscribedAt = nowIso;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    alreadySubscribed = Boolean(existingCustomer.email_marketing_consent);
    subscribedAt = existingCustomer.marketing_subscribed_at || nowIso;

    if (!alreadySubscribed) {
      const updatePayload: Record<string, unknown> = {
        email_marketing_consent: true,
        marketing_subscribed_at: nowIso,
        marketing_subscription_source: input.source,
        updated_at: nowIso,
      };
      if (input.firstName && !existingCustomer.first_name) {
        updatePayload.first_name = input.firstName;
      }
      if (input.lastName && !existingCustomer.last_name) {
        updatePayload.last_name = input.lastName;
      }

      const { error: updateErr } = await (supabase as any)
        .from('customers')
        .update(updatePayload)
        .eq('id', customerId);

      if (updateErr) {
        throw new Error(`Failed to update marketing subscription: ${updateErr.message}`);
      }
      subscribedAt = nowIso;
    }
  } else {
    const { data: newCust, error: insertErr } = await (supabase as any)
      .from('customers')
      .insert({
        organization_id: orgId,
        email: normalizedEmail,
        first_name: input.firstName || null,
        last_name: input.lastName || null,
        phone: input.phone || null,
        email_marketing_consent: true,
        marketing_subscribed_at: nowIso,
        marketing_subscription_source: input.source,
      })
      .select('id')
      .single();

    if (insertErr || !newCust) {
      throw new Error(`Failed to create subscriber record: ${insertErr?.message || 'Unknown error'}`);
    }

    customerId = newCust.id;
  }

  // 2. Emit `marketing.subscribed` ONLY if newly subscribed and never previously entered welcome
  const previouslyWelcomed = alreadySubscribed
    ? true
    : await hasPreviouslyEnteredWelcome(supabase, orgId, customerId, normalizedEmail);

  const newlySubscribed = !alreadySubscribed && !previouslyWelcomed;

  if (newlySubscribed) {
    await publishDomainEvent(supabase, {
      eventType: 'marketing.subscribed',
      aggregateType: 'customer',
      aggregateId: customerId,
      organizationId: orgId,
      payload: {
        customerId,
        email: normalizedEmail,
        firstName: input.firstName || existingCustomer?.first_name || null,
        lastName: input.lastName || existingCustomer?.last_name || null,
        marketingConsent: true,
        subscribedAt,
        source: input.source,
      },
    });
  }

  return {
    customerId,
    email: normalizedEmail,
    newlySubscribed,
    alreadySubscribed,
    subscribedAt,
    source: input.source,
  };
}
