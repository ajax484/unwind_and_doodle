import { PaymentProvider } from './provider.interface';
import { PaystackPaymentProvider } from './paystack.provider';
import { FlutterwavePaymentProvider } from './flutterwave.provider';
import { ManualPaymentProvider } from './manual.provider';
import { PaymentProviderName, isPaymentProviderName } from './provider.types';

export class UnsupportedPaymentProviderError extends Error {
  readonly provider: string;

  constructor(provider: string) {
    super(`Unsupported payment provider: ${provider}`);
    this.name = 'UnsupportedPaymentProviderError';
    this.provider = provider;
  }
}

/**
 * Centralized payment provider resolver / factory.
 * Resolves the concrete PaymentProvider implementation from a canonical provider name.
 * Fails explicitly on unknown or unsupported provider names without silent fallback.
 */
export function getPaymentProvider(
  provider: PaymentProviderName | string
): PaymentProvider {
  if (!provider || typeof provider !== 'string') {
    throw new UnsupportedPaymentProviderError(String(provider));
  }

  const normalized = provider.toLowerCase().trim();

  switch (normalized) {
    case 'paystack':
      return new PaystackPaymentProvider();
    case 'flutterwave':
    case 'flw':
      return new FlutterwavePaymentProvider();
    case 'manual':
      return new ManualPaymentProvider();
    default:
      throw new UnsupportedPaymentProviderError(provider);
  }
}
