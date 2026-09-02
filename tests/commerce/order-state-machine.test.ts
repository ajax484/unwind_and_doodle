import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  canTransitionOrderStatus,
  transitionOrderStatus,
} from '@/services/order-state-machine.service';
import { listAdminOrders, getAdminOrderDetail } from '@/services/admin-order.service';
import { requireAdminAuth } from '@/services/auth.service';
import { ORDER_STATUS } from '@/lib/constants';

describe('Order State Machine & Admin Management', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const adminUserId = 'user-admin-99';
  const regularUserId = 'user-customer-11';
  const orgId = 'org-unwind-01';

  const warehouseId = 'wh-lagos-01';
  const locationId = 'loc-lagos-01';
  const customerId = 'cust-ada-01';
  const orderId = 'ord-test-state-01';
  const bookId = 'prod-book-01';
  const pencilId = 'prod-pencil-01';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle Ltd', slug: 'unwind-and-doodle' }],
      organization_members: [
        { id: 'mem-1', organization_id: orgId, user_id: adminUserId, role: 'admin' },
      ],
      warehouses: [{ id: warehouseId, name: 'Lagos Main Hub', code: 'LAG-01', is_active: true }],
      locations: [{ id: locationId, name: 'Ikeja', state: 'Lagos', country: 'Nigeria', is_active: true }],
      customers: [
        {
          id: customerId,
          email: 'ada@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          phone: '08012345678',
          marketing_consent: true,
        },
      ],
      products: [
        { id: bookId, name: 'Coloring Book', sku: 'BK-001', price: 4000, is_active: true },
        { id: pencilId, name: 'Color Pencils', sku: 'PC-001', price: 2000, is_active: true },
      ],
      orders: [
        {
          id: orderId,
          order_number: 'ORD-STATE-001',
          customer_id: customerId,
          warehouse_id: warehouseId,
          location_id: locationId,
          status: ORDER_STATUS.PENDING,
          subtotal: 8000,
          add_ons_total: 2000,
          discount_total: 500,
          delivery_fee: 1500,
          total_amount: 11000,
          currency: 'NGN',
          shipping_address: { streetAddress: '12 Marina St', city: 'Lagos', state: 'Lagos' },
          notes: 'Deliver before noon',
          created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
      ],
      order_items: [
        {
          id: 'item-1',
          order_id: orderId,
          product_id: bookId,
          quantity: 2,
          unit_price: 4000,
          total_price: 8000,
          customization_id: 'cust-entry-1',
        },
      ],
      order_item_addons: [
        {
          id: 'addon-1',
          order_item_id: 'item-1',
          addon_product_id: pencilId,
          quantity: 1,
          unit_price: 2000,
          total_price: 2000,
        },
      ],
      customizations: [
        {
          id: 'cust-entry-1',
          customer_id: customerId,
          product_id: bookId,
          notes: 'Custom dedication: Happy Birthday Ada',
          status: 'submitted',
        },
      ],
      customization_assets: [
        {
          id: 'asset-1',
          customization_id: 'cust-entry-1',
          asset_url: 'https://storage.example.com/custom-photo.jpg',
          file_type: 'image',
        },
      ],
      payments: [
        {
          id: 'pay-001',
          order_id: orderId,
          provider: 'flutterwave',
          provider_reference: 'UAD_FLW_REF_999',
          amount: 11000,
          currency: 'NGN',
          status: 'successful',
          metadata: { paid_at: new Date().toISOString() },
        },
      ],
      order_status_history: [
        {
          id: 'hist-1',
          order_id: orderId,
          status: ORDER_STATUS.CREATED,
          previous_status: null,
          note: 'Checkout initiated',
          created_by: null,
          created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
        {
          id: 'hist-2',
          order_id: orderId,
          status: ORDER_STATUS.PENDING,
          previous_status: ORDER_STATUS.CREATED,
          note: 'Payment completed via Flutterwave',
          created_by: null,
          created_at: new Date(Date.now() - 3000 * 1000).toISOString(),
        },
      ],
      inventory_reservations: [
        {
          id: 'res-1',
          warehouse_id: warehouseId,
          product_id: bookId,
          quantity: 2,
          status: 'committed',
          reference_type: 'order',
          reference_id: orderId,
          expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        },
      ],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('Order State Machine Transition Validation Matrix', () => {
    it('allows valid fulfillment progression: created -> pending -> confirmed -> shipped -> received', () => {
      expect(canTransitionOrderStatus(ORDER_STATUS.CREATED, ORDER_STATUS.PENDING)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.SHIPPED, ORDER_STATUS.RECEIVED)).toBe(true);
    });

    it('allows valid cancellation paths', () => {
      expect(canTransitionOrderStatus(ORDER_STATUS.CREATED, ORDER_STATUS.CANCELLED)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED)).toBe(true);
    });

    it('allows valid refund paths', () => {
      expect(canTransitionOrderStatus(ORDER_STATUS.PENDING, ORDER_STATUS.REFUNDED)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.CONFIRMED, ORDER_STATUS.REFUNDED)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.SHIPPED, ORDER_STATUS.REFUNDED)).toBe(true);
      expect(canTransitionOrderStatus(ORDER_STATUS.RECEIVED, ORDER_STATUS.REFUNDED)).toBe(true);
    });

    it('strictly rejects arbitrary or backwards transitions', () => {
      // Skipping states
      expect(canTransitionOrderStatus(ORDER_STATUS.CREATED, ORDER_STATUS.SHIPPED)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.CREATED, ORDER_STATUS.RECEIVED)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.CREATED, ORDER_STATUS.CONFIRMED)).toBe(false);

      // Backwards
      expect(canTransitionOrderStatus(ORDER_STATUS.SHIPPED, ORDER_STATUS.PENDING)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.SHIPPED, ORDER_STATUS.CONFIRMED)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.RECEIVED, ORDER_STATUS.CONFIRMED)).toBe(false);

      // Same status
      expect(canTransitionOrderStatus(ORDER_STATUS.CONFIRMED, ORDER_STATUS.CONFIRMED)).toBe(false);

      // Terminal states cannot transition out
      expect(canTransitionOrderStatus(ORDER_STATUS.CANCELLED, ORDER_STATUS.PENDING)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.CANCELLED, ORDER_STATUS.CONFIRMED)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.REFUNDED, ORDER_STATUS.SHIPPED)).toBe(false);
    });
  });

  describe('Atomic Status Transition Execution & Side Effects', () => {
    it('transitions order from pending to confirmed with status history, audit log, and domain event', async () => {
      const result = await transitionOrderStatus({
        supabase: mockSupabase,
        orderId,
        targetStatus: ORDER_STATUS.CONFIRMED,
        userId: adminUserId,
        note: 'Order confirmed and ready for packaging',
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe(ORDER_STATUS.PENDING);
      expect(result.newStatus).toBe(ORDER_STATUS.CONFIRMED);

      // 1. Verify order table
      const order = mockSupabase._store.orders.find((o) => o.id === orderId);
      expect(order.status).toBe(ORDER_STATUS.CONFIRMED);

      // 2. Verify order_status_history
      const history = mockSupabase._store.order_status_history.find(
        (h) => h.order_id === orderId && h.status === ORDER_STATUS.CONFIRMED
      );
      expect(history).toBeDefined();
      expect(history.previous_status).toBe(ORDER_STATUS.PENDING);
      expect(history.created_by).toBe(adminUserId);
      expect(history.note).toBe('Order confirmed and ready for packaging');

      // 3. Verify audit_logs
      const audit = mockSupabase._store.audit_logs.find(
        (a) => a.entity_id === orderId && a.action === 'order.status_transition'
      );
      expect(audit).toBeDefined();
      expect(audit.user_id).toBe(adminUserId);
      expect(audit.old_values.status).toBe(ORDER_STATUS.PENDING);
      expect(audit.new_values.status).toBe(ORDER_STATUS.CONFIRMED);

      // 4. Verify domain_events
      const event = mockSupabase._store.domain_events.find(
        (e) => e.aggregate_id === orderId && e.event_type === 'order.status_changed'
      );
      expect(event).toBeDefined();
      expect(event.payload.newStatus).toBe(ORDER_STATUS.CONFIRMED);
      expect(event.payload.updatedBy).toBe(adminUserId);
    });

    it('rejects illegal transition and does not write history, audit log, or event', async () => {
      await expect(
        transitionOrderStatus({
          supabase: mockSupabase,
          orderId,
          targetStatus: ORDER_STATUS.RECEIVED, // Illegal from pending
          userId: adminUserId,
        })
      ).rejects.toThrow(/Invalid status transition from 'pending' to 'received'/);

      const order = mockSupabase._store.orders.find((o) => o.id === orderId);
      expect(order.status).toBe(ORDER_STATUS.PENDING); // Unchanged

      const audit = mockSupabase._store.audit_logs.find((a) => a.entity_id === orderId);
      expect(audit).toBeUndefined();
    });

    it('releases reservation hold when created order is cancelled', async () => {
      // Setup created order with active reservation
      const createdOrderId = 'ord-created-cancel';
      mockSupabase._store.orders.push({
        id: createdOrderId,
        order_number: 'ORD-CREATED-01',
        customer_id: customerId,
        warehouse_id: warehouseId,
        location_id: locationId,
        status: ORDER_STATUS.CREATED,
        subtotal: 4000,
        total_amount: 4000,
        currency: 'NGN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockSupabase._store.inventory.push({
        warehouse_id: warehouseId,
        product_id: bookId,
        quantity: 10,
        reserved_quantity: 2,
      });
      mockSupabase._store.inventory_reservations.push({
        id: 'res-cancel-test',
        warehouse_id: warehouseId,
        product_id: bookId,
        quantity: 2,
        status: 'active',
        reference_type: 'order',
        reference_id: createdOrderId,
        expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      });

      await transitionOrderStatus({
        supabase: mockSupabase,
        orderId: createdOrderId,
        targetStatus: ORDER_STATUS.CANCELLED,
        userId: adminUserId,
        note: 'Customer requested cancellation before payment',
      });

      const res = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-cancel-test');
      expect(res.status).toBe('released');

      const inv = mockSupabase._store.inventory.find(
        (i) => i.warehouse_id === warehouseId && i.product_id === bookId
      );
      expect(inv.reserved_quantity).toBe(0);
    });
  });

  describe('Organization Admin Authorization', () => {
    it('authorizes organization members with admin/manager roles', async () => {
      const result = await requireAdminAuth(mockSupabase, adminUserId);
      expect(result.authorized).toBe(true);
      expect(result.organizationId).toBe(orgId);
      expect(result.role).toBe('admin');
    });

    it('rejects unauthorized users or non-members with Forbidden', async () => {
      await expect(requireAdminAuth(mockSupabase, regularUserId)).rejects.toThrow(
        /Forbidden: Administrative privileges required/
      );
    });

    it('rejects requests with missing user credentials', async () => {
      await expect(requireAdminAuth(mockSupabase, null)).rejects.toThrow(
        /Authentication required: Missing user ID/
      );
    });
  });

  describe('Admin Order Querying & Detail Inspection', () => {
    it('lists orders with search by order number and customer name', async () => {
      // 1. Search by order number
      const res1 = await listAdminOrders(mockSupabase, { search: 'STATE-001', page: 1, limit: 10 });
      expect(res1.orders.length).toBe(1);
      expect(res1.orders[0].orderNumber).toBe('ORD-STATE-001');
      expect(res1.orders[0].customer.name).toBe('Ada Lovelace');
      expect(res1.orders[0].paymentStatus).toBe('successful');

      // 2. Search by customer email
      const res2 = await listAdminOrders(mockSupabase, { search: 'ada@example.com', page: 1, limit: 10 });
      expect(res2.orders.length).toBe(1);
      expect(res2.orders[0].id).toBe(orderId);

      // 3. Search with non-existent query
      const res3 = await listAdminOrders(mockSupabase, { search: 'nonexistent', page: 1, limit: 10 });
      expect(res3.orders.length).toBe(0);
    });

    it('filters orders by status and warehouse', async () => {
      const pendingOrders = await listAdminOrders(mockSupabase, {
        status: ORDER_STATUS.PENDING,
        warehouseId,
        page: 1,
        limit: 10,
      });
      expect(pendingOrders.orders.length).toBe(1);

      const shippedOrders = await listAdminOrders(mockSupabase, {
        status: ORDER_STATUS.SHIPPED,
        page: 1,
        limit: 10,
      });
      expect(shippedOrders.orders.length).toBe(0);
    });

    it('retrieves comprehensive order details including line items, add-ons, customizations, payments, timeline, and audit logs', async () => {
      const detail = await getAdminOrderDetail(mockSupabase, orderId);

      expect(detail.id).toBe(orderId);
      expect(detail.orderNumber).toBe('ORD-STATE-001');
      expect(detail.customer.email).toBe('ada@example.com');
      expect(detail.warehouse.name).toBe('Lagos Main Hub');
      expect(detail.location.name).toBe('Ikeja');

      // Line items with add-ons and customizations
      expect(detail.items.length).toBe(1);
      expect(detail.items[0].productName).toBe('Coloring Book');
      expect(detail.items[0].addons.length).toBe(1);
      expect(detail.items[0].addons[0].addonName).toBe('Color Pencils');
      expect(detail.items[0].customization?.notes).toBe('Custom dedication: Happy Birthday Ada');
      expect(detail.items[0].customization?.assets.length).toBe(1);
      expect(detail.items[0].customization?.assets[0].assetUrl).toBe(
        'https://storage.example.com/custom-photo.jpg'
      );

      // Payment details
      expect(detail.payments.length).toBe(1);
      expect(detail.payments[0].provider).toBe('flutterwave');
      expect(detail.payments[0].status).toBe('successful');

      // History timeline
      expect(detail.statusHistory.length).toBe(2);
      expect(detail.statusHistory[0].status).toBe(ORDER_STATUS.CREATED);
      expect(detail.statusHistory[1].status).toBe(ORDER_STATUS.PENDING);

      // Reservations
      expect(detail.reservations.length).toBe(1);
      expect(detail.reservations[0].status).toBe('committed');
    });
  });
});
