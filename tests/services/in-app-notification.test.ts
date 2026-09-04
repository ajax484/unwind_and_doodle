import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  createInAppNotification,
  getInAppNotifications,
  markInAppNotificationRead,
  markAllInAppNotificationsRead,
} from '@/services/in-app-notification.service';
import { processPendingDomainEvents, publishDomainEvent } from '@/services/events.service';
import { setServiceSupabaseClient } from '@/lib/supabase/client';
import '@/services/notification.service'; // registers event handlers

describe('Option 2: Persistent In-App Notification Center', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const orgId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const customerId = 'cust-test-123';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle', slug: 'unwind-and-doodle' }],
      notifications: [],
      domain_events: [],
    });
    setServiceSupabaseClient(mockSupabase as any);
  });

  afterEach(() => {
    setServiceSupabaseClient(null);
  });

  describe('1. CRUD Operations & State Transitions', () => {
    it('creates an in-app notification with default system metadata', async () => {
      const created = await createInAppNotification(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Order Confirmed! 🎉',
        message: 'Your doodle kit is being packaged.',
        type: 'success',
        category: 'order',
        link: '/order/1001',
      });

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.title).toBe('Order Confirmed! 🎉');
      expect(created.recipientType).toBe('customer');
      expect(created.recipientId).toBe(customerId);
      expect(created.readAt).toBeNull();
      expect(created.link).toBe('/order/1001');
    });

    it('queries notifications and accurately calculates unread counts', async () => {
      // Seed 2 unread and 1 read
      await createInAppNotification(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Notification 1',
        message: 'First update',
      });

      const n2 = await createInAppNotification(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Notification 2',
        message: 'Second update',
      });

      // Mark n2 as read
      await markInAppNotificationRead(mockSupabase as any, n2.id);

      const list = await getInAppNotifications(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
      });

      expect(list.total).toBe(2);
      expect(list.unreadCount).toBe(1);
      expect(list.notifications.length).toBe(2);
    });

    it('filters unread only when unreadOnly is requested', async () => {
      const n1 = await createInAppNotification(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Unread Notification',
        message: 'Needs attention',
      });

      const n2 = await createInAppNotification(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Read Notification',
        message: 'Already seen',
      });

      await markInAppNotificationRead(mockSupabase as any, n2.id);

      const unreadList = await getInAppNotifications(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        unreadOnly: true,
      });

      expect(unreadList.notifications.length).toBe(1);
      expect(unreadList.notifications[0].id).toBe(n1.id);
    });

    it('marks all notifications as read for a customer', async () => {
      await createInAppNotification(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Item 1',
        message: 'Message 1',
      });

      await createInAppNotification(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
        title: 'Item 2',
        message: 'Message 2',
      });

      await markAllInAppNotificationsRead(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
      });

      const after = await getInAppNotifications(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
      });

      expect(after.unreadCount).toBe(0);
      expect(after.notifications.every((n) => n.readAt !== null)).toBe(true);
    });
  });

  describe('2. Domain Events Integration', () => {
    it('creates in-app notifications when domain event order.pending is processed', async () => {
      // Publish order.pending outbox event
      await publishDomainEvent(mockSupabase as any, {
        eventType: 'order.pending',
        aggregateType: 'order',
        aggregateId: 'ord-1042',
        payload: {
          orderNumber: '1042',
          customerId,
          total: 12500,
          email: 'customer@example.com',
          firstName: 'Amara',
          items: [{ name: 'Mindful Floral Book', quantity: 1, price: 12500 }],
        },
      });

      // Process domain events
      await processPendingDomainEvents(mockSupabase as any);

      // Check customer in-app notification
      const customerNotifs = await getInAppNotifications(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'customer',
        recipientId: customerId,
      });

      expect(customerNotifs.notifications.length).toBeGreaterThanOrEqual(1);
      const customerOrderNotif = customerNotifs.notifications.find((n) => n.category === 'order');
      expect(customerOrderNotif).toBeDefined();
      expect(customerOrderNotif?.title).toContain('1042');
      expect(customerOrderNotif?.type).toBe('success');

      // Check admin in-app notification
      const adminNotifs = await getInAppNotifications(mockSupabase as any, {
        organizationId: orgId,
        recipientType: 'admin',
      });

      expect(adminNotifs.notifications.length).toBeGreaterThanOrEqual(1);
      const adminOrderNotif = adminNotifs.notifications.find((n) => n.title.includes('1042'));
      expect(adminOrderNotif).toBeDefined();
    });
  });
});
