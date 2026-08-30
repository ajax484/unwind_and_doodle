import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import { getPublishedCatalog } from '@/services/catalog.service';

describe('Phase 3C: Product Catalog (/products)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-lagos-01';
  const coloringBookId = 'prod-coloring-book-01';
  const journalId = 'prod-mindful-journal-01';
  const pencilSetId = 'prod-pencil-set-01';
  const outOfStockId = 'prod-out-of-stock-01';
  const draftProdId = 'prod-draft-secret-01';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: warehouseId, name: 'Lagos Hub', code: 'LAG-01', is_active: true },
      ],
      locations: [],
      warehouse_locations: [],
      delivery_rates: [],
      categories: [
        { id: 'cat-cb', name: 'Coloring Books', slug: 'coloring-books' },
        { id: 'cat-jn', name: 'Journals', slug: 'journals' },
        { id: 'cat-wr', name: 'Pencils & Pens', slug: 'writing' },
      ],
      products: [
        {
          id: coloringBookId,
          name: 'Mindful Floral Coloring Book',
          slug: 'mindful-floral-coloring-book',
          description: 'A 50-page mindfulness coloring book for relaxation.',
          price: 5000,
          sku: 'BK-FLR-01',
          requires_customization: true,
          is_active: true,
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          id: journalId,
          name: 'Daily Reflection Journal',
          slug: 'daily-reflection-journal',
          description: 'A guided journal for daily gratitude and reflection.',
          price: 8500,
          sku: 'JN-REF-01',
          requires_customization: false,
          is_active: true,
          created_at: '2026-08-15T10:00:00Z',
        },
        {
          id: pencilSetId,
          name: '24 Artist Coloring Pencils',
          slug: '24-artist-coloring-pencils',
          description: 'Smooth blending colored pencils set.',
          price: 3500,
          sku: 'TL-PNC-24',
          requires_customization: false,
          is_active: true,
          created_at: '2026-08-10T10:00:00Z',
        },
        {
          id: outOfStockId,
          name: 'Limited Edition Hardcover Journal',
          slug: 'limited-edition-hardcover-journal',
          description: 'Sold out hardcover edition.',
          price: 15000,
          sku: 'JN-LTD-01',
          requires_customization: false,
          is_active: true,
          created_at: '2026-08-20T10:00:00Z',
        },
        {
          id: draftProdId,
          name: 'Unreleased Secret Prototype',
          slug: 'unreleased-secret-prototype',
          description: 'Draft item.',
          price: 20000,
          sku: 'BK-SEC-01',
          requires_customization: false,
          is_active: false,
        },
      ],
      product_images: [
        { id: 'img-1', product_id: coloringBookId, image_url: 'https://images.example.com/floral.jpg', is_primary: true },
        { id: 'img-2', product_id: journalId, image_url: 'https://images.example.com/journal.jpg', is_primary: true },
        { id: 'img-3', product_id: pencilSetId, image_url: 'https://images.example.com/pencils.jpg', is_primary: true },
        { id: 'img-4', product_id: outOfStockId, image_url: 'https://images.example.com/ltd.jpg', is_primary: true },
      ],
      product_categories: [
        { product_id: coloringBookId, category_id: 'cat-cb' },
        { product_id: journalId, category_id: 'cat-jn' },
        { product_id: pencilSetId, category_id: 'cat-wr' },
        { product_id: outOfStockId, category_id: 'cat-jn' },
      ],
      product_addons: [],
      inventory: [
        { warehouse_id: warehouseId, product_id: coloringBookId, quantity: 20, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: journalId, quantity: 15, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: pencilSetId, quantity: 30, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: outOfStockId, quantity: 0, reserved_quantity: 0 }, // Out of stock
      ],
      inventory_reservations: [],
      carts: [],
      cart_items: [],
      customers: [],
      orders: [],
      order_items: [],
      order_item_addons: [],
      order_status_history: [],
      payments: [],
      customizations: [],
      customization_assets: [],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Active Products & Multi-field Search', () => {
    it('returns only active published products (excluding drafts)', async () => {
      const catalog = await getPublishedCatalog(mockSupabase);
      expect(catalog.length).toBe(4);
      expect(catalog.map((p) => p.slug)).not.toContain('unreleased-secret-prototype');
    });

    it('searches products by name, description, and SKU', async () => {
      const nameResults = await getPublishedCatalog(mockSupabase, { search: 'Floral' });
      expect(nameResults.length).toBe(1);
      expect(nameResults[0].slug).toBe('mindful-floral-coloring-book');

      const descResults = await getPublishedCatalog(mockSupabase, { search: 'gratitude' });
      expect(descResults.length).toBe(1);
      expect(descResults[0].slug).toBe('daily-reflection-journal');

      const skuResults = await getPublishedCatalog(mockSupabase, { search: 'TL-PNC-24' });
      expect(skuResults.length).toBe(1);
      expect(skuResults[0].slug).toBe('24-artist-coloring-pencils');
    });
  });

  describe('2. Category & Availability Filtering', () => {
    it('filters products by category slug', async () => {
      const journals = await getPublishedCatalog(mockSupabase, { categorySlug: 'journals' });
      expect(journals.length).toBe(2);
      expect(journals.map((j) => j.slug)).toContain('daily-reflection-journal');
      expect(journals.map((j) => j.slug)).toContain('limited-edition-hardcover-journal');
    });

    it('filters in-stock products when inStockOnly = true', async () => {
      const inStockProducts = await getPublishedCatalog(mockSupabase, { inStockOnly: true });
      expect(inStockProducts.length).toBe(3);
      expect(inStockProducts.map((p) => p.slug)).not.toContain('limited-edition-hardcover-journal');
    });
  });

  describe('3. Sorting & Pagination', () => {
    it('sorts by price ascending (Low to High)', async () => {
      const sorted = await getPublishedCatalog(mockSupabase, { sort: 'price-asc' });
      expect(sorted[0].price).toBe(3500); // Pencils
      expect(sorted[1].price).toBe(5000); // Coloring Book
      expect(sorted[2].price).toBe(8500); // Journal
      expect(sorted[3].price).toBe(15000); // Ltd Edition
    });

    it('sorts by price descending (High to Low)', async () => {
      const sorted = await getPublishedCatalog(mockSupabase, { sort: 'price-desc' });
      expect(sorted[0].price).toBe(15000); // Ltd Edition
      expect(sorted[sorted.length - 1].price).toBe(3500); // Pencils
    });

    it('sorts by newest first', async () => {
      const sorted = await getPublishedCatalog(mockSupabase, { sort: 'newest' });
      expect(sorted[0].slug).toBe('limited-edition-hardcover-journal'); // Aug 20
      expect(sorted[1].slug).toBe('daily-reflection-journal'); // Aug 15
    });

    it('paginates results according to page and limit', async () => {
      const page1 = await getPublishedCatalog(mockSupabase, { page: 1, limit: 2 });
      expect(page1.length).toBe(2);

      const page2 = await getPublishedCatalog(mockSupabase, { page: 2, limit: 2 });
      expect(page2.length).toBe(2);
      expect(page2[0].id).not.toBe(page1[0].id);
    });
  });
});
