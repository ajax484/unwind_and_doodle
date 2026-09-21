import { z } from 'zod';
import { PaymentProviderName } from '@/services/payment/provider.types';

export interface BankTransferConfig {
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions?: string;
}

export interface OrganizationPaymentMethod {
  id: string;
  organizationId: string;
  provider: PaymentProviderName;
  enabled: boolean;
  displayTitle: string | null;
  displayDescription: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPaymentMethod {
  provider: PaymentProviderName;
  enabled: boolean;
  displayTitle: string | null;
  displayDescription: string | null;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions?: string | null;
  } | null;
}

export const bankTransferConfigSchema = z.object({
  bankName: z.string().trim().min(2, 'Bank name must be at least 2 characters'),
  accountName: z.string().trim().min(2, 'Account name must be at least 2 characters'),
  accountNumber: z.string().trim().min(5, 'Account number must be at least 5 digits'),
  instructions: z.string().trim().optional().nullable(),
});

export const updatePaymentMethodSchema = z.object({
  provider: z.enum(['paystack', 'flutterwave', 'manual'] as const),
  enabled: z.boolean(),
  displayTitle: z.string().trim().optional().nullable(),
  displayDescription: z.string().trim().optional().nullable(),
  bankName: z.string().trim().optional().nullable(),
  accountName: z.string().trim().optional().nullable(),
  accountNumber: z.string().trim().optional().nullable(),
  instructions: z.string().trim().optional().nullable(),
});

export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
