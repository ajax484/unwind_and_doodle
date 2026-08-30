import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  listAdminReviews,
  getAdminReviewDetail,
  moderateReview,
  deleteReviewImage,
} from '@/services/admin-review.service';
import {
  listAdminCustomizations,
  getAdminCustomizationDetail,
  startCustomizationProcessing,
  setProcessedAsset,
  completeCustomization,
} from '@/services/admin-customization.service';
import { getProductReviews } from '@/services/review.service';

describe('Phase 6F: Reviews & Customer Customization Management', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-competitor-02';

  const adminUserA = 'usr-admin-ada';
  const adminUserB = 'usr-admin-other';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Competitor Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
        { id: 'mem-2', organization_id: orgB, user_id: adminUserB, role: 'admin' },
      ],
      products: [
        {
          id: 'prod-safari-book',
          organization_id: orgA,
          name: 'Safari Coloring Book',
          slug: 'safari-coloring-book',
          sku: 'BK-SAFARI-01',
          product_type: 'physical',
          status: 'published',
        },
        {
          id: 'prod-custom-family-book',
          organization_id: orgA,
          name: 'Custom Family Portrait Coloring Book',
          slug: 'custom-family-portrait-coloring-book',
          sku: 'BK-CUSTOM-01',
          product_type: 'custom',
          status: 'published',
        },
        // Org B Product
        {
          id: 'prod-org-b-item',
          organization_id: orgB,
          name: 'Competitor Coloring Book',
          slug: 'competitor-coloring-book',
          sku: 'COMP-01',
          product_type: 'custom',
          status: 'published',
        },
      ],
      customers: [
        {
          id: 'cust-chidi',
          organization_id: orgA,
          user_id: 'usr-chidi',
          email: 'chidi@example.com',
          first_name: 'Chidi',
          last_name: 'Okeke',
          phone: '08012345678',
        },
        {
          id: 'cust-ngozi',
          organization_id: orgA,
          user_id: 'usr-ngozi',
          email: 'ngozi@example.com',
          first_name: 'Ngozi',
          last_name: 'Eze',
          phone: '08098765432',
        },
        {
          id: 'cust-org-b',
          organization_id: orgB,
          user_id: 'usr-b',
          email: 'david@competitor.com',
          first_name: 'David',
          last_name: 'Smith',
        },
      ],
      orders: [
        {
          id: 'ord-101',
          organization_id: orgA,
          customer_id: 'cust-chidi',
          order_number: 'ORD-2026-101',
          status: 'received',
          payment_status: 'successful',
          total_amount: 15000,
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'ord-102',
          organization_id: orgA,
          customer_id: 'cust-ngozi',
          order_number: 'ORD-2026-102',
          status: 'confirmed',
          payment_status: 'successful',
          total_amount: 28000,
          created_at: '2026-08-05T10:00:00Z',
        },
        // Org B Order
        {
          id: 'ord-org-b',
          organization_id: orgB,
          customer_id: 'cust-org-b',
          order_number: 'ORD-COMP-01',
          status: 'received',
          payment_status: 'successful',
          total_amount: 20000,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      order_items: [
        {
          id: 'item-101-safari',
          order_id: 'ord-101',
          product_id: 'prod-safari-book',
          product_name: 'Safari Coloring Book',
          quantity: 1,
          unit_price: 15000,
          total: 15000,
        },
        {
          id: 'item-102-custom',
          order_id: 'ord-102',
          product_id: 'prod-custom-family-book',
          product_name: 'Custom Family Portrait Coloring Book',
          quantity: 1,
          unit_price: 28000,
          total: 28000,
        },
        {
          id: 'item-org-b',
          order_id: 'ord-org-b',
          product_id: 'prod-org-b-item',
          product_name: 'Competitor Coloring Book',
          quantity: 1,
          unit_price: 20000,
          total: 20000,
        },
      ],
      reviews: [
        {
          id: 'rev-pending-1',
          customer_id: 'cust-chidi',
          product_id: 'prod-safari-book',
          order_id: 'ord-101',
          rating: 5,
          title: 'Beautiful illustrations!',
          body: 'My daughter loved every single page.',
          status: 'pending',
          published_at: null,
          created_at: '2026-08-02T10:00:00Z',
        },
        {
          id: 'rev-approved-1',
          customer_id: 'cust-ngozi',
          product_id: 'prod-safari-book',
          order_id: 'ord-101',
          rating: 4,
          title: 'Great paper quality',
          body: 'Pencils do not bleed through.',
          status: 'approved',
          published_at: '2026-08-03T12:00:00Z',
          created_at: '2026-08-03T10:00:00Z',
        },
        // Org B Review
        {
          id: 'rev-org-b',
          customer_id: 'cust-org-b',
          product_id: 'prod-org-b-item',
          order_id: 'ord-org-b',
          rating: 5,
          title: 'Org B Review',
          body: 'Competitor review body',
          status: 'pending',
          published_at: null,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      review_images: [
        {
          id: 'img-rev-1',
          review_id: 'rev-pending-1',
          storage_path: 'reviews/chidi-daughter-drawing.jpg',
          created_at: '2026-08-02T10:00:00Z',
        },
      ],
      customizations: [
        {
          id: 'custm-102',
          order_item_id: 'item-102-custom',
          status: 'pending',
          completed_at: null,
          created_at: '2026-08-05T10:00:00Z',
        },
        // Org B Customization
        {
          id: 'custm-org-b',
          order_item_id: 'item-org-b',
          status: 'pending',
          completed_at: null,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      customization_assets: [
        {
          id: 'asset-1',
          customization_id: 'custm-102',
          storage_path: 'customizations/uploads/photo-mom.jpg',
          original_filename: 'mom_portrait.jpg',
          mime_type: 'image/jpeg',
          file_size: 2048000,
          processed_storage_path: null,
          created_at: '2026-08-05T10:00:00Z',
        },
        {
          id: 'asset-2',
          customization_id: 'custm-102',
          storage_path: 'customizations/uploads/photo-dad.jpg',
          original_filename: 'dad_portrait.jpg',
          mime_type: 'image/jpeg',
          file_size: 1950000,
          processed_storage_path: null,
          created_at: '2026-08-05T10:00:00Z',
        },
      ],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Review Management & Moderation', () => {
    it('lists organization reviews with rating statistics and filter by status', async () => {
      const list = await listAdminReviews(mockSupabase, {
        organizationId: orgA,
      });

      expect(list.reviews.length).toBe(2);
      expect(list.summary.totalReviews).toBe(2);
      expect(list.summary.pendingCount).toBe(1);
      expect(list.summary.approvedCount).toBe(1);
      expect(list.summary.averageRating).toBe(4.5); // (5 + 4) / 2
    });

    it('searches reviews by customer name, product, or review text', async () => {
      const searchRes = await listAdminReviews(mockSupabase, {
        organizationId: orgA,
        search: 'illustrations',
      });
      expect(searchRes.reviews.length).toBe(1);
      expect(searchRes.reviews[0].id).toBe('rev-pending-1');
    });

    it('approves review, sets published_at timestamp, logs audit trail, and emits domain event', async () => {
      const result = await moderateReview(
        mockSupabase,
        'rev-pending-1',
        'approve',
        'Verified purchaser feedback',
        adminUserA,
        orgA
      );

      expect(result.status).toBe('approved');
      expect(result.published_at).toBeDefined();

      // Verify domain event
      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'review.moderated');
      expect(event).toBeDefined();

      // Verify audit log
      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'review.approved');
      expect(audit).toBeDefined();
    });

    it('rejects inappropriate review and keeps it unpublished', async () => {
      const result = await moderateReview(
        mockSupabase,
        'rev-pending-1',
        'reject',
        'Inappropriate content',
        adminUserA,
        orgA
      );

      expect(result.status).toBe('rejected');
      expect(result.published_at).toBeNull();

      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'review.rejected');
      expect(audit).toBeDefined();
    });

    it('strictly hides pending and rejected reviews from the public storefront', async () => {
      // Public review query on storefront
      const publicReviews = await getProductReviews(mockSupabase, 'prod-safari-book');

      expect(publicReviews.length).toBe(1);
      expect(publicReviews[0].id).toBe('rev-approved-1');
      expect(publicReviews.some((r) => r.id === 'rev-pending-1')).toBe(false);
    });

    it('deletes review image from database and records audit log', async () => {
      const del = await deleteReviewImage(
        mockSupabase,
        'rev-pending-1',
        'img-rev-1',
        adminUserA,
        orgA
      );
      expect(del.success).toBe(true);

      const check = mockSupabase._store.review_images.find((i) => i.id === 'img-rev-1');
      expect(check).toBeUndefined();

      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'review.image_deleted');
      expect(audit).toBeDefined();
    });
  });

  describe('2. Custom Coloring-Book Artwork Pipeline', () => {
    it('lists custom book order queue with multi-asset counts and urgent pending counts', async () => {
      const res = await listAdminCustomizations(mockSupabase, {
        organizationId: orgA,
      });

      expect(res.customizations.length).toBe(1);
      expect(res.summary.pendingCount).toBe(1);
      expect(res.customizations[0].totalAssetsCount).toBe(2);
      expect(res.customizations[0].processedAssetsCount).toBe(0);
    });

    it('retrieves detailed customization workspace with all uploaded photos', async () => {
      const detail = await getAdminCustomizationDetail(mockSupabase, 'custm-102', orgA);

      expect(detail.productName).toBe('Custom Family Portrait Coloring Book');
      expect(detail.customerName).toBe('Ngozi Eze');
      expect(detail.assets.length).toBe(2);
      expect(detail.allAssetsProcessed).toBe(false);
    });

    it('moves customization status to processing', async () => {
      const updated = await startCustomizationProcessing(
        mockSupabase,
        'custm-102',
        adminUserA,
        orgA
      );

      expect(updated.status).toBe('processing');

      const audit = mockSupabase._store.audit_logs.find(
        (a) => a.action === 'customization.processing_started'
      );
      expect(audit).toBeDefined();
    });

    it('attaches processed line-art files to individual assets and advances status', async () => {
      // 1. Process Asset 1
      const asset1 = await setProcessedAsset(
        mockSupabase,
        'custm-102',
        'asset-1',
        { processedStoragePath: 'customizations/processed/lineart-mom.png' },
        adminUserA,
        orgA
      );
      expect(asset1.processed_storage_path).toBe('customizations/processed/lineart-mom.png');

      const intermediate = await getAdminCustomizationDetail(mockSupabase, 'custm-102', orgA);
      expect(intermediate.status).toBe('processing');
      expect(intermediate.allAssetsProcessed).toBe(false);

      // 2. Process Asset 2
      const asset2 = await setProcessedAsset(
        mockSupabase,
        'custm-102',
        'asset-2',
        { processedStoragePath: 'customizations/processed/lineart-dad.png' },
        adminUserA,
        orgA
      );
      expect(asset2.processed_storage_path).toBe('customizations/processed/lineart-dad.png');

      const ready = await getAdminCustomizationDetail(mockSupabase, 'custm-102', orgA);
      expect(ready.allAssetsProcessed).toBe(true);
    });

    it('prevents marking customization completed when any required asset is missing line art', async () => {
      // Asset 1 is processed, Asset 2 is not
      await setProcessedAsset(
        mockSupabase,
        'custm-102',
        'asset-1',
        { processedStoragePath: 'customizations/processed/lineart-mom.png' },
        adminUserA,
        orgA
      );

      await expect(
        completeCustomization(mockSupabase, 'custm-102', adminUserA, orgA)
      ).rejects.toThrow(/still missing processed line-art/i);
    });

    it('marks customization completed once all assets are converted to line art', async () => {
      // Process both assets
      await setProcessedAsset(
        mockSupabase,
        'custm-102',
        'asset-1',
        { processedStoragePath: 'customizations/processed/lineart-mom.png' },
        adminUserA,
        orgA
      );
      await setProcessedAsset(
        mockSupabase,
        'custm-102',
        'asset-2',
        { processedStoragePath: 'customizations/processed/lineart-dad.png' },
        adminUserA,
        orgA
      );

      const completed = await completeCustomization(
        mockSupabase,
        'custm-102',
        adminUserA,
        orgA
      );

      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeDefined();

      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'customization.completed');
      expect(audit).toBeDefined();

      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'customization.completed');
      expect(event).toBeDefined();
    });
  });

  describe('3. Multi-Tenant Security & Tenant Isolation', () => {
    it('denies moderating reviews belonging to another organization', async () => {
      await expect(
        moderateReview(mockSupabase, 'rev-org-b', 'approve', 'Test', adminUserA, orgA)
      ).rejects.toThrow(/Forbidden|not found/i);
    });

    it('denies accessing or processing customizations belonging to another organization', async () => {
      await expect(
        getAdminCustomizationDetail(mockSupabase, 'custm-org-b', orgA)
      ).rejects.toThrow(/Forbidden|not found/i);

      await expect(
        startCustomizationProcessing(mockSupabase, 'custm-org-b', adminUserA, orgA)
      ).rejects.toThrow(/Forbidden|not found/i);
    });
  });
});
