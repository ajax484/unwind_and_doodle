import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { ProductFamily, MarketingRecommendation } from '@/types/marketing-context';

export type { ProductFamily };

/**
 * Maps product metadata (slug, SKU, name) into a stable canonical ProductFamily.
 * Avoids fragile string matching on display names throughout the codebase.
 */
export function classifyProductFamily(product?: {
  slug?: string | null;
  sku?: string | null;
  name?: string | null;
  product_type?: string | null;
  requires_customization?: boolean | null;
}): ProductFamily {
  if (!product) return 'other';

  const slug = (product.slug || '').toLowerCase().trim();
  const sku = (product.sku || '').toLowerCase().trim();
  const name = (product.name || '').toLowerCase().trim();

  // 1. Custom books (standard vs full)
  if (slug.includes('standard-custom') || sku.includes('stan-cust') || name.includes('standard custom')) {
    return 'standard_custom';
  }
  if (slug.includes('full-custom') || sku.includes('full-cust') || name.includes('full custom')) {
    return 'full_custom';
  }
  if (product.requires_customization && (slug.includes('custom') || name.includes('custom'))) {
    return 'standard_custom';
  }

  // 2. Play and Color Kit
  if (
    slug.includes('play-and-color') ||
    slug.includes('play-color') ||
    sku.includes('play-colo') ||
    name.includes('play and color')
  ) {
    return 'play_and_color';
  }

  // 3. Unwind Kit
  if (slug.includes('unwind-kit') || sku.includes('unwi-kit') || name.includes('unwind kit')) {
    return 'unwind_kit';
  }

  // 4. Ultimate Game Book
  if (
    slug.includes('game-book') ||
    slug.includes('ultimate-game') ||
    sku.includes('game-book') ||
    name.includes('game book')
  ) {
    return 'ultimate_game_book';
  }

  // 5. Vent to Me (Journal)
  if (
    slug.includes('vent-to-me') ||
    slug.includes('vent-me') ||
    sku.includes('vent-to-me') ||
    name.includes('vent to me')
  ) {
    return 'vent_to_me';
  }

  // 6. Tools (Pencils / Pens)
  if (
    slug.includes('coloring-pen') ||
    slug.includes('coloring-pencil') ||
    slug.includes('felt-pen') ||
    sku.includes('colo-pen') ||
    sku.includes('colo-penc') ||
    name.includes('pen') ||
    name.includes('pencil')
  ) {
    return 'tools';
  }

  // 7. General Themed Colouring Book
  if (
    slug.includes('general-themed') ||
    slug.includes('colouring-book') ||
    slug.includes('coloring-book') ||
    sku.includes('gene-them') ||
    name.includes('general themed') ||
    name.includes('colouring book') ||
    name.includes('coloring book')
  ) {
    return 'general_colouring_book';
  }

  return 'other';
}

/**
 * Candidate prioritization matrix per Unwind & Doodle Retention Playbook.
 * Defines the deterministic next-step recommendations for each product family.
 */
export const RECOMMENDATION_CANDIDATES: Record<ProductFamily, readonly ProductFamily[]> = {
  general_colouring_book: ['ultimate_game_book', 'tools'],
  unwind_kit: ['ultimate_game_book', 'play_and_color'],
  ultimate_game_book: ['general_colouring_book', 'play_and_color'],
  play_and_color: ['vent_to_me', 'general_colouring_book'],
  vent_to_me: ['unwind_kit'],
  standard_custom: ['full_custom'],
  full_custom: ['vent_to_me', 'unwind_kit', 'general_colouring_book'],
  tools: ['general_colouring_book'],
  other: ['general_colouring_book', 'unwind_kit'],
};

/**
 * Standard narrative text blocks from approved playbook copy.
 */
