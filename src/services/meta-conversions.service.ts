import crypto from 'crypto';

export interface MetaUserDataInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
}

export interface MetaContentItem {
  id: string;
  quantity?: number;
  item_price?: number;
  title?: string;
  category?: string;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  contents?: MetaContentItem[];
  num_items?: number;
  order_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SendMetaEventParams {
  eventName: string;
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  userData?: MetaUserDataInput;
  customData?: MetaCustomData;
  actionSource?: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
}

export interface MetaConversionResponse {
  success: boolean;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
}

/**
 * Normalizes and hashes data with SHA-256 according to Meta Conversions API specifications.
 */
export function hashData(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

/**
 * Normalizes and hashes phone numbers according to Meta Conversions API specifications.
 * Removes symbols, dashes, parentheses, and leading plus signs.
 */
export function hashPhone(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return undefined;
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

/**
 * Builds the hashed user_data object for Meta Conversions API.
 */
export function buildMetaUserData(input?: MetaUserDataInput): Record<string, unknown> {
  if (!input) return {};

  const userData: Record<string, unknown> = {};

  const hashedEmail = hashData(input.email);
  if (hashedEmail) userData.em = [hashedEmail];

  const hashedPhone = hashPhone(input.phone);
  if (hashedPhone) userData.ph = [hashedPhone];

  const hashedFn = hashData(input.firstName);
  if (hashedFn) userData.fn = [hashedFn];

  const hashedLn = hashData(input.lastName);
  if (hashedLn) userData.ln = [hashedLn];

  const hashedCity = hashData(input.city);
  if (hashedCity) userData.ct = [hashedCity];

  const hashedState = hashData(input.state);
  if (hashedState) userData.st = [hashedState];

  const hashedZip = hashData(input.zip?.replace(/\s+/g, ''));
  if (hashedZip) userData.zp = [hashedZip];

  const hashedCountry = hashData(input.country);
  if (hashedCountry) userData.country = [hashedCountry];

  const hashedExternalId = hashData(input.externalId);
  if (hashedExternalId) userData.external_id = [hashedExternalId];

  if (input.clientIpAddress) {
    userData.client_ip_address = input.clientIpAddress;
  }
  if (input.clientUserAgent) {
    userData.client_user_agent = input.clientUserAgent;
  }
  if (input.fbp) {
    userData.fbp = input.fbp;
  }
  if (input.fbc) {
    userData.fbc = input.fbc;
  }

  return userData;
}

/**
 * Sends a server-side conversion event to Meta Conversions API (Graph API).
 */
export async function sendMetaConversionEvent(
  params: SendMetaEventParams
): Promise<MetaConversionResponse> {
  const pixelId =
    process.env.META_PIXEL_ID ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken =
    process.env.META_CONVERSIONS_API_ACCESS_TOKEN ||
    process.env.FACEBOOK_CONVERSIONS_API_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    return {
      success: false,
      error: 'Meta Pixel ID or Conversions API Access Token is not configured in environment',
    };
  }

  const eventTime = params.eventTime || Math.floor(Date.now() / 1000);
  const actionSource = params.actionSource || 'website';
  const userData = buildMetaUserData(params.userData);

  const eventPayload: Record<string, unknown> = {
    event_name: params.eventName,
    event_time: eventTime,
    action_source: actionSource,
    user_data: userData,
  };

  if (params.eventId) {
    eventPayload.event_id = params.eventId;
  }

  if (params.eventSourceUrl) {
    eventPayload.event_source_url = params.eventSourceUrl;
  }

  if (params.customData) {
    eventPayload.custom_data = params.customData;
  }

  const requestBody: Record<string, unknown> = {
    data: [eventPayload],
  };

  if (testEventCode) {
    requestBody.test_event_code = testEventCode;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();

    if (!response.ok) {
      console.warn(
        `[meta-conversions] Meta Conversions API Error (${response.status}):`,
        json.error?.message || json
      );
      return {
        success: false,
        error: json.error?.message || `HTTP ${response.status}`,
        fbtraceId: json.error?.fbtrace_id,
      };
    }

    return {
      success: true,
      eventsReceived: json.events_received,
      fbtraceId: json.fbtrace_id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown network error';
    console.warn('[meta-conversions] Exception while dispatching conversion event:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}
