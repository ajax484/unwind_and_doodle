import { z } from 'zod';

export type ProductMediaType = 'image' | 'video';

export interface BaseProductMedia {
  id: string;
  productId: string;
  type: ProductMediaType;
  storagePath: string;
  thumbnailPath: string | null;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImageMedia extends BaseProductMedia {
  type: 'image';
}

export interface ProductVideoMedia extends BaseProductMedia {
  type: 'video';
}

export type ProductMedia = ProductImageMedia | ProductVideoMedia;

export function isProductVideo(media: ProductMedia): media is ProductVideoMedia {
  return media.type === 'video';
}

export function isProductImage(media: ProductMedia): media is ProductImageMedia {
  return media.type === 'image';
}

export const CreateProductMediaSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  type: z.enum(['image', 'video']),
  storagePath: z.string().min(1, 'Storage path is required'),
  thumbnailPath: z.string().nullable().optional().default(null),
  altText: z.string().nullable().optional().default(null),
  sortOrder: z.number().int().min(0, 'Sort order must be greater than or equal to 0').default(0),
});

export const UpdateProductMediaSchema = CreateProductMediaSchema.partial().omit({ productId: true });

export type CreateProductMediaInput = z.infer<typeof CreateProductMediaSchema>;
export type UpdateProductMediaInput = z.infer<typeof UpdateProductMediaSchema>;
