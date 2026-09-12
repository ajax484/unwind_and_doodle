import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { CampaignAnalytics } from '@/types/marketing';
import { getCampaignRecipientCounts } from './marketing-recipient.service';

/**
 * Computes campaign performance analytics and conversion rates directly from
 * marketing_campaign_recipients and marketing_email_events as the source of truth.
 *
 * Assumptions:
 * - `recipients`: Total number of target recipients created for the campaign.
 * - `sent`: Recipients who transitioned to sending/sent/delivered or beyond.
 * - `delivered`: Recipients whose delivery was confirmed (delivered, opened, clicked).
 * - `opened`: Recipients who opened the email (opened, clicked).
 * - `clicked`: Recipients who clicked a link in the email.
 * - `bounced`: Recipients whose message bounced.
 * - `failed`: Recipients whose dispatch encountered an unrecoverable failure.
 * - `unsubscribed`: Recipients who unsubscribed as a result of this campaign.
 *
 * Rates:
 * - deliveryRate = delivered / sent (0 if sent = 0)
 * - openRate = opened / delivered (0 if delivered = 0)
 * - clickRate = clicked / delivered (0 if delivered = 0)
 * - bounceRate = bounced / sent (0 if sent = 0)
 * - unsubscribeRate = unsubscribed / delivered (0 if delivered = 0)
 */
export async function getCampaignAnalytics(
  supabase: SupabaseClient<Database>,
  campaignId: string
): Promise<CampaignAnalytics> {
  if (!campaignId?.trim()) {
    throw new Error('Campaign ID is required to calculate analytics');
  }

  // Fetch recipients for milestone aggregation
  const { data: recipients, error: recipErr } = await supabase
    .from('marketing_campaign_recipients')
    .select('id, status, sent_at, delivered_at, opened_at, clicked_at, unsubscribed_at, error')
    .eq('campaign_id', campaignId);

  if (recipErr) {
    throw new Error(`Failed to fetch campaign recipients for analytics: ${recipErr.message}`);
  }

  const allRecipients = recipients || [];
  const totalRecipients = allRecipients.length;

  let sent = 0;
  let delivered = 0;
  let opened = 0;
  let clicked = 0;
  let bounced = 0;
  let failed = 0;
  let unsubscribed = 0;

  for (const r of allRecipients) {
    const isSent =
      Boolean(r.sent_at) ||
      ['sent', 'delivered', 'opened', 'clicked'].includes(r.status);

    const isDelivered =
      Boolean(r.delivered_at) ||
      ['delivered', 'opened', 'clicked'].includes(r.status);

    const isOpened =
      Boolean(r.opened_at) ||
      ['opened', 'clicked'].includes(r.status);

    const isClicked =
      Boolean(r.clicked_at) ||
      r.status === 'clicked';

    const isBounced = r.status === 'bounced';
    const isFailed = r.status === 'failed';
    const isUnsubscribed = Boolean(r.unsubscribed_at) || r.status === 'unsubscribed';

    if (isSent) sent++;
    if (isDelivered) delivered++;
    if (isOpened) opened++;
    if (isClicked) clicked++;
    if (isBounced) bounced++;
    if (isFailed) failed++;
    if (isUnsubscribed) unsubscribed++;
  }

  // Safe rate calculations with zero denominator guards
  const deliveryRate = sent > 0 ? Number((delivered / sent).toFixed(4)) : 0;
  const openRate = delivered > 0 ? Number((opened / delivered).toFixed(4)) : 0;
  const clickRate = delivered > 0 ? Number((clicked / delivered).toFixed(4)) : 0;
  const bounceRate = sent > 0 ? Number((bounced / sent).toFixed(4)) : 0;
  const unsubscribeRate = delivered > 0 ? Number((unsubscribed / delivered).toFixed(4)) : 0;

  return {
    recipients: totalRecipients,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    failed,
    unsubscribed,
    deliveryRate,
    openRate,
    clickRate,
    bounceRate,
    unsubscribeRate,
  };
}
