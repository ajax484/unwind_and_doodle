import { createHmac, randomBytes } from 'crypto';
import { getConfig } from './config';

const TOKEN_SECRET = process.env.ORDER_TOKEN_SECRET || getConfig().supabaseServiceRoleKey || 'unwind-order-token-secret';

export interface OrderAccessTokenPayload {
  orderNumber: string;
  email: string;
  expiresAt: number; // unix timestamp in ms
}

/**
 * Generates a signed token for guest order access.
 * Valid for 7 days by default.
 */
export function generateOrderAccessToken(
  orderNumber: string,
  email: string,
  expiresInDays: number = 7
): string {
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const payload: OrderAccessTokenPayload = {
    orderNumber: orderNumber.trim(),
    email: email.trim().toLowerCase(),
    expiresAt,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Validates a signed order access token and ensures it has not expired
 * and matches the requested order number and optionally email.
 */
export function verifyOrderAccessToken(
  token: string,
  expectedOrderNumber: string,
  expectedEmail?: string
): { valid: boolean; email?: string; error?: string } {
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
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payload: OrderAccessTokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Token has expired' };
    }

    if (payload.orderNumber.toUpperCase() !== expectedOrderNumber.trim().toUpperCase()) {
      return { valid: false, error: 'Token does not match order' };
    }

    if (
      expectedEmail &&
      payload.email.toLowerCase() !== expectedEmail.trim().toLowerCase()
    ) {
      return { valid: false, error: 'Token email does not match' };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false, error: 'Failed to parse token payload' };
  }
}
