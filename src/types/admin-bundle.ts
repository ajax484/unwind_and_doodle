import { z } from 'zod';
import { Database } from '../lib/supabase/types';

export type ProductStatus = Database['public']['Enums']['product_status'];
export type ProductType = Database['public']['Enums']['product_type'];

export const BundleComponentInputSchema = z.object({
  component_product_id: z.string().uuid('Component product ID must be a valid UUID'),
  quantity: z.coerce.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
});

export const CreateBundleSchema = z.object({
  name: z.string().min(1, 'Bundle name is required').max(200, 'Bundle name is too long'),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  selling_price: z.coerce.number().min(0, 'Selling price cannot be negative'),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative').default(0),
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
  components: z
    .array(BundleComponentInputSchema)
    .min(1, 'A bundle must contain at least one component product'),
});

export const UpdateBundleSchema = CreateBundleSchema.partial();

export const AdminBundleFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  categoryId: z.string().optional(),
  organizationId: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc']).default('newest').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type BundleComponentInput = z.infer<typeof BundleComponentInputSchema>;
export type CreateBundleInput = z.input<typeof CreateBundleSchema>;
export type UpdateBundleInput = z.input<typeof UpdateBundleSchema>;
export type AdminBundleFilters = z.infer<typeof AdminBundleFilterSchema>;

export interface BundleComponentDetail {
  id: string;
  componentProductId: string;
  name: string;
  slug: string;
  sku: string | null;
  productType: ProductType;
  sellingPrice: number;
  costPrice: number;
  primaryImage: string | null;
  quantity: number;
  totalPrice: number;
}

export interface AdminBundlePricingSummary {
  componentsValue: number;
  bundlePrice: number;
  customerSavings: number;
}

export interface AdminBundleListItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  product_type: ProductType;
  selling_price: number;
  cost_price: number;
  status: ProductStatus;
  primaryImage: string | null;
  categories: { id: string; name: string; slug: string }[];
  componentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBundleListResponse {
  bundles: AdminBundleListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminBundleDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  product_type: ProductType;
  selling_price: number;
  cost_price: number;
  status: ProductStatus;
  organization_id: string;
  images: { id: string; storage_path: string; alt_text: string | null; sort_order: number }[];
  categories: { id: string; name: string; slug: string }[];
  components: BundleComponentDetail[];
  pricingSummary: AdminBundlePricingSummary;
  createdAt: string;
  updatedAt: string;
}
