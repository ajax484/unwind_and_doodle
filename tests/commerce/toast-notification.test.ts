import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { toast } from 'sonner';

describe('Sonner Toast Notification System', () => {
  it('exposes all expected dispatch methods (success, error, warning, info, dismiss)', () => {
    expect(typeof toast).toBe('function');
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.error).toBe('function');
    expect(typeof toast.warning).toBe('function');
    expect(typeof toast.info).toBe('function');
    expect(typeof toast.dismiss).toBe('function');
  });

  it('can dispatch toast notifications without throwing in application code', () => {
    expect(() => {
      toast.success('Test success message');
      toast.error('Test error message');
      toast.warning('Test warning message');
      toast.info('Test info message');
    }).not.toThrow();
  });

  it('supports all core toast notification types', () => {
    const types = ['success', 'error', 'warning', 'info'] as const;

    types.forEach((type) => {
      expect(typeof toast[type]).toBe('function');
    });
  });
});
