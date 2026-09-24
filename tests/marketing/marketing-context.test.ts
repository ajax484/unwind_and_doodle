import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '../mocks/supabase.mock';
import {
  classifyProductFamily,
  resolveProductRecommendation,
  getCustomerPurchasedFamilies,
  RECOMMENDATION_CANDIDATES,
} from '@/services/marketing-recommendation.service';
import {
  resolveMarketingContext,
  selectPrimaryOrderItem,
} from '@/services/marketing-context.service';
import {
  renderMarketingTemplate,
  escapeHtml,
} from '@/services/marketing-renderer.service';
import { replacePersonalizationTags } from '@/lib/sanitize-html';
import { MarketingContext } from '@/types/marketing-context';

describe('Step 17A: Marketing Personalization Context & Dynamic Recommendations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgId = 'org-11111111-1111-1111-1111-111111111111';
  const customerId = 'cust-12345';
  const customerEmail = 'aisha.customer@example.com';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [{ id: orgId, name: 'Unwind and Doodle', slug: 'unwind-and-doodle' }],
      customers: [
        {
          id: customerId,
          organization_id: orgId,
          email: customerEmail,
          first_name: 'Aisha',
          last_name: 'Bello',
          email_marketing_consent: true,
        },
      ],
      products: [
        {
          id: 'prod-general',
          organization_id: orgId,
          name: 'General-Themed Colouring Book',
          slug: 'general-themed',
          sku: 'BK-GENE-THEM-5822',
          status: 'published',
          selling_price: 7000,
        },
        {
          id: 'prod-game-book',
          organization_id: orgId,
          name: 'Ultimate Game Book',
          slug: 'ultimate-game-book',
          sku: 'BK-GAME-BOOK-1001',
          status: 'published',
          selling_price: 8500,
        },
        {
          id: 'prod-unwind-kit',
          organization_id: orgId,
          name: 'Unwind Kit',
          slug: 'unwind-kit',
          sku: 'BNDL-UNWI-KIT-1125',
          status: 'published',
          selling_price: 11500,
        },
        {
          id: 'prod-play-color',
          organization_id: orgId,
          name: 'Play and Color Kit',
          slug: 'play-and-color',
          sku: 'BNDL-PLAY-COLO-3001',
          status: 'published',
          selling_price: 14000,
        },
        {
          id: 'prod-vent-to-me',
          organization_id: orgId,
          name: 'Vent to Me Guided Journal',
          slug: 'vent-to-me',
          sku: 'BK-VENT-TO-ME-4001',
          status: 'published',
          selling_price: 9000,
        },
        {
          id: 'prod-tools',
          organization_id: orgId,
          name: 'Coloring Pencil Set',
          slug: 'coloring-pencil',
          sku: 'BK-COLO-PENC-7326',
          status: 'published',
          selling_price: 3000,
        },
        {
          id: 'prod-std-custom',
          organization_id: orgId,
          name: 'Standard Custom Colouring Book',
          slug: 'standard-custom',
          sku: 'BK-STAN-CUST-2901',
          status: 'published',
          selling_price: 12000,
          requires_customization: true,
        },
        {
          id: 'prod-full-custom',
          organization_id: orgId,
          name: 'Full Custom Colouring Book',
          slug: 'full-custom',
          sku: 'BK-FULL-CUST-5001',
          status: 'published',
          selling_price: 25000,
          requires_customization: true,
        },
      ],
      orders: [],
      order_items: [],
    });
  });

  // ==========================================================================
  // 1. BASIC TOKENS
  // ==========================================================================
  describe('1. Basic Tokens', () => {
    it('substitutes first_name, last_name, and email correctly', () => {
      const template = 'Hi {{first_name}} {{last_name}}, your email is {{email}}.';
      const context: MarketingContext = {
        firstName: 'Zainab',
        lastName: 'Ahmed',
        email: 'zainab@example.com',
      };

      const result = renderMarketingTemplate(template, context);
      expect(result).toBe('Hi Zainab Ahmed, your email is zainab@example.com.');
    });

    it('falls back gracefully when names are missing', () => {
      const template = 'Hello {{first_name}} {{last_name}}!';
      const context: MarketingContext = {
        firstName: null,
        lastName: null,
      };

      const result = renderMarketingTemplate(template, context, { fallback: 'Friend' });
      expect(result).toBe('Hello Friend Friend!');
    });

    it('defaults to empty string when no fallback is provided', () => {
      const template = 'Welcome {{first_name}}!';
      const context: MarketingContext = {};

      const result = renderMarketingTemplate(template, context);
      expect(result).toBe('Welcome !');
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });
  });

  // ==========================================================================
  // 2. ORDER CONTEXT
  // ==========================================================================
  describe('2. Order Context', () => {
    it('substitutes {{order_number}} when resolved from order event', async () => {
      const template = 'Order {{order_number}} has been confirmed.';
      const context = await resolveMarketingContext(mockSupabase as any, {
        customerId,
        orderNumber: 'ORD-9842',
      });

      const result = renderMarketingTemplate(template, context);
      expect(result).toBe('Order ORD-9842 has been confirmed.');
    });

    it('resolves order_number from orderId lookup when missing in event payload', async () => {
      // Seed order
      (mockSupabase as any)._store.orders.push({
        id: 'ord-lookup-1',
        organization_id: orgId,
        customer_id: customerId,
        order_number: 'ORD-AUTO-7711',
        email: customerEmail,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      });

      const context = await resolveMarketingContext(mockSupabase as any, {
        customerId,
        orderId: 'ord-lookup-1',
      });

      expect(context.orderNumber).toBe('ORD-AUTO-7711');
      const rendered = renderMarketingTemplate('Your order {{order_number}} is ready', context);
      expect(rendered).toBe('Your order ORD-AUTO-7711 is ready');
    });

    it('omits order_number cleanly when no order context exists', async () => {
      const template = 'Welcome to Unwind! {{order_number}}';
      const context = await resolveMarketingContext(mockSupabase as any, {
        customerId,
      });

      const rendered = renderMarketingTemplate(template, context);
      expect(rendered).toBe('Welcome to Unwind! ');
      expect(rendered).not.toContain('undefined');
      expect(rendered).not.toContain('null');
    });
  });

  // ==========================================================================
  // 3. PRODUCT CONTEXT & MULTI-ITEM DETERMINISM
  // ==========================================================================
  describe('3. Product Context & Multi-Item Determinism', () => {
    it('resolves {{product_name}} from input context', async () => {
      const template = 'Only a few {{product_name}} kits remaining!';
      const context = await resolveMarketingContext(mockSupabase as any, {
        productName: 'Play and Color',
      });

      const rendered = renderMarketingTemplate(template, context);
      expect(rendered).toBe('Only a few Play and Color kits remaining!');
    });

    it('resolves {{last_product}} from most recent paid order', async () => {
      // Seed older order
      (mockSupabase as any)._store.orders.push({
        id: 'ord-old',
        organization_id: orgId,
        customer_id: customerId,
        order_number: 'ORD-OLD',
        email: customerEmail,
        status: 'received',
        created_at: '2026-08-01T10:00:00Z',
      });
      (mockSupabase as any)._store.order_items.push({
        id: 'item-old',
        order_id: 'ord-old',
        product_id: 'prod-general',
        product_name: 'General-Themed Colouring Book',
        total: 7000,
        unit_price: 7000,
      });

      // Seed recent order
      (mockSupabase as any)._store.orders.push({
        id: 'ord-recent',
        organization_id: orgId,
        customer_id: customerId,
        order_number: 'ORD-RECENT',
        email: customerEmail,
        status: 'confirmed',
        created_at: '2026-09-01T10:00:00Z',
      });
      (mockSupabase as any)._store.order_items.push({
        id: 'item-recent',
        order_id: 'ord-recent',
        product_id: 'prod-unwind-kit',
        product_name: 'Unwind Kit',
        total: 11500,
        unit_price: 11500,
      });

      const context = await resolveMarketingContext(mockSupabase as any, {
        customerId,
      });

      expect(context.lastProduct).toBe('Unwind Kit');
      const rendered = renderMarketingTemplate('You previously bought {{last_product}}.', context);
      expect(rendered).toBe('You previously bought Unwind Kit.');
    });

    it('selects primary order item deterministically by total price then unit price', () => {
      const items = [
        { id: 'i1', product_name: 'Coloring Pencil Set', total: 3000, unit_price: 3000 },
        { id: 'i2', product_name: 'Unwind Kit', total: 11500, unit_price: 11500 },
        { id: 'i3', product_name: 'Stickers', total: 1000, unit_price: 1000 },
      ];

      const primary = selectPrimaryOrderItem(items);
      expect(primary).not.toBeNull();
      expect(primary?.productName).toBe('Unwind Kit');
    });

    it('breaks ties deterministically by alphanumeric id', () => {
      const items = [
        { id: 'item-b', product_name: 'Book B', total: 5000, unit_price: 5000 },
        { id: 'item-a', product_name: 'Book A', total: 5000, unit_price: 5000 },
      ];

      const primary = selectPrimaryOrderItem(items);
      expect(primary?.productName).toBe('Book A');
    });
  });

  // ==========================================================================
  // 4. RECOMMENDATION MATRIX & PLAYBOOK RULES
  // ==========================================================================
  describe('4. Recommendation Rules (Unwind & Doodle Playbook)', () => {
    it('classifies product families reliably from metadata', () => {
      expect(classifyProductFamily({ slug: 'general-themed' })).toBe('general_colouring_book');
      expect(classifyProductFamily({ slug: 'unwind-kit' })).toBe('unwind_kit');
      expect(classifyProductFamily({ slug: 'ultimate-game-book' })).toBe('ultimate_game_book');
      expect(classifyProductFamily({ slug: 'play-and-color' })).toBe('play_and_color');
      expect(classifyProductFamily({ slug: 'vent-to-me' })).toBe('vent_to_me');
      expect(classifyProductFamily({ slug: 'standard-custom', requires_customization: true })).toBe('standard_custom');
      expect(classifyProductFamily({ slug: 'full-custom', requires_customization: true })).toBe('full_custom');
      expect(classifyProductFamily({ slug: 'coloring-pencil' })).toBe('tools');
    });

    it('recommends Ultimate Game Book for General Colouring Book buyer', async () => {
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'general_colouring_book',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('ultimate_game_book');
      expect(rec?.title).toBe('Ultimate Game Book');
      expect(rec?.recommendationText).toContain('try the Ultimate Game Book');
    });

    it('recommends Ultimate Game Book for Unwind Kit buyer', async () => {
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'unwind_kit',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('ultimate_game_book');
      expect(rec?.recommendationText).toContain('Ultimate Game Book is the most natural next addition');
    });

    it('recommends General Colouring Book for Ultimate Game Book buyer', async () => {
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'ultimate_game_book',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('general_colouring_book');
      expect(rec?.recommendationText).toContain('General-Themed Colouring Book next');
    });

    it('recommends Vent to Me for Play and Color buyer', async () => {
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'play_and_color',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('vent_to_me');
      expect(rec?.recommendationText).toContain('Vent to Me is the next option');
    });

    it('recommends Unwind Kit for Vent to Me buyer', async () => {
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'vent_to_me',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('unwind_kit');
      expect(rec?.recommendationText).toContain('Unwind Kit gives you another kind of break');
    });

    it('recommends Full Custom for Standard Custom buyer', async () => {
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'standard_custom',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('full_custom');
      expect(rec?.recommendationText).toContain('Full Custom option takes it further');
    });

    it('recommends General Colouring Book for Tools-only buyer', async () => {
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'tools',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('general_colouring_book');
      expect(rec?.recommendationText).toContain('Add one of our colouring books and put them to proper use');
    });
  });

  // ==========================================================================
  // 5. ALREADY-OWNED PRODUCT EXCLUSION
  // ==========================================================================
  describe('5. Already-Owned Product Exclusion', () => {
    it('skips candidate product if customer already purchased it and selects fallback', async () => {
      // Customer already bought General Colouring Book and Ultimate Game Book
      (mockSupabase as any)._store.orders.push({
        id: 'ord-hist-1',
        organization_id: orgId,
        customer_id: customerId,
        order_number: 'ORD-HIST-1',
        status: 'confirmed',
        created_at: '2026-07-01T10:00:00Z',
      });
      (mockSupabase as any)._store.order_items.push(
        {
          id: 'item-1',
          order_id: 'ord-hist-1',
          product_id: 'prod-general',
          product_name: 'General-Themed Colouring Book',
          sku: 'BK-GENE-THEM-5822',
        },
        {
          id: 'item-2',
          order_id: 'ord-hist-1',
          product_id: 'prod-game-book',
          product_name: 'Ultimate Game Book',
          sku: 'BK-GAME-BOOK-1001',
        }
      );

      // Verify customer owned families
      const owned = await getCustomerPurchasedFamilies(mockSupabase as any, customerId);
      expect(owned.has('general_colouring_book')).toBe(true);
      expect(owned.has('ultimate_game_book')).toBe(true);

      // Recommend for General Colouring Book:
      // Candidates are: ['ultimate_game_book', 'tools']
      // Since ultimate_game_book is ALREADY OWNED, it should fall back to 'tools'!
      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'general_colouring_book',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('tools');
    });

    it('falls back to Play and Color when Unwind Kit buyer already owns Ultimate Game Book', async () => {
      (mockSupabase as any)._store.orders.push({
        id: 'ord-hist-game',
        organization_id: orgId,
        customer_id: customerId,
        status: 'received',
        created_at: '2026-07-15T10:00:00Z',
      });
      (mockSupabase as any)._store.order_items.push({
        id: 'item-game',
        order_id: 'ord-hist-game',
        product_id: 'prod-game-book',
        product_name: 'Ultimate Game Book',
        sku: 'BK-GAME-BOOK-1001',
      });

      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'unwind_kit',
        type: 'post_purchase',
      });

      expect(rec).not.toBeNull();
      expect(rec?.productFamily).toBe('play_and_color');
    });

    it('returns null when ALL candidate products are already owned', async () => {
      // Customer already owns General Colouring Book, Ultimate Game Book, and Tools
      (mockSupabase as any)._store.orders.push({
        id: 'ord-hist-all',
        organization_id: orgId,
        customer_id: customerId,
        status: 'received',
        created_at: '2026-06-01T10:00:00Z',
      });
      (mockSupabase as any)._store.order_items.push(
        {
          id: 'item-all-1',
          order_id: 'ord-hist-all',
          product_id: 'prod-general',
          product_name: 'General-Themed Colouring Book',
          sku: 'BK-GENE-THEM-5822',
        },
        {
          id: 'item-all-2',
          order_id: 'ord-hist-all',
          product_id: 'prod-game-book',
          product_name: 'Ultimate Game Book',
          sku: 'BK-GAME-BOOK-1001',
        },
        {
          id: 'item-all-3',
          order_id: 'ord-hist-all',
          product_id: 'prod-tools',
          product_name: 'Coloring Pencil Set',
          sku: 'BK-COLO-PENC-7326',
        }
      );

      const rec = await resolveProductRecommendation({
        supabase: mockSupabase as any,
        organizationId: orgId,
        customerId,
        sourceFamily: 'general_colouring_book',
        type: 'post_purchase',
      });

      // Both candidates (ultimate_game_book and tools) are owned -> null
      expect(rec).toBeNull();
    });
  });

  // ==========================================================================
  // 6. CLEAN OMISSION OF RECOMMENDATION BLOCKS
  // ==========================================================================
  describe('6. Clean Omission of Recommendation Blocks', () => {
    it('cleanly omits {{product_recommendation}} when null without broken placeholders', () => {
      const template = `
        <p>Hi {{first_name}},</p>
        <p>Now that you have spent some time with your order, you might be wondering what else would suit you.</p>
        {{product_recommendation}}
        <p>You do not need to buy everything at once.</p>
      `;

      const context: MarketingContext = {
        firstName: 'Aisha',
        productRecommendation: null,
      };

      const result = renderMarketingTemplate(template, context);
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
      expect(result).not.toContain('{{product_recommendation}}');
      expect(result).toContain('You do not need to buy everything at once.');
      expect(result).not.toContain('<p></p>');
    });

    it('renders narrative block correctly when productRecommendation is present', () => {
      const template = 'Recommendation: {{product_recommendation}}';
      const context: MarketingContext = {
        productRecommendation: {
          productId: 'prod-1',
          productFamily: 'ultimate_game_book',
          title: 'Ultimate Game Book',
          recommendationText:
            'If you enjoyed colouring but want more variety, try the Ultimate Game Book.',
        },
      };

      const result = renderMarketingTemplate(template, context);
      expect(result).toContain('If you enjoyed colouring but want more variety, try the Ultimate Game Book.');
    });
  });

  // ==========================================================================
  // 7. SECURITY & SANITIZATION
  // ==========================================================================
  describe('7. Security & Sanitization', () => {
    it('escapes script tags in customer names', () => {
      const template = '<p>Hello {{first_name}}</p>';
      const context: MarketingContext = {
        firstName: '<script>alert("xss")</script>',
      };

      const result = renderMarketingTemplate(template, context);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes unsafe characters in product names and order numbers', () => {
      const template = '<p>Item: {{product_name}}, Ref: {{order_number}}</p>';
      const context: MarketingContext = {
        productName: 'Book<img src=x onerror=alert(1)>',
        orderNumber: 'ORD<100>',
      };

      const result = renderMarketingTemplate(template, context);
      expect(result).not.toContain('<img');
      expect(result).toContain('&lt;img');
      expect(result).toContain('ORD&lt;100&gt;');
    });
  });

  // ==========================================================================
  // 8. BACKWARD COMPATIBILITY
  // ==========================================================================
  describe('8. Backward Compatibility', () => {
    it('preserves existing replacePersonalizationTags signature and behavior', () => {
      const template = 'Hi {{first_name}} {{last_name}} ({{email}})';
      const data = {
        first_name: 'Maryam',
        last_name: 'Usman',
        email: 'maryam@example.com',
      };

      const result = replacePersonalizationTags(template, data);
      expect(result).toBe('Hi Maryam Usman (maryam@example.com)');
    });

    it('supports new optional tokens in replacePersonalizationTags', () => {
      const template = 'Order #{{order_number}} for {{product_name}}';
      const data = {
        order_number: '1099',
        product_name: 'Play and Color Kit',
      };

      const result = replacePersonalizationTags(template, data);
      expect(result).toBe('Order #1099 for Play and Color Kit');
    });
  });
});
