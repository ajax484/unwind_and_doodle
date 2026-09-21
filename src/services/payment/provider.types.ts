export type PaymentProviderName = 'paystack' | 'flutterwave' | 'manual';

const SUPPORTED_PROVIDERS: readonly PaymentProviderName[] = ['paystack', 'flutterwave', 'manual'];

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderName, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  manual: 'Bank Transfer',
};

/**
 * Type guard to validate whether a given value is a known PaymentProviderName.
 */
export function isPaymentProviderName(val: unknown): val is PaymentProviderName {
  if (typeof val !== 'string') return false;
  const normalized = val.toLowerCase().trim();
  return SUPPORTED_PROVIDERS.includes(normalized as PaymentProviderName);
}

/**
 * Presentation helper to format internal provider identifier into human-readable label.
 * Maps 'paystack' -> 'Paystack', 'flutterwave' -> 'Flutterwave', 'manual' -> 'Bank Transfer'.
 */
export function getPaymentProviderLabel(provider: string | null | undefined): string {
  if (!provider) return 'Unknown';
  const key = provider.toLowerCase().trim() as PaymentProviderName;
  return PAYMENT_PROVIDER_LABELS[key] || provider;
}
