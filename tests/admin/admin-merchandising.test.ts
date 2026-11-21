import { describe, it, expect } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  updateProductMerchandising,
  reorderCategories,
  listCategories,
  listAdminProducts,
} from '@/services/admin-product.service';

describe('Admin Storefront Merchandising & Category Ordering', () => {
  const orgId = 'org-unwind-01';
  const otherOrgId = 'org-other-02';
  const adminUserId = 'user-admin-01';

  it('batch-updates product display_order, is_featured, and featured_order scoped to organization', async () => {
    const supabase = createMockSupabaseClient({
      products: [
        {
          id: 'prod-1',
          organization_id: orgId,
          name: 'Gel Pen',
          slug: 'gel-pen',
          selling_price: 1500,
          cost_price: 500,
          product_type: 'physical',
          status: 'published',
          display_order: 1,
          is_featured: false,
          featured_order: 0,
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'prod-2',
          organization_id: orgId,
          name: 'Mindful Coloring Book',
          slug: 'mindful-coloring-book',
          selling_price: 8500,
          cost_price: 3000,
          product_type: 'physical',
          status: 'published',
          display_order: 2,
          is_featured: false,
          featured_order: 0,
          created_at: '2026-08-02T10:00:00Z',
          updated_at: '2026-08-02T10:00:00Z',
        },
        {
          id: 'prod-foreign',
          organization_id: otherOrgId,
          name: 'Foreign Product',
          slug: 'foreign-product',
          selling_price: 5000,
          cost_price: 1000,
          product_type: 'physical',
          status: 'published',
          display_order: 1,
          is_featured: false,
          featured_order: 0,
          created_at: '2026-08-03T10:00:00Z',
          updated_at: '2026-08-03T10:00:00Z',
        },
      ],
      product_images: [],
      product_media: [],
      product_categories: [],
      categories: [],
      inventory: [],
      audit_logs: [],
    });

    const result = await updateProductMerchandising(
      supabase,
      orgId,
      [
        { id: 'prod-2', display_order: 1, is_featured: true, featured_order: 1 },
        { id: 'prod-1', display_order: 2, is_featured: false, featured_order: 0 },
        { id: 'prod-foreign', display_order: 99, is_featured: true, featured_order: 1 },
      ],
      adminUserId
    );

    expect(result.updatedCount).toBe(2);

    const listed = await listAdminProducts(supabase, {
      organizationId: orgId,
      sortBy: 'display_order',
    });

    expect(listed.products.map((p) => p.id)).toEqual(['prod-2', 'prod-1']);
    expect(listed.products[0].is_featured).toBe(true);
    expect(listed.products[0].featured_order).toBe(1);
    expect(listed.products[1].is_featured).toBe(false);
  });

  it('reorders categories by sort_order and returns them in storefront order', async () => {
    const supabase = createMockSupabaseClient({
      categories: [
        { id: 'cat-1', organization_id: orgId, name: 'Kits', slug: 'kits', sort_order: 1, created_at: '2026-08-01T10:00:00Z' },
        { id: 'cat-2', organization_id: orgId, name: 'Coloring Books', slug: 'coloring-books', sort_order: 2, created_at: '2026-08-01T10:00:00Z' },
        { id: 'cat-3', organization_id: orgId, name: 'Journals', slug: 'journals', sort_order: 3, created_at: '2026-08-01T10:00:00Z' },
      ],
      product_categories: [],
    });

    const res = await reorderCategories(supabase, orgId, ['cat-2', 'cat-3', 'cat-1']);
    expect(res.updatedCount).toBe(3);

    const ordered = await listCategories(supabase, orgId);
    expect(ordered.map((c) => c.slug)).toEqual(['coloring-books', 'journals', 'kits']);
  });
});
