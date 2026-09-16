import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/nextjs';

vi.mock('@sentry/nextjs', () => {
  return {
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    init: vi.fn(),
  };
});

import {
  sanitizeData,
  sanitizeHeaders,
  captureError,
  recordBreadcrumb,
  isMonitoringEnabled,
} from '@/lib/observability/error-monitoring';

describe('Production Error Monitoring & Runtime Diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Sensitive Data Sanitization & PII Scrubbing', () => {
    it('redacts sensitive fields in shallow objects', () => {
      const input = {
        orderId: 'ord-123',
        password: 'super-secret-password',
        token: 'eyJh...',
        apiKey: 'sk_live_123456789',
        card_number: '4111111111111111',
        cvv: '123',
        status: 'confirmed',
      };

      const sanitized = sanitizeData(input);
      expect(sanitized.orderId).toBe('ord-123');
      expect(sanitized.status).toBe('confirmed');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.card_number).toBe('[REDACTED]');
      expect(sanitized.cvv).toBe('[REDACTED]');
    });

    it('redacts sensitive fields in deeply nested objects and arrays', () => {
      const input = {
        user: {
          id: 'usr-999',
          credentials: {
            refreshToken: 'refresh-xyz',
            pin: '1234',
          },
        },
        payload: [
          { secretKey: 'secret_val', name: 'Coloring Book' },
          { auth: 'Bearer secret_token', amount: 5000 },
        ],
      };

      const sanitized = sanitizeData(input);
      expect(sanitized.user.id).toBe('usr-999');
      expect(sanitized.user.credentials.refreshToken).toBe('[REDACTED]');
      expect(sanitized.user.credentials.pin).toBe('[REDACTED]');
      expect(sanitized.payload[0].secretKey).toBe('[REDACTED]');
      expect(sanitized.payload[0].name).toBe('Coloring Book');
      expect(sanitized.payload[1].auth).toBe('[REDACTED]');
      expect(sanitized.payload[1].amount).toBe(5000);
    });

    it('masks Bearer strings in freeform text', () => {
      expect(sanitizeData('Bearer secret-jwt-value')).toBe('Bearer [REDACTED]');
      expect(sanitizeData('non-sensitive-text')).toBe('non-sensitive-text');
    });

    it('sanitizes request headers, stripping auth headers and webhook signatures', () => {
      const headers = {
        'content-type': 'application/json',
        authorization: 'Bearer secret-jwt-here',
        cookie: 'sb-access-token=token; app_session_token=session;',
        'x-paystack-signature': 'signature_hash_123',
        'verif-hash': 'flw_hash_456',
        host: 'localhost:3000',
      };

      const cleaned = sanitizeHeaders(headers);
      expect(cleaned['content-type']).toBe('application/json');
      expect(cleaned.host).toBe('localhost:3000');
      expect(cleaned.authorization).toBe('[REDACTED]');
      expect(cleaned.cookie).toBe('[REDACTED]');
      expect(cleaned['x-paystack-signature']).toBe('[REDACTED]');
      expect(cleaned['verif-hash']).toBe('[REDACTED]');
    });
  });

  describe('2. Test Isolation & Offline Safety', () => {
    it('isMonitoringEnabled returns false in test environment', () => {
      expect(isMonitoringEnabled()).toBe(false);
    });

    it('captureError executes safely without throwing when monitoring is disabled in test mode', () => {
      const result = captureError(new Error('Test mock error'), {
        tags: { operation: 'test.operation' },
        extra: { orderId: 'ord-test-101' },
      });

      expect(result).toBeUndefined();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('captureError safely suppresses internal errors if monitoring throws', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Force isMonitoringEnabled to return true temporarily
      const prevEnv = process.env.NODE_ENV;
      const prevVitest = process.env.VITEST;
      delete process.env.VITEST;
      (process.env as any).NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://fake@sentry.io/123';

      vi.mocked(Sentry.captureException).mockImplementationOnce(() => {
        throw new Error('Sentry network crash simulation');
      });

      expect(() => {
        captureError(new Error('App error'));
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[error-monitoring]'),
        expect.any(Error)
      );

      // Restore
      (process.env as any).NODE_ENV = prevEnv;
      if (prevVitest) process.env.VITEST = prevVitest;
      delete process.env.SENTRY_DSN;
    });

    it('recordBreadcrumb executes safely without throwing', () => {
      expect(() => {
        recordBreadcrumb({
          category: 'checkout',
          message: 'Payment verified',
          data: { orderId: 'ord-123' },
        });
      }).not.toThrow();

      // In test mode, Sentry.addBreadcrumb is safely bypassed
      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('3. Production Sentry Dispatch when Active', () => {
    afterEach(() => {
      delete process.env.SENTRY_DSN;
    });

    it('calls Sentry.captureException with sanitized tags and extra when active', () => {
      const prevEnv = process.env.NODE_ENV;
      const prevVitest = process.env.VITEST;
      delete process.env.VITEST;
      (process.env as any).NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';

      vi.mocked(Sentry.captureException).mockReturnValueOnce('mock-event-id');

      const result = captureError(new Error('Payment gateway timeout'), {
        tags: {
          operation: 'payment.verification',
          secretKey: 'sk_live_xyz', // Must be sanitized
        },
        extra: {
          orderId: 'ord-888',
          password: 'sensitive_val', // Must be sanitized
        },
        level: 'warning',
      });

      expect(result).toBe('mock-event-id');
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            operation: 'payment.verification',
            secretKey: '[REDACTED]',
          },
          extra: {
            orderId: 'ord-888',
            password: '[REDACTED]',
          },
          level: 'warning',
        })
      );

      // Restore
      (process.env as any).NODE_ENV = prevEnv;
      if (prevVitest) process.env.VITEST = prevVitest;
    });
  });
});
