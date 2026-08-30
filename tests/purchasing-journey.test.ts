import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import { getPublishedCatalog, getProductDetailBySlug } from '@/services/catalog.service';
import {
  getOrCreateCart,
  getCartDetails,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
} from '@/services/cart.service';
import { processCheckout } from '@/services/checkout.service';
import {
  PaymentProvider,
  PaymentInput,
  PaymentInitialization,
  PaymentVerification,
  PaymentWebhookVerification,
} from '@/services/payment/provider.interface';
import { ORDER_STATUS } from '@/lib/constants';

class MockPaymentProvider implements PaymentProvider {
  readonly name = 'paystack';

  generateReference(prefix = 'UAD'): string {
    return `${prefix}_TEST_REF_123`;
  }

  async initializeTransaction(input: PaymentInput): Promise<PaymentInitialization> {
    return {
      authorizationUrl: 'https://checkout.paystack.com/mock-pay',
      reference: input.reference,
      provider: 'paystack',
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerification> {
    return {
      status: 'successful',
      reference,
      amount: 17500,
      currency: 'NGN',
      paidAt: new Date().toISOString(),
      channel: 'card',
    };
  }

  async verifyWebhook(): Promise<PaymentWebhookVerification> {
    return { isValid: true };
  }
}

describe('Customer Purchasing Journey (Phase 3)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const warehouseId = 'wh-lagos-01';
  const locationId = 'loc-ikeja-01';
  const coloringBookId = 'prod-coloring-book-01';
  const journalId = 'prod-mindful-journal-01';
  const pencilAddonId = 'prod-pencil-set-01';
  const draftProdId = 'prod-draft-unreleased-01';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      warehouses: [
        { id: warehouseId, name: 'Lagos Hub', code: 'LAG-01', is_active: true },
      ],
      locations: [
        { id: locationId, name: 'Ikeja', state: 'Lagos', country: 'Nigeria', is_active: true },
      ],
      warehouse_locations: [
        { warehouse_id: warehouseId, location_id: locationId, is_default: true },
      ],
      delivery_rates: [
        { warehouse_id: warehouseId, location_id: locationId, rate: 1500, is_active: true },
      ],
      categories: [
        { id: 'cat-cb', name: 'Coloring Books', slug: 'coloring-books' },
        { id: 'cat-jn', name: 'Journals', slug: 'journals' },
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
        },
        {
          id: journalId,
          name: 'Daily Reflection Journal',
          slug: 'daily-reflection-journal',
          description: 'A guided journal for daily gratitude.',
          price: 6000,
          sku: 'JN-REF-01',
          requires_customization: false,
          is_active: true,
        },
        {
          id: pencilAddonId,
          name: '24 Color Pencils Set',
          slug: '24-color-pencils-set',
          description: 'Artist-grade coloring pencils.',
          price: 3500,
          sku: 'TL-PNC-24',
          requires_customization: false,
          is_active: true,
        },
        {
          id: draftProdId,
          name: 'Secret Upcoming Book (Draft)',
          slug: 'secret-upcoming-book',
          price: 10000,
          sku: 'BK-DFT-99',
          requires_customization: false,
          is_active: false, // Inactive / draft
        },
      ],
      product_images: [
        { id: 'img-1', product_id: coloringBookId, image_url: 'https://images.example.com/floral-cover.jpg', is_primary: true },
        { id: 'img-2', product_id: journalId, image_url: 'https://images.example.com/journal-cover.jpg', is_primary: true },
        { id: 'img-3', product_id: pencilAddonId, image_url: 'https://images.example.com/pencil-set.jpg', is_primary: true },
      ],
      product_categories: [
        { product_id: coloringBookId, category_id: 'cat-cb' },
        { product_id: journalId, category_id: 'cat-jn' },
      ],
      product_addons: [
        {
          id: 'addon-link-1',
          product_id: coloringBookId,
          addon_product_id: pencilAddonId,
          price_override: 3000, // Discounted bundled price
          is_required: false,
          sort_order: 1,
        },
      ],
      inventory: [
        { warehouse_id: warehouseId, product_id: coloringBookId, quantity: 20, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: journalId, quantity: 15, reserved_quantity: 0 },
        { warehouse_id: warehouseId, product_id: pencilAddonId, quantity: 30, reserved_quantity: 0 },
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

  describe('1. Product Catalog & Details', () => {
    it('fetches published products and excludes inactive/draft products', async () => {
      const catalog = await getPublishedCatalog(mockSupabase);

      expect(catalog.length).toBe(3);
      const slugs = catalog.map((p) => p.slug);
      expect(slugs).toContain('mindful-floral-coloring-book');
      expect(slugs).toContain('daily-reflection-journal');
      expect(slugs).not.toContain('secret-upcoming-book');
    });

    it('filters products by category slug and search query', async () => {
      const cbProducts = await getPublishedCatalog(mockSupabase, { categorySlug: 'coloring-books' });
      expect(cbProducts.length).toBe(1);
      expect(cbProducts[0].name).toBe('Mindful Floral Coloring Book');

      const searchResults = await getPublishedCatalog(mockSupabase, { search: 'Floral' });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].slug).toBe('mindful-floral-coloring-book');
    });

    it('loads product detail by slug with image gallery and configured add-ons with price overrides', async () => {
      const detail = await getProductDetailBySlug(mockSupabase, 'mindful-floral-coloring-book');

      expect(detail).toBeDefined();
      expect(detail?.name).toBe('Mindful Floral Coloring Book');
      expect(detail?.requiresCustomization).toBe(true);
      expect(detail?.availableStock).toBe(20);
      expect(detail?.primaryImage).toBe('https://images.example.com/floral-cover.jpg');

      // Check Add-ons
      expect(detail?.addons.length).toBe(1);
      const addon = detail?.addons[0];
      expect(addon?.name).toBe('24 Color Pencils Set');
      expect(addon?.originalPrice).toBe(3500);
      expect(addon?.price).toBe(3000); // Price override applied
      expect(addon?.priceOverride).toBe(3000);
    });
  });

