import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodemailerMarketingEmailProvider } from '@/services/marketing-provider/nodemailer-marketing.provider';
import {
  compileCampaignBlocksToHtml,
  renderMarketingTemplate,
} from '@/services/marketing-renderer.service';
import {
  resolveEffectiveReplyTo,
  invalidateEmailSettingsCache,
  isValidEmailAddress,
} from '@/services/email-settings.service';
import {
  dispatchTransactionalEmail,
  setTransporter,
  clearNotificationCache,
} from '@/services/notification.service';
import { MarketingContext } from '@/types/marketing-context';
import { V1CampaignBlock } from '@/types/marketing-builder';

describe('Email Reply-To, Delivery Transport & New Builder Blocks', () => {
  const originalReplyTo = process.env.SMTP_REPLY_TO;

  beforeEach(() => {
    invalidateEmailSettingsCache();
    clearNotificationCache();
    delete process.env.SMTP_REPLY_TO;
  });

  afterEach(() => {
    setTransporter(null);
    if (originalReplyTo !== undefined) {
      process.env.SMTP_REPLY_TO = originalReplyTo;
    } else {
      delete process.env.SMTP_REPLY_TO;
    }
  });

  describe('Reply-To resolution & propagation', () => {
    it('validates email addresses properly', () => {
      expect(isValidEmailAddress('support@unwindanddoodle.com')).toBe(true);
      expect(isValidEmailAddress('not-an-email')).toBe(false);
      expect(isValidEmailAddress('')).toBe(false);
    });

    it('resolves reply-to with priority: explicit override -> DB setting -> env var', async () => {
      process.env.SMTP_REPLY_TO = 'env-reply@unwindanddoodle.com';

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  organization_id: 'org-1',
                  reply_to_email: 'db-reply@unwindanddoodle.com',
                  default_sender_name: 'Unwind & Doodle',
                  default_sender_email: 'orders@unwindanddoodle.com',
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      // 1. Explicit override wins
      expect(
        await resolveEffectiveReplyTo(mockSupabase, 'org-1', 'campaign-reply@unwindanddoodle.com')
      ).toBe('campaign-reply@unwindanddoodle.com');

      // 2. DB setting wins over env var
      expect(await resolveEffectiveReplyTo(mockSupabase, 'org-1')).toBe(
        'db-reply@unwindanddoodle.com'
      );

      // 3. Env var used when no DB / org
      expect(await resolveEffectiveReplyTo(null, null)).toBe('env-reply@unwindanddoodle.com');
    });

    it('passes replyTo header through NodemailerMarketingEmailProvider', async () => {
      const sendMail = vi.fn().mockResolvedValue({ messageId: 'msg_123' });
      const provider = new NodemailerMarketingEmailProvider({ sendMail } as any);

      const res = await provider.sendEmail({
        to: 'customer@example.com',
        subject: 'Hello',
        senderName: 'Unwind & Doodle',
        senderEmail: 'orders@unwindanddoodle.com',
        replyTo: 'aisha@unwindanddoodle.com',
        html: '<p>Hi there</p>',
      });

      expect(res.success).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          replyTo: 'aisha@unwindanddoodle.com',
        })
      );
    });

    it('passes replyTo header through dispatchTransactionalEmail', async () => {
      process.env.SMTP_REPLY_TO = 'support@unwindanddoodle.com';
      const sendMail = vi.fn().mockResolvedValue({ messageId: 'tx_123' });
      setTransporter({ sendMail } as any);

      const res = await dispatchTransactionalEmail({
        to: 'buyer@example.com',
        subject: 'Order Confirmed',
        template: 'order_confirmation',
        data: {
          orderNumber: 'ORD-1001',
          customerName: 'Amina',
          trackingUrl: 'https://unwindanddoodle.com/order/ORD-1001',
        },
      });

      expect(res.success).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'buyer@example.com',
          replyTo: 'support@unwindanddoodle.com',
        })
      );
    });
  });

  describe('Customer Review & Dynamic Cart/Order Items Blocks', () => {
    it('renders a customer review block with stars, quote, author, and verified badge', () => {
      const blocks: V1CampaignBlock[] = [
        {
          id: 'rev-1',
          type: 'review',
          data: {
            rating: 5,
            title: 'Loved every page',
            quote: 'Best gift I bought myself this year.',
            authorName: 'Zainab A.',
            productName: 'The Unwind Kit',
            productUrl: '/products/unwind-kit',
            verifiedBuyer: true,
            style: 'rose',
          },
        },
      ];

      const html = compileCampaignBlocksToHtml(blocks);
      expect(html).toContain('★★★★★');
      expect(html).toContain('Loved every page');
      expect(html).toContain('Best gift I bought myself this year.');
      expect(html).toContain('Zainab A.');
      expect(html).toContain('Verified Buyer');
      expect(html).toContain('The Unwind Kit');
    });

    it('renders dynamic abandoned cart items per recipient with images, names, prices, and subtotal', () => {
      const blocks: V1CampaignBlock[] = [
        {
          id: 'cart-1',
          type: 'dynamic_items',
          data: {
            source: 'abandoned_cart',
            heading: 'You left these behind',
            showImage: true,
            showPrice: true,
            showQuantity: true,
            showSubtotal: true,
            showCta: true,
            ctaText: 'Complete your order',
          },
        },
      ];

      const context: MarketingContext = {
        firstName: 'Aisha',
        cartItems: [
          {
            productId: 'p1',
            name: 'Vent to Me Journal',
            quantity: 2,
            unitPrice: 12000,
            totalPrice: 24000,
            imageUrl: 'https://cdn.example.com/vent-to-me.jpg',
            productUrl: 'https://unwindanddoodle.com/products/vent-to-me',
          },
        ],
        cartSubtotal: 24000,
        cartUrl: 'https://unwindanddoodle.com/cart',
      };

      const html = renderMarketingTemplate({ blocks }, context, { isHtml: true });
      expect(html).toContain('You left these behind');
      expect(html).toContain('Vent to Me Journal');
      expect(html).toContain('https://cdn.example.com/vent-to-me.jpg');
      expect(html).toContain('Qty: 2');
      expect(html).toContain('24,000');
      expect(html).toContain('Complete your order');
    });

    it('renders dynamic order items for post-purchase follow-ups', () => {
      const blocks: V1CampaignBlock[] = [
        {
          id: 'ord-1',
          type: 'dynamic_items',
          data: {
            source: 'order_items',
            heading: 'What you ordered',
            showImage: true,
            showPrice: true,
            showQuantity: true,
            showSubtotal: true,
            showCta: true,
            ctaText: 'View your order',
          },
        },
      ];

      const context: MarketingContext = {
        firstName: 'Chioma',
        orderNumber: 'ORD-5521',
        orderItems: [
          {
            productId: 'p2',
            name: 'For the Girls Colouring Book',
            quantity: 1,
            unitPrice: 5500,
            totalPrice: 5500,
            imageUrl: 'https://cdn.example.com/ftg.jpg',
          },
        ],
        orderSubtotal: 5500,
        orderUrl: 'https://unwindanddoodle.com/account/orders/ORD-5521',
      };

      const html = renderMarketingTemplate({ blocks }, context, { isHtml: true });
      expect(html).toContain('What you ordered');
      expect(html).toContain('For the Girls Colouring Book');
      expect(html).toContain('https://cdn.example.com/ftg.jpg');
      expect(html).toContain('5,500');
      expect(html).toContain('View your order');
    });

    it('renders empty fallback text when dynamic items list is empty', () => {
      const blocks: V1CampaignBlock[] = [
        {
          id: 'cart-empty',
          type: 'dynamic_items',
          data: {
            source: 'abandoned_cart',
            emptyFallbackText: 'Browse our newest colouring editions.',
          },
        },
      ];

      const html = renderMarketingTemplate({ blocks }, { firstName: 'Aisha' }, { isHtml: true });
      expect(html).toContain('Browse our newest colouring editions.');
    });
  });
});
