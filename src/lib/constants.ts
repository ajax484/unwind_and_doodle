export const RESERVATION_EXPIRY_MINUTES = 45;

export const DEFAULT_ORGANIZATION_ID = '88c7af2e-afd4-4504-a43f-b14cc45d6263';

export const ORDER_STATUS = {
  CREATED: 'created',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const RESERVATION_STATUS = {
  ACTIVE: 'active',
  COMMITTED: 'committed',
  RELEASED: 'released',
  EXPIRED: 'expired',
} as const;

export const PAYMENT_PROVIDER = {
  FLUTTERWAVE: 'flutterwave',
  PAYSTACK: 'paystack',
} as const;

export const CURRENCY = {
  NGN: 'NGN',
} as const;

export const DOMAIN_EVENT_TYPES = {
  ORDER_CREATED: 'order.created',
  PAYMENT_COMPLETED: 'payment.completed',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
} as const;
