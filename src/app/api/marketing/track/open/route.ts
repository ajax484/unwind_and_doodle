import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { verifyMarketingTrackingToken } from '@/lib/marketing-token';
import { canTransitionRecipientStatus } from '@/services/marketing-provider/webhook-normalizer';
import { MarketingCampaignRecipientUpdate } from '@/types/marketing';

// 43-byte valid transparent 1x1 GIF binary
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const TRACKING_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * Native 1x1 open tracking pixel endpoint for marketing emails.
 *
 * Verifies signed tracking token, records open event in marketing_email_events,
 * updates recipient status/opened_at milestone, and returns transparent GIF.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(TRANSPARENT_1X1_GIF, {
        status: 200,
        headers: TRACKING_HEADERS,
      });
    }

    const verified = verifyMarketingTrackingToken(token);
    if (!verified.valid || !verified.recipientId || !verified.campaignId) {
      return new NextResponse(TRANSPARENT_1X1_GIF, {
        status: 200,
        headers: TRACKING_HEADERS,
      });
    }

    const supabase = getServiceSupabaseClient();

    // 1. Fetch recipient to check current status
    const { data: recipient } = await supabase
      .from('marketing_campaign_recipients')
      .select('id, campaign_id, status, opened_at, customer_id')
      .eq('id', verified.recipientId)
      .eq('campaign_id', verified.campaignId)
      .maybeSingle();

    if (recipient) {
      const now = new Date().toISOString();
      const updates: MarketingCampaignRecipientUpdate = {};

      if (!recipient.opened_at) {
        updates.opened_at = now;
      }

      if (canTransitionRecipientStatus(recipient.status, 'opened')) {
        updates.status = 'opened';
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('marketing_campaign_recipients')
          .update(updates)
          .eq('id', recipient.id);
      }

      // Record 'opened' event
      await supabase.from('marketing_email_events').insert({
        campaign_id: verified.campaignId,
        campaign_recipient_id: recipient.id,
        customer_id: recipient.customer_id || verified.customerId || null,
        event_type: 'opened',
        metadata: {
          source: 'native_pixel',
          user_agent: req.headers.get('user-agent') || undefined,
        },
        occurred_at: now,
      });
    }

    return new NextResponse(TRANSPARENT_1X1_GIF, {
      status: 200,
      headers: TRACKING_HEADERS,
    });
  } catch (error) {
    console.error('[marketing_track.open_error]', error);
    // Always return GIF to prevent broken image placeholders in email client
    return new NextResponse(TRANSPARENT_1X1_GIF, {
      status: 200,
      headers: TRACKING_HEADERS,
    });
  }
}