export const POST_PURCHASE_RECOMMENDATION_BLOCKS: Record<ProductFamily, string> = {
  general_colouring_book:
    'If you enjoyed colouring but want more variety, try the Ultimate Game Book. It gives you puzzles, word games, brain teasers and other screen-free activities for the days you do not feel like colouring.',
  unwind_kit:
    'You already have the colouring book and tools. The Ultimate Game Book is the most natural next addition. You can switch between colouring, puzzles and games depending on your mood.',
  ultimate_game_book:
    'If you enjoyed having something to do away from your phone, try our General-Themed Colouring Book next. It gives you a slower, more visual way to relax.',
  play_and_color:
    'You already have activities for colouring and play. Vent to Me is the next option if you also want a private space to write, reflect and release what is sitting in your head.',
  vent_to_me:
    'If writing helps you release your thoughts, the Unwind Kit gives you another kind of break. You can colour when you want to quiet your mind without finding the words.',
  standard_custom:
    'If you enjoyed seeing personal memories turned into something you could colour, our Full Custom option takes it further with more personal images and a more complete keepsake experience.',
  full_custom:
    'You have already created something deeply personal. For your everyday quiet moments, try the Unwind Kit or Vent to Me journal.',
  tools: 'You already have the tools. Add one of our colouring books and put them to proper use.',
  other: 'Explore our latest screen-free activities for your quiet moments.',
};

export const SALES_WIN_BACK_RECOMMENDATION_BLOCKS: Record<ProductFamily, string> = {
  general_colouring_book:
    'Try the Ultimate Game Book or Play and Color Kit when you want puzzles and games alongside colouring.',
  ultimate_game_book:
    'Try the current colouring edition when you want something slower and more creative.',
  unwind_kit: 'Vent to Me adds a private place to write on the days when colouring is not enough.',
  vent_to_me: 'The Unwind Kit gives you something quiet to do when you do not feel like writing.',
  standard_custom:
    'Create another custom book for a different person or choose one of our ready-made products for your own everyday use.',
  full_custom:
    'Create another custom book for a different person or choose one of our ready-made products for your own everyday use.',
  tools: 'Add one of our colouring books and put your tools to proper use.',
  play_and_color: 'Vent to Me adds a private place to write on the days when colouring is not enough.',
  other: 'Take a look at what is new in our latest collection.',
};

/**
 * Canonical product title and relative path defaults for each product family.
 */
export const CANONICAL_PRODUCT_METADATA: Record<
  ProductFamily,
  { defaultTitle: string; defaultSlug: string }
> = {
  general_colouring_book: {
    defaultTitle: 'General-Themed Colouring Book',
    defaultSlug: 'general-themed',
  },
  unwind_kit: {
    defaultTitle: 'Unwind Kit',
    defaultSlug: 'unwind-kit',
  },
  ultimate_game_book: {
    defaultTitle: 'Ultimate Game Book',
    defaultSlug: 'ultimate-game-book',
  },
  play_and_color: {
    defaultTitle: 'Play and Color Kit',
    defaultSlug: 'play-and-color',
  },
  vent_to_me: {
    defaultTitle: 'Vent to Me Guided Journal',
    defaultSlug: 'vent-to-me',
  },
  standard_custom: {
    defaultTitle: 'Standard Custom Colouring Book',
    defaultSlug: 'standard-custom',
  },
  full_custom: {
    defaultTitle: 'Full Custom Colouring Book',
    defaultSlug: 'full-custom',
  },
  tools: {
    defaultTitle: 'Colouring Tools',
    defaultSlug: 'coloring-pencil',
  },
  other: {
    defaultTitle: 'Unwind & Doodle Collection',
    defaultSlug: 'collection',
  },
};

/**
 * Retrieves the set of all product families previously purchased by a customer
 * across paid / confirmed non-cancelled orders.
 */
export async function getCustomerPurchasedFamilies(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<Set<ProductFamily>> {
  const purchasedFamilies = new Set<ProductFamily>();
  if (!customerId) return purchasedFamilies;

  try {
    // 1. Fetch valid orders
    const { data: orders, error: orderErr } = await supabase
      .from('orders')
      .select('id, status')
      .eq('customer_id', customerId);

    if (orderErr || !orders || orders.length === 0) {
      return purchasedFamilies;
    }

    const validOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'refunded'
    );
    if (validOrders.length === 0) return purchasedFamilies;

    const orderIds = validOrders.map((o) => o.id);

    // 2. Fetch order items with product reference
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('id, product_id, product_name, sku')
      .in('order_id', orderIds);

    if (itemsErr || !items || items.length === 0) {
      return purchasedFamilies;
    }

    // 3. Collect product IDs to lookup slugs if needed
    const productIds = Array.from(new Set(items.map((i) => i.product_id).filter(Boolean)));
    const productSlugMap = new Map<string, { slug: string; sku: string | null; name: string }>();

    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, slug, sku, name')
        .in('id', productIds);

      if (products) {
        for (const p of products) {
          productSlugMap.set(p.id, { slug: p.slug, sku: p.sku, name: p.name });
        }
      }
    }

    // 4. Classify each order item
    for (const item of items) {
      const productInfo = productSlugMap.get(item.product_id);
      const family = classifyProductFamily({
        slug: productInfo?.slug || null,
        sku: item.sku || productInfo?.sku || null,
        name: item.product_name || productInfo?.name || null,
      });

      if (family !== 'other') {
        purchasedFamilies.add(family);
      }
    }
  } catch (err) {
    console.warn('[marketing_recommendation.purchased_families_error]', err);
  }

  return purchasedFamilies;
}

