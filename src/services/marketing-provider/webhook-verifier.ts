import crypto from 'crypto';
import { getConfig } from '@/lib/config';

export interface WebhookVerificationOptions {
  rawBody: string;
  headers: Headers | Record<string, string | null | undefined>;
  secret?: string;
}

/**
 * Computes an HMAC-SHA256 signature for test validation or webhook emission.
 */
export function computeMarketingWebhookSignature(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

/**
 * Extracts a header value case-insensitively from Headers object or record.
 */
function getHeader(
  headers: Headers | Record<string, string | null | undefined>,
  name: string
): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName && typeof value === 'string') {
      return value;
    }
  }
  return null;
}

/**
 * Verifies the authenticity of an incoming email provider webhook.
 *
 * Checks standard HMAC-SHA256 signatures (`x-webhook-signature`, `x-signature`, `x-email-signature`)
 * and Svix standard signatures (`svix-signature`, `svix-id`, `svix-timestamp`).
 *
 * Performs comparison using crypto.timingSafeEqual to defend against timing attacks.
 */
export function verifyMarketingWebhookSignature(options: WebhookVerificationOptions): boolean {
  const { rawBody, headers } = options;
  const secret =
    options.secret ||
    getConfig().marketingWebhookSecret ||
    (process.env.NODE_ENV === 'test' ? 'test_webhook_secret' : '');

  if (!secret || !rawBody) {
    return false;
  }

  // Check standard HMAC headers
  const signatureHeader =
    getHeader(headers, 'x-webhook-signature') ||
    getHeader(headers, 'x-signature') ||
    getHeader(headers, 'x-email-signature');

  if (signatureHeader) {
    // Normal hex or sha256=hex format
    const cleanSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;

    const expectedHex = computeMarketingWebhookSignature(rawBody, secret);

    const sigBuffer = Buffer.from(cleanSignature, 'utf8');
    const expectedBuffer = Buffer.from(expectedHex, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  // Check Svix format (used by Resend and standard webhook providers)
  const svixSignature = getHeader(headers, 'svix-signature');
  const svixId = getHeader(headers, 'svix-id');
  const svixTimestamp = getHeader(headers, 'svix-timestamp');

  if (svixSignature && svixId && svixTimestamp) {
    // Svix payload is `${svixId}.${svixTimestamp}.${rawBody}`
    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    // Svix secrets may be prefixed with "whsec_"
    const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    const secretKey = Buffer.from(cleanSecret, 'base64').length > 0
      ? Buffer.from(cleanSecret, 'base64')
      : Buffer.from(cleanSecret, 'utf8');

    const expectedHashBase64 = crypto
      .createHmac('sha256', secretKey)
      .update(toSign, 'utf8')
      .digest('base64');

    // svix-signature may contain multiple space-separated signatures e.g. "v1,abc v1,xyz"
    const signatures = svixSignature.split(' ');
    for (const sig of signatures) {
      const [version, signature] = sig.split(',');
      if (version === 'v1' && signature) {
        const sigBuf = Buffer.from(signature, 'utf8');
        const expBuf = Buffer.from(expectedHashBase64, 'utf8');
        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
          return true;
        }
      }
    }
  }

  return false;
}
