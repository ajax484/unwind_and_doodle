import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { setServiceSupabaseClient } from '@/lib/supabase/client';
import {
  generateMarketingTrackingToken,
  verifyMarketingTrackingToken,
} from '@/lib/marketing-token';
import {
  rewriteMarketingLinks,
  injectOpenTrackingPixel,
} from '@/services/marketing-dispatcher.service';
import { GET as openTrackHandler } from '@/app/api/marketing/track/open/route';
import { GET as clickTrackHandler } from '@/app/api/marketing/track/click/route';

describe('Native 1x1 Open Pixel & Click Redirect Tracking', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgId = 'org-11111111-1111-1111-1111-111111111111';
  const campId = 'camp-99999999-9999-9999-9999-999999999999';
  const recipId = 'recip-88888888-8888-8888-8888-888888888888';
  const customerId = 'cust-77777777-7777-7777-7777-777777777777';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle Org' }],
      marketing_campaigns: [
        {
          id: campId,
          organization_id: orgId,
          name: 'Spring Launch',
          status: 'sent',
          subject: 'Welcome Spring!',
        },
      ],
      marketing_campaign_recipients: [
        {
          id: recipId,
          campaign_id: campId,
          customer_id: customerId,
          email: 'sarah@example.com',
          status: 'sent',
          sent_at: '2026-09-12T10:00:00Z',
          delivered_at: null,
          opened_at: null,
          clicked_at: null,
          unsubscribed_at: null,
          error: null,
        },
      ],
      marketing_email_events: [],
    });

    setServiceSupabaseClient(mockSupabase as any);
  });

  // ============================================================================
  // 1. TOKEN GENERATION & VERIFICATION
  // ============================================================================
  describe('Tracking Token Cryptography', () => {
    it('generates and verifies valid HMAC-SHA256 tracking tokens', () => {
      const token = generateMarketingTrackingToken(campId, recipId, customerId);
      expect(typeof token).toBe('string');
      expect(token).toContain('.');

      const verified = verifyMarketingTrackingToken(token);
      expect(verified.valid).toBe(true);
      expect(verified.campaignId).toBe(campId);
      expect(verified.recipientId).toBe(recipId);
      expect(verified.customerId).toBe(customerId);
    });

    it('rejects tampered tokens', () => {
      const token = generateMarketingTrackingToken(campId, recipId, customerId);
      const [payload, sig] = token.split('.');
      const tampered = `${payload}.tampered_${sig.slice(9)}`;

      const verified = verifyMarketingTrackingToken(tampered);
      expect(verified.valid).toBe(false);
      expect(verified.error).toContain('Invalid or tampered');
    });

    it('rejects malformed or empty tokens', () => {
      expect(verifyMarketingTrackingToken('').valid).toBe(false);
      expect(verifyMarketingTrackingToken('no-dot-token').valid).toBe(false);
    });
  });

  // ============================================================================
  // 2. DISPATCHER HTML ENRICHMENT (PIXEL INJECTION & LINK REWRITING)
  // ============================================================================
  describe('Dispatcher HTML Enrichment', () => {
    const token = 'test-tracking-token-abc';
    const appUrl = 'https://unwindanddoodle.com';

    it('rewrites external links for click tracking while preserving anchors and unsubs', () => {
      const html = `
        <div>
          <a href="https://unwindanddoodle.com/products/bundle-kit" class="btn">Shop Now</a>
          <a href="#details">View Details</a>
          <a href="mailto:support@unwindanddoodle.com">Contact Us</a>
          <a href="https://unwindanddoodle.com/unsubscribe?token=xyz">Unsubscribe</a>
        </div>
      `;

      const rewritten = rewriteMarketingLinks(html, token, appUrl);

      // Rewritten product link
      expect(rewritten).toContain(
        `href="https://unwindanddoodle.com/api/marketing/track/click?token=${encodeURIComponent(
          token
        )}&url=${encodeURIComponent('https://unwindanddoodle.com/products/bundle-kit')}"`
      );

      // Preserved un-rewritten links
      expect(rewritten).toContain('href="#details"');
      expect(rewritten).toContain('href="mailto:support@unwindanddoodle.com"');
      expect(rewritten).toContain('href="https://unwindanddoodle.com/unsubscribe?token=xyz"');
    });

    it('injects 1x1 open tracking pixel before </body>', () => {
      const html = `<html><body><p>Hello world</p></body></html>`;
      const enriched = injectOpenTrackingPixel(html, token, appUrl);

      expect(enriched).toContain('<img src="https://unwindanddoodle.com/api/marketing/track/open?token=');
      expect(enriched).toContain('width="1" height="1"');
      expect(enriched).toContain('</body>');
    });

    it('appends open tracking pixel when no </body> tag is present', () => {
      const html = `<div>Simple email snippet</div>`;
      const enriched = injectOpenTrackingPixel(html, token, appUrl);

      expect(enriched).toContain(html);
      expect(enriched).toContain('<img src="https://unwindanddoodle.com/api/marketing/track/open?token=');
    });
  });

  // ============================================================================
  // 3. OPEN TRACKING PIXEL ENDPOINT
  // ============================================================================
  describe('GET /api/marketing/track/open', () => {
    it('records open event and returns transparent 1x1 GIF', async () => {
      const token = generateMarketingTrackingToken(campId, recipId, customerId);
      const req = new NextRequest(`http://localhost:3000/api/marketing/track/open?token=${token}`, {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
      });

      const res = await openTrackHandler(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/gif');
      expect(res.headers.get('cache-control')).toContain('no-store');

      const bodyBuffer = Buffer.from(await res.arrayBuffer());
      expect(bodyBuffer.length).toBe(42); // Standard 42-byte transparent GIF size

      // Verify recipient status transition in database
      const recipient = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipId
      );
      expect(recipient.status).toBe('opened');
      expect(recipient.opened_at).toBeTruthy();

      // Verify event was logged in marketing_email_events
      const events = (mockSupabase as any)._store.marketing_email_events;
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('opened');
      expect(events[0].campaign_id).toBe(campId);
      expect(events[0].campaign_recipient_id).toBe(recipId);
      expect(events[0].metadata.source).toBe('native_pixel');
    });

    it('returns transparent GIF safely even with missing or invalid token', async () => {
      const req = new NextRequest('http://localhost:3000/api/marketing/track/open?token=invalid.token');
      const res = await openTrackHandler(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('image/gif');
      const bodyBuffer = Buffer.from(await res.arrayBuffer());
      expect(bodyBuffer.length).toBe(42);
    });
  });

  // ============================================================================
  // 4. CLICK TRACKING REDIRECT ENDPOINT
  // ============================================================================
  describe('GET /api/marketing/track/click', () => {
    it('records click event and issues 302 redirect to target destination', async () => {
      const token = generateMarketingTrackingToken(campId, recipId, customerId);
      const target = 'https://unwindanddoodle.com/products/bundle-box';
      const req = new NextRequest(
        `http://localhost:3000/api/marketing/track/click?token=${token}&url=${encodeURIComponent(
          target
        )}`
      );

      const res = await clickTrackHandler(req);

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(target);

      // Verify recipient status transition to 'clicked'
      const recipient = (mockSupabase as any)._store.marketing_campaign_recipients.find(
        (r: any) => r.id === recipId
      );
      expect(recipient.status).toBe('clicked');
      expect(recipient.clicked_at).toBeTruthy();

      // Verify event logged
      const events = (mockSupabase as any)._store.marketing_email_events;
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('clicked');
      expect(events[0].metadata.target_url).toBe(target);
      expect(events[0].metadata.source).toBe('native_redirect');
    });

    it('sanitizes dangerous target URLs like javascript: and redirects safely to fallback', async () => {
      const token = generateMarketingTrackingToken(campId, recipId, customerId);
      const req = new NextRequest(
        `http://localhost:3000/api/marketing/track/click?token=${token}&url=javascript:alert(1)`
      );

      const res = await clickTrackHandler(req);

      expect(res.status).toBe(302);
      // Must not redirect to javascript:
      expect(res.headers.get('location')).toBe('http://localhost:3000/');
    });

    it('redirects to relative paths on application domain correctly', async () => {
      const token = generateMarketingTrackingToken(campId, recipId, customerId);
      const req = new NextRequest(
        `http://localhost:3000/api/marketing/track/click?token=${token}&url=/products`
      );

      const res = await clickTrackHandler(req);

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('http://localhost:3000/products');
    });
  });
});
