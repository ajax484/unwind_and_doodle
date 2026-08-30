import { Json } from '../lib/supabase/types';

export interface BaseDomainEvent<T extends string, P = Record<string, unknown>> {
  eventType: T;
  aggregateType: string;
  aggregateId: string;
  payload: P;
}

export interface OrderCreatedPayload {
  [key: string]: unknown;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  warehouseId: string;
  locationId: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    addonCount: number;
  }[];
  shippingAddress: Json;
  createdAt: string;
}

export interface PaymentCompletedPayload {
  [key: string]: unknown;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  providerReference: string;
  amount: number;
  currency: string;
  paidAt: string;
  customerId: string;
}

export type OrderCreatedEvent = BaseDomainEvent<'order.created', OrderCreatedPayload>;
export type PaymentCompletedEvent = BaseDomainEvent<'payment.completed', PaymentCompletedPayload>;
