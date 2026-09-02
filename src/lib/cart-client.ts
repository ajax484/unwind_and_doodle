import { CartResponse } from '@/services/cart.service';

const CART_SESSION_KEY = 'uad_cart_session';

/**
 * Gets the current cart session ID stored in browser localStorage.
 */
export function getClientCartSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CART_SESSION_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Persists the cart session ID in browser localStorage.
 */
export function setClientCartSessionId(sessionId: string): void {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    const trimmed = sessionId.trim();
    if (trimmed) {
      localStorage.setItem(CART_SESSION_KEY, trimmed);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Builds HTTP headers including JSON content-type and the current x-cart-session header.
 */
export function getCartHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  const sessionId = getClientCartSessionId();
  if (sessionId) {
    headers['x-cart-session'] = sessionId;
  }

  return headers;
}

/**
 * Dispatches cart update events with optional detailed cart payload.
 */
export function dispatchCartUpdated(cart?: CartResponse, openDrawer: boolean = false): void {
  if (typeof window === 'undefined') return;

  if (cart?.sessionId) {
    setClientCartSessionId(cart.sessionId);
  }

  const detail = cart ? { cart } : undefined;

  window.dispatchEvent(new CustomEvent('cart-updated', { detail }));

  if (openDrawer) {
    window.dispatchEvent(new CustomEvent('open-cart-drawer', { detail }));
  }
}
