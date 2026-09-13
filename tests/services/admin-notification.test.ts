import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderEmailTemplate,
  getAdminNotificationRecipients,
  clearNotificationCache,
  setTransporter,
  initializeNotificationEventHandlers,
} from '@/services/notification.service';
import { checkAndEmitLowStockAlert } from '@/services/inventory.service';
import { publishDomainEvent, processPendingDomainEvents } from '@/services/events.service';
import { getInAppNotifications } from '@/services/in-app-notification.service';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { setServiceSupabaseClient } from '@/lib/supabase/client';

describe('Admin Notifications & Alerts (A & D)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearNotificationCache();
    setTransporter(null);
    mockSupabase = createMockSupabaseClient({
      domain_events: [],
      notifications: [],
      organization_members: [],
      customers: [],
      inventory: [],
      products: [],
      warehouses: [],
    });
    setServiceSupabaseClient(mockSupabase as any);
  });

  afterEach(() => {
    setServiceSupabaseClient(null);
  });

  describe('1. Admin Email Template Rendering', () => {
    it('renders admin_new_order template with items, customer details, and total', () => {
      const rendered = renderEmailTemplate(
        'admin_new_order',
        {
          orderNumber: 'ORD-ADM-900',
          customerName: 'Chidi Okafor',
          customerEmail: 'chidi@example.com',
          total: 65000,
          orderSource: 'online',
          adminUrl: 'https://example.com/admin/orders',
          items: [
            { name: 'Calligraphy Master Kit', quantity: 1, unit_price: 45000 },
            { name: 'Gold Foil Paper Pack', quantity: 2, unit_price: 10000 },
          ],
        },
        'New Order Received: #ORD-ADM-900'
      );

      expect(rendered.html).toContain('ORD-ADM-900');
      expect(rendered.html).toContain('Chidi Okafor');
      expect(rendered.html).toContain('chidi@example.com');
      expect(rendered.html).toContain('₦65,000');
      expect(rendered.html).toContain('Calligraphy Master Kit');
      expect(rendered.html).toContain('Gold Foil Paper Pack');
      expect(rendered.html).toContain('https://example.com/admin/orders');

      expect(rendered.text).toContain('ORD-ADM-900');
      expect(rendered.text).toContain('Chidi Okafor');
      expect(rendered.text).toContain('₦65,000');
    });

    it('renders admin_order_cancelled template with reason and previous status', () => {
      const rendered = renderEmailTemplate(
        'admin_order_cancelled',
        {
          orderNumber: 'ORD-CANCEL-123',
          note: 'Customer requested cancellation due to incorrect delivery address.',
          previousStatus: 'pending',
          adminUrl: 'https://example.com/admin/orders',
        },
        'Order Cancelled: #ORD-CANCEL-123'
      );

      expect(rendered.html).toContain('ORD-CANCEL-123');
      expect(rendered.html).toContain('Order Cancelled ⚠️');
      expect(rendered.html).toContain('incorrect delivery address');
      expect(rendered.html).toContain('pending');
      expect(rendered.text).toContain('ORD-CANCEL-123');
      expect(rendered.text).toContain('incorrect delivery address');
    });

    it('renders admin_low_stock template for low stock warning', () => {
      const rendered = renderEmailTemplate(
        'admin_low_stock',
        {
          productId: 'prod-001',
          productName: 'Handmade Sketchbook Large',
          sku: 'SKU-SKETCH-LG',
          warehouseName: 'Ikeja Depot',
          availableQuantity: 3,
          threshold: 5,
          isOutOfStock: false,
          adminUrl: 'https://example.com/admin/inventory/prod-001',
        },
        'Low Stock Alert: Handmade Sketchbook Large'
      );

      expect(rendered.html).toContain('Handmade Sketchbook Large');
      expect(rendered.html).toContain('SKU-SKETCH-LG');
      expect(rendered.html).toContain('3 unit(s)');
      expect(rendered.html).toContain('Ikeja Depot');
      expect(rendered.html).toContain('LOW STOCK');
      expect(rendered.text).toContain('3');
      expect(rendered.text).toContain('LOW STOCK WARNING');
    });

    it('renders admin_low_stock template for out of stock alert', () => {
      const rendered = renderEmailTemplate(
        'admin_low_stock',
        {
          productId: 'prod-002',
          productName: 'Acrylic Paint Tube',
          sku: 'SKU-ACRYLIC-01',
          warehouseName: 'Main Hub',
          availableQuantity: 0,
          threshold: 5,
          isOutOfStock: true,
          adminUrl: 'https://example.com/admin/inventory/prod-002',
        },
        'Out of Stock Alert: Acrylic Paint Tube'
      );

      expect(rendered.html).toContain('Acrylic Paint Tube');
      expect(rendered.html).toContain('Product Out of Stock! 🚨');
      expect(rendered.html).toContain('OUT OF STOCK');
      expect(rendered.text).toContain('OUT OF STOCK ALERT');
    });
  });

  describe('2. Admin Recipient Resolution', () => {
    it('resolves admin recipients from organization members when ignoreConfig is true', async () => {
      const orgId = 'org-test-100';

      mockSupabase = createMockSupabaseClient({
        organization_members: [
          { organization_id: orgId, user_id: 'user-admin-1', role: 'admin' },
          { organization_id: orgId, user_id: 'user-owner-1', role: 'owner' },
          { organization_id: orgId, user_id: 'user-staff-1', role: 'staff' },
        ],
        customers: [
          { user_id: 'user-admin-1', email: 'admin1@unwindanddoodle.com' },
          { user_id: 'user-owner-1', email: 'owner1@unwindanddoodle.com' },
          { user_id: 'user-staff-1', email: 'staff1@unwindanddoodle.com' },
        ],
      });

      const recipients = await getAdminNotificationRecipients(mockSupabase as any, orgId, { ignoreConfig: true });

      expect(recipients).toContain('admin1@unwindanddoodle.com');
      expect(recipients).toContain('owner1@unwindanddoodle.com');
      expect(recipients).not.toContain('staff1@unwindanddoodle.com');
    });
  });

  describe('3. Domain Event Handling for Admin Alerts', () => {
    it('creates admin in-app notification and email on order.cancelled', async () => {
      initializeNotificationEventHandlers();

      await publishDomainEvent(mockSupabase as any, {
        eventType: 'order.cancelled',
        aggregateType: 'order',
        aggregateId: 'ord-cancel-99',
        payload: {
          orderNumber: 'ORD-99-CANCEL',
          previousStatus: 'pending',
          note: 'Item requested refund before dispatch',
        },
      });

      await processPendingDomainEvents(mockSupabase as any, 10);

      const notifs = await getInAppNotifications(mockSupabase as any, {
        recipientType: 'admin',
      });

      const cancelledNotif = notifs.notifications.find(
        (n) => n.category === 'order' && n.title.includes('Cancelled')
      );

      expect(cancelledNotif).toBeDefined();
      expect(cancelledNotif?.type).toBe('warning');
      expect(cancelledNotif?.message).toContain('Item requested refund before dispatch');
    });

    it('creates admin in-app notification on order.refunded', async () => {
      initializeNotificationEventHandlers();

      await publishDomainEvent(mockSupabase as any, {
        eventType: 'order.refunded',
        aggregateType: 'order',
        aggregateId: 'ord-ref-1',
        payload: {
          orderNumber: 'ORD-REF-1',
          previousStatus: 'cancelled',
        },
      });

      await processPendingDomainEvents(mockSupabase as any, 10);

      const notifs = await getInAppNotifications(mockSupabase as any, {
        recipientType: 'admin',
      });

      const refNotif = notifs.notifications.find(
        (n) => n.category === 'order' && n.title.includes('Refunded')
      );

      expect(refNotif).toBeDefined();
      expect(refNotif?.type).toBe('info');
    });

    it('creates admin in-app notification on manual order.created', async () => {
      initializeNotificationEventHandlers();

      await publishDomainEvent(mockSupabase as any, {
        eventType: 'order.created',
        aggregateType: 'order',
        aggregateId: 'ord-man-001',
        payload: {
          orderNumber: 'ORD-MAN-001',
          orderSource: 'manual',
          totalAmount: 32000,
        },
      });

      await processPendingDomainEvents(mockSupabase as any, 10);

      const notifs = await getInAppNotifications(mockSupabase as any, {
        recipientType: 'admin',
      });

      const manualNotif = notifs.notifications.find(
        (n) => n.category === 'order' && n.title.includes('Manual Order Created')
      );

      expect(manualNotif).toBeDefined();
      expect(manualNotif?.message).toContain('32,000');
    });

    it('creates admin in-app warning on inventory.low_stock event', async () => {
      initializeNotificationEventHandlers();

      await publishDomainEvent(mockSupabase as any, {
        eventType: 'inventory.low_stock',
        aggregateType: 'inventory',
        aggregateId: 'wh-1:prod-99',
        payload: {
          productId: 'prod-99',
          productName: 'Calligraphy Ink 50ml',
          sku: 'INK-50',
          warehouseId: 'wh-1',
          warehouseName: 'Main Depot',
          availableQuantity: 2,
          threshold: 5,
          isOutOfStock: false,
        },
      });

      await processPendingDomainEvents(mockSupabase as any, 10);

      const notifs = await getInAppNotifications(mockSupabase as any, {
        recipientType: 'admin',
      });

      const stockNotif = notifs.notifications.find(
        (n) => n.category === 'inventory' && n.title.includes('Low Stock')
      );

      expect(stockNotif).toBeDefined();
      expect(stockNotif?.type).toBe('warning');
      expect(stockNotif?.message).toContain('Only 2 unit(s) remaining');
    });
  });

  describe('4. Inventory Low Stock Threshold Detection', () => {
    it('emits low stock alert when available quantity is <= 5', async () => {
      mockSupabase = createMockSupabaseClient({
        inventory: [
          {
            id: 'inv-1',
            product_id: 'prod-p1',
            warehouse_id: 'wh-w1',
            quantity: 4,
            reserved_quantity: 0,
          },
        ],
        products: [
          {
            id: 'prod-p1',
            name: 'Fine Liners Pack',
            sku: 'FL-01',
          },
        ],
        warehouses: [
          {
            id: 'wh-w1',
            name: 'Lagos Warehouse',
          },
        ],
        domain_events: [],
      });
      setServiceSupabaseClient(mockSupabase as any);

      const triggered = await checkAndEmitLowStockAlert(mockSupabase as any, {
        productId: 'prod-p1',
        warehouseId: 'wh-w1',
      });

      expect(triggered).toBe(true);

      const events = (mockSupabase as any)._store.domain_events;
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe('inventory.low_stock');
      expect(events[0].payload.availableQuantity).toBe(4);
      expect(events[0].payload.isOutOfStock).toBe(false);
    });

    it('does not emit alert when available quantity is > threshold', async () => {
      mockSupabase = createMockSupabaseClient({
        inventory: [
          {
            id: 'inv-2',
            product_id: 'prod-p2',
            warehouse_id: 'wh-w2',
            quantity: 20,
            reserved_quantity: 2,
          },
        ],
        products: [
          {
            id: 'prod-p2',
            name: 'Canvas Board',
            sku: 'CB-01',
          },
        ],
        warehouses: [
          {
            id: 'wh-w2',
            name: 'Abuja Depot',
          },
        ],
        domain_events: [],
      });
      setServiceSupabaseClient(mockSupabase as any);

      const triggered = await checkAndEmitLowStockAlert(mockSupabase as any, {
        productId: 'prod-p2',
        warehouseId: 'wh-w2',
      });

      expect(triggered).toBe(false);

      const events = (mockSupabase as any)._store.domain_events;
      expect(events.length).toBe(0);
    });
  });
});
