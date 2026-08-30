import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  linkOrCreateCustomerAccount,
  getCustomerProfile,
  updateCustomerProfile,
  updateMarketingPreferences,
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  deleteCustomerAccount,
} from '@/services/customer-account.service';
import { reorderPastOrder } from '@/services/reorder.service';
import {
  submitReview,
  checkReviewEligibility,
  getProductReviews,
  getCustomerReviews,
} from '@/services/review.service';
import {
  subscribeToStockNotification,
  unsubscribeFromStockNotification,
  getCustomerStockNotifications,
  handleStockReplenishment,
} from '@/services/stock-notification.service';
import { generateOrderAccessToken, verifyOrderAccessToken } from '@/lib/order-token';

describe('Phase 5: Customer Accounts, Lifecycle & Post-Purchase Services', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: '88c7af2e-afd4-4504-a43f-b14cc45d6263', name: 'Unwind & Doodle' }],
      customers: [
        {
          id: 'cust-guest-01',
          email: 'bilal@example.com',
          user_id: null,
          first_name: 'Bilal',
          last_name: 'Sani',
          phone: '08011112222',
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'cust-guest-02',
          email: 'bilal@example.com',
          user_id: null,
          first_name: 'Bilal',
          last_name: 'Sani',
          phone: '08011112222',
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          created_at: '2026-08-10T10:00:00Z',
        },
      ],
      orders: [
        {
          id: 'ord-001',
          order_number: 'CB-1001',
          customer_id: 'cust-guest-01',
          status: 'received',
          subtotal: 10000,
          shipping_fee: 1500,
          discount_total: 0,
          total: 11500,
          email: 'bilal@example.com',
          created_at: '2026-08-01T10:30:00Z',
        },
        {
          id: 'ord-002',
          order_number: 'CB-1002',
          customer_id: 'cust-guest-02',
          status: 'pending',
          subtotal: 5000,
          shipping_fee: 1500,
          discount_total: 0,
          total: 6500,
          email: 'bilal@example.com',
          created_at: '2026-08-10T10:30:00Z',
        },
      ],
      order_items: [
        {
          id: 'item-001',
          order_id: 'ord-001',
          product_id: 'prod-coloring-book-01',
          product_name: 'Mindful Floral Dreams',
          quantity: 2,
          unit_price: 5000,
          total: 10000,
        },
      ],
      products: [
        {
          id: 'prod-coloring-book-01',
          name: 'Mindful Floral Dreams',
          slug: 'mindful-floral-dreams',
          selling_price: 6000, // Price updated in catalog
          status: 'published',
          requires_customization: false,
        },
        {
          id: 'prod-sold-out-book',
          name: 'Midnight Patterns',
          slug: 'midnight-patterns',
          selling_price: 4500,
          status: 'published',
          requires_customization: false,
        },
      ],
      inventory: [
        {
          id: 'inv-01',
          product_id: 'prod-coloring-book-01',
          warehouse_id: 'wh-01',
          quantity_on_hand: 50,
          quantity_reserved: 0,
          quantity: 50,
        },
        {
          id: 'inv-02',
          product_id: 'prod-sold-out-book',
          warehouse_id: 'wh-01',
          quantity_on_hand: 0,
          quantity_reserved: 0,
          quantity: 0,
        },
      ],
      customer_addresses: [
        {
          id: 'addr-01',
          customer_id: 'cust-guest-01',
          recipient_name: 'Bilal Sani',
          phone: '08011112222',
          address_line_1: '14 Lekki Phase 1',
          state: 'Lagos',
          is_default: true,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
    });
  });

  describe('1. Customer Identity & Guest Account Linking', () => {
    it('links existing guest orders and profile to authenticated user deterministically by email', async () => {
      const authUser = {
        id: 'auth-user-999',
        email: 'bilal@example.com',
        user_metadata: { first_name: 'Bilal', last_name: 'Sani' },
      };

      const linkedCustomer = await linkOrCreateCustomerAccount(mockSupabase as any, authUser);

      expect(linkedCustomer.id).toBe('cust-guest-01');
      expect(linkedCustomer.userId).toBe('auth-user-999');
      expect(linkedCustomer.email).toBe('bilal@example.com');

      // Verify secondary guest order was consolidated to primary customer ID
      const consolidatedOrder = mockSupabase._store.orders.find((o) => o.id === 'ord-002');
      expect(consolidatedOrder?.customer_id).toBe('cust-guest-01');
    });

    it('creates a new customer profile when an authenticated user has no existing guest records', async () => {
      const newAuthUser = {
        id: 'auth-user-new',
        email: 'amara@example.com',
        user_metadata: { first_name: 'Amara', last_name: 'Okonkwo' },
      };

      const newCustomer = await linkOrCreateCustomerAccount(mockSupabase as any, newAuthUser);

      expect(newCustomer.email).toBe('amara@example.com');
      expect(newCustomer.userId).toBe('auth-user-new');
      expect(newCustomer.firstName).toBe('Amara');
      expect(newCustomer.emailMarketingConsent).toBe(true);
    });

    it('does not create duplicate customer records if called repeatedly', async () => {
      const authUser = {
        id: 'auth-user-999',
        email: 'bilal@example.com',
      };

      await linkOrCreateCustomerAccount(mockSupabase as any, authUser);
      const secondCall = await linkOrCreateCustomerAccount(mockSupabase as any, authUser);

      expect(secondCall.id).toBe('cust-guest-01');
      const matching = mockSupabase._store.customers.filter((c) => c.email === 'bilal@example.com');
      expect(matching.length).toBe(2); // original 2, no extra added
    });
  });

  describe('2. Profile & Marketing Preferences Management', () => {
    it('updates customer personal profile fields successfully', async () => {
      const updated = await updateCustomerProfile(mockSupabase as any, 'cust-guest-01', {
        firstName: 'Bilal Ahmad',
        phone: '08099998888',
        whatsappNumber: '08099998888',
      });

      expect(updated.firstName).toBe('Bilal Ahmad');
      expect(updated.phone).toBe('08099998888');
      expect(updated.whatsappNumber).toBe('08099998888');
    });

    it('updates marketing consent preferences without mutating other profile fields', async () => {
      const updated = await updateMarketingPreferences(mockSupabase as any, 'cust-guest-01', {
        emailMarketingConsent: false,
        whatsappMarketingConsent: true,
      });

      expect(updated.emailMarketingConsent).toBe(false);
      expect(updated.whatsappMarketingConsent).toBe(true);
      expect(updated.firstName).toBe('Bilal');
    });
  });

  describe('3. Saved Addresses & Default Address Invariant', () => {
    it('creates new address and respects default flag', async () => {
      const newAddr = await createCustomerAddress(mockSupabase as any, 'cust-guest-01', {
        recipientName: 'Bilal Work',
        phone: '08022223333',
        addressLine1: '42 Marina Street, Lagos Island',
        state: 'Lagos',
        isDefault: true,
      });

      expect(newAddr.recipientName).toBe('Bilal Work');
      expect(newAddr.isDefault).toBe(true);

      // Verify previous address is no longer default
      const oldAddr = mockSupabase._store.customer_addresses.find((a) => a.id === 'addr-01');
      expect(oldAddr?.is_default).toBe(false);
    });

    it('sets an address as default atomically ensuring only one default address', async () => {
      // Add second address as non-default
      const addr2 = await createCustomerAddress(mockSupabase as any, 'cust-guest-01', {
        recipientName: 'Bilal Home',
        phone: '08011112222',
        addressLine1: '12 Victoria Island',
        state: 'Lagos',
        isDefault: false,
      });

      // Set addr2 as default
      await setDefaultCustomerAddress(mockSupabase as any, 'cust-guest-01', addr2.id);

      const all = await getCustomerAddresses(mockSupabase as any, 'cust-guest-01');
      const defaultAddrs = all.filter((a) => a.isDefault);
      expect(defaultAddrs.length).toBe(1);
      expect(defaultAddrs[0].id).toBe(addr2.id);
    });

    it('deletes an address successfully', async () => {
      const deleted = await deleteCustomerAddress(mockSupabase as any, 'cust-guest-01', 'addr-01');
      expect(deleted).toBe(true);

      const remaining = await getCustomerAddresses(mockSupabase as any, 'cust-guest-01');
      expect(remaining.length).toBe(0);
    });
  });

  describe('4. Dynamic Reorder Engine', () => {
    it('reorders past purchase with current live catalog prices and stock check', async () => {
      const reorder = await reorderPastOrder(mockSupabase as any, {
        customerId: 'cust-guest-01',
        orderIdentifier: 'CB-1001',
        sessionId: 'cart-session-reorder-1',
      });

      expect(reorder.success).toBe(true);
      expect(reorder.itemsAddedCount).toBe(1);
      expect(reorder.unavailableItems.length).toBe(0);
      expect(reorder.message).toContain('1 item has been added to your cart');

      // Verify cart has the item
      expect(mockSupabase._store.cart_items.length).toBe(1);
      expect(mockSupabase._store.cart_items[0].product_id).toBe('prod-coloring-book-01');
    });

    it('reports unavailable out-of-stock items without crashing or adding out-of-stock items', async () => {
      // Put out of stock item in order
      mockSupabase._store.order_items.push({
        id: 'item-002',
        order_id: 'ord-001',
        product_id: 'prod-sold-out-book',
        product_name: 'Midnight Patterns',
        quantity: 1,
        unit_price: 4500,
        total: 4500,
      });

      const reorder = await reorderPastOrder(mockSupabase as any, {
        customerId: 'cust-guest-01',
        orderIdentifier: 'CB-1001',
        sessionId: 'cart-session-reorder-2',
      });

      expect(reorder.success).toBe(true);
      expect(reorder.itemsAddedCount).toBe(1);
      expect(reorder.unavailableItems.length).toBe(1);
      expect(reorder.unavailableItems[0].productId).toBe('prod-sold-out-book');
      expect(reorder.unavailableItems[0].reason).toBe('out_of_stock');
    });

    it('rejects reorder if customer does not own the order', async () => {
      await expect(
        reorderPastOrder(mockSupabase as any, {
          customerId: 'cust-stranger',
          orderIdentifier: 'CB-1001',
          sessionId: 'cart-session-3',
        })
      ).rejects.toThrow('Unauthorized: This order does not belong to your account');
    });
  });

  describe('5. Verified Product Reviews', () => {
    it('allows a review on a received order containing the product', async () => {
      const review = await submitReview(mockSupabase as any, 'cust-guest-01', {
        orderId: 'ord-001',
        productId: 'prod-coloring-book-01',
        rating: 5,
        title: 'Mindful bliss!',
        body: 'The paper quality is wonderful and markers do not bleed through.',
      });

      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.status).toBe('pending');

      const reviews = await getCustomerReviews(mockSupabase as any, 'cust-guest-01');
      expect(reviews.length).toBe(1);
      expect(reviews[0].title).toBe('Mindful bliss!');
    });

    it('rejects review if order has not been received yet', async () => {
      // ord-002 status is 'pending'
      mockSupabase._store.order_items.push({
        id: 'item-003',
        order_id: 'ord-002',
        product_id: 'prod-coloring-book-01',
        product_name: 'Mindful Floral Dreams',
        quantity: 1,
        unit_price: 5000,
        total: 5000,
      });

      await expect(
        submitReview(mockSupabase as any, 'cust-guest-02', {
          orderId: 'ord-002',
          productId: 'prod-coloring-book-01',
          rating: 5,
        })
      ).rejects.toThrow(/Reviews can only be submitted for orders that have been received/);
    });

    it('rejects duplicate review for the same product in the same order', async () => {
      // First review
      await submitReview(mockSupabase as any, 'cust-guest-01', {
        orderId: 'ord-001',
        productId: 'prod-coloring-book-01',
        rating: 5,
      });

      // Second review attempt
      await expect(
        submitReview(mockSupabase as any, 'cust-guest-01', {
          orderId: 'ord-001',
          productId: 'prod-coloring-book-01',
          rating: 4,
        })
      ).rejects.toThrow('A review has already been submitted for this item');
    });
  });

  describe('6. Stock Notifications & Replenishment Outbox Events', () => {
    it('subscribes customer to back-in-stock alerts and prevents duplicate active subscriptions', async () => {
      const sub1 = await subscribeToStockNotification(mockSupabase as any, 'cust-guest-01', {
        productId: 'prod-sold-out-book',
        channel: 'email',
      });

      expect(sub1.id).toBeDefined();
      expect(sub1.productSlug).toBe('midnight-patterns');

      // Duplicate attempt returns same subscription without extra DB row
      const sub2 = await subscribeToStockNotification(mockSupabase as any, 'cust-guest-01', {
        productId: 'prod-sold-out-book',
        channel: 'email',
      });

      expect(sub2.id).toBe(sub1.id);
      expect(mockSupabase._store.stock_notifications.length).toBe(1);
    });

    it('dispatches domain event when stock is replenished and marks notification notified', async () => {
      await subscribeToStockNotification(mockSupabase as any, 'cust-guest-01', {
        productId: 'prod-sold-out-book',
        channel: 'email',
      });

      const notifiedCount = await handleStockReplenishment(
        mockSupabase as any,
        'prod-sold-out-book',
        25
      );

      expect(notifiedCount).toBe(1);
      const events = mockSupabase._store.domain_events;
      expect(events.some((e) => e.event_type === 'stock_notification.eligible')).toBe(true);

      const notifRow = mockSupabase._store.stock_notifications[0];
      expect(notifRow.notified_at).not.toBeNull();
    });
  });

  describe('7. Secure Guest Order Tokens', () => {
    it('generates and validates signed guest order access tokens correctly', () => {
      const token = generateOrderAccessToken('CB-1001', 'bilal@example.com');
      expect(token).toBeDefined();

      const verification = verifyOrderAccessToken(token, 'CB-1001', 'bilal@example.com');
      expect(verification.valid).toBe(true);
      expect(verification.email).toBe('bilal@example.com');
    });

    it('rejects tampered or mismatched order tokens', () => {
      const token = generateOrderAccessToken('CB-1001', 'bilal@example.com');
      const tampered = token.slice(0, -5) + 'xxxxx';

      const verifyTampered = verifyOrderAccessToken(tampered, 'CB-1001');
      expect(verifyTampered.valid).toBe(false);

      const verifyWrongOrder = verifyOrderAccessToken(token, 'CB-9999');
      expect(verifyWrongOrder.valid).toBe(false);
    });
  });

  describe('8. Account Deletion & Data Anonymization', () => {
    it('anonymizes customer personal details and preserves historical commerce orders', async () => {
      const res = await deleteCustomerAccount(mockSupabase as any, 'cust-guest-01', 'auth-user-999');

      expect(res.success).toBe(true);

      // Customer profile anonymized
      const cust = mockSupabase._store.customers.find((c) => c.id === 'cust-guest-01');
      expect(cust?.first_name).toBe('Anonymized');
      expect(cust?.phone).toBeNull();
      expect(cust?.user_id).toBeNull();
      expect(cust?.email).toContain('@anonymized.local');

      // Orders and accounting records preserved
      const orders = mockSupabase._store.orders.filter((o) => o.customer_id === 'cust-guest-01');
      expect(orders.length).toBeGreaterThan(0);
    });
  });
});
