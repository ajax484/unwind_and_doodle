import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  dispatchTransactionalEmail,
  renderEmailTemplate,
  getTransporter,
  setTransporter,
  clearNotificationCache,
  initializeNotificationEventHandlers,
} from '@/services/notification.service';
import {
  publishDomainEvent,
  processPendingDomainEvents,
} from '@/services/events.service';
import { createMockSupabaseClient } from './mocks/supabase.mock';

describe('Notification Service with Nodemailer', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearNotificationCache();
    // Reset to fallback jsonTransport
    setTransporter(null);
    mockSupabase = createMockSupabaseClient({
      domain_events: [],
      orders: [],
    });
  });

  describe('1. Email Template Rendering', () => {
    it('renders order confirmation template with order details and item list', () => {
      const rendered = renderEmailTemplate(
        'order_confirmation',
        {
          orderNumber: 'ORD-98210',
          customerName: 'Amina Bello',
          total: 45000,
          trackingUrl: 'https://example.com/order/ORD-98210?token=abc',
          items: [
            { name: 'Doodle Sketchbook Pro', quantity: 2, unit_price: 15000 },
            { name: 'Metallic Ink Pens (Set of 12)', quantity: 1, unit_price: 15000 },
          ],
        },
        'Order Confirmed: #ORD-98210'
      );

      expect(rendered.html).toContain('ORD-98210');
      expect(rendered.html).toContain('Amina Bello');
      expect(rendered.html).toContain('₦45,000');
      expect(rendered.html).toContain('Doodle Sketchbook Pro');
      expect(rendered.html).toContain('Metallic Ink Pens');
      expect(rendered.html).toContain('https://example.com/order/ORD-98210?token=abc');

      expect(rendered.text).toContain('ORD-98210');
      expect(rendered.text).toContain('Amina Bello');
      expect(rendered.text).toContain('https://example.com/order/ORD-98210?token=abc');
    });

    it('renders order shipped template with tracking and delivery info', () => {
      const rendered = renderEmailTemplate(
        'order_shipped',
        {
          orderNumber: 'ORD-77123',
          trackingUrl: 'https://example.com/order/ORD-77123?token=xyz',
          deliveryAddress: { street: '15 Victoria Island Blvd', city: 'Lagos' },
        },
        'Your Order #ORD-77123 Has Shipped!'
      );

      expect(rendered.html).toContain('ORD-77123');
      expect(rendered.html).toContain('Your Order is on its Way!');
      expect(rendered.html).toContain('15 Victoria Island Blvd');
      expect(rendered.text).toContain('ORD-77123');
      expect(rendered.text).toContain('https://example.com/order/ORD-77123?token=xyz');
    });

    it('renders stock alert notification', () => {
      const rendered = renderEmailTemplate(
        'stock_alert',
        {
          productId: 'prod-canvas-01',
          productUrl: 'https://example.com/products/prod-canvas-01',
        },
        'Back in Stock: An item you were watching is available!'
      );

      expect(rendered.html).toContain('Back in Stock!');
      expect(rendered.html).toContain('https://example.com/products/prod-canvas-01');
      expect(rendered.text).toContain('https://example.com/products/prod-canvas-01');
    });

    it('renders team invitation template with organization details and role', () => {
      const rendered = renderEmailTemplate(
        'team_invitation',
        {
          inviteUrl: 'https://example.com/invite/tok_abc123',
          organizationName: 'Unwind & Doodle Studio',
          role: 'admin',
          invitedBy: 'Tunde Adeleke',
          expiresAt: '2026-09-09T00:00:00.000Z',
        },
        "You've been invited to join Unwind & Doodle Studio"
      );

      expect(rendered.html).toContain("You're Invited!");
      expect(rendered.html).toContain('Unwind & Doodle Studio');
      expect(rendered.html).toContain('admin');
      expect(rendered.html).toContain('Tunde Adeleke');
      expect(rendered.html).toContain('https://example.com/invite/tok_abc123');
      expect(rendered.text).toContain('https://example.com/invite/tok_abc123');
    });

    it('renders review request template', () => {
      const rendered = renderEmailTemplate(
        'review_request',
        {
          orderNumber: 'ORD-55443',
          reviewUrl: 'https://example.com/reviews/new?order=ORD-55443',
        },
        'How was your experience?'
      );

      expect(rendered.html).toContain('How was your experience?');
      expect(rendered.html).toContain('ORD-55443');
      expect(rendered.html).toContain('https://example.com/reviews/new?order=ORD-55443');
    });
  });

  describe('2. Transactional Email Dispatching & Idempotency', () => {
    it('sends email successfully using custom mock transporter', async () => {
      const sendMailMock = vi.fn().mockResolvedValue({
        messageId: '<test-message-123@unwindanddoodle.com>',
      });

      setTransporter({
        sendMail: sendMailMock,
      } as any);

      const result = await dispatchTransactionalEmail({
        to: 'customer@example.com',
        subject: 'Order Confirmed: #ORD-1111',
        template: 'order_confirmation',
        data: {
          orderNumber: 'ORD-1111',
          customerName: 'Kemi',
          total: 12000,
          trackingUrl: 'https://example.com/order/ORD-1111',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<test-message-123@unwindanddoodle.com>');
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'Order Confirmed: #ORD-1111',
        })
      );
    });

    it('handles idempotency key by skipping duplicate transmissions', async () => {
      const sendMailMock = vi.fn().mockResolvedValue({
        messageId: '<unique-msg-id>',
      });

      setTransporter({
        sendMail: sendMailMock,
      } as any);

      const payload = {
        to: 'repeat@example.com',
        subject: 'Stock Alert',
        template: 'stock_alert' as const,
        data: { productUrl: 'https://example.com/products/item-1' },
      };

      const firstCall = await dispatchTransactionalEmail(payload, 'idemp_key_123');
      expect(firstCall.success).toBe(true);
      expect(sendMailMock).toHaveBeenCalledTimes(1);

      // Second attempt with same key
      const secondCall = await dispatchTransactionalEmail(payload, 'idemp_key_123');
      expect(secondCall.success).toBe(true);
      expect(secondCall.messageId).toBe('cached_idemp_key_123');
      expect(sendMailMock).toHaveBeenCalledTimes(1); // Not called again
    });

    it('returns structured error if nodemailer sendMail fails', async () => {
      const sendMailMock = vi.fn().mockRejectedValue(new Error('SMTP connection timed out'));

      setTransporter({
        sendMail: sendMailMock,
      } as any);

      const result = await dispatchTransactionalEmail({
        to: 'fail@example.com',
        subject: 'Order Confirmation',
        template: 'order_confirmation',
        data: { orderNumber: 'ORD-999' },
      });

      expect(result.success).toBe(false);
      expect(result.messageId).toBe('');
      expect(result.error).toContain('SMTP connection timed out');
    });

    it('uses fallback JSON transport when no live SMTP config is provided', async () => {
      setTransporter(null); // Defaults to JSON transport fallback
      const transporter = getTransporter();
      expect(transporter).toBeDefined();

      const result = await dispatchTransactionalEmail({
        to: 'test.fallback@example.com',
        subject: 'Test Email',
        template: 'order_confirmation',
        data: { orderNumber: 'ORD-FALLBACK' },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
    });
  });

  describe('3. Domain Event Listeners Integration', () => {
    it('dispatches order confirmation email when order.pending event is processed', async () => {
      const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'evt_order_pending_msg' });
      setTransporter({ sendMail: sendMailMock } as any);

      initializeNotificationEventHandlers();

      await publishDomainEvent(mockSupabase as any, {
        eventType: 'order.pending',
        aggregateType: 'order',
        aggregateId: 'ORD-EVT-101',
        payload: {
          orderNumber: 'ORD-EVT-101',
          email: 'buyer@example.com',
          firstName: 'Emeka',
          total: 25000,
          items: [{ name: 'Starter Kit', quantity: 1, unit_price: 25000 }],
        },
      });

      await processPendingDomainEvents(mockSupabase as any);

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'buyer@example.com',
          subject: expect.stringContaining('ORD-EVT-101'),
        })
      );
    });

    it('dispatches shipped email when order.shipped event is processed', async () => {
      const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'evt_order_shipped_msg' });
      setTransporter({ sendMail: sendMailMock } as any);

      initializeNotificationEventHandlers();

      await publishDomainEvent(mockSupabase as any, {
        eventType: 'order.shipped',
        aggregateType: 'order',
        aggregateId: 'ORD-EVT-202',
        payload: {
          orderNumber: 'ORD-EVT-202',
          email: 'shipper@example.com',
          deliveryAddress: { address: 'Plot 4, Lekki Phase 1' },
        },
      });

      await processPendingDomainEvents(mockSupabase as any);

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'shipper@example.com',
          subject: expect.stringContaining('Has Shipped'),
        })
      );
    });

    it('dispatches stock notification when stock_notification.eligible event is processed', async () => {
      const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'evt_stock_msg' });
      setTransporter({ sendMail: sendMailMock } as any);

      initializeNotificationEventHandlers();

      await publishDomainEvent(mockSupabase as any, {
        eventType: 'stock_notification.eligible',
        aggregateType: 'stock_notification',
        aggregateId: 'prod-paint-01',
        payload: {
          productId: 'prod-paint-01',
          recipients: [
            {
              notificationId: 'notif-subscriber-1',
              email: 'waitlist@example.com',
              channel: 'email',
            },
          ],
        },
      });

      await processPendingDomainEvents(mockSupabase as any);

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'waitlist@example.com',
          subject: expect.stringContaining('Back in Stock'),
        })
      );
    });
  });
});