export interface ResolveRecommendationParams {
  supabase: SupabaseClient<Database>;
  organizationId?: string | null;
  customerId?: string | null;
  sourceFamily?: ProductFamily;
  type?: 'post_purchase' | 'win_back';
  appUrl?: string;
}

/**
 * Core product recommendation resolver.
 *
 * 1. Takes the customer's source purchase family.
 * 2. Fetches their historical purchased product families.
 * 3. Evaluates priority candidate families in deterministic order.
 * 4. Filters out any candidate family the customer ALREADY owns.
 * 5. Resolves a published product in the tenant catalog or canonical fallback.
 * 6. Attaches the exact approved playbook copy block.
 *
 * Returns null if all candidate families are already owned or none are eligible.
 */
export async function resolveProductRecommendation(
  params: ResolveRecommendationParams
): Promise<MarketingRecommendation | null> {
  const {
    supabase,
    organizationId,
    customerId,
    sourceFamily = 'general_colouring_book',
    type = 'post_purchase',
    appUrl = '',
  } = params;

  // 1. Determine already owned product families
  const ownedFamilies = customerId
    ? await getCustomerPurchasedFamilies(supabase, customerId)
    : new Set<ProductFamily>();

  // The source product itself is considered owned
  if (sourceFamily !== 'other') {
    ownedFamilies.add(sourceFamily);
  }

  // 2. Evaluate candidates in order of priority
  const candidates = RECOMMENDATION_CANDIDATES[sourceFamily] || RECOMMENDATION_CANDIDATES.general_colouring_book;
  let targetFamily: ProductFamily | null = null;

  for (const candidate of candidates) {
    if (!ownedFamilies.has(candidate)) {
      targetFamily = candidate;
      break;
    }
  }

  // If all candidate families are already owned, return null (omit recommendation block)
  if (!targetFamily) {
    return null;
  }

  // 3. Resolve active catalog product for this target family if available
  let catalogProductId = `rec-prod-${targetFamily}`;
  let title = CANONICAL_PRODUCT_METADATA[targetFamily]?.defaultTitle || 'Unwind & Doodle';
  let slug = CANONICAL_PRODUCT_METADATA[targetFamily]?.defaultSlug || '';

  try {
    let query = supabase
      .from('products')
      .select('id, name, slug, sku, status')
      .eq('status', 'published');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: products } = await query;
    if (products && products.length > 0) {
      const matchingProduct = products.find((p) => classifyProductFamily(p) === targetFamily);
      if (matchingProduct) {
        catalogProductId = matchingProduct.id;
        title = matchingProduct.name;
        slug = matchingProduct.slug;
      }
    }
  } catch (err) {
    console.warn('[marketing_recommendation.catalog_lookup_error]', err);
  }

  const cleanAppUrl = appUrl.replace(/\/+$/, '');
  const url = slug ? `${cleanAppUrl}/products/${slug}` : cleanAppUrl;

  const narrativeBlock =
    type === 'win_back'
      ? SALES_WIN_BACK_RECOMMENDATION_BLOCKS[sourceFamily] || SALES_WIN_BACK_RECOMMENDATION_BLOCKS.other
      : POST_PURCHASE_RECOMMENDATION_BLOCKS[sourceFamily] || POST_PURCHASE_RECOMMENDATION_BLOCKS.other;

  return {
    productId: catalogProductId,
    productFamily: targetFamily,
    title,
    url,
    recommendationText: narrativeBlock,
    reasoning: `Recommended ${targetFamily} based on prior purchase of ${sourceFamily}`,
  };
}
