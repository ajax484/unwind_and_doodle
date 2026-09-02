import { z } from 'zod';
import { Database } from '../lib/supabase/types';

export type ProductStatus = Database['public']['Enums']['product_status'];
export type ProductType = Database['public']['Enums']['product_type'];

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  product_type: z.enum(['physical', 'custom']).default('physical'),
  selling_price: z.coerce.number().min(0, 'Selling price cannot be negative'),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative').default(0),
  requires_customization: z.boolean().default(false),
  supports_theme_customization: z.boolean().default(false).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  category_ids: z.array(z.string().uuid()).optional().default([]),
  images: z
    .array(
      z.object({
        storage_path: z.string().min(1),
        alt_text: z.string().optional().nullable(),
        sort_order: z.number().int().min(0).default(0),
      })
    )
    .optional()
    .default([]),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const ProductAddonSchema = z.object({
  addon_product_id: z.string().uuid('Add-on product ID must be a valid UUID'),
  price_override: z.coerce.number().min(0).optional().nullable(),
  min_quantity: z.coerce.number().int().min(1).default(1),
  max_quantity: z.coerce.number().int().min(1).default(5),
  active: z.boolean().default(true),
});

export const UpdateProductAddonSchema = ProductAddonSchema.partial();

export const AdminProductFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  product_type: z.enum(['physical', 'custom']).optional(),
  categoryId: z.string().optional(),
  organizationId: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc']).default('newest').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductAddonInput = z.infer<typeof ProductAddonSchema>;
export type UpdateProductAddonInput = z.infer<typeof UpdateProductAddonSchema>;
export type AdminProductFilters = z.infer<typeof AdminProductFilterSchema>;

export interface AdminProductImageItem {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
}

export interface AdminProductCategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  product_type: ProductType;
  selling_price: number;
  cost_price: number;
  status: ProductStatus;
  requires_customization: boolean;
  primaryImage: string | null;
  categories: AdminProductCategoryItem[];
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductListResponse {
  products: AdminProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminProductAddonDetail {
  id: string;
  addonProductId: string;
  addonName: string;
  addonSku: string | null;
  addonOriginalPrice: number;
  priceOverride: number | null;
  effectivePrice: number;
  minQuantity: number;
  maxQuantity: number;
  active: boolean;
  primaryImage: string | null;
}

export interface AdminProductInventoryItem {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableToSell: number;
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  product_type: ProductType;
  selling_price: number;
  cost_price: number;
  status: ProductStatus;
  requires_customization: boolean;
  supports_theme_customization?: boolean;
  organization_id: string;
  images: AdminProductImageItem[];
  categories: AdminProductCategoryItem[];
  addons: AdminProductAddonDetail[];
  inventory: AdminProductInventoryItem[];
  totalStock: number;
  availableStock: number;
  createdAt: string;
  updatedAt: string;
}