  describe('2. Guest Cart Operations', () => {
    const sessionId = 'guest_sess_test_12345';

    it('adds product with custom photo and add-on to cart', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: coloringBookId,
        quantity: 2,
        addons: [{ addonProductId: pencilAddonId, quantity: 1 }],
        customization: {
          notes: 'For Sarah on her graduation',
          assetUrls: ['https://storage.example.com/sarah-photo.jpg'],
        },
      });

      expect(cart.items.length).toBe(1);
      const item = cart.items[0];
      expect(item.productId).toBe(coloringBookId);
      expect(item.quantity).toBe(2);
      expect(item.unitPrice).toBe(5000);
      expect(item.totalPrice).toBe(10000);

      // Customization
      expect(item.customization).toBeDefined();
      expect(item.customization?.notes).toBe('For Sarah on her graduation');
      expect(item.customization?.assets).toContain('https://storage.example.com/sarah-photo.jpg');

      // Add-on
      expect(item.addons.length).toBe(1);
      expect(item.addons[0].addonName).toBe('24 Color Pencils Set');
      expect(item.addons[0].unitPrice).toBe(3000); // Override price in cart
      expect(item.addons[0].quantity).toBe(1);

      // Total count & subtotal: (2 * 5000) + (1 * 3000) = 13000
      expect(cart.totalItemCount).toBe(3);
      expect(cart.subtotal).toBe(13000);
    });

    it('modifies item quantity and recalculates subtotal', async () => {
      const initialCart = await addItemToCart(mockSupabase, sessionId, {
        productId: journalId,
        quantity: 1,
      });
      const itemId = initialCart.items[0].id;

      const updatedCart = await updateCartItemQuantity(mockSupabase, sessionId, itemId, 3);
      expect(updatedCart.items[0].quantity).toBe(3);
      expect(updatedCart.subtotal).toBe(18000); // 3 * 6000
    });

    it('removes item and all associated child add-ons from cart', async () => {
      const cartWithAddon = await addItemToCart(mockSupabase, sessionId, {
        productId: coloringBookId,
        quantity: 1,
        addons: [{ addonProductId: pencilAddonId, quantity: 1 }],
      });
      const itemId = cartWithAddon.items[0].id;

      const emptyCart = await removeCartItem(mockSupabase, sessionId, itemId);
      expect(emptyCart.items.length).toBe(0);
      expect(emptyCart.subtotal).toBe(0);
    });
  });

  describe('3. End-to-End Checkout & Order Creation', () => {
    it('executes server-side checkout, reserves stock, creates order, and initializes Flutterwave', async () => {
      const mockPaymentProvider = new MockPaymentProvider();

      const checkoutResult = await processCheckout({
        supabase: mockSupabase,
        request: {
          customer: {
            email: 'funke@example.com',
            firstName: 'Funke',
            lastName: 'Akintola',
            phone: '08099887766',
            marketingConsent: true,
          },
          shippingAddress: {
            streetAddress: '25 Toyin Street, Ikeja',
            city: 'Ikeja',
            state: 'Lagos',
          },
          locationId: locationId,
          items: [
            {
              productId: coloringBookId,
              quantity: 2,
              customization: {
                notes: 'Happy Birthday Funke',
                assetUrls: ['https://storage.example.com/funke.png'],
              },
              addons: [{ addonProductId: pencilAddonId, quantity: 2 }],
            },
          ],
        },
        paymentProvider: mockPaymentProvider,
      });

      expect(checkoutResult.orderId).toBeDefined();
      expect(checkoutResult.orderNumber).toMatch(/^ORD-/);
      expect(checkoutResult.authorizationUrl).toBe('https://checkout.paystack.com/mock-pay');

      // Verify order amounts:
      // Book: 2 * 5000 = 10000
      // Addon: 2 * 3000 = 6000
      // Delivery fee: 1500
      // Total: 17500
      const order = mockSupabase._store.orders.find((o) => o.id === checkoutResult.orderId);
      expect(order).toBeDefined();
      expect(order.subtotal).toBe(10000);
      expect(order.shipping_fee).toBe(1500);
      expect(order.total).toBe(17500);
      expect(order.status).toBe(ORDER_STATUS.CREATED);

      // Verify reservations created
      const reservations = mockSupabase._store.inventory_reservations.filter(
        (r) => r.reference_id === checkoutResult.orderId
      );
      expect(reservations.length).toBe(2); // Book & pencil
    });
  });
});
