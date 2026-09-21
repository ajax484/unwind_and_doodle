import { z } from 'zod';

export const ManualOrderCustomizationSchema = z.object({
  theme_ids: z.array(z.string().uuid({ message: 'Invalid theme ID' })).min(1, 'At least 1 theme ID is required').max(3, 'At most 3 theme IDs are allowed').optional(),
  themeIds: z.array(z.string().uuid({ message: 'Invalid theme ID' })).min(1, 'At least 1 theme ID is required').max(3, 'At most 3 theme IDs are allowed').optional(),
  cover_name: z.string().optional(),
  coverName: z.string().optional(),
});

export const ManualOrderItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product ID' }),
  product_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }),
  customization: ManualOrderCustomizationSchema.optional(),
});

export const ManualOrderCustomerSchema = z
  .object({
    email: z.string().email({ message: 'Valid customer email is required' }).optional().or(z.literal('')),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    whatsappNumber: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.email && data.email.trim() !== '') ||
        (data.phone && data.phone.trim() !== '') ||
        (data.whatsappNumber && data.whatsappNumber.trim() !== '')
      ),
    {
      message: 'Either customer email or phone number is required',
      path: ['email'],
    }
  );

export const ManualOrderShippingAddressSchema = z.object({
  addressLine1: z.string().optional().or(z.literal('')),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().default('Nigeria'),
});

export const CustomerShippingAddressSchema = z.object({
  addressLine1: z.string().min(1, { message: 'Street address is required' }),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().default('Nigeria'),
});

export const ManualDiscountSchema = z.object({
  type: z.enum(['percentage', 'fixed_amount', 'fixed']),
  value: z.number().positive({ message: 'Discount value must be greater than zero' }),
});

export const CreateManualOrderSchema = z
  .object({
    customer: ManualOrderCustomerSchema,
    shippingAddress: ManualOrderShippingAddressSchema.optional().default({}),
    items: z.array(ManualOrderItemSchema).min(1, { message: 'At least one product item is required' }),
    manualOrderChannel: z.enum(['instagram', 'whatsapp', 'phone', 'in_person', 'other']).default('instagram'),
    paymentMethod: z.enum(['paystack', 'flutterwave', 'manual']).default('paystack'),
    alreadyPaid: z.boolean().default(false),
    paymentNote: z.string().optional(),
    discountCode: z.string().optional(),
    manualDiscount: ManualDiscountSchema.optional(),
    shippingFee: z.number().min(0).default(0),
    locationId: z.string().uuid().optional().or(z.literal('')),
    warehouseId: z.string().uuid().optional().or(z.literal('')),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.discountCode && data.discountCode.trim() !== '' && data.manualDiscount) {
        return false;
      }
      return true;
    },
    { message: 'Discount code and manual discount cannot be used together', path: ['manualDiscount'] }
  );

export const UpdateCustomerOrderSchema = z.object({
  token: z.string().min(1, { message: 'Payment token is required' }),
  email: z.string().email({ message: 'Valid customer email is required' }).optional().or(z.literal('')),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  locationId: z.string().uuid({ message: 'Invalid location ID' }).optional().or(z.literal('')),
  shippingAddress: CustomerShippingAddressSchema.partial().optional(),
});

export type ManualDiscountInput = z.input<typeof ManualDiscountSchema>;
export type ManualOrderItemInput = z.input<typeof ManualOrderItemSchema>;
export type ManualOrderCustomerInput = z.input<typeof ManualOrderCustomerSchema>;
export type ManualOrderShippingAddressInput = z.input<typeof ManualOrderShippingAddressSchema>;
export type CreateManualOrderInput = z.input<typeof CreateManualOrderSchema>;
export type UpdateCustomerOrderInput = z.input<typeof UpdateCustomerOrderSchema>;

export interface PaymentRequestDetail {
  id: string;
  token: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expiresAt: string | null;
  paymentMethod?: 'paystack' | 'flutterwave' | 'manual';
  paymentStatus?: string;
  bankDetails?: {
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    instructions?: string | null;
  } | null;
  customer: {
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phone: string | null;
    locationId?: string | null;
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
    themeCustomization?: {
      coverName: string | null;
      themes: Array<{
        themeId: string | null;
        themeName: string;
        sortOrder: number;
      }>;
    } | null;
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
  subtotal?: number;
  discountTotal?: number;
  shippingFee?: number;
  total?: number;
  paymentMethod?: 'paystack' | 'flutterwave' | 'manual';
  paymentStatus?: string;
  alreadyPaid?: boolean;
}
