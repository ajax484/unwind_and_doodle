import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  getCartDetails,
  addItemToCart,
  updateCartItemQuantity,
  updateCartItemCustomization,
  removeCartItem,
} from '@/services/cart.service';
import { AddToCartSchema, UpdateCartItemSchema } from '@/types/cart';

describe('Phase 3D: Cart Drawer & Main Cart Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const sessionId = 'cart_drawer_sync_session_1';
  const coloringBookId = 'prod-cb-01';
  const journalId = 'prod-jn-01';
  const pencilsAddonId = 'prod-pencils-01';
  const archivedProductId = 'prod-archived-01';

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
        {
          id: archivedProductId,
          name: 'Archived Notebook',
          slug: 'archived-notebook',
          price: 4000,
          requires_customization: false,
          is_active: false,
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

  describe('6. Customization Equality with Empty Fields', () => {
    it('increments quantity instead of duplicating row when notes are whitespace or empty', async () => {
      // Add first item with empty notes
      const initialCart = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 1,
        customization: {
          notes: '   ',
        },
      });
      expect(initialCart.items.length).toBe(1);
      expect(initialCart.items[0].quantity).toBe(1);

      // Add second item with undefined notes
      const updatedCart = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 2,
      });

      // Should recognize as identical configuration and increment quantity
      expect(updatedCart.items.length).toBe(1);
      expect(updatedCart.items[0].quantity).toBe(3);
    });
  });

  describe('7. Product Availability Flagging in Cart', () => {
    it('marks active product as isAvailable = true', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 1,
      });
      expect(cart.items[0].isAvailable).toBe(true);
    });

    it('marks inactive product as isAvailable = false', async () => {
      const cart = await addItemToCart(mockSupabase, 'session_with_archived', {
        productId: archivedProductId,
        quantity: 1,
      });
      expect(cart.items.length).toBe(1);
      expect(cart.items[0].isAvailable).toBe(false);
    });
  });

  describe('8. Customer Account Association', () => {
    it('links customerId to cart and retrieves cart across sessions', async () => {
      const testCustomerId = 'cust-uuid-12345';
      const cart = await addItemToCart(
        mockSupabase,
        sessionId,
        {
          productId: journalId,
          quantity: 1,
        },
        testCustomerId
      );

      expect(cart.items.length).toBe(1);
      const fetched = await getCartDetails(mockSupabase, 'diff_session_id', testCustomerId);
      expect(fetched.cartId).toBe(cart.cartId);
      expect(fetched.items.length).toBe(1);
    });
  });

  describe('9. Cart Schema Validation', () => {
    it('rejects invalid decimal, negative, or zero quantities', () => {
      const decimalResult = AddToCartSchema.safeParse({
        productId: journalId,
        quantity: 1.5,
      });
      expect(decimalResult.success).toBe(false);

      const negativeResult = AddToCartSchema.safeParse({
        productId: journalId,
        quantity: -2,
      });
      expect(negativeResult.success).toBe(false);

      const zeroResult = AddToCartSchema.safeParse({
        productId: journalId,
        quantity: 0,
      });
      expect(zeroResult.success).toBe(false);
    });

    it('rejects missing or empty productId', () => {
      const emptyResult = AddToCartSchema.safeParse({
        productId: '',
        quantity: 1,
      });
      expect(emptyResult.success).toBe(false);

      const missingResult = AddToCartSchema.safeParse({
        quantity: 1,
      });
      expect(missingResult.success).toBe(false);
    });

    it('validates correct AddToCart payload with optional customization and addons', () => {
      const valid = AddToCartSchema.safeParse({
        productId: coloringBookId,
        quantity: 2,
        addons: [{ addonProductId: pencilsAddonId, quantity: 1 }],
        customization: {
          notes: 'Happy birthday!',
          assetUrls: ['https://example.com/cover.jpg'],
        },
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.quantity).toBe(2);
        expect(valid.data.addons?.[0].quantity).toBe(1);
      }
    });

    it('rejects malformed addon with invalid quantity', () => {
      const invalidAddon = AddToCartSchema.safeParse({
        productId: coloringBookId,
        quantity: 1,
        addons: [{ addonProductId: pencilsAddonId, quantity: -1 }],
      });
      expect(invalidAddon.success).toBe(false);
    });

    it('validates UpdateCartItemSchema requires at least one actionable field', () => {
      const emptyUpdate = UpdateCartItemSchema.safeParse({
        cartItemId: 'item-123',
      });
      expect(emptyUpdate.success).toBe(false);

      const validQtyUpdate = UpdateCartItemSchema.safeParse({
        cartItemId: 'item-123',
        quantity: 4,
      });
      expect(validQtyUpdate.success).toBe(true);

      const validCustomizationUpdate = UpdateCartItemSchema.safeParse({
        cartItemId: 'item-123',
        customization: { notes: 'New note' },
      });
      expect(validCustomizationUpdate.success).toBe(true);
    });
  });

  describe('10. Multi-Cart Deduplication & Item Consolidation', () => {
    it('consolidates orphan items across duplicate cart records into primary cart', async () => {
      const dupSession = 'session_with_duplicates';
      const primaryCartId = 'cart_dup_primary';
      const secondaryCartId = 'cart_dup_secondary';

      mockSupabase._store.carts.push(
        {
          id: primaryCartId,
          session_id: dupSession,
          organization_id: 'org-1',
          status: 'active',
          created_at: '2026-09-01T10:00:00Z',
          updated_at: '2026-09-01T12:00:00Z',
        },
        {
          id: secondaryCartId,
          session_id: dupSession,
          organization_id: 'org-1',
          status: 'active',
          created_at: '2026-09-01T09:00:00Z',
          updated_at: '2026-09-01T09:00:00Z',
        }
      );

      mockSupabase._store.cart_items.push({
        id: 'item-in-secondary',
        cart_id: secondaryCartId,
        product_id: journalId,
        quantity: 2,
        customization_data: null,
      });

      mockSupabase._store.cart_items.push({
        id: 'item-in-primary',
        cart_id: primaryCartId,
        product_id: coloringBookId,
        quantity: 1,
        customization_data: null,
      });

      const details = await getCartDetails(mockSupabase, dupSession);
      expect(details.items.length).toBe(2);
      expect(details.cartId).toBe(primaryCartId);
      expect(mockSupabase._store.carts.some((c) => c.id === secondaryCartId)).toBe(false);
    });
  });
});


