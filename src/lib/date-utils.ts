import { AnalyticsDateRange, AnalyticsDateRangePreset } from '../types/analytics';

/**
 * Calculates a safe percentage change between current and previous values.
 * Returns null if previous is 0 and current > 0 (to display 'New' rather than 'Infinity%'),
 * or if both are 0.
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): { percentageChange: number | null; isNew: boolean } {
  if (previous === 0) {
    if (current > 0) {
      return { percentageChange: null, isNew: true };
    }
    return { percentageChange: 0, isNew: false };
  }

  const change = ((current - previous) / previous) * 100;
  // Round to 1 decimal place
  const rounded = Math.round(change * 10) / 10;
  return { percentageChange: rounded, isNew: false };
}

/**
 * Resolves standard date ranges and their exact preceding comparison periods.
 * All ranges are normalized to UTC boundaries for deterministic database filtering.
 */
export function resolveAnalyticsDateRange(
  preset: AnalyticsDateRangePreset,
  customFrom?: string,
  customTo?: string,
  nowDate: Date = new Date()
): AnalyticsDateRange {
  const now = new Date(nowDate);

  let fromDate: Date;
  let toDate: Date;
  let prevFromDate: Date;
  let prevToDate: Date;
  let label: string;

  switch (preset) {
    case 'today': {
      // From start of today 00:00:00 to now
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      
      // Preceding 24 hours (yesterday)
      prevFromDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
      prevToDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
      label = 'Today';
      break;
    }

    case 'last_7_days': {
      // Last 7 full days
      toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
      
      // Preceding 7 days
      prevToDate = new Date(fromDate.getTime() - 1);
      prevFromDate = new Date(prevToDate.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
      label = 'Last 7 Days';
      break;
    }

    case 'last_30_days': {
      // Last 30 full days
      toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000 + 1);

      // Preceding 30 days
      prevToDate = new Date(fromDate.getTime() - 1);
      prevFromDate = new Date(prevToDate.getTime() - 30 * 24 * 60 * 60 * 1000 + 1);
      label = 'Last 30 Days';
      break;
    }

    case 'last_90_days': {
      // Last 90 full days
      toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      fromDate = new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000 + 1);

      // Preceding 90 days
      prevToDate = new Date(fromDate.getTime() - 1);
      prevFromDate = new Date(prevToDate.getTime() - 90 * 24 * 60 * 60 * 1000 + 1);
      label = 'Last 90 Days';
      break;
    }

    case 'this_month': {
      // From 1st of current month to end of current month
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

      // Previous month
      prevFromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      prevToDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      label = 'This Month';
      break;
    }

    case 'last_month': {
      // Previous full month
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));

      // Month before previous month
      prevFromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1, 0, 0, 0, 0));
      prevToDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 0, 23, 59, 59, 999));
      label = 'Last Month';
      break;
    }

    case 'this_year': {
      // From Jan 1 of this year
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      toDate = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));

      // Last year
      prevFromDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1, 0, 0, 0, 0));
      prevToDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999));
      label = 'This Year';
      break;
    }

    case 'custom':
    default: {
      if (customFrom && customTo) {
        fromDate = new Date(customFrom);
        toDate = new Date(customTo);
      } else {
        // Default to last 30 days if invalid custom range provided
        toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000 + 1);
      }

      const durationMs = toDate.getTime() - fromDate.getTime();
      prevToDate = new Date(fromDate.getTime() - 1);
      prevFromDate = new Date(prevToDate.getTime() - durationMs);
      label = 'Custom Range';
      break;
    }
  }

  return {
    preset,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    previousFrom: prevFromDate.toISOString(),
    previousTo: prevToDate.toISOString(),
    label,
  };
}

/**
 * Determines adaptive time series interval:
 * <= 31 days -> day
 * 32 to 180 days -> week
 * > 180 days -> month
 */
export function getAdaptiveInterval(from: string, to: string): 'day' | 'week' | 'month' {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (diffDays <= 31) {
    return 'day';
  }
  if (diffDays <= 180) {
    return 'week';
  }
  return 'month';
}
