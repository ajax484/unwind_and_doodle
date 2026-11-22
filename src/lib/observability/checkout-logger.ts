import crypto from 'crypto';
import { captureError, recordBreadcrumb, sanitizeData } from './error-monitoring';

export type CheckoutLogStage =
  | 'cart'
  | 'checkout'
  | 'order_creation'
  | 'payment_init'
  | 'payment_verify'
  | 'payment_retry'
  | 'webhook';

export type CheckoutReasonCode =
  | 'VALIDATION_ERROR'
  | 'INVENTORY_UNAVAILABLE'
  | 'WAREHOUSE_UNAVAILABLE'
  | 'PAYMENT_METHOD_DISABLED'
  | 'PAYMENT_INIT_FAILED'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'PAYMENT_ABANDONED'
  | 'PAYMENT_FAILED'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'ORDER_CREATION_FAILED'
  | 'CART_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface CheckoutLogPayload {
  requestId: string;
  stage: CheckoutLogStage;
  event: string;
  reasonCode?: CheckoutReasonCode;
  orderId?: string;
  orderNumber?: string;
  paymentId?: string;
  provider?: string;
  reference?: string;
  sessionId?: string;
  durationMs?: number;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Resolves a traceable request ID from incoming HTTP headers or generates a new one.
 */
