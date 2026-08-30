import { z } from 'zod';

export const CheckoutItemAddonSchema = z.object({
  addonProductId: z.string().uuid('Invalid addon product ID'),
  quantity: z.number().int().positive('Addon quantity must be at least 1').default(1),
});

export const CheckoutItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  addons: z.array(CheckoutItemAddonSchema).optional().default([]),
  customization: z
    .object({
      notes: z.string().optional(),
      assetUrls: z.array(z.string().url()).optional(),
    })
    .optional(),
});

export const CustomerInfoSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  userId: z.string().uuid().optional(),
  marketingConsent: z.boolean().optional().default(false),
});

export const ShippingAddressSchema = z.object({
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().optional(),
});

export const CheckoutRequestSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  customer: CustomerInfoSchema,
  shippingAddress: ShippingAddressSchema,
  items: z.array(CheckoutItemSchema).min(1, 'Cart cannot be empty'),
  discountCode: z.string().optional(),
  notes: z.string().optional(),
  callbackUrl: z.string().url().optional(),
});

export type CheckoutItemAddon = z.infer<typeof CheckoutItemAddonSchema>;
export type CheckoutItem = z.infer<typeof CheckoutItemSchema>;
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export interface PriceBreakdown {
  subtotal: number;
  addOnsTotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  itemBreakdowns: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    addons: {
      addonProductId: string;
      addonName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }[];
  appliedDiscount?: {
    id: string;
    code: string;
    amount: number;
  };
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  paymentReference: string;
  authorizationUrl: string;
  warehouseId: string;
  pricing: PriceBreakdown;
  expiresAt: string;
}
