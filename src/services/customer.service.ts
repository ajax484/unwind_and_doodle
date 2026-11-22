import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { CustomerInfo, ShippingAddress } from '../types/checkout';
import { DEFAULT_ORGANIZATION_ID } from '../lib/constants';
import { publishDomainEvent } from './events.service';
import { hasPreviouslyEnteredWelcome } from './marketing-subscription.service';

export interface CustomerResolutionResult {
  customerId: string;
  customerAddressId: string;
}

/**
 * Resolves an existing customer by email/userId or creates a new guest/registered customer record.
 * Also persists the shipping address in customer_addresses.
 */
export async function resolveOrCreateCustomer(
  supabase: SupabaseClient<Database>,
  customerInfo: CustomerInfo,
  shippingAddress: ShippingAddress,
  locationId: string
): Promise<CustomerResolutionResult> {
  const email = customerInfo.email.trim().toLowerCase();

  // 1. Check if customer exists
  let customerId: string | null = null;
  let wasAlreadySubscribed = false;
  let existingOrgId: string = DEFAULT_ORGANIZATION_ID;

  if (customerInfo.userId) {
    const { data: existingUserCust } = await supabase
      .from('customers')
      .select('id, email_marketing_consent, organization_id')
      .eq('user_id', customerInfo.userId)
      .maybeSingle();

    if (existingUserCust) {
      customerId = existingUserCust.id;
      wasAlreadySubscribed = Boolean(existingUserCust.email_marketing_consent);
      if (existingUserCust.organization_id) existingOrgId = existingUserCust.organization_id;
    }
  }

  if (!customerId) {
    const { data: existingEmailCust } = await supabase
      .from('customers')
      .select('id, email_marketing_consent, organization_id')
      .ilike('email', email)
      .maybeSingle();

    if (existingEmailCust) {
      customerId = existingEmailCust.id;
      wasAlreadySubscribed = Boolean(existingEmailCust.email_marketing_consent);
      if (existingEmailCust.organization_id) existingOrgId = existingEmailCust.organization_id;
    }
  }

  const nowIso = new Date().toISOString();
  const optedInAtCheckout = customerInfo.marketingConsent === true;

  if (customerId) {
    // Update customer metadata if changed — NEVER revoke existing marketing consent just because checkout box was unchecked
    const updatePayload: Record<string, unknown> = {
      first_name: customerInfo.firstName,
      last_name: customerInfo.lastName,
      phone: customerInfo.phone || null,
      updated_at: nowIso,
    };

    if (optedInAtCheckout && !wasAlreadySubscribed) {
      updatePayload.email_marketing_consent = true;
      updatePayload.marketing_subscribed_at = nowIso;
      updatePayload.marketing_subscription_source = 'checkout';
    }

    await supabase
      .from('customers')
      .update(updatePayload as unknown as Database['public']['Tables']['customers']['Update'])
      .eq('id', customerId);

    // Emit explicit marketing.subscribed ONLY if newly opted in and never previously entered welcome
    if (optedInAtCheckout && !wasAlreadySubscribed) {
      const previouslyWelcomed = await hasPreviouslyEnteredWelcome(
        supabase,
        existingOrgId,
        customerId,
        email
      );
      if (!previouslyWelcomed) {
        await publishDomainEvent(supabase, {
          eventType: 'marketing.subscribed',
          aggregateType: 'customer',
          aggregateId: customerId,
          organizationId: existingOrgId,
          payload: {
            customerId,
            email,
            firstName: customerInfo.firstName,
            lastName: customerInfo.lastName,
            marketingConsent: true,
            subscribedAt: nowIso,
            source: 'checkout',
          },
        });
      }
    }
  } else {
    // Create new customer
    const insertPayload: Record<string, unknown> = {
      organization_id: DEFAULT_ORGANIZATION_ID,
      email,
      first_name: customerInfo.firstName,
      last_name: customerInfo.lastName,
      phone: customerInfo.phone || null,
      user_id: customerInfo.userId || null,
      email_marketing_consent: optedInAtCheckout,
      ...(optedInAtCheckout
        ? {
            marketing_subscribed_at: nowIso,
            marketing_subscription_source: 'checkout',
          }
        : {}),
    };

    const { data: newCust, error: createError } = await supabase
      .from('customers')
      .insert(insertPayload as unknown as Database['public']['Tables']['customers']['Insert'])
      .select('id')
      .single();

    if (createError || !newCust) {
      throw new Error(`Failed to create customer record: ${createError?.message}`);
    }

    customerId = newCust.id;

    // Emit domain event for new customer creation (no longer triggers welcome marketing emails)
    await publishDomainEvent(supabase, {
      eventType: 'customer.created',
      aggregateType: 'customer',
      aggregateId: newCust.id,
      organizationId: DEFAULT_ORGANIZATION_ID,
      payload: {
        customerId: newCust.id,
        email,
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phone: customerInfo.phone || null,
        userId: customerInfo.userId || null,
        marketingConsent: optedInAtCheckout,
      },
    });

    // Emit explicit marketing.subscribed ONLY if the customer actively opted in at checkout
    if (optedInAtCheckout) {
      const previouslyWelcomed = await hasPreviouslyEnteredWelcome(
        supabase,
        DEFAULT_ORGANIZATION_ID,
        newCust.id,
        email
      );
      if (!previouslyWelcomed) {
        await publishDomainEvent(supabase, {
          eventType: 'marketing.subscribed',
          aggregateType: 'customer',
          aggregateId: newCust.id,
          organizationId: DEFAULT_ORGANIZATION_ID,
          payload: {
            customerId: newCust.id,
            email,
            firstName: customerInfo.firstName,
            lastName: customerInfo.lastName,
            marketingConsent: true,
            subscribedAt: nowIso,
            source: 'checkout',
          },
        });
      }
    }
  }

  // 2. Create or find address record
  const recipientName = `${customerInfo.firstName} ${customerInfo.lastName}`.trim();
  const street = (shippingAddress.streetAddress || '').trim();
  const state = (shippingAddress.state || '').trim();
  const lga = (shippingAddress.city || '').trim();

  const { data: existingAddresses } = await supabase
    .from('customer_addresses')
    .select('id, address_line_1, state, lga, is_default')
    .eq('customer_id', customerId);

  // Check if identical address already exists for this customer
  const matchingAddr = (existingAddresses || []).find(
    (a) =>
      a.address_line_1?.trim().toLowerCase() === street.toLowerCase() &&
      a.state?.trim().toLowerCase() === state.toLowerCase()
  );

  if (matchingAddr) {
    return {
      customerId,
      customerAddressId: matchingAddr.id,
    };
  }

  // Only mark as default if the customer currently has no saved addresses
  const hasExistingAddresses = (existingAddresses || []).length > 0;
  const isDefault = !hasExistingAddresses;

  const { data: addressRecord, error: addrError } = await supabase
    .from('customer_addresses')
    .insert({
      customer_id: customerId,
      location_id: locationId,
      address_line_1: street,
      state: state,
      lga: lga || null,
      recipient_name: recipientName,
      phone: customerInfo.phone || '',
      is_default: isDefault,
    } as Database['public']['Tables']['customer_addresses']['Insert'])
    .select('id')
    .single();

  if (addrError || !addressRecord) {
    throw new Error(`Failed to save customer address: ${addrError?.message}`);
  }

  return {
    customerId,
    customerAddressId: addressRecord.id,
  };
}
