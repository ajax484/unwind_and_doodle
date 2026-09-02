import { z } from 'zod';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const AdminCustomerFilterSchema = z.object({
  search: z.string().optional(),
  accountType: z.enum(['all', 'registered', 'guest']).optional(),
  marketingConsent: z.enum(['all', 'email_subscribed', 'whatsapp_subscribed']).optional(),
  orderActivity: z.enum(['all', 'has_ordered', 'never_ordered']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export type AdminCustomerFilterInput = z.input<typeof AdminCustomerFilterSchema>;

export const UpdateCustomerProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional().nullable(),
  whatsapp_number: z.string().optional().nullable(),
});

export type UpdateCustomerProfileInput = z.infer<typeof UpdateCustomerProfileSchema>;

export const UpdateCustomerConsentSchema = z.object({
  channel: z.enum(['email', 'whatsapp']),
  consent: z.boolean(),
  reason: z.string().optional(),
});

export type UpdateCustomerConsentInput = z.infer<typeof UpdateCustomerConsentSchema>;

export const CreateCustomerNoteSchema = z.object({
  note: z.string().min(1, 'Note content is required'),
});

export type CreateCustomerNoteInput = z.infer<typeof CreateCustomerNoteSchema>;

// ==========================================
// TYPESCRIPT RESPONSE MODELS
// ==========================================

export interface AdminCustomerListItem {
  id: string;
  userId: string | null;
  hasAccount: boolean;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  emailMarketingConsent: boolean;
  whatsappMarketingConsent: boolean;
  totalOrdersCount: number;
  completedOrdersCount: number;
  lifetimeValue: number; // LTV = sum of successfully paid/completed non-refunded orders
  lastOrderDate: string | null;
  createdAt: string;
}

export interface AdminCustomerSummaryKPIs {
  totalCustomers: number;
  registeredAccounts: number;
  guestCustomers: number;
  emailSubscribers: number;
  whatsappSubscribers: number;
  totalLifetimeValue: number;
}

export interface AdminCustomerListResponse {
  customers: AdminCustomerListItem[];
  summary: AdminCustomerSummaryKPIs;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCustomerAddress {
  id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  state: string;
  lga: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface AdminCustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  itemsCount: number;
  createdAt: string;
}

export interface AdminCustomerNoteItem {
  id: string;
  customerId: string;
  authorId: string;
  authorName?: string;
  note: string;
  createdAt: string;
}

export interface AdminCustomerActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AdminCustomerDetail {
  id: string;
  userId: string | null;
  hasAccount: boolean;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
  emailVerified: boolean;
  emailMarketingConsent: boolean;
  whatsappMarketingConsent: boolean;
  createdAt: string;
  metrics: {
    totalOrders: number;
    completedOrders: number;
    lifetimeValue: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
  };
  hasAbandonedCart: boolean;
  orders: AdminCustomerOrderSummary[];
  addresses: AdminCustomerAddress[];
  notes: AdminCustomerNoteItem[];
  activity: AdminCustomerActivityItem[];
}
