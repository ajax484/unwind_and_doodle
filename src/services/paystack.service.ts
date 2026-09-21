import crypto from 'crypto';
import { getConfig } from '../lib/config';
import { getPaymentProvider, PaystackPaymentProvider } from './payment';

export { PaystackPaymentProvider };

// Standalone helper for test and utility usage
export function generatePaystackReference(prefix = 'UAD'): string {
  return getPaymentProvider('paystack').generateReference(prefix);
}

export function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secretKeyOverride?: string
): boolean {
  if (!signatureHeader) return false;
  const key = secretKeyOverride || getConfig().paystackSecretKey || '';
  if (!key) return false;
  const hash = crypto.createHmac('sha512', key).update(rawBody).digest('hex');
  return hash === signatureHeader;
}
