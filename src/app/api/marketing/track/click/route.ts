import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { verifyMarketingTrackingToken } from '@/lib/marketing-token';
import { canTransitionRecipientStatus } from '@/services/marketing-provider/webhook-normalizer';
import { getConfig } from '@/lib/config';
import { MarketingCampaignRecipientUpdate } from '@/types/marketing';

/**
 * Validates that a target URL is safe for redirection (prevents open redirects and javascript: injection).
 */
function sanitizeTargetUrl(rawUrl: string | null, fallbackUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallbackUrl;
  }

  const trimmed = rawUrl.trim();

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return fallbackUrl;
  }

  // Allow relative paths on same domain
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return new URL(trimmed, fallbackUrl).toString();
  }

  // Validate absolute URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Malformed URL
  }

  return fallbackUrl;
}

/**
 * Native click tracking redirect endpoint for marketing campaigns.
 *
 * Verifies signed tracking token, records click event in marketing_email_events,
 * updates recipient status/clicked_at milestone, and issues a 302 redirect.
 */
export async function GET(req: NextRequest) {
  const { appUrl } = getConfig();
  const fallbackUrl = appUrl || 'http://localhost:3000';

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const rawTargetUrl = searchParams.get('url');

  const destination = sanitizeTargetUrl(rawTargetUrl, fallbackUrl);

  try {
    if (!token) {
      return NextResponse.redirect(destination, 302);
    }

    const verified = verifyMarketingTrackingToken(token);
    if (!verified.valid || !verified.recipientId || !verified.campaignId) {
      return NextResponse.redirect(destination, 302);
    }

    const supabase = getServiceSupabaseClient();

    // 1. Fetch recipient
    const { data: recipient } = await supabase
      .from('marketing_campaign_recipients')
      .select('id, campaign_id, status, clicked_at, customer_id')
      .eq('id', verified.recipientId)
      .eq('campaign_id', verified.campaignId)
      .maybeSingle();

    if (recipient) {
      const now = new Date().toISOString();
      const updates: MarketingCampaignRecipientUpdate = {};

      if (!recipient.clicked_at) {
        updates.clicked_at = now;
      }

      if (canTransitionRecipientStatus(recipient.status, 'clicked')) {
        updates.status = 'clicked';
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('marketing_campaign_recipients')
          .update(updates)
          .eq('id', recipient.id);
      }

      // Record 'clicked' event
      await supabase.from('marketing_email_events').insert({
        campaign_id: verified.campaignId,
        campaign_recipient_id: recipient.id,
        customer_id: recipient.customer_id || verified.customerId || null,
        event_type: 'clicked',
        metadata: {
          source: 'native_redirect',
          target_url: destination,
          user_agent: req.headers.get('user-agent') || undefined,
        },
        occurred_at: now,
      });
    }

    return NextResponse.redirect(destination, 302);
  } catch (error) {
    console.error('[marketing_track.click_error]', error);
    return NextResponse.redirect(destination, 302);
  }
}
