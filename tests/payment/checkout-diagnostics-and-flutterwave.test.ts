import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveRequestId,
  classifyCheckoutReasonCode,
  classifyPaymentStatusReason,
  logCheckoutError,
  logCheckoutWarning,
} from '@/lib/observability/checkout-logger';
import {
  getPaymentMethods,
  getPublicPaymentMethods,
  getEnabledPaymentMethods,
} from '@/services/payment-settings.service';

describe('Tier 1.2 — Checkout Diagnostics (PERF-4) & Flutterwave Fallback (CHK-3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Structured Checkout Diagnostics (PERF-4)', () => {
    it('extracts incoming x-request-id header or generates a traceable request ID', () => {
      const headers = new Headers({ 'x-request-id': 'req_external_trace_123' });
      expect(resolveRequestId(headers)).toBe('req_external_trace_123');

      const generated = resolveRequestId(new Headers());
      expect(generated).toMatch(/^req_[a-z0-9]+_[a-f0-9]{12}$/);
    });

    it('classifies checkout and payment errors into deterministic reason codes', () => {
      expect(classifyCheckoutReasonCode("Payment method 'flutterwave' is not currently available for this store.")).toBe(
        'PAYMENT_METHOD_DISABLED'
      );
      expect(classifyCheckoutReasonCode('Invalid paystack webhook signature/hash')).toBe(
        'WEBHOOK_SIGNATURE_INVALID'
      );
      expect(classifyCheckoutReasonCode('Transaction amount mismatch. Expected: 5000, Got: 4000')).toBe(
        'AMOUNT_MISMATCH'
      );
      expect(classifyCheckoutReasonCode('Transaction currency mismatch. Expected: NGN, Got: USD')).toBe(
        'CURRENCY_MISMATCH'
      );
      expect(classifyCheckoutReasonCode('No single warehouse can fulfill all items for your location')).toBe(
        'WAREHOUSE_UNAVAILABLE'
      );
      expect(classifyCheckoutReasonCode('Insufficient stock for product')).toBe('INVENTORY_UNAVAILABLE');
      expect(classifyCheckoutReasonCode('Failed to initialize Paystack transaction')).toBe('PAYMENT_INIT_FAILED');
      expect(classifyCheckoutReasonCode('Payment abandoned by customer')).toBe('PAYMENT_ABANDONED');
    });

    it('classifies failed and abandoned provider payment statuses', () => {
      expect(classifyPaymentStatusReason('abandoned')).toBe('PAYMENT_ABANDONED');
      expect(classifyPaymentStatusReason('cancelled')).toBe('PAYMENT_ABANDONED');
      expect(classifyPaymentStatusReason('failed')).toBe('PAYMENT_FAILED');
      expect(classifyPaymentStatusReason('declined')).toBe('PAYMENT_FAILED');
      expect(classifyPaymentStatusReason('pending')).toBe('PAYMENT_VERIFICATION_FAILED');
    });

    it('emits structured JSON logs with requestId and redacts sensitive fields', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logCheckoutError(new Error('Failed to initialize Paystack transaction'), {
        requestId: 'req_test_001',
        stage: 'payment_init',
        event: 'payment.initialize_failed',
        provider: 'paystack',
        orderNumber: 'ORD-123',
        metadata: {
          authorization: 'Bearer secret_live_key',
          customerToken: 'tok_12345',
          itemCount: 2,
        },
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const parsedError = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(parsedError.domain).toBe('checkout');
      expect(parsedError.requestId).toBe('req_test_001');
      expect(parsedError.stage).toBe('payment_init');
      expect(parsedError.reasonCode).toBe('PAYMENT_INIT_FAILED');
      expect(parsedError.metadata.authorization).toBe('[REDACTED]');
      expect(parsedError.metadata.customerToken).toBe('[REDACTED]');
      expect(parsedError.metadata.itemCount).toBe(2);

      logCheckoutWarning({
        requestId: 'req_test_002',
        stage: 'payment_verify',
        event: 'payment_verify.not_verified',
        reasonCode: 'PAYMENT_ABANDONED',
        provider: 'paystack',
        reference: 'PSK_REF_001',
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const parsedWarn = JSON.parse(warnSpy.mock.calls[0][0] as string);
      expect(parsedWarn.level).toBe('warn');
      expect(parsedWarn.reasonCode).toBe('PAYMENT_ABANDONED');
      expect(parsedWarn.reference).toBe('PSK_REF_001');
    });
  });

  describe('Flutterwave Fallback Verification (CHK-3)', () => {
    function createMockSupabase(rows: Array<Record<string, unknown>>) {
      return {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          upsert: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: null, error: { message: 'readonly' } }),
          })),
        })),
      } as any;
    }

    it('keeps Flutterwave disabled by default and hides it from public checkout methods', async () => {
      const supabase = createMockSupabase([]);

      const allMethods = await getPaymentMethods(supabase, 'org-1');
      const paystack = allMethods.find((m) => m.provider === 'paystack');
      const flutterwave = allMethods.find((m) => m.provider === 'flutterwave');

      expect(paystack?.enabled).toBe(true);
      expect(flutterwave?.enabled).toBe(false);

      const publicMethods = await getPublicPaymentMethods(supabase, 'org-1');
      expect(publicMethods.map((m) => m.provider)).toEqual(['paystack']);
      expect(publicMethods.some((m) => m.provider === 'flutterwave')).toBe(false);
    });

    it('exposes Flutterwave on checkout only when explicitly enabled in Payment Settings', async () => {
      const supabase = createMockSupabase([
        {
          id: 'pm-1',
          organization_id: 'org-1',
          provider: 'paystack',
          enabled: true,
          display_title: 'Paystack',
          display_description: 'Card/Bank',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'pm-2',
          organization_id: 'org-1',
          provider: 'flutterwave',
          enabled: true,
          display_title: 'Flutterwave',
          display_description: 'Fallback gateway',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]);

      const enabled = await getEnabledPaymentMethods(supabase, 'org-1');
      expect(enabled).toEqual(['paystack', 'flutterwave']);

      const publicMethods = await getPublicPaymentMethods(supabase, 'org-1');
      expect(publicMethods.map((m) => m.provider)).toEqual(['paystack', 'flutterwave']);
    });
  });
});
