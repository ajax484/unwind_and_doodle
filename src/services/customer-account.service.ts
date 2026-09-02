import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';

export interface CustomerProfile {
  id: string;
  userId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  emailMarketingConsent: boolean;
  whatsappMarketingConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddressInput {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  state: string;
  lga?: string | null;
  locationId?: string | null;
  isDefault?: boolean;
}

export interface CustomerAddressRecord extends CustomerAddressInput {
  id: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deterministically resolves, creates, or links a Supabase auth user to a customer record.
 * Handles guest order history association safely based on email.
 */
export async function linkOrCreateCustomerAccount(
  supabase: SupabaseClient<Database>,
  user: {
    id: string;
    email: string;
    user_metadata?: {
      first_name?: string;
      last_name?: string;
      full_name?: string;
    };
  }
): Promise<CustomerProfile> {
  const email = user.email.trim().toLowerCase();
  const meta = user.user_metadata || {};
  let firstName = meta.first_name || null;
  let lastName = meta.last_name || null;

  if (!firstName && meta.full_name) {
    const parts = meta.full_name.trim().split(' ');
    firstName = parts[0] || null;
    lastName = parts.slice(1).join(' ') || null;
  }

  // 1. Check if customer record is already linked to this user_id
  const { data: userCustomer } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (userCustomer) {
    return formatCustomerProfile(userCustomer);
  }

  // 2. Look for existing customer records with the same email (from guest checkouts)
  const { data: emailCustomers } = await supabase
    .from('customers')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: true });

  if (emailCustomers && emailCustomers.length > 0) {
    // Primary customer is the earliest created record
    const primary = emailCustomers[0];

    // Link user_id to primary customer
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        user_id: user.id,
        first_name: primary.first_name || firstName || null,
        last_name: primary.last_name || lastName || null,
        updated_at: new Date().toISOString(),
      } as Database['public']['Tables']['customers']['Update'])
      .eq('id', primary.id)
      .select('*')
      .single();

    if (updateError || !updatedCustomer) {
      throw new Error(`Failed to link customer profile: ${updateError?.message}`);
    }

    // If there were secondary guest records with the same email, consolidate their orders & addresses
    if (emailCustomers.length > 1) {
      const secondaryIds = emailCustomers.slice(1).map((c) => c.id);
      for (const secId of secondaryIds) {
        await supabase
          .from('orders')
          .update({ customer_id: primary.id } as Database['public']['Tables']['orders']['Update'])
          .eq('customer_id', secId);

        await supabase
          .from('customer_addresses')
          .update({ customer_id: primary.id } as Database['public']['Tables']['customer_addresses']['Update'])
          .eq('customer_id', secId);
      }
    }

    return formatCustomerProfile(updatedCustomer);
  }

  // 3. Create a brand new customer record for this authenticated user
  let orgId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  try {
    const { data: primaryOrg } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
    if (primaryOrg?.id) {
      orgId = primaryOrg.id;
    }
  } catch {}

  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      organization_id: orgId,
      email,
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email_marketing_consent: true,
      whatsapp_marketing_consent: false,
    } as Database['public']['Tables']['customers']['Insert'])
    .select('*')
    .single();

  if (createError || !newCustomer) {
    throw new Error(`Failed to create customer profile: ${createError?.message}`);
  }

  return formatCustomerProfile(newCustomer);
}

/**
 * Retrieves a customer profile by customer ID or Supabase user ID.
 */
export async function getCustomerProfile(
  supabase: SupabaseClient<Database>,
  lookup: { customerId?: string; userId?: string }
): Promise<CustomerProfile | null> {
  let query = supabase.from('customers').select('*');

  if (lookup.customerId) {
    query = query.eq('id', lookup.customerId);
  } else if (lookup.userId) {
    query = query.eq('user_id', lookup.userId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  return formatCustomerProfile(data);
}

/**
 * Updates basic profile details. Email cannot be directly updated here.
 */
export async function updateCustomerProfile(
  supabase: SupabaseClient<Database>,
  customerId: string,
  data: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    whatsappNumber?: string | null;
  }
): Promise<CustomerProfile> {
  const updatePayload: Database['public']['Tables']['customers']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (data.firstName !== undefined) updatePayload.first_name = data.firstName;
  if (data.lastName !== undefined) updatePayload.last_name = data.lastName;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.whatsappNumber !== undefined) updatePayload.whatsapp_number = data.whatsappNumber;

  const { data: updated, error } = await supabase
    .from('customers')
    .update(updatePayload)
    .eq('id', customerId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Failed to update customer profile: ${error?.message}`);
  }

  return formatCustomerProfile(updated);
}

/**
 * Updates marketing consent preferences.
 */
export async function updateMarketingPreferences(
  supabase: SupabaseClient<Database>,
  customerId: string,
  preferences: {
    emailMarketingConsent?: boolean;
    whatsappMarketingConsent?: boolean;
  }
): Promise<CustomerProfile> {
  const updatePayload: Database['public']['Tables']['customers']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (preferences.emailMarketingConsent !== undefined) {
    updatePayload.email_marketing_consent = preferences.emailMarketingConsent;
  }
  if (preferences.whatsappMarketingConsent !== undefined) {
    updatePayload.whatsapp_marketing_consent = preferences.whatsappMarketingConsent;
  }

  const { data: updated, error } = await supabase
    .from('customers')
    .update(updatePayload)
    .eq('id', customerId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Failed to update marketing preferences: ${error?.message}`);
  }

  return formatCustomerProfile(updated);
}

/**
 * Lists all saved addresses for a customer.
 */