export function resolveRequestId(
  headers?: Headers | Record<string, string | null | undefined> | null
): string {
  if (headers) {
    let incoming: string | null | undefined;
    if (typeof (headers as Headers).get === 'function') {
      const h = headers as Headers;
      incoming = h.get('x-request-id') || h.get('x-correlation-id');
    } else {
      const rec = headers as Record<string, string | null | undefined>;
      incoming = rec['x-request-id'] || rec['X-Request-Id'] || rec['x-correlation-id'];
    }
    if (incoming && incoming.trim().length > 0 && incoming.trim().length <= 128) {
      return incoming.trim();
    }
  }

  return `req_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Classifies an error or provider status into a deterministic CheckoutReasonCode.
 */
export function classifyCheckoutReasonCode(
  errorOrMessage: unknown,
  fallback: CheckoutReasonCode = 'UNKNOWN_ERROR'
): CheckoutReasonCode {
  const message = (
    errorOrMessage instanceof Error
      ? errorOrMessage.message
      : typeof errorOrMessage === 'string'
      ? errorOrMessage
      : ''
  ).toLowerCase();

  if (!message) return fallback;

  if (message.includes('signature') || message.includes('webhook hash')) {
    return 'WEBHOOK_SIGNATURE_INVALID';
  }
  if (message.includes('not currently available') || message.includes('not enabled')) {
    return 'PAYMENT_METHOD_DISABLED';
  }
  if (message.includes('amount mismatch')) {
    return 'AMOUNT_MISMATCH';
  }
  if (message.includes('currency mismatch')) {
    return 'CURRENCY_MISMATCH';
  }
  if (message.includes('abandoned') || message.includes('cancelled') || message.includes('canceled')) {
    return 'PAYMENT_ABANDONED';
  }
  if (
    message.includes('insufficient') ||
    message.includes('out of stock') ||
    message.includes('stock') ||
    message.includes('reserve')
  ) {
    return 'INVENTORY_UNAVAILABLE';
  }
  if (message.includes('warehouse') || message.includes('fulfill all items')) {
    return 'WAREHOUSE_UNAVAILABLE';
  }
  if (
    message.includes('initialize') ||
    message.includes('paystack') ||
    message.includes('flutterwave') ||
    message.includes('authorization url')
  ) {
    return 'PAYMENT_INIT_FAILED';
  }
  if (message.includes('non-successful') || message.includes('payment failed') || message.includes('failed')) {
    if (message.includes('create order') || message.includes('order line item')) {
      return 'ORDER_CREATION_FAILED';
    }
    if (message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }
    return 'PAYMENT_FAILED';
  }
  if (message.includes('not found')) {
    return 'NOT_FOUND';
  }
  if (message.includes('unauthorized') || message.includes('permission') || message.includes('access token')) {
    return 'UNAUTHORIZED';
  }
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return 'VALIDATION_ERROR';
  }

  return fallback;
}

/**
 * Classifies a payment provider verification status string into a CheckoutReasonCode.
 */
export function classifyPaymentStatusReason(providerStatus?: string | null): CheckoutReasonCode {
  const normalized = (providerStatus || '').toLowerCase().trim();
  if (normalized === 'abandoned' || normalized === 'cancelled' || normalized === 'canceled') {
    return 'PAYMENT_ABANDONED';
  }
  if (normalized === 'failed' || normalized === 'declined' || normalized === 'reversed') {
    return 'PAYMENT_FAILED';
  }
  return 'PAYMENT_VERIFICATION_FAILED';
}

function buildStructuredEntry(level: 'info' | 'warn' | 'error', payload: CheckoutLogPayload, error?: unknown) {
  const sanitizedMetadata = payload.metadata ? sanitizeData(payload.metadata) : undefined;
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : undefined;

  return {
    timestamp: new Date().toISOString(),
    level,
    domain: 'checkout',
    requestId: payload.requestId,
    stage: payload.stage,
    event: payload.event,
    ...(payload.reasonCode ? { reasonCode: payload.reasonCode } : {}),
    ...(payload.orderId ? { orderId: payload.orderId } : {}),
    ...(payload.orderNumber ? { orderNumber: payload.orderNumber } : {}),
    ...(payload.paymentId ? { paymentId: payload.paymentId } : {}),
    ...(payload.provider ? { provider: payload.provider } : {}),
    ...(payload.reference ? { reference: payload.reference } : {}),
    ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
    ...(typeof payload.durationMs === 'number' ? { durationMs: payload.durationMs } : {}),
    ...(typeof payload.statusCode === 'number' ? { statusCode: payload.statusCode } : {}),
    ...(errorMessage ? { error: errorMessage } : {}),
    ...(sanitizedMetadata ? { metadata: sanitizedMetadata } : {}),
  };
}

/**
 * Logs an informational checkout lifecycle event and records a Sentry breadcrumb.
 */
export function logCheckoutEvent(payload: CheckoutLogPayload): void {
  const entry = buildStructuredEntry('info', payload);
  console.info(JSON.stringify(entry));
  recordBreadcrumb({
    category: `checkout.${payload.stage}`,
    message: payload.event,
    level: 'info',
    data: {
      requestId: payload.requestId,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      provider: payload.provider,
      reference: payload.reference,
      reasonCode: payload.reasonCode,
    },
  });
}

/**
 * Logs a structured checkout/payment warning (e.g., abandoned payment, validation error, disabled gateway).
 */
export function logCheckoutWarning(payload: CheckoutLogPayload, error?: unknown): void {
  const entry = buildStructuredEntry('warn', payload, error);
  console.warn(JSON.stringify(entry));
  recordBreadcrumb({
    category: `checkout.${payload.stage}`,
    message: `${payload.event}${payload.reasonCode ? ` (${payload.reasonCode})` : ''}`,
    level: 'warning',
    data: {
      requestId: payload.requestId,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      provider: payload.provider,
      reference: payload.reference,
      reasonCode: payload.reasonCode,
    },
  });
}

/**
 * Logs a structured checkout/payment error with traceable requestId and forwards to Sentry monitoring.
 */
export function logCheckoutError(
  error: unknown,
  payload: CheckoutLogPayload,
  options?: { level?: 'warning' | 'error' }
): void {
  const reasonCode = payload.reasonCode || classifyCheckoutReasonCode(error);
  const entry = buildStructuredEntry('error', { ...payload, reasonCode }, error);
  console.error(JSON.stringify(entry));

  captureError(error, {
    level: options?.level || 'error',
    tags: {
      domain: 'checkout',
      stage: payload.stage,
      event: payload.event,
      reasonCode,
      requestId: payload.requestId,
      ...(payload.provider ? { provider: payload.provider } : {}),
    },
    extra: {
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      paymentId: payload.paymentId,
      reference: payload.reference,
      sessionId: payload.sessionId,
      durationMs: payload.durationMs,
      statusCode: payload.statusCode,
      metadata: payload.metadata,
    },
  });
}
