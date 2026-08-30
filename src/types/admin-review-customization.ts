import { z } from 'zod';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const AdminReviewFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  productId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export type AdminReviewFilterInput = z.infer<typeof AdminReviewFilterSchema>;

export const ModerateReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export type ModerateReviewInput = z.infer<typeof ModerateReviewSchema>;

export const AdminCustomizationFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'processing', 'completed', 'cancelled']).optional(),
  productId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export type AdminCustomizationFilterInput = z.infer<typeof AdminCustomizationFilterSchema>;

export const UploadProcessedAssetSchema = z.object({
  processedStoragePath: z.string().min(1, 'Processed storage path is required'),
  mimeType: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
});

export type UploadProcessedAssetInput = z.infer<typeof UploadProcessedAssetSchema>;

// ==========================================
// TYPESCRIPT RESPONSE MODELS (REVIEWS)
// ==========================================

export interface AdminReviewImageItem {
  id: string;
  storagePath: string;
  url: string;
  createdAt: string;
}

export interface AdminReviewListItem {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  productId: string;
  productName: string;
  productSlug: string;
  orderId: string;
  orderNumber: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: 'pending' | 'approved' | 'rejected';
  imagesCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface AdminReviewSummaryKPIs {
  totalReviews: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  averageRating: number;
}

export interface AdminReviewListResponse {
  reviews: AdminReviewListItem[];
  summary: AdminReviewSummaryKPIs;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminReviewDetail {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  productId: string;
  productName: string;
  productSlug: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: 'pending' | 'approved' | 'rejected';
  publishedAt: string | null;
  createdAt: string;
  images: AdminReviewImageItem[];
}

// ==========================================
// TYPESCRIPT RESPONSE MODELS (CUSTOMIZATIONS)
// ==========================================

export interface AdminCustomizationAssetItem {
  id: string;
  customizationId: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string | null;
  fileSize: number | null;
  processedStoragePath: string | null;
  originalUrl: string;
  processedUrl: string | null;
  createdAt: string;
}

export interface AdminCustomizationListItem {
  id: string;
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  productId: string;
  productName: string;
  totalAssetsCount: number;
  processedAssetsCount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  completedAt: string | null;
  createdAt: string;
}

export interface AdminCustomizationSummaryKPIs {
  totalCustomizations: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
}

export interface AdminCustomizationListResponse {
  customizations: AdminCustomizationListItem[];
  summary: AdminCustomizationSummaryKPIs;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCustomizationDetail {
  id: string;
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  orderCreatedAt: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerWhatsapp: string | null;
  productId: string;
  productName: string;
  productSku: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  completedAt: string | null;
  createdAt: string;
  allAssetsProcessed: boolean;
  assets: AdminCustomizationAssetItem[];
}
