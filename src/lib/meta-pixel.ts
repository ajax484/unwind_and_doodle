/**
 * Meta (Facebook) Pixel Client-Side Utilities
 * Provides safe event tracking helpers with deduplication support (event_id).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

/**
 * Checks whether Meta Pixel is available and initialized on window.
 */
export function isPixelAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Fires a standard Meta Pixel event.
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  if (!isPixelAvailable()) return;

  try {
    if (eventId) {
      window.fbq!('track', eventName, params || {}, { eventID: eventId });
    } else if (params) {
      window.fbq!('track', eventName, params);
    } else {
      window.fbq!('track', eventName);
    }
  } catch (err) {
    console.warn(`[meta-pixel] Failed to track event '${eventName}':`, err);
  }
}

/**
 * Fires a custom Meta Pixel event.
 */
export function trackMetaCustomEvent(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  if (!isPixelAvailable()) return;

  try {
    if (eventId) {
      window.fbq!('trackCustom', eventName, params || {}, { eventID: eventId });
    } else if (params) {
      window.fbq!('trackCustom', eventName, params);
    } else {
      window.fbq!('trackCustom', eventName);
    }
  } catch (err) {
    console.warn(`[meta-pixel] Failed to track custom event '${eventName}':`, err);
  }
}

/**
 * Tracks a PageView event on the client.
 */
export function trackPageView(eventId?: string): void {
  trackMetaEvent('PageView', undefined, eventId);
}

/**
 * Standard ViewContent Event
 */
export function trackViewContent(
  data: {
    content_name?: string;
    content_ids?: string[];
    content_type?: string;
    value?: number;
    currency?: string;
  },
  eventId?: string
): void {
  trackMetaEvent(
    'ViewContent',
    {
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      value: data.value,
      currency: data.currency || 'NGN',
    },
    eventId
  );
}

/**
 * Standard AddToCart Event
 */
export function trackAddToCart(
  data: {
    content_name?: string;
    content_ids?: string[];
    content_type?: string;
    value?: number;
    currency?: string;
  },
  eventId?: string
): void {
  trackMetaEvent(
    'AddToCart',
    {
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      value: data.value,
      currency: data.currency || 'NGN',
    },
    eventId
  );
}

/**
 * Standard InitiateCheckout Event
 */
export function trackInitiateCheckout(
  data: {
    num_items?: number;
    value?: number;
    currency?: string;
    content_ids?: string[];
  },
  eventId?: string
): void {
  trackMetaEvent(
    'InitiateCheckout',
    {
      num_items: data.num_items,
      value: data.value,
      currency: data.currency || 'NGN',
      content_ids: data.content_ids,
    },
    eventId
  );
}

/**
 * Standard Purchase Event
 */
export function trackPurchase(
  data: {
    value: number;
    currency?: string;
    content_name?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
    order_id?: string;
  },
  eventId?: string
): void {
  trackMetaEvent(
    'Purchase',
    {
      value: data.value,
      currency: data.currency || 'NGN',
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      num_items: data.num_items,
      order_id: data.order_id,
    },
    eventId
  );
}