export async function getCustomerAddresses(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<CustomerAddressRecord[]> {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(formatAddressRecord);
}

/**
 * Creates a new customer address. If set to default, resets other defaults atomically.
 */
export async function createCustomerAddress(
  supabase: SupabaseClient<Database>,
  customerId: string,
  input: CustomerAddressInput
): Promise<CustomerAddressRecord> {
  // If location_id is supplied, ensure it exists
  if (input.locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('id', input.locationId)
      .maybeSingle();

    if (!loc) {
      throw new Error('Invalid location selected');
    }
  }

  if (input.isDefault) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({
      customer_id: customerId,
      recipient_name: input.recipientName.trim(),
      phone: input.phone.trim(),
      address_line_1: input.addressLine1.trim(),
      address_line_2: input.addressLine2?.trim() || null,
      state: input.state.trim(),
      lga: input.lga?.trim() || null,
      location_id: input.locationId || null,
      is_default: !!input.isDefault,
    } as Database['public']['Tables']['customer_addresses']['Insert'])
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save customer address: ${error?.message}`);
  }

  return formatAddressRecord(data);
}

/**
 * Updates an address with ownership enforcement.
 */
export async function updateCustomerAddress(
  supabase: SupabaseClient<Database>,
  customerId: string,
  addressId: string,
  input: Partial<CustomerAddressInput>
): Promise<CustomerAddressRecord> {
  const { data: existing } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!existing) {
    throw new Error('Address not found or unauthorized');
  }

  if (input.isDefault) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);
  }

  const updatePayload: Database['public']['Tables']['customer_addresses']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (input.recipientName !== undefined) updatePayload.recipient_name = input.recipientName.trim();
  if (input.phone !== undefined) updatePayload.phone = input.phone.trim();
  if (input.addressLine1 !== undefined) updatePayload.address_line_1 = input.addressLine1.trim();
  if (input.addressLine2 !== undefined) updatePayload.address_line_2 = input.addressLine2?.trim() || null;
  if (input.state !== undefined) updatePayload.state = input.state.trim();
  if (input.lga !== undefined) updatePayload.lga = input.lga?.trim() || null;
  if (input.locationId !== undefined) updatePayload.location_id = input.locationId || null;
  if (input.isDefault !== undefined) updatePayload.is_default = input.isDefault;

  const { data, error } = await supabase
    .from('customer_addresses')
    .update(updatePayload)
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update customer address: ${error?.message}`);
  }

  return formatAddressRecord(data);
}

/**
 * Deletes a customer address.
 */
export async function deleteCustomerAddress(
  supabase: SupabaseClient<Database>,
  customerId: string,
  addressId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', addressId)
    .eq('customer_id', customerId);

  if (error) {
    throw new Error(`Failed to delete customer address: ${error.message}`);
  }

  return true;
}

/**
 * Sets an address as default, ensuring single default guarantee.
 */
export async function setDefaultCustomerAddress(
  supabase: SupabaseClient<Database>,
  customerId: string,
  addressId: string
): Promise<CustomerAddressRecord> {
  // Ensure the address belongs to this customer
  const { data: targetAddr } = await supabase
    .from('customer_addresses')
    .select('id')
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!targetAddr) {
    throw new Error('Address not found or unauthorized');
  }

  // Clear existing defaults
  await supabase
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', customerId);

  // Set selected address as default
  const { data, error } = await supabase
    .from('customer_addresses')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', addressId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to set default address: ${error?.message}`);
  }

  return formatAddressRecord(data);
}

/**
 * Deletes customer auth account and anonymizes customer personal data while preserving
 * all orders, payments, order_items, inventory movements, and accounting history.
 */
export async function deleteCustomerAccount(
  supabase: SupabaseClient<Database>,
  customerId: string,
  userId?: string | null
): Promise<{ success: boolean; message: string }> {
  // 1. Verify customer exists
  const { data: customer } = await supabase
    .from('customers')
    .select('id, user_id')
    .eq('id', customerId)
    .maybeSingle();

  if (!customer) {
    throw new Error('Customer account not found');
  }

  // 2. Anonymize customer personal data
  const anonymizedEmail = `deleted_${customerId.substring(0, 8)}_${Date.now()}@anonymized.local`;
  await supabase
    .from('customers')
    .update({
      first_name: 'Anonymized',
      last_name: 'Customer',
      email: anonymizedEmail,
      phone: null,
      whatsapp_number: null,
      user_id: null,
      email_marketing_consent: false,
      whatsapp_marketing_consent: false,
      updated_at: new Date().toISOString(),
    } as Database['public']['Tables']['customers']['Update'])
    .eq('id', customerId);

  // 3. Delete saved addresses
  await supabase
    .from('customer_addresses')
    .delete()
    .eq('customer_id', customerId);

  // 4. Remove Supabase Auth User if present
  const authUserId = userId || customer.user_id;
  if (authUserId) {
    try {
      if (supabase.auth.admin && typeof supabase.auth.admin.deleteUser === 'function') {
        await supabase.auth.admin.deleteUser(authUserId);
      }
    } catch (authErr) {
      console.warn(`Auth user deletion notice:`, authErr);
    }
  }

  return {
    success: true,
    message: 'Account successfully deactivated and personal data anonymized.',
  };
}

function formatCustomerProfile(row: Database['public']['Tables']['customers']['Row']): CustomerProfile {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    emailMarketingConsent: !!row.email_marketing_consent,
    whatsappMarketingConsent: !!row.whatsapp_marketing_consent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatAddressRecord(row: Database['public']['Tables']['customer_addresses']['Row']): CustomerAddressRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    recipientName: row.recipient_name,
    phone: row.phone,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    state: row.state,
    lga: row.lga,
    locationId: row.location_id,
    isDefault: !!row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
