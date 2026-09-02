import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { revalidatePayment, sweepPendingPayments } from '@/services/payment-revalidation.service';
import { POST as adminRevalidatePost } from '@/app/api/admin/payments/revalidate/route';
import { POST as orderRevalidatePost } from '@/app/api/orders/[orderNumber]/revalidate/route';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/constants';

vi.mock('@/lib/supabase/client', () => ({
  getServiceSupabaseClient: vi.fn(),
  getAnonSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/auth-helpers', () => ({
  getAuthenticatedAdmin: vi.fn(),
  getAuthenticatedCustomer: vi.fn(),
}));

import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedAdmin, getAuthenticatedCustomer } from '@/lib/auth-helpers';

describe('Payment Revalidation Subsystem', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const orderId = 'ord-reval-01';
  const orderNumber = 'ORD-2026-REVAL01';
  const paymentId = 'pay-reval-01';
  const providerRef = 'UAD_TX_REVAL_001';

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle' }],
      orders: [
        {
          id: orderId,
          order_number: orderNumber,
          organization_id: orgId,
          customer_id: 'cust-01',
          warehouse_id: 'wh-01',
          status: ORDER_STATUS.CREATED,
          subtotal: 10000,
          total: 12000,
          created_at: new Date().toISOString(),
        },
      ],
      payments: [
        {
          id: paymentId,
          order_id: orderId,
          provider: 'paystack',
          provider_reference: providerRef,
          amount: 12000,
          currency: 'NGN',
          status: PAYMENT_STATUS.PENDING,
          created_at: new Date().toISOString(),
        },
      ],
      inventory: [
        {
          id: 'inv-01',
          warehouse_id: 'wh-01',
          product_id: 'prod-01',
          quantity: 10,
          reserved_quantity: 2,
        },
      ],
      inventory_reservations: [
        {
          id: 'res-reval-01',
          inventory_id: 'inv-01',
          order_id: orderId,
          quantity: 2,
          status: 'active',
          expires_at: new Date(Date.now() + 1800000).toISOString(),
        },
      ],
      order_status_history: [],
      audit_logs: [],
      domain_events: [],
    });

    vi.mocked(getServiceSupabaseClient).mockReturnValue(mockSupabase as any);
  });

  describe('1. Single Payment Revalidation', () => {
    it('successfully revalidates a pending payment when gateway confirms payment', async () => {
      // Mock global fetch for Paystack verify
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            id: 998877,
            status: 'success',
            reference: providerRef,
            amount: 1200000, // in kobo
            currency: 'NGN',
            channel: 'card',
            paid_at: '2026-08-30T11:00:00.000Z',
          },
        }),
      } as any);

      const result = await revalidatePayment(mockSupabase as any, {
        paymentId,
        triggeredBy: 'admin',
      });

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.status).toBe('successful');

      // Verify payment updated to successful
      const updatedPayment = mockSupabase._store.payments.find((p) => p.id === paymentId);
      expect(updatedPayment?.status).toBe(PAYMENT_STATUS.SUCCESSFUL);

      // Verify order updated to pending
      const updatedOrder = mockSupabase._store.orders.find((o) => o.id === orderId);
      expect(updatedOrder?.status).toBe(ORDER_STATUS.PENDING);

      // Verify reservation committed
      const reservation = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-reval-01');
      expect(reservation?.status).toBe('committed');

      // Verify audit log created
      const audit = mockSupabase._store.audit_logs.find((a) => a.entity_id === paymentId);
      expect(audit).toBeDefined();

      // Verify domain event emitted
      const event = mockSupabase._store.domain_events.find((e) => e.aggregate_id === paymentId);
      expect(event).toBeDefined();
    });

    it('returns idempotent response if payment is already marked successful', async () => {
      mockSupabase._store.payments[0].status = PAYMENT_STATUS.SUCCESSFUL;

      const result = await revalidatePayment(mockSupabase as any, {
        reference: providerRef,
      });

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.status).toBe('already_successful');
    });

    it('updates payment to failed and releases reservation if gateway confirms failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            id: 998877,
            status: 'failed',
            reference: providerRef,
            amount: 1200000,
            currency: 'NGN',
            gateway_response: 'Declined by bank',
          },
        }),
      } as any);

      const result = await revalidatePayment(mockSupabase as any, {
        orderNumber,
        triggeredBy: 'customer',
      });

      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.status).toBe('failed');

      const updatedPayment = mockSupabase._store.payments.find((p) => p.id === paymentId);
      expect(updatedPayment?.status).toBe(PAYMENT_STATUS.FAILED);

      const reservation = mockSupabase._store.inventory_reservations.find((r) => r.id === 'res-reval-01');
      expect(reservation?.status).toBe('released');
    });
  });

  describe('2. Batch Sweep Revalidation', () => {
    it('sweeps multiple pending payments and returns aggregate results', async () => {
      // Add a second pending payment
      mockSupabase._store.orders.push({
        id: 'ord-reval-02',
        order_number: 'ORD-2026-REVAL02',
        organization_id: orgId,
        customer_id: 'cust-02',
        warehouse_id: 'wh-01',
        status: ORDER_STATUS.CREATED,
        subtotal: 5000,
        total: 5000,
        created_at: new Date().toISOString(),
      });

      mockSupabase._store.payments.push({
        id: 'pay-reval-02',
        order_id: 'ord-reval-02',
        provider: 'paystack',
        provider_reference: 'UAD_TX_REVAL_002',
        amount: 5000,
        currency: 'NGN',
        status: PAYMENT_STATUS.PENDING,
        created_at: new Date().toISOString(),
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            amount: 1200000,
            currency: 'NGN',
            paid_at: new Date().toISOString(),
          },
        }),
      } as any);

      const sweep = await sweepPendingPayments(mockSupabase as any, {
        limit: 10,
        maxAgeHours: 24,
      });

      expect(sweep.processed).toBe(2);
      expect(sweep.results.length).toBe(2);
    });
  });

  describe('3. Admin & Customer API Endpoints', () => {
    it('POST /api/admin/payments/revalidate executes revalidation for authenticated admin', async () => {
      vi.mocked(getAuthenticatedAdmin).mockResolvedValue({
        user: { id: 'usr-admin-01', email: 'admin@unwind.com' } as any,
        membership: { id: 'mem-01', role: 'admin', organizationId: orgId, userId: 'usr-admin-01' } as any,
        organization: { id: orgId, name: 'Unwind & Doodle', slug: 'unwind' } as any,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: providerRef,
            amount: 1200000,
            currency: 'NGN',
            paid_at: new Date().toISOString(),
          },
        }),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/payments/revalidate', {
        method: 'POST',
        body: JSON.stringify({ paymentId }),
      });

      const res = await adminRevalidatePost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.verified).toBe(true);
    });

    it('POST /api/orders/[orderNumber]/revalidate executes customer revalidation with internal tracking header', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: 'success',
            reference: providerRef,
            amount: 1200000,
            currency: 'NGN',
            paid_at: new Date().toISOString(),
          },
        }),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/orders/${orderNumber}/revalidate`, {
        method: 'POST',
        headers: { 'x-internal-tracking': 'true' },
      });

      const res = await orderRevalidatePost(req, {
        params: Promise.resolve({ orderNumber }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('successful');
    });
  });
});
