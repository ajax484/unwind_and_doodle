/**
 * Unified formatting utilities for prices, currencies, and dates.
 * Ensures deterministic, SSR-safe rendering across server and client components.
 */

export interface FormatPriceOptions {
  showCurrency?: boolean;
  currencySymbol?: string;
}

/**
 * Formats a monetary amount into a clean, localized currency string.
 * Handles null, undefined, NaN, and string inputs gracefully.
 *
 * @example
 * formatPrice(15000) // "₦15,000"
 * formatPrice(null)  // "₦0"
 * formatPrice(2500, { showCurrency: false }) // "2,500"
 */
export function formatPrice(
  amount?: number | string | null,
  options?: FormatPriceOptions
): string {
  const { showCurrency = true, currencySymbol = '₦' } = options || {};

  let num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num === null || num === undefined || Number.isNaN(num) || !Number.isFinite(num)) {
    num = 0;
  }

  const formattedNumber = Math.round(num).toLocaleString('en-US');

  return showCurrency ? `${currencySymbol}${formattedNumber}` : formattedNumber;
}

/**
 * Default date formatting options ensuring consistent SSR and client output.
 */
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Deterministically formats a date using 'en-GB' locale to prevent hydration mismatches.
 *
 * @example
 * formatDate('2026-09-04T12:00:00Z') // "4 Sep 2026"
 */
export function formatDate(
  date?: string | Date | number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—';

  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', options || DEFAULT_DATE_OPTIONS);
}

/**
 * Deterministically formats a date and time using 'en-GB' locale to prevent hydration mismatches.
 *
 * @example
 * formatDateTime('2026-09-04T12:00:00Z') // "4 Sep 2026, 12:00"
 */
export function formatDateTime(
  date?: string | Date | number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—';

  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-GB', options || DEFAULT_DATETIME_OPTIONS);
}
