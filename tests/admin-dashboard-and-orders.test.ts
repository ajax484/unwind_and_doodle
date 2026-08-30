import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  getAdminDashboardMetrics,
  listAdminOrders,
  getAdminOrderDetail,
  refundAdminOrder,
} from '@/services/admin-order.service';
import { transitionOrderStatus } from '@/services/order-state-machine.service';
import { ORDER_STATUS } from '@/lib/constants';
import { PaystackPaymentProvider } from '@/services/payment/paystack.provider';

describe('Phase 6B: Admin Dashboard & Order Management', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-other-store-02';

  const adminUserA = 'usr-admin-ada';
  const adminUserB = 'usr-admin-other';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Other Enterprise Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
        { id: 'mem-2', organization_id: orgB, user_id: adminUserB, role: 'admin' },
      ],
      customers: [
        {
          id: 'cust-chidi',
          email: 'chidi.okafor@example.com',
          first_name: 'Chidi',
          last_name: 'Okafor',
          phone: '+2348012345678',
        },
        {
          id: 'cust-ngozi',
          email: 'ngozi.eze@example.com',
          first_name: 'Ngozi',
          last_name: 'Eze',
          phone: '+2348098765432',
        },
      ],
      warehouses: [
        { id: 'wh-lagos', name: 'Lagos Mainland Hub', code: 'LOS-01' },
      ],
      locations: [
        { id: 'loc-lagos', name: 'Lagos', state: 'Lagos' },
      ],
      products: [
        { id: 'prod-book-01', name: 'The Bloom Coloring Book', sku: 'BK-BLOOM-01' },
        { id: 'prod-pencils-01', name: 'Premium Colored Pencils (24 Pack)', sku: 'ACC-PENCIL-24' },
      ],
      orders: [
        // Order 1: Org A, placed today, pending, total 15000
        {
          id: 'ord-today-pending',
          order_number: 'UAD-1001',
          organization_id: orgA,
          customer_id: 'cust-chidi',
          email: 'chidi.okafor@example.com',
          first_name: 'Chidi',
          last_name: 'Okafor',
          phone: '+2348012345678',
          warehouse_id: 'wh-lagos',
          location_id: 'loc-lagos',
          subtotal: 12000,
          discount_total: 0,
          shipping_fee: 3000,
          total: 15000,
          status: ORDER_STATUS.PENDING,
          shipping_address: {
            streetAddress: '14 Admiralty Way',
            city: 'Lekki',
            state: 'Lagos',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        // Order 2: Org A, placed today, confirmed, total 25000
        {
          id: 'ord-today-confirmed',
          order_number: 'UAD-1002',
          organization_id: orgA,
          customer_id: 'cust-ngozi',
          email: 'ngozi.eze@example.com',
          first_name: 'Ngozi',
          last_name: 'Eze',
          phone: '+2348098765432',
          warehouse_id: 'wh-lagos',
          location_id: 'loc-lagos',
          subtotal: 22000,
          discount_total: 0,
          shipping_fee: 3000,
          total: 25000,
          status: ORDER_STATUS.CONFIRMED,
          shipping_address: {
            streetAddress: '25 Victoria Island',
            city: 'Lagos',
            state: 'Lagos',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        // Order 3: Org A, placed today, cancelled, total 10000 (should NOT count toward revenue)
        {
          id: 'ord-today-cancelled',
          order_number: 'UAD-1003',
          organization_id: orgA,
          customer_id: 'cust-chidi',
          email: 'chidi.okafor@example.com',
          first_name: 'Chidi',
          last_name: 'Okafor',
          phone: '+2348012345678',
          warehouse_id: 'wh-lagos',
          location_id: 'loc-lagos',
          subtotal: 7000,
          discount_total: 0,
          shipping_fee: 3000,
          total: 10000,
          status: ORDER_STATUS.CANCELLED,
          shipping_address: { streetAddress: '14 Admiralty Way', city: 'Lekki', state: 'Lagos' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        // Order 4: Org B order (Tenant isolation test)
        {
          id: 'ord-org-b-01',
          order_number: 'ORG-B-999',
          organization_id: orgB,
          customer_id: 'cust-ngozi',
          email: 'ngozi.eze@example.com',
          first_name: 'Ngozi',
          last_name: 'Eze',
          total: 50000,
          status: ORDER_STATUS.PENDING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      order_items: [
        {
          id: 'item-1',
          order_id: 'ord-today-pending',
          product_id: 'prod-book-01',
          product_name: 'The Bloom Coloring Book',
          sku: 'BK-BLOOM-01',
          quantity: 1,
          unit_price: 12000,
          total: 12000,
        },
      ],
      order_item_addons: [
        {
          id: 'addon-1',
          order_item_id: 'item-1',
          addon_product_id: 'prod-pencils-01',
          product_name: 'Premium Colored Pencils (24 Pack)',
          quantity: 1,
          unit_price: 3000,
          total: 3000,
        },
      ],
      customizations: [
        {
          id: 'cust-entry-1',
          order_item_id: 'item-1',
          notes: 'Please add "To Deola with love" on the first page',
          status: 'pending_review',
        },
      ],
      customization_assets: [
        {
          id: 'asset-1',
          customization_id: 'cust-entry-1',
          storage_path: 'customizations/deola-photo.jpg',
          asset_url: 'https://storage.example.com/customizations/deola-photo.jpg',
          mime_type: 'image/jpeg',
        },
      ],
      payments: [
        {
          id: 'pay-1',
          order_id: 'ord-today-pending',
          amount: 15000,
          currency: 'NGN',
          status: 'successful',
          provider: 'paystack',
          provider_reference: 'PSTK_REF_001',
          reference: 'UAD_ORD_1001',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'pay-2',
          order_id: 'ord-today-confirmed',
          amount: 25000,
          currency: 'NGN',
          status: 'successful',
          provider: 'paystack',
          provider_reference: 'PSTK_REF_002',
          reference: 'UAD_ORD_1002',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
      order_status_history: [
        {
          id: 'hist-1',
          order_id: 'ord-today-pending',
          from_status: ORDER_STATUS.CREATED,
          to_status: ORDER_STATUS.PENDING,
          status: ORDER_STATUS.PENDING,
          previous_status: ORDER_STATUS.CREATED,
          note: 'Payment verified, order awaiting admin review',
          created_at: new Date().toISOString(),
        },
      ],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Dashboard Metrics & KPI Calculations', () => {
    it('calculates orders today, pending attention count, and revenue accurately', async () => {
      const metrics = await getAdminDashboardMetrics(mockSupabase, orgA);

      // Orders today: 3 orders for Org A (ord-today-pending, ord-today-confirmed, ord-today-cancelled)
      expect(metrics.ordersToday).toBe(3);

      // Pending attention orders: 1 (ord-today-pending)
      expect(metrics.pendingOrdersCount).toBe(1);

      // Revenue: 15,000 (pending) + 25,000 (confirmed) = 40,000. Cancelled order (10,000) is excluded.
      expect(metrics.revenueToday).toBe(40000);
      expect(metrics.revenueThisMonth).toBe(40000);

      // Verify pending orders stream
      expect(metrics.pendingOrders.length).toBe(1);
      expect(metrics.pendingOrders[0].orderNumber).toBe('UAD-1001');

      // Verify recent orders stream
      expect(metrics.recentOrders.length).toBe(3);
    });

    it('enforces multi-tenant isolation in dashboard metrics', async () => {
      const metricsOrgB = await getAdminDashboardMetrics(mockSupabase, orgB);

      expect(metricsOrgB.ordersToday).toBe(1);
      expect(metricsOrgB.pendingOrdersCount).toBe(1);
      expect(metricsOrgB.revenueToday).toBe(50000);
      expect(metricsOrgB.pendingOrders[0].orderNumber).toBe('ORG-B-999');
    });
  });

  describe('2. Order Listing, Search, Filter, Sort & Pagination', () => {
    it('searches orders by order number, customer name, email, and phone', async () => {
      // Search by order number
      const resByNum = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        search: 'UAD-1001',
      });
      expect(resByNum.orders.length).toBe(1);
      expect(resByNum.orders[0].id).toBe('ord-today-pending');

      // Search by customer name
      const resByName = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        search: 'Ngozi',
      });
      expect(resByName.orders.length).toBe(1);
      expect(resByName.orders[0].id).toBe('ord-today-confirmed');

      // Search by customer email
      const resByEmail = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        search: 'chidi.okafor@example.com',
      });
      expect(resByEmail.orders.length).toBe(2);
    });

    it('filters orders by order status and payment status', async () => {
      // Filter by status: pending
      const pendingOrders = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        status: 'pending',
      });
      expect(pendingOrders.orders.length).toBe(1);
      expect(pendingOrders.orders[0].status).toBe(ORDER_STATUS.PENDING);

      // Filter by payment status: successful
      const paidOrders = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        paymentStatus: 'successful',
      });
      expect(paidOrders.orders.length).toBe(2);
    });

    it('sorts orders by highest total and lowest total', async () => {
      const highestFirst = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        sortBy: 'highest_total',
      });
      expect(highestFirst.orders[0].totalAmount).toBe(25000);
      expect(highestFirst.orders[1].totalAmount).toBe(15000);

      const lowestFirst = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        sortBy: 'lowest_total',
      });
      expect(lowestFirst.orders[0].totalAmount).toBe(10000);
    });

    it('paginates orders correctly', async () => {
      const paginated = await listAdminOrders(mockSupabase, {
        organizationId: orgA,
        limit: 2,
        page: 1,
      });

      expect(paginated.orders.length).toBe(2);
      expect(paginated.pagination.total).toBe(3);
      expect(paginated.pagination.totalPages).toBe(2);
      expect(paginated.pagination.page).toBe(1);
    });
  });

  describe('3. Order Details Inspection', () => {
    it('retrieves comprehensive order details including add-ons, customizations, and history', async () => {
      const detail = await getAdminOrderDetail(mockSupabase, 'ord-today-pending', orgA);

      expect(detail.id).toBe('ord-today-pending');
      expect(detail.orderNumber).toBe('UAD-1001');
      expect(detail.customer.email).toBe('chidi.okafor@example.com');
      expect(detail.shippingAddress.streetAddress).toBe('14 Admiralty Way');

      // Verify line items and add-ons
      expect(detail.items.length).toBe(1);
      const item = detail.items[0];
      expect(item.productName).toBe('The Bloom Coloring Book');
      expect(item.addons.length).toBe(1);
      expect(item.addons[0].addonName).toBe('Premium Colored Pencils (24 Pack)');
      expect(item.addons[0].totalPrice).toBe(3000);

      // Verify customizations
      expect(item.customization).toBeDefined();
      expect(item.customization?.notes).toContain('To Deola with love');
      expect(item.customization?.assets.length).toBe(1);
      expect(item.customization?.assets[0].assetUrl).toContain('deola-photo.jpg');

      // Verify payments
      expect(detail.payments.length).toBe(1);
      expect(detail.payments[0].provider).toBe('paystack');
      expect(detail.payments[0].status).toBe('successful');

      // Verify status history
      expect(detail.statusHistory.length).toBe(1);
      expect(detail.statusHistory[0].status).toBe('pending');
    });

    it('denies cross-organization order detail inspection', async () => {
      // Admin from Org A tries to access Org B order
      await expect(
        getAdminOrderDetail(mockSupabase, 'ord-org-b-01', orgA)
      ).rejects.toThrow(/Forbidden|unauthorized|not found/i);
    });
  });

  describe('4. Order State Machine Transitions', () => {
    it('transitions order from pending to confirmed with status history and domain event', async () => {
      const result = await transitionOrderStatus({
        supabase: mockSupabase,
        orderId: 'ord-today-pending',
        targetStatus: ORDER_STATUS.CONFIRMED,
        userId: adminUserA,
        note: 'Order confirmed after manual stock verification',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(ORDER_STATUS.CONFIRMED);

      // Verify updated database state
      const updatedOrder = mockSupabase._store.orders.find((o) => o.id === 'ord-today-pending');
      expect(updatedOrder?.status).toBe(ORDER_STATUS.CONFIRMED);

      // Verify status history record
      const history = mockSupabase._store.order_status_history.filter(
        (h) => h.order_id === 'ord-today-pending'
      );
      expect(history.length).toBe(2);
      expect(history[1].to_status).toBe(ORDER_STATUS.CONFIRMED);
      expect(history[1].changed_by).toBe(adminUserA);

      // Verify domain events
      const events = mockSupabase._store.domain_events.filter(
        (e) => e.aggregate_id === 'ord-today-pending'
      );
      expect(events.some((e) => e.event_type === 'order.confirmed')).toBe(true);
      expect(events.some((e) => e.event_type === 'order.status_changed')).toBe(true);
    });

    it('transitions order from confirmed to shipped with tracking metadata and timestamp', async () => {
      const result = await transitionOrderStatus({
        supabase: mockSupabase,
        orderId: 'ord-today-confirmed',
        targetStatus: ORDER_STATUS.SHIPPED,
        userId: adminUserA,
        note: 'Shipped via GIG Logistics (Tracking: GIG-LOS-1029)',
        metadata: { trackingNumber: 'GIG-LOS-1029', carrier: 'GIG Logistics' },
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(ORDER_STATUS.SHIPPED);

      const updated = mockSupabase._store.orders.find((o) => o.id === 'ord-today-confirmed');
      expect(updated?.status).toBe(ORDER_STATUS.SHIPPED);
      expect(updated?.shipped_at).toBeDefined();
    });

    it('transitions order from shipped to received and sets received_at', async () => {
      // First move to shipped
      await transitionOrderStatus({
        supabase: mockSupabase,
        orderId: 'ord-today-confirmed',
        targetStatus: ORDER_STATUS.SHIPPED,
        userId: adminUserA,
      });

      // Then move to received
      const result = await transitionOrderStatus({
        supabase: mockSupabase,
        orderId: 'ord-today-confirmed',
        targetStatus: ORDER_STATUS.RECEIVED,
        userId: adminUserA,
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(ORDER_STATUS.RECEIVED);

      const updated = mockSupabase._store.orders.find((o) => o.id === 'ord-today-confirmed');
      expect(updated?.status).toBe(ORDER_STATUS.RECEIVED);
      expect(updated?.received_at).toBeDefined();
    });

    it('rejects invalid state transitions (e.g. received -> pending)', async () => {
      // Set to received
      mockSupabase._store.orders[0].status = ORDER_STATUS.RECEIVED;

      await expect(
        transitionOrderStatus({
          supabase: mockSupabase,
          orderId: 'ord-today-pending',
          targetStatus: ORDER_STATUS.PENDING,
        })
      ).rejects.toThrow(/Invalid status transition/i);
    });
  });

  describe('5. Paystack Full Refund & Idempotency', () => {
    it('executes full refund, transitions order to refunded, and records audit event', async () => {
      const mockPaystack = new PaystackPaymentProvider();
      const refundSpy = vi.fn().mockResolvedValue({
        status: 'processed',
        refundId: 'ref_pstk_998',
        amount: 15000,
        currency: 'NGN',
        transactionReference: 'PSTK_REF_001',
      });
      mockPaystack.refundTransaction = refundSpy;

      const result = await refundAdminOrder({
        supabase: mockSupabase,
        orderId: 'ord-today-pending',
        userId: adminUserA,
        organizationId: orgA,
        reason: 'Customer cancelled prior to printing',
        paystackProvider: mockPaystack,
      });

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(15000);

      // Verify order status
      const updatedOrder = mockSupabase._store.orders.find((o) => o.id === 'ord-today-pending');
      expect(updatedOrder?.status).toBe(ORDER_STATUS.REFUNDED);
      expect(updatedOrder?.refunded_at).toBeDefined();

      // Verify payment status
      const updatedPayment = mockSupabase._store.payments.find((p) => p.order_id === 'ord-today-pending');
      expect(updatedPayment?.status).toBe('refunded');

      // Verify domain events
      const events = mockSupabase._store.domain_events.filter(
        (e) => e.aggregate_id === 'ord-today-pending'
      );
      expect(events.some((e) => e.event_type === 'order.refunded')).toBe(true);
    });

    it('prevents duplicate refund calls (idempotency)', async () => {
      // Mark as already refunded
      mockSupabase._store.orders[0].status = ORDER_STATUS.REFUNDED;

      await expect(
        refundAdminOrder({
          supabase: mockSupabase,
          orderId: 'ord-today-pending',
          userId: adminUserA,
          organizationId: orgA,
        })
      ).rejects.toThrow(/already refunded/i);
    });

    it('denies cross-organization refund attempts', async () => {
      await expect(
        refundAdminOrder({
          supabase: mockSupabase,
          orderId: 'ord-org-b-01',
          userId: adminUserA,
          organizationId: orgA, // Admin A attempting to refund Org B order
        })
      ).rejects.toThrow(/Forbidden|unauthorized|not found/i);
    });
  });
});
