import { z } from 'zod';

export const ManualOrderItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product ID' }),
  quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }),
});

export const ManualOrderCustomerSchema = z.object({
  email: z.string().email({ message: 'Valid customer email is required' }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

export const ManualOrderShippingAddressSchema = z.object({
  addressLine1: z.string().min(1, { message: 'Address line 1 is required' }),
  addressLine2: z.string().optional(),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  postalCode: z.string().optional(),
  country: z.string().default('Nigeria'),
});

export const CreateManualOrderSchema = z.object({
  customer: ManualOrderCustomerSchema,
  shippingAddress: ManualOrderShippingAddressSchema,
  items: z.array(ManualOrderItemSchema).min(1, { message: 'At least one product item is required' }),
  manualOrderChannel: z.enum(['instagram', 'whatsapp', 'phone', 'in_person', 'other']).default('instagram'),
  discountCode: z.string().optional(),
  shippingFee: z.number().min(0).default(0),
  locationId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type ManualOrderItemInput = z.infer<typeof ManualOrderItemSchema>;
export type ManualOrderCustomerInput = z.infer<typeof ManualOrderCustomerSchema>;
export type ManualOrderShippingAddressInput = z.infer<typeof ManualOrderShippingAddressSchema>;
export type CreateManualOrderInput = z.infer<typeof CreateManualOrderSchema>;

export interface PaymentRequestDetail {
  id: string;
  token: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expiresAt: string | null;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    shippingAddress: Record<string, unknown>;
  };
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    bundleComponents?: Array<{
      productName: string;
      quantityPerBundle: number;
      totalQuantity: number;
    }>;
  }>;
  pricing: {
    subtotal: number;
    discountTotal: number;
    shippingFee: number;
    total: number;
    discountCode?: string | null;
  };
  store?: {
    name: string;
    slug?: string;
  };
  paymentReference?: string | null;
}

export interface PaymentLinkResponse {
  paymentRequestId: string;
  token: string;
  paymentUrl: string;
  orderId: string;
  orderNumber: string;
  expiresAt: string | null;
  amount: number;
}
