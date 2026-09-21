import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { PaymentProviderName, isPaymentProviderName } from '@/services/payment/provider.types';
import {
  BankTransferConfig,
  OrganizationPaymentMethod,
  PublicPaymentMethod,
  UpdatePaymentMethodInput,
  updatePaymentMethodSchema,
} from '@/types/payment-settings';

const DEFAULT_METHODS: Array<{
  provider: PaymentProviderName;
  enabled: boolean;
  displayTitle: string;
  displayDescription: string;
}> = [
  {
    provider: 'paystack',
    enabled: true,
    displayTitle: 'Paystack',
    displayDescription: 'Pay securely with Card, Bank Transfer, USSD, or Mobile Money via Paystack.',
  },
  {
    provider: 'flutterwave',
    enabled: false,
    displayTitle: 'Flutterwave',
    displayDescription: 'Accept payments seamlessly through Flutterwave gateway.',
  },
  {
    provider: 'manual',
    enabled: false,
    displayTitle: 'Direct Bank Transfer',
    displayDescription: 'Pay directly to our bank account. Your order will be processed after confirmation.',
  },
];

function mapRowToPaymentMethod(row: any): OrganizationPaymentMethod {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider as PaymentProviderName,
    enabled: Boolean(row.enabled),
    displayTitle: row.display_title || null,
    displayDescription: row.display_description || null,
    bankName: row.bank_name || null,
    accountName: row.account_name || null,
    accountNumber: row.account_number || null,
    instructions: row.instructions || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Initializes default payment method rows for an organization if not already present.
 */
async function ensureDefaultPaymentMethods(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<OrganizationPaymentMethod[]> {
  const rowsToInsert = DEFAULT_METHODS.map((dm) => ({
    organization_id: organizationId,
    provider: dm.provider,
    enabled: dm.enabled,
    display_title: dm.displayTitle,
    display_description: dm.displayDescription,
  }));

  const { data, error } = await supabase
    .from('organization_payment_methods' as any)
    .upsert(rowsToInsert, { onConflict: 'organization_id,provider' })
    .select('*');

  if (error || !data) {
    // If upsert fails (e.g., RLS restricted or read-only context), construct fallback objects in-memory
    const now = new Date().toISOString();
    return DEFAULT_METHODS.map((dm, idx) => ({
      id: `default-${organizationId}-${dm.provider}`,
      organizationId,
      provider: dm.provider,
      enabled: dm.enabled,
      displayTitle: dm.displayTitle,
      displayDescription: dm.displayDescription,
      bankName: null,
      accountName: null,
      accountNumber: null,
      instructions: null,
      createdAt: now,
      updatedAt: now,
    }));
  }

  return data.map(mapRowToPaymentMethod);
}

/**
 * Retrieves all configured payment methods for an organization.
 * If none exist, initializes safe defaults (Paystack enabled, Flutterwave & Manual disabled).
 */
export async function getPaymentMethods(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<OrganizationPaymentMethod[]> {
  if (!organizationId) {
    throw new Error('Organization ID is required to fetch payment methods.');
  }

  const { data, error } = await supabase
    .from('organization_payment_methods' as any)
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch payment methods: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return ensureDefaultPaymentMethods(supabase, organizationId);
  }

  const existingProviders = new Set(data.map((r: any) => r.provider));
  const methods = data.map(mapRowToPaymentMethod);

  // Ensure any missing providers from DEFAULT_METHODS are included in memory
  const missingDefaults = DEFAULT_METHODS.filter((dm) => !existingProviders.has(dm.provider));
  if (missingDefaults.length > 0) {
    const now = new Date().toISOString();
    for (const missing of missingDefaults) {
      methods.push({
        id: `default-${organizationId}-${missing.provider}`,
        organizationId,
        provider: missing.provider,
        enabled: missing.enabled,
        displayTitle: missing.displayTitle,
        displayDescription: missing.displayDescription,
        bankName: null,
        accountName: null,
        accountNumber: null,
        instructions: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return methods;
}

/**
 * Retrieves enabled payment provider names for an organization.
 * Example return: ['paystack', 'manual']
 */
export async function getEnabledPaymentMethods(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<PaymentProviderName[]> {
  const allMethods = await getPaymentMethods(supabase, organizationId);
  return allMethods
    .filter((m) => m.enabled)
    .map((m) => m.provider);
}

/**
 * Retrieves public-safe payment method configurations for customer checkout.
 */
export async function getPublicPaymentMethods(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<PublicPaymentMethod[]> {
  const allMethods = await getPaymentMethods(supabase, organizationId);
  return allMethods
    .filter((m) => m.enabled)
    .map((m) => ({
      provider: m.provider,
      enabled: m.enabled,
      displayTitle: m.displayTitle,
      displayDescription: m.displayDescription,
      bankDetails:
        m.provider === 'manual' && m.bankName && m.accountName && m.accountNumber
          ? {
              bankName: m.bankName,
              accountName: m.accountName,
              accountNumber: m.accountNumber,
              instructions: m.instructions,
            }
          : null,
    }));
}

/**
 * Retrieves bank transfer configuration for an organization.
 */
export async function getBankTransferSettings(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<BankTransferConfig | null> {
  const allMethods = await getPaymentMethods(supabase, organizationId);
  const manualMethod = allMethods.find((m) => m.provider === 'manual');

  if (
    !manualMethod ||
    !manualMethod.bankName ||
    !manualMethod.accountName ||
    !manualMethod.accountNumber
  ) {
    return null;
  }

  return {
    bankName: manualMethod.bankName,
    accountName: manualMethod.accountName,
    accountNumber: manualMethod.accountNumber,
    instructions: manualMethod.instructions || undefined,
  };
}

/**
 * Updates or configures a payment method for an organization.
 * 
 * Enforces business validation rules:
 * 1. An organization must keep at least one payment method enabled.
 * 2. Enabling Bank Transfer ('manual') requires valid bankName, accountName, and accountNumber.
 */
export async function updatePaymentMethod(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  input: UpdatePaymentMethodInput,
  actorId?: string
): Promise<OrganizationPaymentMethod> {
  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }

  const validated = updatePaymentMethodSchema.parse(input);
  const currentMethods = await getPaymentMethods(supabase, organizationId);
  const existingForProvider = currentMethods.find((m) => m.provider === validated.provider);

  // Validation Rule 1: At least one payment method must remain enabled
  if (!validated.enabled) {
    const otherEnabled = currentMethods.filter(
      (m) => m.provider !== validated.provider && m.enabled
    );
    if (otherEnabled.length === 0) {
      throw new Error('You must keep at least one payment method enabled.');
    }
  }

  // Validation Rule 2: Bank transfer requires bank details before enabling
  if (validated.provider === 'manual' && validated.enabled) {
    const bankName = validated.bankName ?? existingForProvider?.bankName;
    const accountName = validated.accountName ?? existingForProvider?.accountName;
    const accountNumber = validated.accountNumber ?? existingForProvider?.accountNumber;

    if (!bankName?.trim() || !accountName?.trim() || !accountNumber?.trim()) {
      throw new Error(
        'Bank name, account name, and account number are required to enable bank transfer.'
      );
    }
  }

  const now = new Date().toISOString();
  const upsertPayload = {
    organization_id: organizationId,
    provider: validated.provider,
    enabled: validated.enabled,
    display_title:
      validated.displayTitle !== undefined
        ? validated.displayTitle
        : existingForProvider?.displayTitle ?? null,
    display_description:
      validated.displayDescription !== undefined
        ? validated.displayDescription
        : existingForProvider?.displayDescription ?? null,
    bank_name:
      validated.bankName !== undefined
        ? validated.bankName
        : existingForProvider?.bankName ?? null,
    account_name:
      validated.accountName !== undefined
        ? validated.accountName
        : existingForProvider?.accountName ?? null,
    account_number:
      validated.accountNumber !== undefined
        ? validated.accountNumber
        : existingForProvider?.accountNumber ?? null,
    instructions:
      validated.instructions !== undefined
        ? validated.instructions
        : existingForProvider?.instructions ?? null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('organization_payment_methods' as any)
    .upsert(upsertPayload, { onConflict: 'organization_id,provider' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update payment method: ${error?.message || 'Unknown database error'}`);
  }

  return mapRowToPaymentMethod(data);
}
