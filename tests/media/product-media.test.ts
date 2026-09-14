import { describe, it, expect } from 'vitest';
import { createMockSupabaseClient } from '../mocks/supabase.mock';
import { getPublishedCatalog, getProductDetailBySlug } from '@/services/catalog.service';
import { getAdminProductDetail, listAdminProducts } from '@/services/admin-product.service';
import {
  ProductMedia,
  ProductImageMedia,
  ProductVideoMedia,
  isProductVideo,
  isProductImage,
  CreateProductMediaSchema,
} from '@/types/product-media';
import {
  buildProductMediaPath,
  isAllowedImageMimeType,
  isAllowedVideoMimeType,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
} from '@/lib/product-media-storage';

describe('Unified Product Media Architecture', () => {
  const orgId = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const prodVideoFirstId = 'prod-video-first-001';
  const prodImageFirstId = 'prod-image-first-002';

  const mockProducts = [
    {
      id: prodVideoFirstId,
      organization_id: orgId,
      name: 'Glow in the Dark Canvas Kit',
      slug: 'glow-canvas-kit',
      description: 'Exciting luminous canvas set',
      sku: 'KIT-GLOW-01',
      selling_price: 12000,
      cost_price: 6000,
      status: 'published',
      product_type: 'physical',
      requires_customization: false,
      created_at: '2026-09-14T08:00:00.000Z',
      updated_at: '2026-09-14T08:00:00.000Z',
    },
    {
      id: prodImageFirstId,
      organization_id: orgId,
      name: 'Watercolor Floral Doodle Book',
      slug: 'floral-doodle-book',
      description: 'Relaxing floral illustrations',
      sku: 'BK-FLORAL-01',
      selling_price: 8500,
      cost_price: 3500,
      status: 'published',
      product_type: 'physical',
      requires_customization: false,
      created_at: '2026-09-14T08:30:00.000Z',
      updated_at: '2026-09-14T08:30:00.000Z',
    },
  ];

  // Video is at sort_order: 0, followed by images at 1 and 2
  const mockMediaVideoFirst: ProductMedia[] = [
    {
      id: 'media-vid-0',
      productId: prodVideoFirstId,
      type: 'video',
      storagePath: 'products/prod-video-first-001/videos/hero_preview.mp4',
      thumbnailPath: 'products/prod-video-first-001/thumbnails/hero_thumb.jpg',
      altText: 'Glow canvas product demonstration video',
      sortOrder: 0,
      createdAt: '2026-09-14T08:05:00.000Z',
      updatedAt: '2026-09-14T08:05:00.000Z',
    },
    {
      id: 'media-img-1',
      productId: prodVideoFirstId,
      type: 'image',
      storagePath: 'products/prod-video-first-001/images/front_packaging.jpg',
      thumbnailPath: null,
      altText: 'Front packaging view',
      sortOrder: 1,
      createdAt: '2026-09-14T08:06:00.000Z',
      updatedAt: '2026-09-14T08:06:00.000Z',
    },
    {
      id: 'media-img-2',
      productId: prodVideoFirstId,
      type: 'image',
      storagePath: 'products/prod-video-first-001/images/paints_detail.jpg',
      thumbnailPath: null,
      altText: 'Included paints and glow tubes',
      sortOrder: 2,
      createdAt: '2026-09-14T08:07:00.000Z',
      updatedAt: '2026-09-14T08:07:00.000Z',
    },
  ];

  // Image is at sort_order: 0, video is at sort_order: 1, image is at sort_order: 2
  const mockMediaImageFirst: ProductMedia[] = [
    {
      id: 'media-img-10',
      productId: prodImageFirstId,
      type: 'image',
      storagePath: 'products/prod-image-first-002/images/cover.jpg',
      thumbnailPath: null,
      altText: 'Book cover illustration',
      sortOrder: 0,
      createdAt: '2026-09-14T08:31:00.000Z',
      updatedAt: '2026-09-14T08:31:00.000Z',
    },
    {
      id: 'media-vid-11',
      productId: prodImageFirstId,
      type: 'video',
      storagePath: 'products/prod-image-first-002/videos/page_flip.mp4',
      thumbnailPath: 'products/prod-image-first-002/thumbnails/flip_thumb.jpg',
      altText: 'Page flip walkthrough',
      sortOrder: 1,
      createdAt: '2026-09-14T08:32:00.000Z',
      updatedAt: '2026-09-14T08:32:00.000Z',
    },
    {
      id: 'media-img-12',
      productId: prodImageFirstId,
      type: 'image',
      storagePath: 'products/prod-image-first-002/images/spread.jpg',
      thumbnailPath: null,
      altText: 'Sample two-page spread',
      sortOrder: 2,
      createdAt: '2026-09-14T08:33:00.000Z',
      updatedAt: '2026-09-14T08:33:00.000Z',
    },
  ];

  const dbMediaRows = [...mockMediaVideoFirst, ...mockMediaImageFirst].map((m) => ({
    id: m.id,
    product_id: m.productId,
    type: m.type,
    storage_path: m.storagePath,
    thumbnail_path: m.thumbnailPath,
    alt_text: m.altText,
    sort_order: m.sortOrder,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  }));

  function createTestClient() {
    return createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind & Doodle HQ', slug: 'unwind-hq' }],
      products: mockProducts,
      product_media: dbMediaRows,
      inventory: [
        { product_id: prodVideoFirstId, warehouse_id: 'wh-1', quantity: 20, reserved_quantity: 0 },
        { product_id: prodImageFirstId, warehouse_id: 'wh-1', quantity: 15, reserved_quantity: 0 },
      ],
      categories: [{ id: 'cat-art', name: 'Art Kits', slug: 'art-kits', organization_id: orgId }],
      product_categories: [
        { product_id: prodVideoFirstId, category_id: 'cat-art' },
        { product_id: prodImageFirstId, category_id: 'cat-art' },
      ],
    });
  }

  describe('Storage Architecture & Helpers', () => {
    it('constructs standard hierarchical storage paths for images, videos, and thumbnails', () => {
      const imgPath = buildProductMediaPath('prod-123', 'images', 'photo.png', 'image/png');
      expect(imgPath).toMatch(/^products\/prod-123\/images\/\d+_[a-f0-9]+\.png$/);

      const vidPath = buildProductMediaPath('prod-123', 'videos', 'demo.mp4', 'video/mp4');
      expect(vidPath).toMatch(/^products\/prod-123\/videos\/\d+_[a-f0-9]+\.mp4$/);

      const thumbPath = buildProductMediaPath('prod-123', 'thumbnails', 'demo_thumb.jpg', 'image/jpeg');
      expect(thumbPath).toMatch(/^products\/prod-123\/thumbnails\/\d+_[a-f0-9]+\.jpg$/);
    });

    it('validates supported image and video MIME types and file limits', () => {
      expect(isAllowedImageMimeType('image/jpeg')).toBe(true);
      expect(isAllowedImageMimeType('image/png')).toBe(true);
      expect(isAllowedImageMimeType('image/webp')).toBe(true);
      expect(isAllowedImageMimeType('application/pdf')).toBe(false);

      expect(isAllowedVideoMimeType('video/mp4')).toBe(true);
      expect(isAllowedVideoMimeType('video/webm')).toBe(true);
      expect(isAllowedVideoMimeType('video/quicktime')).toBe(true);
      expect(isAllowedVideoMimeType('video/avi')).toBe(false);

      expect(MAX_IMAGE_FILE_SIZE).toBe(10 * 1024 * 1024);
      expect(MAX_VIDEO_FILE_SIZE).toBe(100 * 1024 * 1024);
    });
  });

  describe('TypeScript Discriminated Types & Zod Validation', () => {
    it('correctly discriminates image and video media objects', () => {
      const videoItem: ProductMedia = mockMediaVideoFirst[0];
      const imageItem: ProductMedia = mockMediaVideoFirst[1];

      expect(isProductVideo(videoItem)).toBe(true);
      expect(isProductImage(videoItem)).toBe(false);

      expect(isProductImage(imageItem)).toBe(true);
      expect(isProductVideo(imageItem)).toBe(false);
    });

    it('validates CreateProductMediaSchema rules', () => {
      const valid = CreateProductMediaSchema.safeParse({
        productId: '4c7c1d60-2f15-40c0-b4da-ef44860c2845',
        type: 'video',
        storagePath: 'products/4c7c1d60/videos/sample.mp4',
        thumbnailPath: 'products/4c7c1d60/thumbnails/sample.jpg',
        altText: 'Sample demo',
        sortOrder: 0,
      });
      expect(valid.success).toBe(true);

      const invalidOrder = CreateProductMediaSchema.safeParse({
        productId: '4c7c1d60-2f15-40c0-b4da-ef44860c2845',
        type: 'video',
        storagePath: 'products/4c7c1d60/videos/sample.mp4',
        sortOrder: -1,
      });
      expect(invalidOrder.success).toBe(false);
    });
  });

  describe('Catalog Data Access with Unified Media', () => {
    it('returns ordered media[] for catalog listing without assuming video is always first', async () => {
      const supabase = createTestClient();
      const catalog = await getPublishedCatalog(supabase as any);

      const videoFirstProd = catalog.find((p) => p.id === prodVideoFirstId);
      expect(videoFirstProd).toBeDefined();
      expect(videoFirstProd!.media).toHaveLength(3);

      // Verify sort_order 0 is video
      expect(videoFirstProd!.media[0].sortOrder).toBe(0);
      expect(videoFirstProd!.media[0].type).toBe('video');
      expect(videoFirstProd!.media[0].thumbnailPath).toBe('products/prod-video-first-001/thumbnails/hero_thumb.jpg');

      // Verify sort_order 1 and 2 are images
      expect(videoFirstProd!.media[1].sortOrder).toBe(1);
      expect(videoFirstProd!.media[1].type).toBe('image');
      expect(videoFirstProd!.media[2].sortOrder).toBe(2);
      expect(videoFirstProd!.media[2].type).toBe('image');

      // Check primaryImage fallback for video-first product
      // Primary image selects the first image for backward-compatible image display
      expect(videoFirstProd!.primaryImage).toBe('products/prod-video-first-001/images/front_packaging.jpg');

      // Check second product where video is second (sort_order: 1)
      const imageFirstProd = catalog.find((p) => p.id === prodImageFirstId);
      expect(imageFirstProd).toBeDefined();
      expect(imageFirstProd!.media).toHaveLength(3);
      expect(imageFirstProd!.media[0].sortOrder).toBe(0);
      expect(imageFirstProd!.media[0].type).toBe('image');
      expect(imageFirstProd!.media[1].sortOrder).toBe(1);
      expect(imageFirstProd!.media[1].type).toBe('video');
      expect(imageFirstProd!.media[2].sortOrder).toBe(2);
      expect(imageFirstProd!.media[2].type).toBe('image');
      expect(imageFirstProd!.primaryImage).toBe('products/prod-image-first-002/images/cover.jpg');
    });

    it('returns ordered media[] for product detail by slug', async () => {
      const supabase = createTestClient();
      const detail = await getProductDetailBySlug(supabase as any, 'glow-canvas-kit');

      expect(detail).not.toBeNull();
      expect(detail!.media).toHaveLength(3);
      expect(detail!.media[0].type).toBe('video');
      expect(detail!.media[0].storagePath).toBe('products/prod-video-first-001/videos/hero_preview.mp4');
      expect(detail!.media[1].type).toBe('image');
      expect(detail!.media[2].type).toBe('image');

      // Backward compatibility images array only includes images
      expect(detail!.images).toHaveLength(2);
      expect(detail!.images[0].imageUrl).toBe('products/prod-video-first-001/images/front_packaging.jpg');
    });

    it('gracefully falls back to product_images when a legacy product has no product_media records', async () => {
      const legacyProdId = 'legacy-prod-999';
      const supabase = createMockSupabaseClient({
        products: [
          {
            id: legacyProdId,
            organization_id: orgId,
            name: 'Legacy Notebook',
            slug: 'legacy-notebook',
            selling_price: 3000,
            status: 'published',
            product_type: 'physical',
            created_at: '2026-09-01T00:00:00.000Z',
          },
        ],
        // No product_media provided, only legacy product_images
        product_images: [
          {
            id: 'legacy-img-1',
            product_id: legacyProdId,
            storage_path: 'https://example.com/legacy.png',
            sort_order: 0,
            alt_text: 'Legacy cover',
          },
        ],
        inventory: [{ product_id: legacyProdId, quantity: 5, reserved_quantity: 0 }],
      });

      const catalog = await getPublishedCatalog(supabase as any);
      const item = catalog.find((p) => p.id === legacyProdId);
      expect(item).toBeDefined();
      expect(item!.media).toHaveLength(1);
      expect(item!.media[0].type).toBe('image');
      expect(item!.media[0].storagePath).toBe('https://example.com/legacy.png');
      expect(item!.primaryImage).toBe('https://example.com/legacy.png');
    });
  });

  describe('Admin Product Data Access with Unified Media', () => {
    it('returns ordered media[] in getAdminProductDetail', async () => {
      const supabase = createTestClient();
      const detail = await getAdminProductDetail(supabase as any, prodVideoFirstId, orgId);

      expect(detail).toBeDefined();
      expect(detail.media).toBeDefined();
      expect(detail.media).toHaveLength(3);
      expect(detail.media![0].type).toBe('video');
      expect(detail.media![0].sortOrder).toBe(0);
      expect(detail.media![1].type).toBe('image');
      expect(detail.media![1].sortOrder).toBe(1);
    });

    it('returns ordered media[] in listAdminProducts', async () => {
      const supabase = createTestClient();
      const result = await listAdminProducts(supabase as any, { organizationId: orgId });

      expect(result.products).toHaveLength(2);
      const prod = result.products.find((p) => p.id === prodVideoFirstId);
      expect(prod).toBeDefined();
      expect(prod!.media).toBeDefined();
      expect(prod!.media).toHaveLength(3);
      expect(prod!.media![0].type).toBe('video');
      expect(prod!.media![1].type).toBe('image');
    });
  });
});
