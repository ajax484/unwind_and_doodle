import * as Sentry from '@sentry/nextjs';

/**
 * List of sensitive key names that must always be redacted from error reports,
 * tags, breadcrumbs, and telemetry payloads.
 */
export const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'auth',
  'authorization',
  'cookie',
  'cookies',
  'set-cookie',
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'privatekey',
  'private_key',
  'service_role_key',
  'servicerolekey',
  'sb-access-token',
  'sb-refresh-token',
  'app_session_token',
  'supabase-auth-token',
  'x-paystack-signature',
  'verif-hash',
]);

/**
 * Deeply sanitizes any arbitrary object or array, redacting sensitive fields.
 */
export function sanitizeData(data: unknown, depth = 0): any {
  if (depth > 6) return '[MAX_DEPTH_EXCEEDED]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Basic pattern masking for bearer tokens
    if (data.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]';
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    let isSensitive = false;

    for (const pattern of SENSITIVE_KEYS) {
      if (lowerKey === pattern || lowerKey.includes(pattern.replace(/[-_]/g, ''))) {
        isSensitive = true;
        break;
      }
    }

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeData(val, depth + 1);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Strips sensitive HTTP headers from request metadata before sending to Sentry.
 */
export function sanitizeHeaders(
  headers: Record<string, any> | undefined | null
): Record<string, any> {
  if (!headers) return {};
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lk = k.toLowerCase();
    if (
      lk === 'authorization' ||
      lk === 'cookie' ||
      lk === 'set-cookie' ||
      lk === 'x-paystack-signature' ||
      lk === 'verif-hash' ||
      lk.includes('token') ||
      lk.includes('key')
    ) {
      cleaned[k] = '[REDACTED]';
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export interface ErrorContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, any>;
  level?: Sentry.SeverityLevel;
  fingerprint?: string[];
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

/**
 * Returns true if error monitoring is actively configured and running in a live environment.
 * Disables live telemetry in test environments to guarantee offline determinism.
 */
export function isMonitoringEnabled(): boolean {
  if (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST)) {
    return false;
  }
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Captures an exception with structured diagnostic context, redacting any sensitive data.
 * Safe to call anywhere: will not throw even if reporting fails.
 */
export function captureError(error: unknown, context?: ErrorContext): string | undefined {
  try {
    const sanitizedTags = context?.tags ? sanitizeData(context.tags) : undefined;
    const sanitizedExtra = context?.extra ? sanitizeData(context.extra) : undefined;

    // In non-test environments or when enabled, send to Sentry
    if (isMonitoringEnabled()) {
      return Sentry.captureException(error, {
        tags: sanitizedTags,
        extra: sanitizedExtra,
        level: context?.level || 'error',
        fingerprint: context?.fingerprint,
        user: context?.user
          ? {
              id: context.user.id,
              // Only record role or non-sensitive identifiers
              role: context.user.role,
            }
          : undefined,
      });
    }

    return undefined;
  } catch (monitoringErr) {
    // Monitoring should never crash the application
    console.warn('[error-monitoring] Exception while capturing error:', monitoringErr);
    return undefined;
  }
}

/**
 * Records an informational operational breadcrumb for tracking sequence of events leading to a fault.
 */
export function recordBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  data?: Record<string, any>;
  level?: Sentry.SeverityLevel;
}): void {
  try {
    if (!isMonitoringEnabled()) return;

    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level || 'info',
      data: breadcrumb.data ? sanitizeData(breadcrumb.data) : undefined,
    });
  } catch {
    // Non-blocking
  }
}
