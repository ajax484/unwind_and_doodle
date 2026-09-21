import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  listAdminPayments,
  getAdminPaymentDetail,
  refundPayment,
} from '@/services/payment-management.service';
import {
  getPaymentProviderLabel,
  PaystackPaymentProvider,
  FlutterwavePaymentProvider,
  ManualPaymentProvider,
} from '@/services/payment';
import { updatePaymentMethod } from '@/services/payment-settings.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES } from '@/lib/constants';

describe('Payment History, Refunds & Admin Payment Management (Step 5)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgA = 'org-pm-alpha';
  const orgB = 'org-pm-beta';
  const adminUserA = 'user-admin-alpha';

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Alpha Store Ltd', slug: 'alpha-store' },
        { id: orgB, name: 'Beta Store Ltd', slug: 'beta-store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
      ],
      orders: [
        {
          id: 'ord-pay-1',
          order_number: 'UD-1001',
          organization_id: orgA,
          status: ORDER_STATUS.PENDING,
          total: 25000,
          email: 'ada@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          created_at: '2026-09-20T10:00:00Z',
        },
        {
          id: 'ord-pay-2',
          order_number: 'UD-1002',
          organization_id: orgA,
          status: ORDER_STATUS.PENDING,
          total: 18500,
          email: 'bayo@example.com',
          first_name: 'Bayo',
          last_name: 'Ogunlesi',
          created_at: '2026-09-20T11:00:00Z',
        },
        {
          id: 'ord-pay-3',
          order_number: 'UD-1003',
          organization_id: orgA,
          status: ORDER_STATUS.CREATED,
          total: 12000,
          email: 'chidi@example.com',
          first_name: 'Chidi',
          last_name: 'Anagonye',
          created_at: '2026-09-20T12:00:00Z',
        },
        {
          id: 'ord-pay-beta',
          order_number: 'UD-9999',
          organization_id: orgB,
          status: ORDER_STATUS.PENDING,
          total: 50000,
          email: 'beta@example.com',
          first_name: 'Beta',
          last_name: 'User',
          created_at: '2026-09-20T13:00:00Z',
        },
      ],
      payments: [
        {
          id: 'pay-pstk-1',
          order_id: 'ord-pay-1',
          provider: 'paystack',
          provider_reference: 'PSTK_TX_001',
          amount: 25000,
          currency: 'NGN',
          status: PAYMENT_STATUS.SUCCESSFUL,
          paid_at: '2026-09-20T10:05:00Z',
          created_at: '2026-09-20T10:00:00Z',
          metadata: { order_id: 'ord-pay-1' },
        },
        {
          id: 'pay-flw-2',
          order_id: 'ord-pay-2',
          provider: 'flutterwave',
          provider_reference: 'FLW_TX_002',
          amount: 18500,
          currency: 'NGN',
          status: PAYMENT_STATUS.SUCCESSFUL,
          paid_at: '2026-09-20T11:05:00Z',
          created_at: '2026-09-20T11:00:00Z',
          metadata: { order_id: 'ord-pay-2' },
        },
        {
          id: 'pay-man-3',
          order_id: 'ord-pay-3',
          provider: 'manual',
          provider_reference: 'MAN_TX_003',
          amount: 12000,
          currency: 'NGN',
          status: PAYMENT_STATUS.PENDING,
          created_at: '2026-09-20T12:00:00Z',
          metadata: {
            order_id: 'ord-pay-3',
            bank_details: {
              bankName: 'Guaranty Trust Bank',
              accountName: 'Unwind & Doodle Studios Ltd',
              accountNumber: '0123456789',
            },
          },
        },
        {
          id: 'pay-beta-9',
          order_id: 'ord-pay-beta',
          provider: 'paystack',
          provider_reference: 'PSTK_BETA_999',
          amount: 50000,
          currency: 'NGN',
          status: PAYMENT_STATUS.SUCCESSFUL,
          created_at: '2026-09-20T13:00:00Z',
          metadata: { order_id: 'ord-pay-beta' },
        },
      ],
      organization_payment_methods: [
        {
          id: 'pm-pstk',
          organization_id: orgA,
          provider: 'paystack',
          enabled: true,
          display_title: 'Paystack',
        },
        {
          id: 'pm-flw',
          organization_id: orgA,
          provider: 'flutterwave',
          enabled: true,
          display_title: 'Flutterwave',
        },
        {
          id: 'pm-man',
          organization_id: orgA,
          provider: 'manual',
          enabled: true,
          display_title: 'Bank Transfer',
        },
      ],
    });
  });

  // 1. Presentation Label Mapping
  describe('Provider Presentation Formatting', () => {
    it('maps internal provider identifiers to human-readable labels', () => {
      expect(getPaymentProviderLabel('paystack')).toBe('Paystack');
      expect(getPaymentProviderLabel('flutterwave')).toBe('Flutterwave');
      expect(getPaymentProviderLabel('manual')).toBe('Bank Transfer');
      expect(getPaymentProviderLabel(null)).toBe('Unknown');
      expect(getPaymentProviderLabel('custom_gateway')).toBe('custom_gateway');
    });
  });

  // 2. Payment History Listing & Multi-Tenant Scoping
  describe('Payment History & Filtering', () => {
    it('lists payments strictly scoped to the requesting organization', async () => {
      const response = await listAdminPayments(mockSupabase as any, {
        organizationId: orgA,
      });

      expect(response.payments).toHaveLength(3);
      expect(response.payments.every((p) => p.orderId !== 'ord-pay-beta')).toBe(true);
      expect(response.pagination.total).toBe(3);
    });

    it('filters payments by status and provider', async () => {
      // Filter by status = successful
      const successRes = await listAdminPayments(mockSupabase as any, {
        organizationId: orgA,
        status: 'successful',
      });
      expect(successRes.payments).toHaveLength(2);

      // Filter by provider = manual
      const manualRes = await listAdminPayments(mockSupabase as any, {
        organizationId: orgA,
        provider: 'manual',
      });
      expect(manualRes.payments).toHaveLength(1);
      expect(manualRes.payments[0].providerLabel).toBe('Bank Transfer');
      expect(manualRes.payments[0].status).toBe(PAYMENT_STATUS.PENDING);
    });

    it('searches payments by order number, customer name, and reference', async () => {
      const searchRes = await listAdminPayments(mockSupabase as any, {
        organizationId: orgA,
        search: 'FLW_TX_002',
      });
      expect(searchRes.payments).toHaveLength(1);
      expect(searchRes.payments[0].orderNumber).toBe('UD-1002');
      expect(searchRes.payments[0].customer.name).toBe('Bayo Ogunlesi');
    });
  });

  // 3. Payment Detail Query
  describe('Payment Details & Timeline', () => {
    it('retrieves detailed payment metadata, snapshotted bank details, and timeline', async () => {
      const detail = await getAdminPaymentDetail(
        mockSupabase as any,
        'pay-man-3',
        orgA
      );

      expect(detail.id).toBe('pay-man-3');
      expect(detail.providerLabel).toBe('Bank Transfer');
      expect(detail.bankDetails).toEqual({
        bankName: 'Guaranty Trust Bank',
        accountName: 'Unwind & Doodle Studios Ltd',
        accountNumber: '0123456789',
      });
      expect(detail.timeline.length).toBeGreaterThan(0);
      expect(detail.timeline[0].type).toBe('created');
    });

    it('rejects accessing payment details of another organization', async () => {
      await expect(
        getAdminPaymentDetail(mockSupabase as any, 'pay-beta-9', orgA)
      ).rejects.toThrow(/Forbidden: Payment does not belong to your organization/);
    });
  });

  // 4. Provider-Aware Refunds (Paystack, Flutterwave, Manual)
  describe('Provider-Aware Refunds & Historical Integrity', () => {
    it('refunds Paystack payment via Paystack provider', async () => {
      const refundSpy = vi
        .spyOn(PaystackPaymentProvider.prototype, 'refundTransaction')
        .mockResolvedValueOnce({
          status: 'processed',
          refundId: 'ref_pstk_123',
          amount: 25000,
          currency: 'NGN',
          transactionReference: 'PSTK_TX_001',
          rawResponse: {},
        });

      const result = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: 'pay-pstk-1',
        reason: 'Customer requested refund for delay',
        adminContext: {
          userId: adminUserA,
          organizationId: orgA,
          userEmail: 'admin@unwindanddoodle.com',
        },
      });

      expect(refundSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: 'PSTK_TX_001',
          amount: 25000,
          merchantNote: 'Customer requested refund for delay',
        })
      );

      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(25000);
      expect(result.paymentStatus).toBe('refunded');
      expect(result.remainingRefundable).toBe(0);

      // Verify payment in mock DB is marked refunded
      const { data: updatedPay } = await mockSupabase
        .from('payments')
        .select('*')
        .eq('id', 'pay-pstk-1')
        .single();

      expect(updatedPay).toBeDefined();
      expect(updatedPay!.status).toBe('refunded');
      expect((updatedPay!.metadata as any).refunds).toHaveLength(1);

      // Verify audit log
      const { data: audits } = await mockSupabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', 'pay-pstk-1');
      expect(audits).toHaveLength(1);
      expect((audits![0].after_data as any).operation).toBe('payment.refunded');

      // Verify domain event
      const { data: events } = await mockSupabase
        .from('domain_events')
        .select('*')
        .eq('event_type', DOMAIN_EVENT_TYPES.ORDER_REFUNDED);
      expect(events).toHaveLength(1);
    });

    it('refunds Flutterwave payment via Flutterwave provider', async () => {
      const refundSpy = vi
        .spyOn(FlutterwavePaymentProvider.prototype, 'refundTransaction')
        .mockResolvedValueOnce({
          status: 'processed',
          refundId: 'ref_flw_789',
          amount: 18500,
          currency: 'NGN',
          transactionReference: 'FLW_TX_002',
          rawResponse: {},
        });

      const result = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: 'pay-flw-2',
        reason: 'Item defective upon arrival',
        adminContext: {
          userId: adminUserA,
          organizationId: orgA,
        },
      });

      expect(refundSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: 'FLW_TX_002',
          amount: 18500,
        })
      );
      expect(result.provider).toBe('flutterwave');
      expect(result.paymentStatus).toBe('refunded');
    });

    it('preserves historical provider when merchant has disabled that provider in settings', async () => {
      // Step A: Merchant disables Paystack in their current settings
      await updatePaymentMethod(mockSupabase as any, orgA, {
        provider: 'paystack',
        enabled: false,
      });

      const pstkRefundSpy = vi
        .spyOn(PaystackPaymentProvider.prototype, 'refundTransaction')
        .mockResolvedValueOnce({
          status: 'processed',
          refundId: 'ref_pstk_disabled_test',
          amount: 25000,
          currency: 'NGN',
          transactionReference: 'PSTK_TX_001',
          rawResponse: {},
        });

      // Step B: Admin refunds the historical Paystack payment
      const result = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: 'pay-pstk-1',
        adminContext: {
          userId: adminUserA,
          organizationId: orgA,
        },
      });

      // Step C: Verify it still authoritatively used Paystack
      expect(pstkRefundSpy).toHaveBeenCalled();
      expect(result.provider).toBe('paystack');
    });

    it('records manual refund for bank transfer without calling external gateway API', async () => {
      // Transition manual payment to successful first
      await mockSupabase
        .from('payments')
        .update({ status: PAYMENT_STATUS.SUCCESSFUL })
        .eq('id', 'pay-man-3');

      const result = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: 'pay-man-3',
        reason: 'Returned funds via manual bank transfer',
        adminContext: {
          userId: adminUserA,
          organizationId: orgA,
        },
      });

      expect(result.success).toBe(true);
      expect(result.isManual).toBe(true);
      expect(result.provider).toBe('manual');
      expect(result.refundAmount).toBe(12000);

      // Verify audit log recorded manual_refund_recorded
      const { data: audits } = await mockSupabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', 'pay-man-3');
      expect((audits![0].after_data as Record<string, any>).operation).toBe('manual_refund_recorded');
    });
  });

  // 5. Partial Refunds & Balance Boundaries
  describe('Partial Refunds & Over-Refund Prevention', () => {
    it('supports partial refund and recalculates remaining refundable balance', async () => {
      vi.spyOn(PaystackPaymentProvider.prototype, 'refundTransaction')
        .mockResolvedValueOnce({
          status: 'processed',
          refundId: 'ref_partial_1',
          amount: 10000,
          currency: 'NGN',
          transactionReference: 'PSTK_TX_001',
          rawResponse: {},
        });

      // First partial refund: ₦10,000 out of ₦25,000
      const partialRes = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: 'pay-pstk-1',
        amount: 10000,
        reason: 'Partial discount refund',
        adminContext: {
          userId: adminUserA,
          organizationId: orgA,
        },
      });

      expect(partialRes.refundAmount).toBe(10000);
      expect(partialRes.totalRefunded).toBe(10000);
      expect(partialRes.remainingRefundable).toBe(15000);
      expect(partialRes.paymentStatus).toBe(PAYMENT_STATUS.SUCCESSFUL); // not yet fully refunded

      // Second partial refund attempt: trying to refund ₦20,000 (exceeds remaining ₦15,000)
      await expect(
        refundPayment({
          supabase: mockSupabase as any,
          paymentId: 'pay-pstk-1',
          amount: 20000,
          adminContext: {
            userId: adminUserA,
            organizationId: orgA,
          },
        })
      ).rejects.toThrow(/exceeds remaining refundable balance/);

      // Second partial refund success: refund remaining ₦15,000
      vi.spyOn(PaystackPaymentProvider.prototype, 'refundTransaction').mockResolvedValueOnce({
        status: 'processed',
        refundId: 'ref_partial_2',
        amount: 15000,
        currency: 'NGN',
        transactionReference: 'PSTK_TX_001',
        rawResponse: {},
      });

      const secondRes = await refundPayment({
        supabase: mockSupabase as any,
        paymentId: 'pay-pstk-1',
        amount: 15000,
        reason: 'Remaining balance refund',
        adminContext: {
          userId: adminUserA,
          organizationId: orgA,
        },
      });

      expect(secondRes.totalRefunded).toBe(25000);
      expect(secondRes.remainingRefundable).toBe(0);
      expect(secondRes.paymentStatus).toBe('refunded');

      // Third attempt: payment is now fully refunded
      await expect(
        refundPayment({
          supabase: mockSupabase as any,
          paymentId: 'pay-pstk-1',
          adminContext: {
            userId: adminUserA,
            organizationId: orgA,
          },
        })
      ).rejects.toThrow(/Cannot refund payment in status 'refunded'|already been fully refunded/);
    });

    it('rejects refunding non-successful / pending payments', async () => {
      await expect(
        refundPayment({
          supabase: mockSupabase as any,
          paymentId: 'pay-man-3', // status: pending
          adminContext: {
            userId: adminUserA,
            organizationId: orgA,
          },
        })
      ).rejects.toThrow(/Cannot refund payment in status 'pending'/);
    });
  });
});
