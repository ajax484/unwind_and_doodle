import { MarketingEmailEventType, MarketingRecipientStatus } from '@/types/marketing';

export interface NormalizedEmailWebhookEvent {
  eventType: MarketingEmailEventType;
  providerEventId: string;
  providerMessageId?: string;
  recipientId?: string;
  campaignId?: string;
  customerId?: string;
  email?: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Priority rank for recipient delivery lifecycles.
 * Higher rank represents further progression down the funnel.
 */
const STATUS_PROGRESSION_RANK: Record<MarketingRecipientStatus, number> = {
  pending: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  failed: 6,
  bounced: 6,
  unsubscribed: 7,
};

/**
 * Determines whether a recipient status may transition to a new target status.
 *
 * Prevents out-of-order webhooks from regressing recipient states
 * (e.g., prevents 'delivered' arriving after 'opened' from downgrading status to 'delivered').
 */
export function canTransitionRecipientStatus(
  current: MarketingRecipientStatus,
  target: MarketingRecipientStatus
): boolean {
  if (current === target) {
    return false;
  }

  // Once unsubscribed, do not overwrite with delivery/engagement statuses
  if (current === 'unsubscribed') {
    return false;
  }

  // Unsubscribe can always be transitioned to from any prior status
  if (target === 'unsubscribed') {
    return true;
  }

  // If already engaged (opened or clicked), do not downgrade to failed or delivered
  if ((current === 'opened' || current === 'clicked') && (target === 'failed' || target === 'delivered' || target === 'sent')) {
    return false;
  }

  // If already delivered, do not downgrade to sent or pending
  if (current === 'delivered' && (target === 'sent' || target === 'pending' || target === 'sending')) {
    return false;
  }

  // For bounced / failed
  if (target === 'bounced' || target === 'failed') {
    return current === 'pending' || current === 'sending' || current === 'sent' || current === 'delivered';
  }

  // General progression comparison
  return STATUS_PROGRESSION_RANK[target] > STATUS_PROGRESSION_RANK[current];
}

/**
 * Normalizes an arbitrary raw event type string to canonical MarketingEmailEventType.
 */
export function normalizeEventType(rawType: string): MarketingEmailEventType | null {
  const clean = rawType.toLowerCase().trim().replace(/^email\./, '');

  switch (clean) {
    case 'sent':
    case 'send':
    case 'dispatch':
    case 'dispatched':
      return 'sent';
    case 'delivered':
    case 'delivery':
      return 'delivered';
    case 'opened':
    case 'open':
      return 'opened';
    case 'clicked':
    case 'click':
      return 'clicked';
    case 'bounced':
    case 'bounce':
    case 'hard_bounce':
    case 'soft_bounce':
    case 'hardbounce':
    case 'softbounce':
      return 'bounced';
    case 'failed':
    case 'failure':
    case 'rejected':
    case 'dropped':
      return 'failed';
    case 'unsubscribed':
    case 'unsubscribe':
    case 'complaint':
    case 'spam_complaint':
      return 'unsubscribed';
    default:
      return null;
  }
}

/**
 * Normalizes incoming provider webhook payloads (single object or array of events)
 * into a typed array of NormalizedEmailWebhookEvent objects.
 */
export function normalizeEmailWebhookPayload(payload: unknown): NormalizedEmailWebhookEvent[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const rawEvents: Record<string, unknown>[] = Array.isArray(payload)
    ? payload.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    : [payload as Record<string, unknown>];

  const results: NormalizedEmailWebhookEvent[] = [];

  for (const raw of rawEvents) {
    // Determine event type from common fields: 'event', 'type', 'event_type'
    const rawTypeString =
      typeof raw.event === 'string'
        ? raw.event
        : typeof raw.type === 'string'
        ? raw.type
        : typeof raw.event_type === 'string'
        ? raw.event_type
        : '';

    const eventType = normalizeEventType(rawTypeString);
    if (!eventType) {
      continue;
    }

    // Extract nested data if using wrapper objects (e.g. Resend data wrapper)
    const dataObj =
      raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : raw;

    // Provider Event ID
    const providerEventId =
      typeof raw.id === 'string'
        ? raw.id
        : typeof raw.event_id === 'string'
        ? raw.event_id
        : typeof dataObj.id === 'string'
        ? dataObj.id
        : typeof dataObj.event_id === 'string'
        ? dataObj.event_id
        : `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Provider Message ID
    const providerMessageId =
      typeof dataObj.message_id === 'string'
        ? dataObj.message_id
        : typeof dataObj.email_id === 'string'
        ? dataObj.email_id
        : typeof raw.sg_message_id === 'string'
        ? raw.sg_message_id
        : typeof raw.provider_message_id === 'string'
        ? raw.provider_message_id
        : undefined;

    // Headers or tags for correlation
    const tags = (dataObj.tags || raw.tags || {}) as Record<string, unknown>;
    const headers = (dataObj.headers || raw.headers || {}) as Record<string, unknown>;
    const metadataObj = (dataObj.metadata || raw.metadata || {}) as Record<string, unknown>;

    // Recipient ID (supports standard, custom headers, and Zoho ZeptoMail client_reference)
    const recipientId =
      typeof dataObj.recipient_id === 'string'
        ? dataObj.recipient_id
        : typeof raw.recipient_id === 'string'
        ? raw.recipient_id
        : typeof dataObj.client_reference === 'string'
        ? dataObj.client_reference
        : typeof raw.client_reference === 'string'
        ? raw.client_reference
        : typeof dataObj.client_ref === 'string'
        ? dataObj.client_ref
        : typeof raw.client_ref === 'string'
        ? raw.client_ref
        : typeof tags.recipient_id === 'string'
        ? tags.recipient_id
        : typeof metadataObj.recipient_id === 'string'
        ? metadataObj.recipient_id
        : typeof headers['x-tm-client-ref'] === 'string'
        ? (headers['x-tm-client-ref'] as string)
        : typeof headers['X-TM-CLIENT-REF'] === 'string'
        ? (headers['X-TM-CLIENT-REF'] as string)
        : typeof headers['x-campaign-recipient-id'] === 'string'
        ? (headers['x-campaign-recipient-id'] as string)
        : typeof headers['X-Campaign-Recipient-Id'] === 'string'
        ? (headers['X-Campaign-Recipient-Id'] as string)
        : undefined;

    // Campaign ID
    const campaignId =
      typeof dataObj.campaign_id === 'string'
        ? dataObj.campaign_id
        : typeof raw.campaign_id === 'string'
        ? raw.campaign_id
        : typeof tags.campaign_id === 'string'
        ? tags.campaign_id
        : typeof metadataObj.campaign_id === 'string'
        ? metadataObj.campaign_id
        : typeof headers['x-campaign-id'] === 'string'
        ? (headers['x-campaign-id'] as string)
        : typeof headers['X-Campaign-Id'] === 'string'
        ? (headers['X-Campaign-Id'] as string)
        : undefined;

    // Customer ID
    const customerId =
      typeof dataObj.customer_id === 'string'
        ? dataObj.customer_id
        : typeof raw.customer_id === 'string'
        ? raw.customer_id
        : typeof tags.customer_id === 'string'
        ? tags.customer_id
        : typeof metadataObj.customer_id === 'string'
        ? metadataObj.customer_id
        : typeof headers['x-customer-id'] === 'string'
        ? (headers['x-customer-id'] as string)
        : typeof headers['X-Customer-Id'] === 'string'
        ? (headers['X-Customer-Id'] as string)
        : undefined;

    // Email
    const rawTo = dataObj.to || raw.to || dataObj.email || raw.email || raw.recipient;
    const email = Array.isArray(rawTo)
      ? typeof rawTo[0] === 'string'
        ? rawTo[0]
        : undefined
      : typeof rawTo === 'string'
      ? rawTo
      : undefined;

    // Timestamp
    let occurredAt = new Date();
    const rawTimestamp =
      dataObj.created_at ||
      raw.created_at ||
      dataObj.timestamp ||
      raw.timestamp ||
      dataObj.occurred_at ||
      raw.occurred_at;

    if (rawTimestamp) {
      if (typeof rawTimestamp === 'number') {
        // Handle unix timestamp in seconds vs milliseconds
        occurredAt = new Date(rawTimestamp > 1e11 ? rawTimestamp : rawTimestamp * 1000);
      } else if (typeof rawTimestamp === 'string') {
        const parsed = new Date(rawTimestamp);
        if (!isNaN(parsed.getTime())) {
          occurredAt = parsed;
        }
      }
    }

    // Build sanitised metadata
    const metadata: Record<string, unknown> = {
      provider_event_id: providerEventId,
      provider_raw_type: rawTypeString,
    };

    if (providerMessageId) {
      metadata.provider_message_id = providerMessageId;
    }

    // Click link URL
    const clickObj = (dataObj.click || raw.click) as Record<string, unknown> | undefined;
    const linkUrl = clickObj?.link || dataObj.url || raw.url || dataObj.link;
    if (typeof linkUrl === 'string') {
      metadata.link_url = linkUrl;
    }

    // Bounce category / reason
    const bounceObj = (dataObj.bounce || raw.bounce) as Record<string, unknown> | undefined;
    const bounceReason = bounceObj?.message || bounceObj?.reason || dataObj.reason || raw.reason;
    if (typeof bounceReason === 'string') {
      metadata.bounce_reason = bounceReason;
    }

    // Error info
    const errorMsg = dataObj.error || raw.error;
    if (typeof errorMsg === 'string') {
      metadata.error = errorMsg;
    }

    results.push({
      eventType,
      providerEventId,
      providerMessageId,
      recipientId,
      campaignId,
      customerId,
      email: email ? email.toLowerCase().trim() : undefined,
      occurredAt,
      metadata,
    });
  }

  return results;
}
