import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  MarketingRecipientStatus,
  MarketingCampaignRecipientUpdate,
} from '@/types/marketing';
import { verifyMarketingWebhookSignature } from './marketing-provider/webhook-verifier';
import {
  normalizeEmailWebhookPayload,
  canTransitionRecipientStatus,
  NormalizedEmailWebhookEvent,
} from './marketing-provider/webhook-normalizer';

export interface ProcessEmailWebhookOptions {
  supabase: SupabaseClient<Database>;
  rawBody: string;
  headers: Headers | Record<string, string | null | undefined>;
  webhookSecret?: string;
}

export interface ProcessedWebhookEventSummary {
  eventType: string;
  recipientId?: string;
  campaignId?: string;
  idempotentSkip?: boolean;
}

export interface ProcessEmailWebhookResult {
  success: boolean;
  message: string;
  processedCount: number;
  events: ProcessedWebhookEventSummary[];
}

/**
 * Handles incoming email provider webhooks with cryptographic signature verification,
 * event normalization, recipient correlation, idempotent deduplication,
 * non-regressing status updates, and customer unsubscribe consent updates.
 */
export async function processEmailWebhook(
  options: ProcessEmailWebhookOptions
): Promise<ProcessEmailWebhookResult> {
  const { supabase, rawBody, headers, webhookSecret } = options;

  // 1. Mandatory signature verification
  const isValid = verifyMarketingWebhookSignature({
    rawBody,
    headers,
    secret: webhookSecret,
  });

  if (!isValid) {
    throw new Error('Invalid email webhook signature');
  }

  // 2. Parse payload JSON
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    throw new Error('Malformed webhook JSON payload');
  }

  // 3. Normalize provider events
  const normalizedEvents = normalizeEmailWebhookPayload(parsedPayload);
  if (normalizedEvents.length === 0) {
    return {
      success: true,
      message: 'No actionable marketing events in payload',
      processedCount: 0,
      events: [],
    };
  }

  const processedEvents: ProcessedWebhookEventSummary[] = [];

  for (const ev of normalizedEvents) {
    // 4. Correlate Recipient
    let recipient = null;

    // Strategy A: Direct recipient ID match
    if (ev.recipientId) {
      const { data: rec } = await supabase
        .from('marketing_campaign_recipients')
        .select('*')
        .eq('id', ev.recipientId)
        .maybeSingle();

      recipient = rec;
    }

    // Strategy B: Match via provider_message_id in prior sent events
    if (!recipient && ev.providerMessageId) {
      const { data: matchedEvents } = await supabase
        .from('marketing_email_events')
        .select('campaign_recipient_id')
        .contains('metadata', { provider_message_id: ev.providerMessageId })
        .limit(1);

      if (matchedEvents && matchedEvents.length > 0 && matchedEvents[0].campaign_recipient_id) {
        const { data: rec } = await supabase
          .from('marketing_campaign_recipients')
          .select('*')
          .eq('id', matchedEvents[0].campaign_recipient_id)
          .maybeSingle();

        recipient = rec;
      }
    }

    // Strategy C: Match via campaign ID + email
    if (!recipient && ev.campaignId && ev.email) {
      const { data: rec } = await supabase
        .from('marketing_campaign_recipients')
        .select('*')
        .eq('campaign_id', ev.campaignId)
        .eq('email', ev.email)
        .maybeSingle();

      recipient = rec;
    }

    // If recipient cannot be identified, safely ignore event to prevent provider infinite retries
    if (!recipient) {
      console.warn('[email_webhook.unknown_recipient]', {
        eventType: ev.eventType,
        providerEventId: ev.providerEventId,
        providerMessageId: ev.providerMessageId,
      });

      processedEvents.push({
        eventType: ev.eventType,
        idempotentSkip: true,
      });
      continue;
    }

    // 5. Idempotency Check: check if event already recorded for this recipient and providerEventId
    const { data: existingEvents } = await supabase
      .from('marketing_email_events')
      .select('id, metadata')
      .eq('campaign_recipient_id', recipient.id)
      .eq('event_type', ev.eventType);

    const isDuplicate = existingEvents?.some((item) => {
      const meta = item.metadata as Record<string, unknown> | null;
      return meta?.provider_event_id === ev.providerEventId;
    });

    if (isDuplicate) {
      processedEvents.push({
        eventType: ev.eventType,
        recipientId: recipient.id,
        campaignId: recipient.campaign_id,
        idempotentSkip: true,
      });
      continue;
    }

    // 6. Record marketing_email_events
    const eventTimeIso = ev.occurredAt.toISOString();

    const { error: insertErr } = await supabase.from('marketing_email_events').insert({
      campaign_id: recipient.campaign_id,
      campaign_recipient_id: recipient.id,
      customer_id: recipient.customer_id,
      event_type: ev.eventType,
      metadata: ev.metadata as Json,
      occurred_at: eventTimeIso,
    });

    if (insertErr) {
      console.error('[email_webhook.event_insert_error]', insertErr);
    }

    // 7. Non-regressing Recipient Status Update & Milestones
    const targetStatus = ev.eventType as MarketingRecipientStatus;
    const recipientUpdate: MarketingCampaignRecipientUpdate = {};

    if (canTransitionRecipientStatus(recipient.status, targetStatus)) {
      recipientUpdate.status = targetStatus;
    }

    // Update milestone timestamps
    if (ev.eventType === 'delivered') {
      if (!recipient.delivered_at || new Date(eventTimeIso) < new Date(recipient.delivered_at)) {
        recipientUpdate.delivered_at = eventTimeIso;
      }
    } else if (ev.eventType === 'opened') {
      if (!recipient.opened_at || new Date(eventTimeIso) < new Date(recipient.opened_at)) {
        recipientUpdate.opened_at = eventTimeIso;
      }
      if (!recipient.delivered_at || new Date(eventTimeIso) < new Date(recipient.delivered_at)) {
        // Opening implies it was delivered
        recipientUpdate.delivered_at = eventTimeIso;
      }
    } else if (ev.eventType === 'clicked') {
      if (!recipient.clicked_at || new Date(eventTimeIso) < new Date(recipient.clicked_at)) {
        recipientUpdate.clicked_at = eventTimeIso;
      }
      if (!recipient.opened_at || new Date(eventTimeIso) < new Date(recipient.opened_at)) {
        recipientUpdate.opened_at = eventTimeIso;
      }
      if (!recipient.delivered_at || new Date(eventTimeIso) < new Date(recipient.delivered_at)) {
        recipientUpdate.delivered_at = eventTimeIso;
      }
    } else if (ev.eventType === 'unsubscribed') {
      if (!recipient.unsubscribed_at) {
        recipientUpdate.unsubscribed_at = eventTimeIso;
      }
    } else if (ev.eventType === 'bounced') {
      recipientUpdate.error =
        (ev.metadata.bounce_reason as string) ||
        (ev.metadata.error as string) ||
        'Email bounced';
    } else if (ev.eventType === 'failed') {
      recipientUpdate.error = (ev.metadata.error as string) || 'Delivery failed';
    }

    if (Object.keys(recipientUpdate).length > 0) {
      await supabase
        .from('marketing_campaign_recipients')
        .update(recipientUpdate)
        .eq('id', recipient.id);
    }

    // 8. Canonical Unsubscribe Sync
    if (ev.eventType === 'unsubscribed') {
      // Look up campaign to obtain organization_id
      const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('organization_id')
        .eq('id', recipient.campaign_id)
        .maybeSingle();

      if (recipient.customer_id) {
        await supabase
          .from('customers')
          .update({
            email_marketing_consent: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipient.customer_id);
      }

      if (campaign?.organization_id && recipient.email) {
        await supabase
          .from('customers')
          .update({
            email_marketing_consent: false,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', campaign.organization_id)
          .eq('email', recipient.email);
      }
    }

    processedEvents.push({
      eventType: ev.eventType,
      recipientId: recipient.id,
      campaignId: recipient.campaign_id,
      idempotentSkip: false,
    });
  }

  return {
    success: true,
    message: `Processed ${processedEvents.length} webhook event(s)`,
    processedCount: processedEvents.filter((e) => !e.idempotentSkip).length,
    events: processedEvents,
  };
}
