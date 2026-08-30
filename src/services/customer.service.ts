import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { CustomerInfo, ShippingAddress } from '../types/checkout';

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

  if (customerInfo.userId) {
    const { data: existingUserCust } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', customerInfo.userId)
      .maybeSingle();

    if (existingUserCust) {
      customerId = existingUserCust.id;
    }
  }

  if (!customerId) {
    const { data: existingEmailCust } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existingEmailCust) {
      customerId = existingEmailCust.id;
    }
  }

  if (customerId) {
    // Update customer metadata if changed
    await supabase
      .from('customers')
      .update({
        first_name: customerInfo.firstName,
        last_name: customerInfo.lastName,
        phone: customerInfo.phone || null,
        email_marketing_consent: customerInfo.marketingConsent ?? false,
        marketing_consent: customerInfo.marketingConsent ?? false,
        updated_at: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['customers']['Update'])
      .eq('id', customerId);
  } else {
    // Create new customer
    const { data: newCust, error: createError } = await supabase
      .from('customers')
      .insert({
        organization_id: '88c7af2e-afd4-4504-a43f-b14cc45d6263',
        email,
        first_name: customerInfo.firstName,
        last_name: customerInfo.lastName,
        phone: customerInfo.phone || null,
        user_id: customerInfo.userId || null,
        email_marketing_consent: customerInfo.marketingConsent ?? false,
        marketing_consent: customerInfo.marketingConsent ?? false,
      } as unknown as Database['public']['Tables']['customers']['Insert'])
      .select('id')
      .single();

    if (createError || !newCust) {
      throw new Error(`Failed to create customer record: ${createError?.message}`);
    }

    customerId = newCust.id;
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
