import { z } from 'zod';
import { PaymentProviderName } from '@/services/payment/provider.types';
import { Json } from '@/lib/supabase/types';

export const AdminPaymentFilterSchema = z.object({
  status: z.enum(['all', 'pending', 'successful', 'failed', 'refunded']).optional().default('all'),
  provider: z.enum(['all', 'paystack', 'flutterwave', 'manual']).optional().default('all'),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest_amount', 'lowest_amount']).optional().default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type AdminPaymentFilters = z.input<typeof AdminPaymentFilterSchema>;

export const ProcessRefundSchema = z.object({
  amount: z.number().positive('Refund amount must be greater than 0').optional(),
  reason: z.string().min(1, 'Refund reason is required').optional(),
  customerNote: z.string().optional(),
});

export type ProcessRefundInput = z.infer<typeof ProcessRefundSchema>;

export interface PaymentRefundRecord {
  id: string;
  refundId: string;
  amount: number;
  status: 'processed' | 'pending' | 'failed';
  provider: string;
  reason?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  createdAt: string;
}

export interface PaymentTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: string | null;
  badge?: string;
  type: 'created' | 'verified' | 'refunded' | 'failed' | 'other';
}

export interface AdminPaymentListItem {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  provider: PaymentProviderName | string;
  providerLabel: string;
  providerReference: string | null;
  status: string;
  customer: {
    id?: string;
    name: string;
    email: string;
  };
  refundedAmount: number;
  isRefundable: boolean;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminPaymentListResponse {
  payments: AdminPaymentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminPaymentDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  amount: number;
  currency: string;
  provider: PaymentProviderName | string;
  providerLabel: string;
  providerReference: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt?: string;
  customer: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  shippingAddress?: {
    streetAddress: string;
    city: string;
    state: string;
  } | null;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  } | null;
  refunds: PaymentRefundRecord[];
  totalRefunded: number;
  remainingRefundable: number;
  isRefundable: boolean;
  timeline: PaymentTimelineEvent[];
  rawMetadata?: Json | null;
}

export interface RefundPaymentResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  refundId: string;
  refundAmount: number;
  totalRefunded: number;
  remainingRefundable: number;
  paymentStatus: string;
  provider: string;
  isManual: boolean;
  message: string;
}
