import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  listAdminProducts,
  getAdminProductDetail,
  createAdminProduct,
  updateAdminProduct,
  deleteOrArchiveAdminProduct,
  addProductAddon,
  updateProductAddon,
  removeProductAddon,
  generateUniqueSlug,
} from '@/services/admin-product.service';

describe('Phase 6C: Admin Product & Catalog Management', () => {
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
      categories: [
        { id: 'cat-books', organization_id: orgA, name: 'Coloring Books', slug: 'coloring-books' },
        { id: 'cat-accessories', organization_id: orgA, name: 'Accessories', slug: 'accessories' },
      ],
      products: [
        {
          id: 'prod-bloom-book',
          organization_id: orgA,
          name: 'The Bloom Coloring Book',
          slug: 'bloom-coloring-book',
          description: 'A calming floral coloring journey',
          sku: 'BK-BLOOM-01',
          product_type: 'physical',
          selling_price: 12000,
          cost_price: 4500,
          requires_customization: false,
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'prod-custom-book',
          organization_id: orgA,
          name: 'Personalized Keepsake Storybook',
          slug: 'personalized-keepsake-storybook',
          description: 'Custom illustrated book for children',
          sku: 'BK-CUSTOM-01',
          product_type: 'custom',
          selling_price: 25000,
          cost_price: 9000,
          requires_customization: true,
          status: 'draft',
          created_at: '2026-08-10T10:00:00Z',
          updated_at: '2026-08-10T10:00:00Z',
        },
        {
          id: 'prod-pencils',
          organization_id: orgA,
          name: 'Premium Colored Pencils (24 Pack)',
          slug: 'premium-colored-pencils-24',
          description: 'Artist grade soft core pencils',
          sku: 'ACC-PENCIL-24',
          product_type: 'physical',
          selling_price: 5000,
          cost_price: 2000,
          requires_customization: false,
          status: 'published',
          created_at: '2026-08-15T10:00:00Z',
          updated_at: '2026-08-15T10:00:00Z',
        },
        // Org B product
        {
          id: 'prod-org-b-item',
          organization_id: orgB,
          name: 'Competitor Canvas Set',
          slug: 'competitor-canvas-set',
          sku: 'COMP-01',
          product_type: 'physical',
          selling_price: 30000,
          cost_price: 15000,
          status: 'published',
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-08-20T10:00:00Z',
        },
      ],
      product_categories: [
        { product_id: 'prod-bloom-book', category_id: 'cat-books' },
        { product_id: 'prod-custom-book', category_id: 'cat-books' },
        { product_id: 'prod-pencils', category_id: 'cat-accessories' },
      ],
      product_images: [
        {
          id: 'img-1',
          product_id: 'prod-bloom-book',
          storage_path: 'https://storage.example.com/bloom-cover.jpg',
          alt_text: 'Bloom Book Cover',
          sort_order: 0,
        },
      ],
      product_addons: [
        {
          id: 'addon-rel-1',
          parent_product_id: 'prod-bloom-book',
          addon_product_id: 'prod-pencils',
          price_override: 4000,
          min_quantity: 1,
          max_quantity: 3,
          active: true,
        },
      ],
      warehouses: [
        { id: 'wh-main', name: 'Lagos Mainland Hub', code: 'LOS-01' },
      ],
      inventory: [
        {
          id: 'inv-1',
          warehouse_id: 'wh-main',
          product_id: 'prod-bloom-book',
          quantity_on_hand: 50,
          quantity_reserved: 5,
        },
      ],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Product Creation & Slug Management', () => {
    it('creates a product with auto-generated unique slug and attaches categories and images', async () => {
      const created = await createAdminProduct(
        mockSupabase,
        {
          name: 'African Safari Coloring Adventure',
          selling_price: 16000,
          cost_price: 6000,
          product_type: 'physical',
          requires_customization: false,
          status: 'draft',
          sku: 'BK-SAFARI-01',
          category_ids: ['cat-books'],
          images: [
            {
              storage_path: 'https://storage.example.com/safari-cover.jpg',
              alt_text: 'Safari Cover',
              sort_order: 0,
            },
          ],
        },
        adminUserA,
        orgA
      );

      expect(created.name).toBe('African Safari Coloring Adventure');
      expect(created.slug).toBe('african-safari-coloring-adventure');
      expect(created.selling_price).toBe(16000);
      expect(created.cost_price).toBe(6000);
      expect(created.categories.length).toBe(1);
      expect(created.categories[0].name).toBe('Coloring Books');
      expect(created.images.length).toBe(1);

      // Verify audit logs and domain events
      const audit = mockSupabase._store.audit_logs.find((a) => a.entity_id === created.id);
      expect(audit?.action).toBe('product.created');

      const event = mockSupabase._store.domain_events.find((e) => e.aggregate_id === created.id);
      expect(event?.event_type).toBe('product.created');
    });

    it('handles slug collisions by appending numerical suffixes', async () => {
      const slug1 = await generateUniqueSlug(mockSupabase, 'Bloom Coloring Book', orgA);
      expect(slug1).toBe('bloom-coloring-book-1');
    });

    it('auto-generates structured unique SKU when not provided during product creation', async () => {
      const created = await createAdminProduct(
        mockSupabase,
        {
          name: 'Underwater Ocean Magic',
          selling_price: 14000,
          product_type: 'physical',
          status: 'draft',
          requires_customization: false,
        },
        adminUserA,
        orgA
      );

      expect(created.sku).toBeDefined();
      expect(created.sku).toMatch(/^BK-UNDE-OCEA-\d{4}$/);
    });

    it('rejects duplicate SKU within the same organization', async () => {
      await expect(
        createAdminProduct(
          mockSupabase,
          {
            name: 'Another Bloom Book',
            sku: 'BK-BLOOM-01', // Already exists in Org A
            selling_price: 15000,
            product_type: 'physical',
            status: 'draft',
            requires_customization: false,
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/already exists/i);
    });
  });

  describe('2. Product Listing, Search, Filter & Sort', () => {
    it('lists products scoped to organization with inventory sums', async () => {
      const res = await listAdminProducts(mockSupabase, {
        organizationId: orgA,
      });

      expect(res.products.length).toBe(3);
      expect(res.pagination.total).toBe(3);

      const bloom = res.products.find((p) => p.id === 'prod-bloom-book');
      expect(bloom?.totalStock).toBe(50);
      expect(bloom?.availableStock).toBe(45);
      expect(bloom?.primaryImage).toBe('https://storage.example.com/bloom-cover.jpg');
    });

    it('searches products by name or SKU', async () => {
      const searchByName = await listAdminProducts(mockSupabase, {
        organizationId: orgA,
        search: 'Keepsake',
      });
      expect(searchByName.products.length).toBe(1);
      expect(searchByName.products[0].id).toBe('prod-custom-book');

      const searchBySku = await listAdminProducts(mockSupabase, {
        organizationId: orgA,
        search: 'ACC-PENCIL',
      });
      expect(searchBySku.products.length).toBe(1);
      expect(searchBySku.products[0].id).toBe('prod-pencils');
    });

    it('filters products by status, type, and category', async () => {
      const drafts = await listAdminProducts(mockSupabase, {
        organizationId: orgA,
        status: 'draft',
      });
      expect(drafts.products.length).toBe(1);
      expect(drafts.products[0].id).toBe('prod-custom-book');

      const customTypes = await listAdminProducts(mockSupabase, {
        organizationId: orgA,
        product_type: 'custom',
      });
      expect(customTypes.products.length).toBe(1);
      expect(customTypes.products[0].id).toBe('prod-custom-book');

      const accessories = await listAdminProducts(mockSupabase, {
        organizationId: orgA,
        categoryId: 'cat-accessories',
      });
      expect(accessories.products.length).toBe(1);
      expect(accessories.products[0].id).toBe('prod-pencils');
    });

    it('sorts products by price descending and ascending', async () => {
      const highToLow = await listAdminProducts(mockSupabase, {
        organizationId: orgA,
        sortBy: 'price_desc',
      });
      expect(highToLow.products[0].selling_price).toBe(25000);
      expect(highToLow.products[2].selling_price).toBe(5000);
    });
  });

  describe('3. Product Updates, Publishing & Safe Archival', () => {
    it('updates product pricing and details, emitting domain events', async () => {
      const updated = await updateAdminProduct(
        mockSupabase,
        'prod-bloom-book',
        {
          selling_price: 14500,
          cost_price: 5000,
        },
        adminUserA,
        orgA
      );

      expect(updated.selling_price).toBe(14500);
      expect(updated.cost_price).toBe(5000);

      const dbRow = mockSupabase._store.products.find((p) => p.id === 'prod-bloom-book');
      expect(dbRow?.selling_price).toBe(14500);
    });

    it('publishes and unpublishes product correctly', async () => {
      // Publish draft product
      const published = await updateAdminProduct(
        mockSupabase,
        'prod-custom-book',
        { status: 'published' },
        adminUserA,
        orgA
      );
      expect(published.status).toBe('published');

      const eventPub = mockSupabase._store.domain_events.find((e) => e.event_type === 'product.published');
      expect(eventPub).toBeDefined();

      // Unpublish back to draft
      const drafted = await updateAdminProduct(
        mockSupabase,
        'prod-custom-book',
        { status: 'draft' },
        adminUserA,
        orgA
      );
      expect(drafted.status).toBe('draft');

      const eventUnpub = mockSupabase._store.domain_events.find((e) => e.event_type === 'product.unpublished');
      expect(eventUnpub).toBeDefined();
    });

    it('soft-archives product to preserve historical integrity', async () => {
      const res = await deleteOrArchiveAdminProduct(
        mockSupabase,
        'prod-bloom-book',
        adminUserA,
        orgA
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe('archived');

      const row = mockSupabase._store.products.find((p) => p.id === 'prod-bloom-book');
      expect(row?.status).toBe('archived');
    });
  });

  describe('4. Add-ons Subsystem & Business Rules', () => {
    it('retrieves detailed add-on relationships with effective price and quantity constraints', async () => {
      const detail = await getAdminProductDetail(mockSupabase, 'prod-bloom-book', orgA);

      expect(detail.addons.length).toBe(1);
      const addon = detail.addons[0];
      expect(addon.addonName).toBe('Premium Colored Pencils (24 Pack)');
      expect(addon.addonOriginalPrice).toBe(5000);
      expect(addon.priceOverride).toBe(4000);
      expect(addon.effectivePrice).toBe(4000);
      expect(addon.minQuantity).toBe(1);
      expect(addon.maxQuantity).toBe(3);
    });

    it('attaches an add-on product with price override and min/max quantities', async () => {
      const newAddon = await addProductAddon(
        mockSupabase,
        'prod-custom-book',
        {
          addon_product_id: 'prod-pencils',
          price_override: 3500,
          min_quantity: 1,
          max_quantity: 2,
          active: true,
        },
        orgA,
        adminUserA
      );

      expect(newAddon.parent_product_id).toBe('prod-custom-book');
      expect(newAddon.addon_product_id).toBe('prod-pencils');
      expect(newAddon.price_override).toBe(3500);

      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'product.addon_added');
      expect(event).toBeDefined();
    });

    it('rejects attaching a product as an add-on to itself', async () => {
      await expect(
        addProductAddon(
          mockSupabase,
          'prod-bloom-book',
          {
            addon_product_id: 'prod-bloom-book', // Self-selection
            min_quantity: 1,
            max_quantity: 5,
            active: true,
          },
          orgA,
          adminUserA
        )
      ).rejects.toThrow(/cannot be attached as an add-on to itself/i);
    });

    it('rejects duplicate add-on relationships on the same product', async () => {
      await expect(
        addProductAddon(
          mockSupabase,
          'prod-bloom-book',
          {
            addon_product_id: 'prod-pencils', // Already linked in beforeEach
            min_quantity: 1,
            max_quantity: 5,
            active: true,
          },
          orgA,
          adminUserA
        )
      ).rejects.toThrow(/already linked/i);
    });

    it('updates and removes an add-on relationship', async () => {
      // Update
      const updated = await updateProductAddon(
        mockSupabase,
        'prod-bloom-book',
        'addon-rel-1',
        {
          price_override: 4200,
          max_quantity: 5,
          active: false,
        },
        orgA,
        adminUserA
      );
      expect(updated.price_override).toBe(4200);
      expect(updated.active).toBe(false);

      // Remove
      const removed = await removeProductAddon(
        mockSupabase,
        'prod-bloom-book',
        'addon-rel-1',
        orgA,
        adminUserA
      );
      expect(removed.success).toBe(true);

      const checkDetail = await getAdminProductDetail(mockSupabase, 'prod-bloom-book', orgA);
      expect(checkDetail.addons.length).toBe(0);
    });
  });

  describe('5. Multi-Tenant Security & Isolation', () => {
    it('denies cross-organization product inspection', async () => {
      await expect(
        getAdminProductDetail(mockSupabase, 'prod-org-b-item', orgA)
      ).rejects.toThrow(/Forbidden|not found/i);
    });

    it('denies cross-organization product update', async () => {
      await expect(
        updateAdminProduct(
          mockSupabase,
          'prod-org-b-item',
          { selling_price: 9999 },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden|not found/i);
    });

    it('denies attaching an add-on belonging to another organization', async () => {
      await expect(
        addProductAddon(
          mockSupabase,
          'prod-bloom-book', // Org A product
          {
            addon_product_id: 'prod-org-b-item', // Org B product
            min_quantity: 1,
            max_quantity: 5,
            active: true,
          },
          orgA,
          adminUserA
        )
      ).rejects.toThrow(/different organization|not found/i);
    });
  });
});
