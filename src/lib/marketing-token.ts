import { createHmac } from 'crypto';
import { getConfig } from './config';

const TOKEN_SECRET =
  process.env.MARKETING_TOKEN_SECRET ||
  process.env.ORDER_TOKEN_SECRET ||
  getConfig().supabaseServiceRoleKey ||
  'unwind-marketing-secret-key-salt';

export interface MarketingUnsubscribeTokenPayload {
  customerId: string;
  organizationId: string;
  campaignId?: string;
  createdAt: number;
}

/**
 * Generates an HMAC-SHA256 signed token for secure, tamper-proof email unsubscribe links.
 */
export function generateMarketingUnsubscribeToken(
  customerId: string,
  organizationId: string,
  campaignId?: string
): string {
  const payload: MarketingUnsubscribeTokenPayload = {
    customerId: customerId.trim(),
    organizationId: organizationId.trim(),
    campaignId: campaignId?.trim(),
    createdAt: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export interface VerifyMarketingUnsubscribeResult {
  valid: boolean;
  customerId?: string;
  organizationId?: string;
  campaignId?: string;
  error?: string;
}

/**
 * Verifies the signature of an unsubscribe token and extracts customer and organization IDs.
 */
export function verifyMarketingUnsubscribeToken(
  token: string
): VerifyMarketingUnsubscribeResult {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Invalid token format' };
  }

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'Malformed token' };
  }

  const expectedSignature = createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid or tampered token signature' };
  }

  try {
    const payload: MarketingUnsubscribeTokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    if (!payload.customerId || !payload.organizationId) {
      return { valid: false, error: 'Missing required token identifiers' };
    }

    return {
      valid: true,
      customerId: payload.customerId,
      organizationId: payload.organizationId,
      campaignId: payload.campaignId,
    };
  } catch {
    return { valid: false, error: 'Failed to decode token payload' };
  }
}

// ============================================================================
// EMAIL ENGAGEMENT TRACKING TOKENS (OPENS & CLICKS)
// ============================================================================

export interface MarketingTrackingTokenPayload {
  campaignId: string;
  recipientId: string;
  customerId?: string;
  createdAt: number;
}

/**
 * Generates an HMAC-SHA256 signed token for open tracking pixel and click redirect URLs.
 */
export function generateMarketingTrackingToken(
  campaignId: string,
  recipientId: string,
  customerId?: string
): string {
  const payload: MarketingTrackingTokenPayload = {
    campaignId: campaignId.trim(),
    recipientId: recipientId.trim(),
    customerId: customerId?.trim() || undefined,
    createdAt: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export interface VerifyMarketingTrackingResult {
  valid: boolean;
  campaignId?: string;
  recipientId?: string;
  customerId?: string;
  error?: string;
}

/**
 * Verifies the signature of a marketing tracking token.
 */
export function verifyMarketingTrackingToken(
  token: string
): VerifyMarketingTrackingResult {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Invalid token format' };
  }

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'Malformed token' };
  }

  const expectedSignature = createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid or tampered token signature' };
  }

  try {
    const payload: MarketingTrackingTokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    if (!payload.campaignId || !payload.recipientId) {
      return { valid: false, error: 'Missing required token identifiers' };
    }

    return {
      valid: true,
      campaignId: payload.campaignId,
      recipientId: payload.recipientId,
      customerId: payload.customerId,
    };
  } catch {
    return { valid: false, error: 'Failed to decode token payload' };
  }
}

