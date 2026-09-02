import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  getCartDetails,
  addItemToCart,
  updateCartItemQuantity,
  updateCartItemCustomization,
  removeCartItem,
} from '@/services/cart.service';

describe('Phase 3D: Cart Drawer & Main Cart Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const sessionId = 'cart_drawer_sync_session_1';
  const coloringBookId = 'prod-cb-01';
  const journalId = 'prod-jn-01';
  const pencilsAddonId = 'prod-pencils-01';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: 'wh-lagos', name: 'Lagos Hub', code: 'LAG', is_active: true },
      ],
      locations: [],
      warehouse_locations: [],
      delivery_rates: [],
      categories: [],
      products: [
        {
          id: coloringBookId,
          name: 'Mindful Floral Coloring Book',
          slug: 'mindful-floral-coloring-book',
          price: 5000,
          requires_customization: true,
          is_active: true,
        },
        {
          id: journalId,
          name: 'Daily Reflection Journal',
          slug: 'daily-reflection-journal',
          price: 8000,
          requires_customization: false,
          is_active: true,
        },
        {
          id: pencilsAddonId,
          name: '24 Artist Pencils',
          slug: '24-artist-pencils',
          price: 3500,
          requires_customization: false,
          is_active: true,
        },
      ],
      product_images: [
        { id: 'img-1', product_id: coloringBookId, image_url: 'https://images.example.com/cb.jpg', is_primary: true },
        { id: 'img-2', product_id: journalId, image_url: 'https://images.example.com/jn.jpg', is_primary: true },
        { id: 'img-3', product_id: pencilsAddonId, image_url: 'https://images.example.com/pnc.jpg', is_primary: true },
      ],
      product_categories: [],
      product_addons: [
        {
          id: 'addon-1',
          product_id: coloringBookId,
          addon_product_id: pencilsAddonId,
          price_override: 2500,
          is_required: false,
          active: true,
        },
      ],
      inventory: [
        { warehouse_id: 'wh-lagos', product_id: coloringBookId, quantity: 20, reserved_quantity: 0 },
        { warehouse_id: 'wh-lagos', product_id: journalId, quantity: 15, reserved_quantity: 0 },
        { warehouse_id: 'wh-lagos', product_id: pencilsAddonId, quantity: 30, reserved_quantity: 0 },
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

  describe('1. Cart Initialization & Empty State', () => {
    it('returns empty cart structure with totalItemCount = 0 and subtotal = 0', async () => {
      const cart = await getCartDetails(mockSupabase, sessionId);
      expect(cart.items).toEqual([]);
      expect(cart.totalItemCount).toBe(0);
      expect(cart.subtotal).toBe(0);
      expect(cart.currency).toBe('NGN');
    });
  });

  describe('2. Add Items, Add-ons & Customization State', () => {
    it('adds product with companion add-on and photo customization', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: coloringBookId,
        quantity: 2,
        addons: [{ addonProductId: pencilsAddonId, quantity: 1 }],
        customization: {
          notes: 'For Sarah on her birthday',
          assetUrls: ['https://storage.example.com/sarah-1.jpg', 'https://storage.example.com/sarah-2.jpg'],
        },
      });

      expect(cart.items.length).toBe(1);
      const item = cart.items[0];
      expect(item.productName).toBe('Mindful Floral Coloring Book');
      expect(item.quantity).toBe(2);
      expect(item.unitPrice).toBe(5000);
      expect(item.totalPrice).toBe(10000); // 2 * 5000

      // Customization
      expect(item.requiresCustomization).toBe(true);
      expect(item.customization?.notes).toBe('For Sarah on her birthday');
      expect(item.customization?.assets.length).toBe(2);

      // Add-on bundle
      expect(item.addons.length).toBe(1);
      expect(item.addons[0].addonName).toBe('24 Artist Pencils');
      expect(item.addons[0].unitPrice).toBe(2500); // Price override
      expect(item.addons[0].totalPrice).toBe(2500);

      // Total count and subtotal
      expect(cart.totalItemCount).toBe(3); // 2 books + 1 pencils set
      expect(cart.subtotal).toBe(12500); // 10000 + 2500
    });

    it('merges quantity into existing cart item instead of creating duplicate line item when same product is re-added', async () => {
      // 1. First add journal (qty 1)
      const cart1 = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 1,
      });
      expect(cart1.items.length).toBe(1);
      expect(cart1.items[0].quantity).toBe(1);

      // 2. Add same journal again (qty 2)
      const cart2 = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 2,
      });

      // Must remain 1 unique line item with quantity = 3
      expect(cart2.items.length).toBe(1);
      expect(cart2.items[0].productId).toBe(journalId);
      expect(cart2.items[0].quantity).toBe(3);
      expect(cart2.totalItemCount).toBe(3);
      expect(cart2.subtotal).toBe(24000); // 3 * 8000
    });
  });

  describe('3. Quantity Modifications & Removals', () => {
    it('updates quantity of an existing item and recalculates subtotal', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 1,
      });

      const itemId = cart.items[0].id;
      const updated = await updateCartItemQuantity(mockSupabase, sessionId, itemId, 3);

      expect(updated.items[0].quantity).toBe(3);
      expect(updated.items[0].totalPrice).toBe(24000); // 3 * 8000
      expect(updated.subtotal).toBe(24000);
    });

    it('removes item when quantity is set to 0', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 1,
      });

      const itemId = cart.items[0].id;
      const updated = await updateCartItemQuantity(mockSupabase, sessionId, itemId, 0);

      expect(updated.items.length).toBe(0);
      expect(updated.subtotal).toBe(0);
    });

    it('removes item directly via removeCartItem', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 2,
      });

      const itemId = cart.items[0].id;
      const updated = await removeCartItem(mockSupabase, sessionId, itemId);

      expect(updated.items.length).toBe(0);
      expect(updated.subtotal).toBe(0);
    });
  });

  describe('4. Customization Updates in Cart', () => {
    it('allows modifying attached photos and dedication notes of an existing cart item', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: coloringBookId,
        quantity: 1,
        customization: {
          notes: 'Initial note',
          assetUrls: ['https://storage.example.com/photo1.jpg'],
        },
      });

      const itemId = cart.items[0].id;
      const updated = await updateCartItemCustomization(mockSupabase, sessionId, itemId, {
        notes: 'Updated special note',
        assetUrls: [
          'https://storage.example.com/photo1.jpg',
          'https://storage.example.com/photo2.jpg',
        ],
      });

      const item = updated.items[0];
      expect(item.customization?.notes).toBe('Updated special note');
      expect(item.customization?.assets.length).toBe(2);
      expect(item.customization?.assets).toContain('https://storage.example.com/photo2.jpg');
    });
  });

  describe('5. Zero-Quantity Add-on Sanitization', () => {
    it('filters out zero-quantity add-on items when adding to cart', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: coloringBookId,
        quantity: 1,
        addons: [
          { addonProductId: pencilsAddonId, quantity: 0 },
        ],
      });

      expect(cart.items.length).toBe(1);
      expect(cart.items[0].addons.length).toBe(0);
    });
  });
});
