import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { getProductDetailBySlug, getPublishedCatalog } from '@/services/catalog.service';
import { addItemToCart } from '@/services/cart.service';

describe('Phase 3B: Product Detail Page & Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-lagos-01';
  const standardBookId = 'prod-standard-book-01';
  const customBookId = 'prod-custom-book-01';
  const pencilsAddonId = 'prod-pencils-addon-01';
  const outOfStockBookId = 'prod-out-of-stock-01';
  const draftBookId = 'prod-draft-book-01';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: warehouseId, name: 'Lagos Central Hub', code: 'LAG-01', is_active: true },
      ],
      locations: [],
      warehouse_locations: [],
      delivery_rates: [],
      categories: [
        { id: 'cat-cb', name: 'Coloring Books', slug: 'coloring-books' },
        { id: 'cat-tl', name: 'Tools & Pencils', slug: 'writing' },
      ],
      products: [
        {
          id: standardBookId,
          name: 'Mindful Floral Coloring Book',
          slug: 'mindful-floral-coloring-book',
          description: 'A 50-page mindfulness coloring book for relaxation.',
          price: 5000,
          sku: 'BK-FLR-01',
          requires_customization: false,
          is_active: true,
        },
        {
          id: customBookId,
          name: 'Personalized Photo Coloring Book',
          slug: 'personalized-photo-coloring-book',
          description: 'Handcrafted coloring book created from your uploaded memories.',
          price: 12500,
          sku: 'BK-CST-01',
          requires_customization: true,
          is_active: true,
        },
        {
          id: pencilsAddonId,
          name: '24 Artist Coloring Pencils',
          slug: '24-artist-coloring-pencils',
          description: 'Smooth blending colored pencils.',
          price: 3500,
          sku: 'TL-PNC-24',
          requires_customization: false,
          is_active: true,
        },
        {
          id: outOfStockBookId,
          name: 'Limited Edition Botanical Journal',
          slug: 'limited-edition-botanical-journal',
          description: 'Sold out collector journal.',
          price: 8000,
          sku: 'JN-BOT-01',
          requires_customization: false,
          is_active: true,
        },
        {
          id: draftBookId,
          name: 'Unpublished Secret Book',
          slug: 'unpublished-secret-book',
          price: 9000,
          sku: 'BK-DFT-01',
          requires_customization: false,
          is_active: false,
        },
      ],
      product_images: [
        {
          id: 'img-std-1',
          product_id: standardBookId,
          image_url: 'https://images.example.com/floral-1.jpg',
          is_primary: true,
        },
        {
          id: 'img-std-2',
          product_id: standardBookId,
          image_url: 'https://images.example.com/floral-2.jpg',
          is_primary: false,
        },
        {
          id: 'img-cst-1',
          product_id: customBookId,
          image_url: 'https://images.example.com/custom-cover.jpg',
          is_primary: true,
        },
        {
          id: 'img-pnc-1',
          product_id: pencilsAddonId,
          image_url: 'https://images.example.com/pencils.jpg',
          is_primary: true,
        },
      ],
      product_categories: [
        { product_id: standardBookId, category_id: 'cat-cb' },
        { product_id: customBookId, category_id: 'cat-cb' },
        { product_id: pencilsAddonId, category_id: 'cat-tl' },
      ],
      product_addons: [
        {
          id: 'addon-link-1',
          product_id: customBookId,
          addon_product_id: pencilsAddonId,
          price_override: 2500, // Discounted bundled price from 3500 to 2500
          is_required: false,
          active: true,
        },
      ],
      inventory: [
        { warehouse_id: warehouseId, product_id: standardBookId, quantity: 15, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: customBookId, quantity: 50, reserved_quantity: 2 },
        { warehouse_id: warehouseId, product_id: pencilsAddonId, quantity: 30, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: outOfStockBookId, quantity: 0, reserved_quantity: 0 },
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

  describe('1. Product Fetching & Slug Resolution', () => {
    it('successfully loads a published product detail by slug with image gallery and inventory stock', async () => {
      const product = await getProductDetailBySlug(mockSupabase, 'mindful-floral-coloring-book');

      expect(product).not.toBeNull();
      expect(product?.name).toBe('Mindful Floral Coloring Book');
      expect(product?.sku).toBe('BK-FLR-01');
      expect(product?.price).toBe(5000);
      expect(product?.isAvailable).toBe(true);
      expect(product?.availableStock).toBe(15);
      expect(product?.requiresCustomization).toBe(false);
      expect(product?.images.length).toBe(2);
      expect(product?.primaryImage).toBe('https://images.example.com/floral-1.jpg');
    });

    it('returns null for an unpublished/draft product slug', async () => {
      const product = await getProductDetailBySlug(mockSupabase, 'unpublished-secret-book');
      expect(product).toBeNull();
    });

    it('identifies out-of-stock products correctly', async () => {
      const product = await getProductDetailBySlug(mockSupabase, 'limited-edition-botanical-journal');
      expect(product).not.toBeNull();
      expect(product?.isAvailable).toBe(false);
      expect(product?.availableStock).toBe(0);
    });
  });

  describe('2. Add-on Configuration & Price Overrides', () => {
    it('applies price_override when present on active companion add-ons', async () => {
      const product = await getProductDetailBySlug(mockSupabase, 'personalized-photo-coloring-book');

      expect(product).not.toBeNull();
      expect(product?.requiresCustomization).toBe(true);
      expect(product?.addons.length).toBe(1);

      const addon = product?.addons[0];
      expect(addon?.name).toBe('24 Artist Coloring Pencils');
      expect(addon?.originalPrice).toBe(3500);
      expect(addon?.price).toBe(2500); // 2500 price override
      expect(addon?.priceOverride).toBe(2500);
      expect(addon?.isAvailable).toBe(true);
    });
  });

  describe('3. Cart Additions from Product Detail', () => {
    const sessionId = 'session_prod_detail_test';

    it('adds customizable product with attached photo upload and add-on to cart', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: customBookId,
        quantity: 1,
        addons: [{ addonProductId: pencilsAddonId, quantity: 1 }],
        customization: {
          notes: 'Wedding anniversary gift for Dayo & Nkechi',
          assetUrls: ['https://storage.example.com/dayo-nkechi.jpg'],
        },
      });

      expect(cart.items.length).toBe(1);
      const cartItem = cart.items[0];
      expect(cartItem.productName).toBe('Personalized Photo Coloring Book');
      expect(cartItem.quantity).toBe(1);
      expect(cartItem.customization).toBeDefined();
      expect(cartItem.customization?.notes).toBe('Wedding anniversary gift for Dayo & Nkechi');
      expect(cartItem.customization?.assets).toContain('https://storage.example.com/dayo-nkechi.jpg');
      expect(cartItem.addons.length).toBe(1);
      expect(cartItem.addons[0].addonName).toBe('24 Artist Coloring Pencils');
      expect(cartItem.addons[0].unitPrice).toBe(2500); // Effective bundled price
      expect(cart.subtotal).toBe(15000); // 12500 + 2500
    });
  });
});
