import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from './mocks/supabase.mock';
import {
  listOrganizationThemes,
  createTheme,
  updateTheme,
  toggleThemeActive,
  reorderThemes,
  deleteTheme,
  assignThemesToProduct,
  getProductThemes,
  getPublicProductThemes,
  validateThemeCustomization,
} from '@/services/theme.service';
import { addItemToCart } from '@/services/cart.service';
import { processCheckout } from '@/services/checkout.service';
import { getAdminOrderDetail } from '@/services/admin-order.service';
import { createAdminManualOrder, getPaymentRequestByToken } from '@/services/manual-order.service';
import { PaystackPaymentProvider } from '@/services/payment/paystack.provider';

describe('Phase 6L: Coloring Book Themes & Cover Personalization', () => {
  const orgA = '88c7af2e-afd4-4504-a43f-b14cc45d6263';
  const orgB = '99c7af2e-afd4-4504-a43f-b14cc45d6264';

  const adminUserA = 'usr-admin-ada';
  const adminUserB = 'usr-admin-bob';

  const prodBookId = '11111111-1111-4111-8111-111111111111';
  const prodNormalId = '22222222-2222-4222-8222-222222222222';
  const prodOrgBId = '33333333-3333-4333-8333-333333333333';

  const themeFloral = 'a1111111-1111-4111-8111-111111111111';
  const themeMystical = 'a2222222-2222-4222-8222-222222222222';
  const themeAnimals = 'a3333333-3333-4333-8333-333333333333';
  const themeNature = 'a4444444-4444-4444-8444-444444444444';
  const themeOrgB = 'a5555555-5555-4555-8555-555555555555';

  const warehouseId = 'b19f8b03-3c06-440b-825b-327b6840bf74';
  const locationId = 'bafe67db-ceb1-474c-929b-9b280b15ee90';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.spyOn(PaystackPaymentProvider.prototype, 'initializeTransaction').mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/mock-auth-url',
      provider: 'paystack',
      reference: 'mock-ref-123',
    });

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Other Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'admin' },
        { id: 'mem-2', organization_id: orgB, user_id: adminUserB, role: 'admin' },
      ],
      products: [
        {
          id: prodBookId,
          organization_id: orgA,
          name: 'Custom Coloring Book',
          slug: 'custom-coloring-book',
          sku: 'CB-001',
          selling_price: 5000,
          cost_price: 2000,
          status: 'published',
          supports_theme_customization: true,
          requires_customization: false,
          product_type: 'physical',
        },
        {
          id: prodNormalId,
          organization_id: orgA,
          name: 'Normal Pencils',
          slug: 'normal-pencils',
          sku: 'PN-001',
          selling_price: 1500,
          cost_price: 500,
          status: 'published',
          supports_theme_customization: false,
          requires_customization: false,
          product_type: 'physical',
        },
        {
          id: prodOrgBId,
          organization_id: orgB,
          name: 'Org B Coloring Book',
          slug: 'org-b-book',
          sku: 'CB-B01',
          selling_price: 4500,
          cost_price: 1800,
          status: 'published',
          supports_theme_customization: true,
          requires_customization: false,
          product_type: 'physical',
        },
      ],
      warehouses: [
        { id: warehouseId, organization_id: orgA, name: 'Main Hub', is_active: true },
        { id: 'wh-b-02', organization_id: orgB, name: 'Warehouse B', is_active: true },
      ],
      warehouse_locations: [
        { warehouse_id: warehouseId, location_id: locationId },
      ],
      locations: [
        { id: locationId, organization_id: orgA, name: 'Lagos Central', state: 'Lagos' },
        { id: 'loc-b-02', organization_id: orgB, name: 'Abuja Central', state: 'FCT' },
      ],
      delivery_rates: [
        { id: 'dr-1', warehouse_id: warehouseId, location_id: locationId, price: 1000, active: true },
      ],
      inventory: [
        { id: 'inv-cb', warehouse_id: warehouseId, product_id: prodBookId, quantity: 100, reserved_quantity: 0 },
        { id: 'inv-pn', warehouse_id: warehouseId, product_id: prodNormalId, quantity: 100, reserved_quantity: 0 },
      ],
      themes: [
        {
          id: themeFloral,
          organization_id: orgA,
          name: 'Floral',
          slug: 'floral',
          description: 'Botanical and flower patterns',
          is_active: true,
          sort_order: 1,
        },
        {
          id: themeMystical,
          organization_id: orgA,
          name: 'Mystical',
          slug: 'mystical',
          description: 'Magical and celestial art',
          is_active: true,
          sort_order: 2,
        },
        {
          id: themeAnimals,
          organization_id: orgA,
          name: 'Animals',
          slug: 'animals',
          description: 'Wildlife and pets',
          is_active: true,
          sort_order: 3,
        },
        {
          id: themeNature,
          organization_id: orgA,
          name: 'Nature',
          slug: 'nature',
          description: 'Forests and landscapes',
          is_active: false, // Inactive theme
          sort_order: 4,
        },
        {
          id: themeOrgB,
          organization_id: orgB,
          name: 'Sports',
          slug: 'sports',
          description: 'Athletics and games',
          is_active: true,
          sort_order: 1,
        },
      ],
      product_themes: [
        { product_id: prodBookId, theme_id: themeFloral },
        { product_id: prodBookId, theme_id: themeMystical },
        { product_id: prodBookId, theme_id: themeAnimals },
        { product_id: prodBookId, theme_id: themeNature }, // Inactive theme assigned previously
        { product_id: prodOrgBId, theme_id: themeOrgB },
      ],
    });
  });

  // ==========================================
  // 1. THEME ADMINISTRATION TESTS
  // ==========================================
  describe('1. Theme Administration', () => {
    it('creates a new theme for an organization', async () => {
      const created = await createTheme(mockSupabase, orgA, {
        name: 'Space Exploration',
        slug: 'space-exploration',
        description: 'Rockets, stars, and planets',
        sortOrder: 5,
        isActive: true,
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Space Exploration');
      expect(created.slug).toBe('space-exploration');
      expect(created.organizationId).toBe(orgA);

      const allThemes = await listOrganizationThemes(mockSupabase, orgA);
      expect(allThemes.map((t) => t.slug)).toContain('space-exploration');
    });

    it('auto-generates theme slug from theme name when slug is omitted or empty', async () => {
      const created = await createTheme(mockSupabase, orgA, {
        name: 'Underwater Adventures & Coral Reefs',
        sortOrder: 6,
        isActive: true,
      });

      expect(created.slug).toBe('underwater-adventures-coral-reefs');
    });

    it('rejects duplicate theme slugs within the same organization', async () => {
      await expect(
        createTheme(mockSupabase, orgA, {
          name: 'Duplicate Floral',
          slug: 'floral', // Already exists in orgA
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('allows identical theme slugs across different organizations', async () => {
      const createdOrgB = await createTheme(mockSupabase, orgB, {
        name: 'Floral Org B',
        slug: 'floral', // Exists in orgA, allowed in orgB
      });
      expect(createdOrgB.organizationId).toBe(orgB);
    });

    it('updates an existing theme', async () => {
      const updated = await updateTheme(mockSupabase, orgA, themeFloral, {
        name: 'Botanical Floral',
        description: 'Updated description',
      });

      expect(updated.name).toBe('Botanical Floral');
      expect(updated.description).toBe('Updated description');
    });

    it('deactivates and activates a theme', async () => {
      await toggleThemeActive(mockSupabase, orgA, themeFloral, false);
      const themes = await listOrganizationThemes(mockSupabase, orgA);
      const floral = themes.find((t) => t.id === themeFloral);
      expect(floral?.isActive).toBe(false);
    });

    it('reorders themes', async () => {
      await reorderThemes(mockSupabase, orgA, [
        { id: themeMystical, sortOrder: 1 },
        { id: themeFloral, sortOrder: 2 },
      ]);

      const themes = await listOrganizationThemes(mockSupabase, orgA);
      const mystical = themes.find((t) => t.id === themeMystical);
      expect(mystical?.sortOrder).toBe(1);
    });

    it('deletes a theme safely', async () => {
      await deleteTheme(mockSupabase, orgA, themeAnimals);
      const themes = await listOrganizationThemes(mockSupabase, orgA);
      expect(themes.map((t) => t.id)).not.toContain(themeAnimals);
    });

    it('prevents an admin of Org A from modifying Org B themes', async () => {
      await expect(
        updateTheme(mockSupabase, orgA, themeOrgB, { name: 'Hacked' })
      ).rejects.toThrow();

      await expect(
        deleteTheme(mockSupabase, orgA, themeOrgB)
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // 2. PRODUCT / THEME ASSIGNMENT TESTS
  // ==========================================
  describe('2. Product / Theme Assignment', () => {
    it('assigns active themes to a product', async () => {
      await assignThemesToProduct(mockSupabase, orgA, prodBookId, [
        themeFloral,
        themeMystical,
      ]);

      const assigned = await getProductThemes(mockSupabase, orgA, prodBookId);
      expect(assigned.map((t) => t.id)).toEqual([themeFloral, themeMystical]);
    });

    it('rejects assigning inactive themes to a product', async () => {
      await expect(
        assignThemesToProduct(mockSupabase, orgA, prodBookId, [
          themeFloral,
          themeNature, // themeNature is inactive
        ])
      ).rejects.toThrow();
    });

    it('rejects assigning cross-organization themes to a product', async () => {
      await expect(
        assignThemesToProduct(mockSupabase, orgA, prodBookId, [
          themeOrgB, // Belongs to orgB
        ])
      ).rejects.toThrow();
    });

    it('removes theme assignments cleanly when empty array provided', async () => {
      await assignThemesToProduct(mockSupabase, orgA, prodBookId, []);
      const assigned = await getProductThemes(mockSupabase, orgA, prodBookId);
      expect(assigned).toHaveLength(0);
    });
  });

  // ==========================================
  // 3. STOREFRONT THEME RETRIEVAL TESTS
  // ==========================================
  describe('3. Customer-Facing Theme Retrieval', () => {
    it('returns only active themes assigned to a product ordered by sort_order', async () => {
      const publicThemes = await getPublicProductThemes(mockSupabase, prodBookId);
      // themeNature is inactive, so it must be excluded
      expect(publicThemes).toHaveLength(3);

      const themeIds = publicThemes.map((t) => t.id);
      expect(themeIds).toContain(themeFloral);
      expect(themeIds).toContain(themeMystical);
      expect(themeIds).toContain(themeAnimals);
      expect(themeIds).not.toContain(themeNature);
    });

    it('never returns themes belonging to another organization', async () => {
      const publicThemes = await getPublicProductThemes(mockSupabase, prodBookId);
      expect(publicThemes.map((t) => t.id)).not.toContain(themeOrgB);
    });
  });

  // ==========================================
  // 4. SERVER-SIDE CUSTOMIZATION VALIDATION TESTS
  // ==========================================
  describe('4. Server-Side Customization Validation', () => {
    it('accepts 1 selected theme', async () => {
      const result = await validateThemeCustomization(mockSupabase, orgA, prodBookId, {
        selectedThemeIds: [themeFloral],
      });

      expect(result).not.toBeNull();
      expect(result?.selectedThemeIds).toEqual([themeFloral]);
      expect(result?.themes).toHaveLength(1);
    });

    it('accepts 2 selected themes', async () => {
      const result = await validateThemeCustomization(mockSupabase, orgA, prodBookId, {
        selectedThemeIds: [themeFloral, themeMystical],
      });

      expect(result?.selectedThemeIds).toEqual([themeFloral, themeMystical]);
    });

    it('accepts 3 selected themes (recommended selection)', async () => {
      const result = await validateThemeCustomization(mockSupabase, orgA, prodBookId, {
        selectedThemeIds: [themeFloral, themeMystical, themeAnimals],
      });

      expect(result?.selectedThemeIds).toHaveLength(3);
    });

    it('rejects 0 selected themes when product supports theme customization', async () => {
      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [],
        })
      ).rejects.toThrow(/requires theme customization/i);
    });

    it('rejects 4 selected themes (>3 limit)', async () => {
      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [themeFloral, themeMystical, themeAnimals, themeOrgB],
        })
      ).rejects.toThrow();
    });

    it('rejects duplicate theme IDs in selection', async () => {
      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [themeFloral, themeFloral],
        })
      ).rejects.toThrow(/duplicate/i);
    });

    it('rejects unassigned theme IDs for a product', async () => {
      // Create theme in orgA but do not assign to prodBookId
      const unassignedTheme = await createTheme(mockSupabase, orgA, {
        name: 'Unassigned Theme',
        slug: 'unassigned-theme',
      });

      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [unassignedTheme.id],
        })
      ).rejects.toThrow();
    });

    it('rejects inactive themes in selection', async () => {
      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [themeNature], // inactive theme
        })
      ).rejects.toThrow();
    });

    it('rejects cross-organization theme IDs', async () => {
      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [themeOrgB], // belongs to orgB
        })
      ).rejects.toThrow();
    });

    it('validates and trims cover name', async () => {
      const result = await validateThemeCustomization(mockSupabase, orgA, prodBookId, {
        selectedThemeIds: [themeFloral],
        coverName: '   Amara   ',
      });

      expect(result?.coverName).toBe('Amara');
    });

    it('rejects whitespace-only cover name if provided', async () => {
      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [themeFloral],
          coverName: '    ',
        })
      ).rejects.toThrow(/whitespace/i);
    });

    it('rejects overlong cover name exceeding 100 characters', async () => {
      const longName = 'A'.repeat(101);
      await expect(
        validateThemeCustomization(mockSupabase, orgA, prodBookId, {
          selectedThemeIds: [themeFloral],
          coverName: longName,
        })
      ).rejects.toThrow(/100 characters/i);
    });
  });

  // ==========================================
  // 5. CART INTEGRATION & IDENTITY TESTS
  // ==========================================
  describe('5. Cart Integration & Line Item Identity', () => {
    const sessionId = 'cart-sess-custom-01';

    it('adds customizable coloring book to cart and preserves theme selections', async () => {
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: prodBookId,
        quantity: 1,
        themeCustomization: {
          selectedThemeIds: [themeFloral, themeMystical],
          coverName: 'Amara',
        },
      });

      expect(cart.items).toHaveLength(1);
      const item = cart.items[0];
      expect(item.themeCustomization?.selectedThemeIds).toEqual([themeFloral, themeMystical]);
      expect(item.themeCustomization?.coverName).toBe('Amara');
    });

    it('keeps differently customized coloring books as separate cart items', async () => {
      // Add Book A: Floral, Animals + Cover: Amara
      await addItemToCart(mockSupabase, sessionId, {
        productId: prodBookId,
        quantity: 1,
        themeCustomization: {
          selectedThemeIds: [themeFloral, themeAnimals],
          coverName: 'Amara',
        },
      });

      // Add Book B: Floral, Animals + Cover: David (different cover name)
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: prodBookId,
        quantity: 1,
        themeCustomization: {
          selectedThemeIds: [themeFloral, themeAnimals],
          coverName: 'David',
        },
      });

      // Must remain separate line items
      expect(cart.items).toHaveLength(2);
      expect(cart.items[0].themeCustomization?.coverName).toBe('Amara');
      expect(cart.items[1].themeCustomization?.coverName).toBe('David');
    });

    it('combines identical customizations into a single cart line and increments quantity', async () => {
      // Add item 1
      await addItemToCart(mockSupabase, sessionId, {
        productId: prodBookId,
        quantity: 1,
        themeCustomization: {
          selectedThemeIds: [themeFloral],
          coverName: 'Zainab',
        },
      });

      // Add identical item 2
      const cart = await addItemToCart(mockSupabase, sessionId, {
        productId: prodBookId,
        quantity: 2,
        themeCustomization: {
          selectedThemeIds: [themeFloral],
          coverName: 'Zainab',
        },
      });

      // Should combine into single item with quantity 3
      const item = cart.items.find((i) => i.themeCustomization?.coverName === 'Zainab');
      expect(item?.quantity).toBe(3);
    });
  });

  // ==========================================
  // 6. ORDER PROCESS & HISTORICAL SNAPSHOT TESTS
  // ==========================================
  describe('6. Orders & Historical Theme Snapshots', () => {
    it('executes checkout and persists denormalized theme snapshot on order items', async () => {
      const checkoutResult = await processCheckout({
        supabase: mockSupabase,
        request: {
          locationId,
          customer: {
            email: 'customer@example.com',
            firstName: 'Amara',
            lastName: 'Okafor',
            phone: '+2348012345678',
            marketingConsent: false,
          },
          shippingAddress: {
            streetAddress: '12 Marina Road',
            city: 'Lagos',
            state: 'Lagos',
          },
          items: [
            {
              productId: prodBookId,
              quantity: 1,
              addons: [],
              themeCustomization: {
                selectedThemeIds: [themeFloral, themeMystical],
                coverName: 'Amara',
              },
            },
          ],
        },
      });

      expect(checkoutResult.orderId).toBeDefined();

      const orderDetail = await getAdminOrderDetail(mockSupabase, checkoutResult.orderId, orgA);
      expect(orderDetail.items).toHaveLength(1);

      const orderItem = orderDetail.items[0];
      expect(orderItem.themeCustomization).toBeDefined();
      expect(orderItem.themeCustomization?.coverName).toBe('Amara');
      expect(orderItem.themeCustomization?.themes).toHaveLength(2);
      expect(orderItem.themeCustomization?.themes.map((t) => t.themeName)).toEqual(['Floral', 'Mystical']);
    });

    it('preserves historical order theme snapshot even if theme is later renamed or deactivated', async () => {
      // 1. Create order
      const checkoutResult = await processCheckout({
        supabase: mockSupabase,
        request: {
          locationId,
          customer: {
            email: 'snapshot.user@example.com',
            firstName: 'Historical',
            lastName: 'User',
            marketingConsent: false,
          },
          shippingAddress: {
            streetAddress: '45 Victoria Island',
            city: 'Lagos',
            state: 'Lagos',
          },
          items: [
            {
              productId: prodBookId,
              quantity: 1,
              addons: [],
              themeCustomization: {
                selectedThemeIds: [themeFloral],
                coverName: 'Legacy Cover',
              },
            },
          ],
        },
      });

      // 2. Later: Admin renames and deactivates 'themeFloral'
      await updateTheme(mockSupabase, orgA, themeFloral, {
        name: 'Super Floral 2027 Edition',
        isActive: false,
      });

      // 3. Historical order must still report original 'Floral' name and snapshot
      const orderDetail = await getAdminOrderDetail(mockSupabase, checkoutResult.orderId, orgA);
      const orderItem = orderDetail.items[0];
      expect(orderItem.themeCustomization?.themes[0].themeName).toBe('Floral');
    });

    it('supports coloring book customization in manual orders', async () => {
      const manualRes = await createAdminManualOrder(
        mockSupabase,
        {
          customer: {
            email: 'manual.client@example.com',
            firstName: 'Manual',
            lastName: 'Client',
          },
          shippingAddress: {
            addressLine1: '8 Ikoyi Crescent',
            city: 'Lagos',
            state: 'Lagos',
          },
          items: [
            {
              productId: prodBookId,
              quantity: 1,
              customization: {
                theme_ids: [themeFloral, themeAnimals],
                cover_name: 'Manual Order Cover',
              },
            },
          ],
          manualOrderChannel: 'instagram',
          shippingFee: 1500,
          locationId,
        },
        adminUserA,
        orgA
      );

      expect(manualRes.paymentRequestId).toBeDefined();

      const payDetail = await getPaymentRequestByToken(mockSupabase, manualRes.token);
      expect(payDetail.items[0].themeCustomization).toBeDefined();
      expect(payDetail.items[0].themeCustomization?.coverName).toBe('Manual Order Cover');
      expect(payDetail.items[0].themeCustomization?.themes).toHaveLength(2);
    });
  });
});
