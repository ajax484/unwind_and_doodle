import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hashData,
  hashPhone,
  buildMetaUserData,
  sendMetaConversionEvent,
} from '@/services/meta-conversions.service';
import {
  trackMetaEvent,
  trackMetaCustomEvent,
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  isPixelAvailable,
} from '@/lib/meta-pixel';

describe('Meta Conversions API & Hashing Helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('hashData & hashPhone', () => {
    it('returns undefined for empty or missing inputs', () => {
      expect(hashData(undefined)).toBeUndefined();
      expect(hashData('')).toBeUndefined();
      expect(hashData('   ')).toBeUndefined();
      expect(hashPhone(undefined)).toBeUndefined();
      expect(hashPhone('')).toBeUndefined();
      expect(hashPhone('---')).toBeUndefined();
    });

    it('hashes lowercase trimmed emails with SHA-256', () => {
      const email = ' Test@Example.com ';
      const hashed = hashData(email);
      // SHA-256 for 'test@example.com'
      expect(hashed).toBe('973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b');
    });

    it('normalizes and hashes phone numbers', () => {
      const phone = '+234 (801) 234-5678';
      const hashed = hashPhone(phone);
      // Cleaned digits: '2348012345678'
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed?.length).toBe(64); // SHA-256 hex length
    });
  });

  describe('buildMetaUserData', () => {
    it('constructs hashed arrays for user data fields', () => {
      const userData = buildMetaUserData({
        email: 'user@test.com',
        phone: '+2348012345678',
        firstName: 'Ada',
        lastName: 'Lovelace',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG',
        clientIpAddress: '127.0.0.1',
        clientUserAgent: 'Mozilla/5.0',
        fbp: 'fb.1.12345.6789',
        fbc: 'fb.1.12345.clickid',
      });

      expect(userData.em).toBeDefined();
      expect(Array.isArray(userData.em)).toBe(true);
      expect(userData.ph).toBeDefined();
      expect(userData.fn).toBeDefined();
      expect(userData.ln).toBeDefined();
      expect(userData.ct).toBeDefined();
      expect(userData.st).toBeDefined();
      expect(userData.country).toBeDefined();
      expect(userData.client_ip_address).toBe('127.0.0.1');
      expect(userData.client_user_agent).toBe('Mozilla/5.0');
      expect(userData.fbp).toBe('fb.1.12345.6789');
      expect(userData.fbc).toBe('fb.1.12345.clickid');
    });
  });

  describe('sendMetaConversionEvent', () => {
    it('returns error when Meta credentials are not configured', async () => {
      delete process.env.META_PIXEL_ID;
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
      delete process.env.META_CONVERSIONS_API_ACCESS_TOKEN;

      const res = await sendMetaConversionEvent({
        eventName: 'Purchase',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('not configured');
    });

    it('successfully posts event payload to Graph API when configured', async () => {
      process.env.META_PIXEL_ID = '1234567890';
      process.env.META_CONVERSIONS_API_ACCESS_TOKEN = 'test_token';
      process.env.META_TEST_EVENT_CODE = 'TEST12345';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          events_received: 1,
          fbtrace_id: 'trace_abc123',
        }),
      });
      global.fetch = mockFetch;

      const res = await sendMetaConversionEvent({
        eventName: 'Purchase',
        eventId: 'order_9999',
        userData: { email: 'customer@example.com' },
        customData: { value: 12500, currency: 'NGN' },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(callUrl).toContain('/1234567890/events');
      expect(callUrl).toContain('access_token=test_token');
      expect(callBody.test_event_code).toBe('TEST12345');
      expect(callBody.data[0].event_name).toBe('Purchase');
      expect(callBody.data[0].event_id).toBe('order_9999');
      expect(callBody.data[0].custom_data.value).toBe(12500);
      expect(res.success).toBe(true);
      expect(res.eventsReceived).toBe(1);
    });

    it('handles Graph API error response gracefully', async () => {
      process.env.META_PIXEL_ID = '1234567890';
      process.env.META_CONVERSIONS_API_ACCESS_TOKEN = 'test_token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid access token',
            fbtrace_id: 'trace_err',
          },
        }),
      });

      const res = await sendMetaConversionEvent({
        eventName: 'Purchase',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid access token');
      expect(res.fbtraceId).toBe('trace_err');
    });
  });
});

describe('Meta Pixel Client Tracking Helpers', () => {
  let fbqMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fbqMock = vi.fn();
    (global as unknown as { window: unknown }).window = {
      fbq: fbqMock,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects isPixelAvailable when window.fbq is present', () => {
    expect(isPixelAvailable()).toBe(true);
  });

  it('tracks standard and custom events with event_id deduplication', () => {
    trackMetaEvent('ViewContent', { content_name: 'Mindful Journal' }, 'event_123');
    expect(fbqMock).toHaveBeenCalledWith(
      'track',
      'ViewContent',
      { content_name: 'Mindful Journal' },
      { eventID: 'event_123' }
    );

    trackMetaCustomEvent('CustomCampaignClick', { campaign: 'spring_sale' });
    expect(fbqMock).toHaveBeenCalledWith('trackCustom', 'CustomCampaignClick', {
      campaign: 'spring_sale',
    });
  });

  it('tracks PageView, AddToCart, InitiateCheckout, and Purchase', () => {
    trackPageView('pv_1');
    expect(fbqMock).toHaveBeenCalledWith('track', 'PageView', {}, { eventID: 'pv_1' });

    trackViewContent({ content_name: 'Coloring Book', value: 3500 });
    expect(fbqMock).toHaveBeenCalledWith('track', 'ViewContent', {
      content_name: 'Coloring Book',
      content_ids: undefined,
      content_type: 'product',
      value: 3500,
      currency: 'NGN',
    });

    trackAddToCart({ content_name: 'Journal', value: 4500 });
    expect(fbqMock).toHaveBeenCalledWith('track', 'AddToCart', {
      content_name: 'Journal',
      content_ids: undefined,
      content_type: 'product',
      value: 4500,
      currency: 'NGN',
    });

    trackInitiateCheckout({ num_items: 2, value: 8000 });
    expect(fbqMock).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      num_items: 2,
      value: 8000,
      currency: 'NGN',
      content_ids: undefined,
    });

    trackPurchase({ value: 8000, order_id: 'ORD-101' }, 'ORD-101');
    expect(fbqMock).toHaveBeenCalledWith(
      'track',
      'Purchase',
      {
        value: 8000,
        currency: 'NGN',
        content_name: undefined,
        content_ids: undefined,
        content_type: 'product',
        num_items: undefined,
        order_id: 'ORD-101',
      },
      { eventID: 'ORD-101' }
    );
  });
});
