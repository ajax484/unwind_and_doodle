import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  MarketingCampaign,
  MarketingRecipientStatus,
} from '@/types/marketing';
import {
  getCampaignById,
  validateCampaignForDelivery,
} from './marketing-campaign.service';
import { getSegmentCustomers } from './marketing-segmentation.service';
import { getMarketingEmailProvider } from './marketing-provider/nodemailer-marketing.provider';
import { sanitizeHtml, replacePersonalizationTags } from '@/lib/sanitize-html';
import { resolveMarketingContext } from './marketing-context.service';
import { renderMarketingTemplate } from './marketing-renderer.service';
import { MarketingContext } from '@/types/marketing-context';
import {
  generateMarketingUnsubscribeToken,
  generateMarketingTrackingToken,
} from '@/lib/marketing-token';
import { getConfig } from '@/lib/config';

/**
 * Rewrites <a href="..."> links in email HTML to route through the native click tracking redirect.
 * Skips mailto:, tel:, in-page hashes (#), and unsubscribe URLs.
 */
export function rewriteMarketingLinks(
  html: string,
  trackingToken: string,
  appUrl: string
): string {
  if (!html || !trackingToken || !appUrl) return html;

  return html.replace(
    /<a\b([^>]*?)\bhref=(["'])(.*?)\2([^>]*?)>/gi,
    (match, beforeHref, quote, targetUrl, afterHref) => {
      const trimmed = targetUrl.trim();
      const lower = trimmed.toLowerCase();

      // Skip in-page anchors, mailto, tel, javascript, and unsubscribe URLs
      if (
        trimmed.startsWith('#') ||
        lower.startsWith('mailto:') ||
        lower.startsWith('tel:') ||
        lower.startsWith('javascript:') ||
        lower.includes('/unsubscribe')
      ) {
        return match;
      }

      // Encode target URL and wrap in click tracking endpoint
      const trackingUrl = `${appUrl}/api/marketing/track/click?token=${encodeURIComponent(
        trackingToken
      )}&url=${encodeURIComponent(trimmed)}`;

      return `<a${beforeHref}href=${quote}${trackingUrl}${quote}${afterHref}>`;
    }
  );
}

/**
 * Injects a 1x1 transparent tracking pixel image into email HTML before </body> or at the end.
 */
export function injectOpenTrackingPixel(
  html: string,
  trackingToken: string,
  appUrl: string
): string {
  if (!html || !trackingToken || !appUrl) return html;

  const pixelUrl = `${appUrl}/api/marketing/track/open?token=${encodeURIComponent(trackingToken)}`;
  const pixelImg = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;max-height:0;overflow:hidden;border:0;outline:0;" />`;

  if (html.toLowerCase().includes('</body>')) {
    return html.replace(/<\/body>/i, `${pixelImg}</body>`);
  }

  return `${html}\n${pixelImg}`;
}

export interface TestEmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface CampaignDispatchSummary {
  success: boolean;
  campaignId: string;
  processed: number;
  sent: number;
  failed: number;
  message?: string;
}

/**
 * Dispatches a single test email without creating recipient records or analytics events.
 */
export async function sendTestEmail(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  campaignId: string,
  recipientEmail: string
): Promise<TestEmailDispatchResult> {
  const campaign = await getCampaignById(supabase, organizationId, campaignId);
  if (!campaign) {
    return { success: false, error: 'Campaign not found for this organization.' };
  }

  // Validate campaign fields without requiring audience segment for single test sends
  const validation = validateCampaignForDelivery(campaign, { requireSegment: false });
  if (!validation.valid) {
    return {
      success: false,
      error: `Campaign validation failed: ${validation.errors.join(', ')}`,
    };
  }

  const content = campaign.content as { html?: string; text?: string } | null;
  const rawHtml = content?.html || '';

  const sampleContext: MarketingContext = {
    firstName: 'Test',
    lastName: 'Recipient',
    email: recipientEmail,
    orderNumber: 'ORD-TEST-1001',
    productName: 'General-Themed Colouring Book',
    lastProduct: 'General-Themed Colouring Book',
    productRecommendation: {
      productId: 'sample-rec',
      productFamily: 'ultimate_game_book',
      title: 'Ultimate Game Book',
      url: `${getConfig().appUrl}/products/ultimate-game-book`,
      recommendationText:
        'If you enjoyed colouring but want more variety, try the Ultimate Game Book. It gives you puzzles, word games, brain teasers and other screen-free activities for the days you do not feel like colouring.',
    },
    personalizedRecommendation: {
      productId: 'sample-rec',
      productFamily: 'ultimate_game_book',
      title: 'Ultimate Game Book',
      url: `${getConfig().appUrl}/products/ultimate-game-book`,
      recommendationText:
        'Try the Ultimate Game Book or Play and Color Kit when you want puzzles and games alongside colouring.',
    },
  };

  let renderedHtml = renderMarketingTemplate(rawHtml, sampleContext, { isHtml: true });

  // Append sample unsubscribe text for completeness
  if (!renderedHtml.includes('unsubscribe') && !renderedHtml.includes('Unsubscribe')) {
    renderedHtml += `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
        <p>This is a test marketing email sent from Unwind &amp; Doodle.</p>
        <p><a href="#" style="color: #6b7280; text-decoration: underline;">Unsubscribe link placeholder</a></p>
      </div>
    `;
  }

  const provider = getMarketingEmailProvider();
  const result = await provider.sendEmail({
    to: recipientEmail,
    subject: `[Test] ${renderMarketingTemplate(campaign.subject || '', sampleContext, { isHtml: false })}`,
    senderName: campaign.sender_name || 'Unwind & Doodle',
    senderEmail: campaign.sender_email || 'no-reply@unwindanddoodle.com',
    html: renderedHtml,
    text: content?.text ? renderMarketingTemplate(content.text, sampleContext, { isHtml: false }) : undefined,
  });

  return result;
}

/**
 * Dispatches an entire email campaign with audience resolution, consent checks,
 * recipient snapshotting, batch delivery, and idempotency protection.
 */
export async function dispatchCampaign(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  campaignId: string
): Promise<CampaignDispatchSummary> {
  // 1. Fetch and validate campaign
  const campaign = await getCampaignById(supabase, organizationId, campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found for this organization`);
  }

  const validation = validateCampaignForDelivery(campaign);
  if (!validation.valid) {
    throw new Error(`Campaign validation failed: ${validation.errors.join(', ')}`);
  }

  // 2. Atomic state transition to 'sending' to lock against race conditions
  const { data: lockedCampaign, error: lockError } = await supabase
    .from('marketing_campaigns')
    .update({
      status: 'sending',
      started_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('organization_id', organizationId)
    .in('status', ['draft', 'scheduled'])
    .select()
    .maybeSingle();

  if (lockError || !lockedCampaign) {
    throw new Error(
      `Campaign ${campaignId} is not in a sendable state (current status: ${campaign.status})`
    );
  }

  // 3. Dynamically re-evaluate audience from segmentation engine (enforces email_marketing_consent = true)
  const cohort = await getSegmentCustomers(supabase, organizationId, campaign.segment_id!);

  if (cohort.length === 0) {
    // Revert status to draft if no eligible customers match
    await supabase
      .from('marketing_campaigns')
      .update({ status: 'draft', started_at: null })
      .eq('id', campaignId);

    throw new Error(
      'Cannot send campaign: no eligible recipients found matching the segment with active marketing consent.'
    );
  }

  // 4. Snapshot recipients in marketing_campaign_recipients
  const recipientPayloads = cohort.map((customer) => ({
    campaign_id: campaignId,
    customer_id: customer.id,
    email: customer.email.trim().toLowerCase(),
    status: 'pending' as MarketingRecipientStatus,
  }));

  // Insert recipient records (ignoring duplicates via unique constraint on campaign_id, email)
  const { error: insertErr } = await supabase
    .from('marketing_campaign_recipients')
    .upsert(recipientPayloads, {
      onConflict: 'campaign_id,email',
      ignoreDuplicates: true,
    });

  if (insertErr) {
    console.error('[campaign_dispatch.recipient_snapshot_error]', insertErr);
    // Continue if rows already exist
  }

  // 5. Query all pending recipients for this campaign
  const { data: pendingRecipients, error: fetchPendingErr } = await supabase
    .from('marketing_campaign_recipients')
    .select('id, customer_id, email, status')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  if (fetchPendingErr || !pendingRecipients || pendingRecipients.length === 0) {
    // If no pending recipients found, evaluate if all already processed
    const { count: sentCount } = await supabase
      .from('marketing_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'sent');

    const finalStatus = (sentCount || 0) > 0 ? 'sent' : 'failed';
    await supabase
      .from('marketing_campaigns')
      .update({ status: finalStatus, completed_at: new Date().toISOString() })
      .eq('id', campaignId);

    return {
      success: finalStatus === 'sent',
      campaignId,
      processed: 0,
      sent: sentCount || 0,
      failed: 0,
      message: 'No pending recipients to process',
    };
  }

  // Map of customer ID to customer details for personalization
  const customerMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  for (const c of cohort) {
    customerMap.set(c.id, { first_name: c.first_name, last_name: c.last_name });
  }

  const { appUrl } = getConfig();
  const provider = getMarketingEmailProvider();
  const content = campaign.content as { html?: string; text?: string } | null;
  const baseHtml = content?.html || '';
  const baseText = content?.text || '';

  let sentCount = 0;
  let failedCount = 0;

  // 6. Process recipients in controlled batches
  const BATCH_SIZE = 25;
  for (let i = 0; i < pendingRecipients.length; i += BATCH_SIZE) {
    const batch = pendingRecipients.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (recipient) => {
        // Transition to 'sending'
        await supabase
          .from('marketing_campaign_recipients')
          .update({ status: 'sending' })
          .eq('id', recipient.id);

        const customerInfo = recipient.customer_id
          ? customerMap.get(recipient.customer_id)
          : null;

        const marketingContext = await resolveMarketingContext(supabase, {
          organizationId,
          customerId: recipient.customer_id,
          customerEmail: recipient.email,
          campaignId,
        });

        // Ensure customer names from batch map take priority if resolver didn't load them
        if (!marketingContext.firstName && customerInfo?.first_name) {
          marketingContext.firstName = customerInfo.first_name;
        }
        if (!marketingContext.lastName && customerInfo?.last_name) {
          marketingContext.lastName = customerInfo.last_name;
        }

        // Generate signed unsubscribe link
        const unsubscribeToken = generateMarketingUnsubscribeToken(
          recipient.customer_id || '',
          organizationId,
          campaignId
        );
        const unsubscribeUrl = `${appUrl}/unsubscribe?token=${unsubscribeToken}`;

        // Personalize and sanitize HTML
        let personalizedHtml = renderMarketingTemplate(baseHtml, marketingContext, { isHtml: true });

        // Append unsubscribe footer
        const unsubscribeFooter = `
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; font-family: sans-serif;">
            <p>You received this email because you subscribed to updates from ${campaign.sender_name || 'Unwind & Doodle'}.</p>
            <p><a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from marketing emails</a></p>
          </div>
        `;
        personalizedHtml += unsubscribeFooter;

        // Generate signed tracking token for open pixel and click redirects
        const trackingToken = generateMarketingTrackingToken(
          campaignId,
          recipient.id,
          recipient.customer_id || undefined
        );

        // Rewrite outbound links for native click tracking (skipping unsubscribe URL)
        personalizedHtml = rewriteMarketingLinks(personalizedHtml, trackingToken, appUrl);

        // Inject 1x1 transparent open tracking pixel
        personalizedHtml = injectOpenTrackingPixel(personalizedHtml, trackingToken, appUrl);

        const personalizedText = baseText
          ? `${renderMarketingTemplate(baseText, marketingContext, { isHtml: false })}\n\nUnsubscribe: ${unsubscribeUrl}`
          : undefined;

        // Deliver via provider
        const sendResult = await provider.sendEmail({
          to: recipient.email,
          subject: renderMarketingTemplate(campaign.subject || '', marketingContext, { isHtml: false }),
          senderName: campaign.sender_name || 'Unwind & Doodle',
          senderEmail: campaign.sender_email || 'no-reply@unwindanddoodle.com',
          html: personalizedHtml,
          text: personalizedText,
          headers: {
            'X-Campaign-Id': campaignId,
            'X-Campaign-Recipient-Id': recipient.id,
            'X-Customer-Id': recipient.customer_id || '',
            'X-TM-CLIENT-REF': recipient.id,
          },
          tags: {
            campaign_id: campaignId,
            recipient_id: recipient.id,
          },
        });

        if (sendResult.success) {
          sentCount++;
          const now = new Date().toISOString();

          // Mark recipient sent
          await supabase
            .from('marketing_campaign_recipients')
            .update({
              status: 'sent',
              sent_at: now,
              error: null,
            })
            .eq('id', recipient.id);

          // Record 'sent' event with provider message ID
          await supabase.from('marketing_email_events').insert({
            campaign_id: campaignId,
            campaign_recipient_id: recipient.id,
            customer_id: recipient.customer_id,
            event_type: 'sent',
            metadata: {
              provider_message_id: sendResult.providerMessageId || null,
            },
            occurred_at: now,
          });
        } else {
          failedCount++;
          await supabase
            .from('marketing_campaign_recipients')
            .update({
              status: 'failed',
              error: sendResult.error || 'Failed to dispatch email',
            })
            .eq('id', recipient.id);

          await supabase.from('marketing_email_events').insert({
            campaign_id: campaignId,
            campaign_recipient_id: recipient.id,
            customer_id: recipient.customer_id,
            event_type: 'failed',
            metadata: {
              error: sendResult.error || 'Provider rejected email',
            },
            occurred_at: new Date().toISOString(),
          });
        }
      })
    );
  }

  // 7. Update final campaign status
  const finalStatus = sentCount > 0 ? 'sent' : 'failed';
  await supabase
    .from('marketing_campaigns')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  return {
    success: finalStatus === 'sent',
    campaignId,
    processed: pendingRecipients.length,
    sent: sentCount,
    failed: failedCount,
  };
}

/**
 * Finds all due scheduled campaigns across organizations and dispatches them.
 * Supports bounded batching and protects against concurrent dispatcher execution.
 */
export async function dispatchDueScheduledCampaigns(
  supabase: SupabaseClient<Database>,
  options?: { limit?: number; organizationId?: string }
): Promise<CampaignDispatchSummary[]> {
  const now = new Date().toISOString();
  const limit = options?.limit || 10;

  let query = supabase
    .from('marketing_campaigns')
    .select('id, organization_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (options?.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }

  const { data: dueCampaigns, error } = await query;

  if (error || !dueCampaigns || dueCampaigns.length === 0) {
    return [];
  }

  const results: CampaignDispatchSummary[] = [];

  for (const camp of dueCampaigns) {
    try {
      const summary = await dispatchCampaign(supabase, camp.organization_id, camp.id);
      results.push(summary);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Execution failed';
      // If another concurrent worker claimed and changed status, don't count as failure
      if (errorMsg.includes('not in a sendable state')) {
        console.info(`[dispatch_due_campaign.concurrent_skip] id=${camp.id}`);
        continue;
      }

      console.error(`[dispatch_due_campaign.error] id=${camp.id}`, err);
      results.push({
        success: false,
        campaignId: camp.id,
        processed: 0,
        sent: 0,
        failed: 0,
        message: errorMsg,
      });
    }
  }

  return results;
}
