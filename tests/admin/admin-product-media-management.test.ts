import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  createAdminProduct,
  updateAdminProduct,
  getAdminProductDetail,
  deleteAdminProductMedia,
} from '@/services/admin-product.service';
import {
  isAllowedImageMimeType,
  isAllowedVideoMimeType,
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  buildProductMediaPath,
} from '@/lib/product-media-storage';

describe('Admin Product Media Management', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-other-store-02';
  const adminUserA = 'usr-admin-ada';
  const adminUserB = 'usr-admin-other';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Other Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
        { id: 'mem-2', organization_id: orgB, user_id: adminUserB, role: 'admin' },
      ],
      products: [
        {
          id: 'prod-existing-book',
          organization_id: orgA,
          name: 'Flora & Fauna Coloring Book',
          slug: 'flora-fauna-coloring-book',
          sku: 'BK-FLORA-01',
          product_type: 'physical',
          selling_price: 15000,
          cost_price: 6000,
          status: 'published',
        },
      ],
      product_media: [
        {
          id: 'pm-1',
          product_id: 'prod-existing-book',
          type: 'image',
          storage_path: 'products/org-unwind-doodle-01/flora-cover.jpg',
          thumbnail_path: null,
          alt_text: 'Flora & Fauna front cover',
          sort_order: 0,
        },
        {
          id: 'pm-2',
          product_id: 'prod-existing-book',
          type: 'video',
          storage_path: 'products/org-unwind-doodle-01/flora-flipthrough.mp4',
          thumbnail_path: 'products/org-unwind-doodle-01/flora-flipthrough-thumb.jpg',
          alt_text: 'Book flipthrough video preview',
          sort_order: 1,
        },
        {
          id: 'pm-3',
          product_id: 'prod-existing-book',
          type: 'image',
          storage_path: 'products/org-unwind-doodle-01/flora-page-1.jpg',
          thumbnail_path: null,
          alt_text: 'Interior page illustration 1',
          sort_order: 2,
        },
      ],
    });
  });

  describe('1. File Type and Size Validation', () => {
    it('validates permitted image MIME types', () => {
      expect(isAllowedImageMimeType('image/jpeg')).toBe(true);
      expect(isAllowedImageMimeType('image/png')).toBe(true);
      expect(isAllowedImageMimeType('image/webp')).toBe(true);
      expect(isAllowedImageMimeType('image/gif')).toBe(true);
      expect(isAllowedImageMimeType('video/mp4')).toBe(false);
      expect(isAllowedImageMimeType('application/pdf')).toBe(false);
    });

    it('validates permitted video MIME types', () => {
      expect(isAllowedVideoMimeType('video/mp4')).toBe(true);
      expect(isAllowedVideoMimeType('video/webm')).toBe(true);
      expect(isAllowedVideoMimeType('video/quicktime')).toBe(true);
      expect(isAllowedVideoMimeType('video/avi')).toBe(false);
      expect(isAllowedVideoMimeType('image/png')).toBe(false);
    });

    it('enforces maximum file sizes (10MB image, 100MB video)', () => {
      expect(MAX_IMAGE_FILE_SIZE).toBe(10 * 1024 * 1024);
      expect(MAX_VIDEO_FILE_SIZE).toBe(100 * 1024 * 1024);
    });

    it('builds standard storage paths with folder separation', () => {
      const imgPath = buildProductMediaPath('prod-123', 'images', 'cover.jpg', 'image/jpeg');
      expect(imgPath).toMatch(/^products\/prod-123\/images\/\d+_[a-f0-9]+\.jpg$/);

      const vidPath = buildProductMediaPath('prod-123', 'videos', 'preview.mp4', 'video/mp4');
      expect(vidPath).toMatch(/^products\/prod-123\/videos\/\d+_[a-f0-9]+\.mp4$/);

      const thumbPath = buildProductMediaPath('prod-123', 'thumbnails', 'thumb.png', 'image/png');
      expect(thumbPath).toMatch(/^products\/prod-123\/thumbnails\/\d+_[a-f0-9]+\.png$/);
    });
  });

  describe('2. Product Creation with Mixed Media', () => {
    it('creates product and persists mixed images and videos with proper sort order', async () => {
      const newProduct = await createAdminProduct(
        mockSupabase,
        {
          name: 'Mindful Mandalas Coloring Book',
          selling_price: 18000,
          cost_price: 7000,
          product_type: 'physical',
          status: 'draft',
          media: [
            {
              type: 'image',
              storage_path: 'products/org-unwind-doodle-01/mandala-cover.jpg',
              alt_text: 'Mandala Cover',
              sort_order: 0,
            },
            {
              type: 'video',
              storage_path: 'products/org-unwind-doodle-01/mandala-timelapse.mp4',
              thumbnail_path: 'products/org-unwind-doodle-01/mandala-thumb.jpg',
              alt_text: 'Coloring Timelapse Preview',
              sort_order: 1,
            },
            {
              type: 'image',
              storage_path: 'products/org-unwind-doodle-01/mandala-page2.jpg',
              alt_text: 'Mandala Page 2 Preview',
              sort_order: 2,
            },
          ],
        },
        adminUserA,
        orgA
      );

      expect(newProduct).toBeDefined();
      expect(newProduct.media).toHaveLength(3);

      const [m0, m1, m2] = newProduct.media!;
      expect(m0.type).toBe('image');
      expect(m0.sortOrder).toBe(0);
      expect(m0.altText).toBe('Mandala Cover');

      expect(m1.type).toBe('video');
      expect(m1.sortOrder).toBe(1);
      expect(m1.thumbnailPath).toBe('products/org-unwind-doodle-01/mandala-thumb.jpg');
      expect(m1.altText).toBe('Coloring Timelapse Preview');

      expect(m2.type).toBe('image');
      expect(m2.sortOrder).toBe(2);

      // Backwards compatibility check: product_images contains the 2 images
      const { data: dbImages } = await mockSupabase
        .from('product_images')
        .select('*')
        .eq('product_id', newProduct.id);

      expect(dbImages).toHaveLength(2);
      expect(dbImages?.map((i) => i.storage_path)).toContain(
        'products/org-unwind-doodle-01/mandala-cover.jpg'
      );
    });
  });

  describe('3. Reordering Mixed Media', () => {
    it('allows moving a video to position 0 (cover video) and updates sort_order', async () => {
      // Reorder so that the video (originally index 1) is moved to position 0
      const updated = await updateAdminProduct(
        mockSupabase,
        'prod-existing-book',
        {
          media: [
            {
              id: 'pm-2',
              type: 'video',
              storage_path: 'products/org-unwind-doodle-01/flora-flipthrough.mp4',
              thumbnail_path: 'products/org-unwind-doodle-01/flora-flipthrough-thumb.jpg',
              alt_text: 'Book flipthrough video preview',
              sort_order: 0,
            },
            {
              id: 'pm-1',
              type: 'image',
              storage_path: 'products/org-unwind-doodle-01/flora-cover.jpg',
              alt_text: 'Flora & Fauna front cover',
              sort_order: 1,
            },
            {
              id: 'pm-3',
              type: 'image',
              storage_path: 'products/org-unwind-doodle-01/flora-page-1.jpg',
              alt_text: 'Interior page illustration 1',
              sort_order: 2,
            },
          ],
        },
        adminUserA,
        orgA
      );

      expect(updated.media).toBeDefined();
      expect(updated.media![0].type).toBe('video');
      expect(updated.media![0].id).toBe('pm-2');
      expect(updated.media![0].sortOrder).toBe(0);

      expect(updated.media![1].type).toBe('image');
      expect(updated.media![1].id).toBe('pm-1');
      expect(updated.media![1].sortOrder).toBe(1);

      expect(updated.media![2].type).toBe('image');
      expect(updated.media![2].id).toBe('pm-3');
      expect(updated.media![2].sortOrder).toBe(2);
    });
  });

  describe('4. Alt Text & Video Thumbnail Updates', () => {
    it('updates alt text and adds thumbnail to a video', async () => {
      const updated = await updateAdminProduct(
        mockSupabase,
        'prod-existing-book',
        {
          media: [
            {
              id: 'pm-1',
              type: 'image',
              storage_path: 'products/org-unwind-doodle-01/flora-cover.jpg',
              alt_text: 'Updated Flora Front Cover (High Contrast Edition)',
              sort_order: 0,
            },
            {
              id: 'pm-2',
              type: 'video',
              storage_path: 'products/org-unwind-doodle-01/flora-flipthrough.mp4',
              thumbnail_path: 'products/org-unwind-doodle-01/new-poster.webp',
              alt_text: 'Video preview showing page turning with gel pen coloring',
              sort_order: 1,
            },
            {
              id: 'pm-3',
              type: 'image',
              storage_path: 'products/org-unwind-doodle-01/flora-page-1.jpg',
              alt_text: null,
              sort_order: 2,
            },
          ],
        },
        adminUserA,
        orgA
      );

      const videoItem = updated.media?.find((m) => m.type === 'video');
      expect(videoItem?.thumbnailPath).toBe('products/org-unwind-doodle-01/new-poster.webp');
      expect(videoItem?.altText).toBe(
        'Video preview showing page turning with gel pen coloring'
      );

      const imageItem = updated.media?.find((m) => m.id === 'pm-1');
      expect(imageItem?.altText).toBe('Updated Flora Front Cover (High Contrast Edition)');
    });
  });

  describe('5. Media Deletion and Sequence Reconciliation', () => {
    it('deletes an individual media item, removes DB record, and re-sequences sort_order', async () => {
      // Delete item at index 1 (pm-2, the video)
      const deleteResult = await deleteAdminProductMedia(
        mockSupabase,
        'prod-existing-book',
        'pm-2',
        orgA
      );

      expect(deleteResult.success).toBe(true);

      // Verify detail shows 2 items remaining, resequenced to 0 and 1
      const detail = await getAdminProductDetail(mockSupabase, 'prod-existing-book', orgA);
      expect(detail.media).toHaveLength(2);
      expect(detail.media?.map((m) => m.id)).toEqual(['pm-1', 'pm-3']);
      expect(detail.media?.[0].sortOrder).toBe(0);
      expect(detail.media?.[1].sortOrder).toBe(1);
    });

    it('rejects deletion when product belongs to another organization', async () => {
      await expect(
        deleteAdminProductMedia(mockSupabase, 'prod-existing-book', 'pm-1', orgB)
      ).rejects.toThrow(/Forbidden/);
    });

    it('rejects deletion when media item does not exist', async () => {
      await expect(
        deleteAdminProductMedia(mockSupabase, 'prod-existing-book', 'pm-nonexistent', orgA)
      ).rejects.toThrow(/Media item not found/);
    });
  });
});
