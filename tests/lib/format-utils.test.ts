import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate, formatDateTime } from '@/lib/format-utils';

describe('format-utils', () => {
  describe('formatPrice', () => {
    it('formats standard numbers with currency symbol and thousands separators', () => {
      expect(formatPrice(15000)).toBe('₦15,000');
      expect(formatPrice(1250500)).toBe('₦1,250,500');
      expect(formatPrice(0)).toBe('₦0');
    });

    it('handles numeric strings properly', () => {
      expect(formatPrice('4500')).toBe('₦4,500');
      expect(formatPrice('10000.50')).toBe('₦10,001');
    });

    it('gracefully handles null, undefined, and NaN inputs', () => {
      expect(formatPrice(null)).toBe('₦0');
      expect(formatPrice(undefined)).toBe('₦0');
      expect(formatPrice(NaN)).toBe('₦0');
      expect(formatPrice('invalid_number')).toBe('₦0');
    });

    it('supports disabling currency symbol', () => {
      expect(formatPrice(25000, { showCurrency: false })).toBe('25,000');
    });

    it('supports custom currency symbols', () => {
      expect(formatPrice(100, { currencySymbol: '$' })).toBe('$100');
    });
  });

  describe('formatDate', () => {
    it('formats ISO string dates deterministically', () => {
      const dateStr = '2026-09-04T12:00:00.000Z';
      const formatted = formatDate(dateStr);
      expect(formatted).toMatch(/4 Sept? 2026/);
    });

    it('formats Date objects deterministically', () => {
      const dateObj = new Date('2026-01-15T00:00:00.000Z');
      const formatted = formatDate(dateObj);
      expect(formatted).toMatch(/15 Jan 2026/);
    });

    it('returns a fallback dash for null, undefined, or invalid dates', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('not-a-date')).toBe('—');
    });

    it('respects custom format options', () => {
      const dateStr = '2026-09-04T12:00:00.000Z';
      const formatted = formatDate(dateStr, { month: 'long', year: 'numeric' });
      expect(formatted).toMatch(/September 2026/);
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time together', () => {
      const dateStr = '2026-09-04T14:30:00.000Z';
      const formatted = formatDateTime(dateStr);
      expect(formatted).toMatch(/4 Sept? 2026/);
      expect(formatted).toContain(':');
    });

    it('returns fallback dash for invalid inputs', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
      expect(formatDateTime('')).toBe('—');
    });
  });
});
