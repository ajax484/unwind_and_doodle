import { z } from 'zod';

export const CartAddonInputSchema = z.object({
  addonProductId: z.string().min(1, 'Addon product ID is required'),
  quantity: z
    .number()
    .int('Addon quantity must be an integer')
    .positive('Addon quantity must be at least 1')
    .default(1),
});

export const CartThemeCustomizationInputSchema = z.object({
  selectedThemeIds: z.array(z.string().min(1, 'Theme ID is required')).min(1, 'At least 1 theme is required'),
  coverName: z.string().optional(),
});

export const CartCustomizationInputSchema = z.object({
  notes: z.string().optional(),
  assetUrls: z.array(z.string()).optional(),
  themeCustomization: CartThemeCustomizationInputSchema.optional(),
});

export const AddToCartSchema = z.object({
  productId: z.string().min(1, 'Valid productId is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1'),
  addons: z.array(CartAddonInputSchema).optional(),
  customization: CartCustomizationInputSchema.optional(),
  themeCustomization: CartThemeCustomizationInputSchema.optional(),
});

export const UpdateCartItemSchema = z
  .object({
    cartItemId: z.string().min(1, 'cartItemId is required'),
    quantity: z
      .number()
      .int('Quantity must be an integer')
      .min(0, 'Quantity cannot be negative')
      .optional(),
    customization: z
      .object({
        notes: z.string().optional(),
        assetUrls: z.array(z.string()).optional(),
      })
      .optional(),
    themeCustomization: CartThemeCustomizationInputSchema.optional(),
  })
  .refine(
    (data) =>
      data.quantity !== undefined ||
      data.customization !== undefined ||
      data.themeCustomization !== undefined,
    {
      message: 'Either quantity, customization, or themeCustomization must be provided',
    }
  );

export type AddToCartPayload = z.infer<typeof AddToCartSchema>;
export type UpdateCartItemPayload = z.infer<typeof UpdateCartItemSchema>;
export type CartAddonInputPayload = z.infer<typeof CartAddonInputSchema>;
export type CartThemeCustomizationPayload = z.infer<typeof CartThemeCustomizationInputSchema>;

export type CartAddonInput = CartAddonInputPayload;
export type CartThemeCustomizationInput = CartThemeCustomizationPayload;

export interface CartCustomizationInput {
  notes?: string;
  assetUrls?: string[];
  themeCustomization?: CartThemeCustomizationInput;
}

export interface AddToCartInput {
  productId: string;
  quantity: number;
  addons?: CartAddonInput[];
  customization?: CartCustomizationInput;
  themeCustomization?: CartThemeCustomizationInput;
}

export interface CartItemDetail {
  id: string;
  productId: string;
  productName: string;
  slug: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  primaryImage: string | null;
  requiresCustomization: boolean;
  supportsThemeCustomization?: boolean;
  isAvailable?: boolean;
  productType?: 'physical' | 'custom' | 'bundle';
  bundleComponents?: {
    componentProductId: string;
    name: string;
    quantity: number;
  }[];
  customization?: {
    id: string;
    notes: string | null;
    status: string;
    assets: string[];
  } | null;
  themeCustomization?: {
    selectedThemeIds: string[];
    coverName: string | null;
    themes: {
      id: string;
      name: string;
      sortOrder: number;
    }[];
  } | null;
  addons: {
    id: string;
    addonProductId: string;
    addonName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    primaryImage: string | null;
  }[];
}

export interface CartResponse {
  cartId: string;
  sessionId: string;
  items: CartItemDetail[];
  totalItemCount: number;
  subtotal: number;
  currency: string;
}

