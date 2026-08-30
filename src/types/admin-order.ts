import { z } from 'zod';
import { OrderStatus, Json } from '../lib/supabase/types';

export const TransitionOrderStatusSchema = z.object({
  status: z.enum([
    'created',
    'pending',
    'confirmed',
    'shipped',
    'received',
    'cancelled',
    'refunded',
  ]),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
});

export const RefundOrderSchema = z.object({
  reason: z.string().optional(),
  customerNote: z.string().optional(),
});

export const AdminOrderFilterSchema = z.object({
  status: z
    .enum([
      'created',
      'pending',
      'confirmed',
      'shipped',
      'received',
      'cancelled',
      'refunded',
    ])
    .optional(),
  paymentStatus: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest_total', 'lowest_total']).default('newest').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type TransitionOrderStatusInput = z.infer<typeof TransitionOrderStatusSchema>;
export type RefundOrderInput = z.infer<typeof RefundOrderSchema>;
export type AdminOrderFilters = z.infer<typeof AdminOrderFilterSchema>;

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customer: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  location: {
    id: string;
    name: string;
    state: string;
  };
  itemCount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string | null;
  paymentProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderListResponse {
  orders: AdminOrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminOrderDetailItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customization?: {
    id: string;
    notes: string | null;
    status: string;
    assets: {
      id: string;
      assetUrl: string;
      fileType: string;
    }[];
  } | null;
  addons: {
    id: string;
    addonProductId: string;
    addonName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string | null;
  subtotal: number;
  addOnsTotal: number;
  discountTotal: number;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    marketingConsent: boolean;
  };
  shippingAddress: {
    streetAddress: string;
    city: string;
    state: string;
    postalCode?: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    address: string | null;
  };
  location: {
    id: string;
    name: string;
    state: string;
    country: string;
  };
  items: AdminOrderDetailItem[];
  payments: {
    id: string;
    provider: string;
    providerReference: string | null;
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
    metadata: Json | null;
    createdAt: string;
  }[];
  statusHistory: {
    id: string;
    status: OrderStatus;
    previousStatus: OrderStatus | null;
    note: string | null;
    createdBy: string | null;
    createdAt: string;
  }[];
  reservations: {
    id: string;
    productId: string;
    quantity: number;
    status: string;
    expiresAt: string;
  }[];
  auditLogs: {
    id: string;
    userId: string | null;
    action: string;
    oldValues: Json | null;
    newValues: Json | null;
    createdAt: string;
  }[];
  domainEvents: {
    id: string;
    eventType: string;
    payload: Json;
    createdAt: string;
  }[];
}

export interface AdminDashboardMetricsResponse {
  ordersToday: number;
  pendingOrdersCount: number;
  revenueToday: number;
  revenueThisMonth: number;
  currency: string;
  pendingOrders: AdminOrderListItem[];
  recentOrders: AdminOrderListItem[];
}
