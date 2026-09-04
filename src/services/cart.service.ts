import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { DEFAULT_ORGANIZATION_ID } from '../lib/constants';

import type {
  CartAddonInput,
  CartCustomizationInput,
  CartThemeCustomizationInput,
  AddToCartInput,
  CartItemDetail,
  CartResponse,
} from '../types/cart';

export type {
  CartAddonInput,
  CartCustomizationInput,
  CartThemeCustomizationInput,
  AddToCartInput,
  CartItemDetail,
  CartResponse,
};

/**
 * Retrieves an existing cart or creates a new guest cart session.
 * Supports optional customerId for linking carts to registered users.
 */
export async function getOrCreateCart(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  customerId?: string | null
): Promise<{ id: string; session_id: string | null; customer_id?: string | null }> {
  let existingCart: { id: string; session_id: string | null; customer_id?: string | null } | null = null;

  if (customerId) {
    const { data: customerCarts } = await supabase
      .from('carts')
      .select('id, session_id, customer_id, status')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false });

    const activeCustomerCarts = (customerCarts || []).filter(
      (c) => c.status === 'active' || !c.status
    );

    if (activeCustomerCarts.length > 0) {
      existingCart = activeCustomerCarts[0];

      // Deduplicate: If multiple active carts exist for customer, consolidate items into primary
      if (activeCustomerCarts.length > 1) {
        const duplicateIds = activeCustomerCarts
          .filter((c) => c.id !== existingCart!.id)
          .map((c) => c.id);

        if (duplicateIds.length > 0) {
          await supabase
            .from('cart_items')
            .update({ cart_id: existingCart.id })
            .in('cart_id', duplicateIds);

          await supabase.from('carts').delete().in('id', duplicateIds);
        }
      }

      if (sessionId && existingCart.session_id !== sessionId) {
        await supabase
          .from('carts')
          .update({ session_id: sessionId, updated_at: new Date().toISOString() })
          .eq('id', existingCart.id);
        existingCart.session_id = sessionId;
      }
    }
  }

  if (!existingCart) {
    const { data: sessionCarts } = await supabase
      .from('carts')
      .select('id, session_id, customer_id, status')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });

    const activeSessionCarts = (sessionCarts || []).filter(
      (c) => c.status === 'active' || !c.status
    );

    if (activeSessionCarts.length > 0) {
      existingCart = activeSessionCarts[0];

      // Deduplicate: If multiple active carts exist for session, consolidate items into primary
      if (activeSessionCarts.length > 1) {
        const duplicateIds = activeSessionCarts
          .filter((c) => c.id !== existingCart!.id)
          .map((c) => c.id);

        if (duplicateIds.length > 0) {
          await supabase
            .from('cart_items')
            .update({ cart_id: existingCart.id })
            .in('cart_id', duplicateIds);

          await supabase.from('carts').delete().in('id', duplicateIds);
        }
      }

      if (customerId && !existingCart.customer_id) {
        await supabase
          .from('carts')
          .update({ customer_id: customerId, updated_at: new Date().toISOString() })
          .eq('id', existingCart.id);
        existingCart.customer_id = customerId;
      }
    }
  }

  if (existingCart) {
    return existingCart;
  }

  // Resolve default organization ID
  let orgId = DEFAULT_ORGANIZATION_ID;
  try {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
    if (org?.id) {
      orgId = org.id;
    }
  } catch {
    // use default
  }

  const { data: newCart, error } = await supabase
    .from('carts')
    .insert({
      session_id: sessionId,
      customer_id: customerId || null,
      organization_id: orgId,
      status: 'active',
    })
    .select('id, session_id, customer_id')
    .single();

  if (error || !newCart) {
    // Retry in case of concurrent insert
    const { data: retryCart } = await supabase
      .from('carts')
      .select('id, session_id, customer_id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (retryCart) {
      return retryCart;
    }
    throw new Error(`Failed to create cart session: ${error?.message}`);
  }

  return newCart;
}

/**
 * Fetches full cart details including product information, add-ons, customization assets, and prices.
 */
export async function getCartDetails(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  customerId?: string | null
): Promise<CartResponse> {
  const cart = await getOrCreateCart(supabase, sessionId, customerId);

  const { data: rawItems, error: itemsErr } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id);

  if (itemsErr) {
    throw new Error(`Failed to fetch cart items: ${itemsErr.message}`);
  }

  if (!rawItems || rawItems.length === 0) {
    return {
      cartId: cart.id,
      sessionId,
      items: [],
      totalItemCount: 0,
      subtotal: 0,
      currency: 'NGN',
    };
  }

  // Separate parent items from legacy child add-on items (if any in mock)
  const parentItems = rawItems.filter(
    (i) => !(i as Record<string, unknown>).parent_cart_item_id
  );
  const childAddonItems = rawItems.filter(
    (i) => Boolean((i as Record<string, unknown>).parent_cart_item_id)
  );

  // Group child addons by parent_cart_item_id for mock backwards compatibility
  const childAddonsByParent = new Map<string, typeof childAddonItems>();
  for (const child of childAddonItems) {
    const parentId = (child as Record<string, unknown>).parent_cart_item_id as string;
    if (!childAddonsByParent.has(parentId)) {
      childAddonsByParent.set(parentId, []);
    }
    childAddonsByParent.get(parentId)!.push(child);
  }

  // Extract all product IDs (main products + embedded addons in customization_data + child items)
  const allProductIds = new Set<string>();
  for (const item of rawItems) {
    allProductIds.add(item.product_id);
    const custData =
      item.customization_data && typeof item.customization_data === 'object'
        ? (item.customization_data as { addons?: CartAddonInput[] })
        : null;
    if (custData?.addons && Array.isArray(custData.addons)) {
      for (const a of custData.addons) {
        if (a.addonProductId) allProductIds.add(a.addonProductId);
      }
    }
  }

  const legacyCustIds = Array.from(
    new Set(
      rawItems
        .map((i) => (i as Record<string, unknown>).customization_id as string | undefined)
        .filter(Boolean) as string[]
    )
  );

  const parentIds = Array.from(allProductIds);
  const [
    { data: products },
    { data: images },
    { data: addonsByParent },
    { data: addonsByLegacyProd },
    { data: legacyCusts },
    { data: legacyAssets },
  ] = await Promise.all([
    supabase.from('products').select('*').in('id', parentIds),
    supabase
      .from('product_images')
      .select('*')
      .in('product_id', parentIds)
      .order('sort_order', { ascending: true }),
    supabase.from('product_addons').select('*').in('parent_product_id', parentIds),
    supabase.from('product_addons').select('*').in('product_id' as unknown as 'parent_product_id', parentIds),
    legacyCustIds.length > 0
      ? supabase.from('customizations').select('*').in('id', legacyCustIds)
      : Promise.resolve({ data: [] }),
    legacyCustIds.length > 0
      ? supabase.from('customization_assets').select('*').in('customization_id', legacyCustIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map((products || []).map((p) => [p.id, p]));

  const imageMap = new Map<string, string>();
  // Prioritize primary images, then sort_order ascending
  const sortedImages = [...(images || [])].sort((x, y) => {
    const xLegacy = x as Record<string, unknown>;
    const yLegacy = y as Record<string, unknown>;
    const xPri = xLegacy.sort_order === 0 || Boolean(xLegacy.is_primary);
    const yPri = yLegacy.sort_order === 0 || Boolean(yLegacy.is_primary);
    if (xPri && !yPri) return -1;
    if (!xPri && yPri) return 1;
    return ((x.sort_order ?? 0) as number) - ((y.sort_order ?? 0) as number);
  });
  for (const img of sortedImages) {
    const legacyImg = img as Record<string, unknown>;
    const url = (legacyImg.storage_path as string) || (legacyImg.image_url as string) || '';
    if (url && !imageMap.has(img.product_id)) {
      imageMap.set(img.product_id, url);
    }
  }

  // Map addon price overrides: `${productId}:${addonProductId}` -> price_override
  const addonOverrideMap = new Map<string, number | null>();
  const allAddonConfigs = [
    ...(addonsByParent || []),
    ...(addonsByLegacyProd || []),
  ];
  for (const a of allAddonConfigs) {
    const parentId = a.parent_product_id || (a as Record<string, unknown>).product_id;
    if (parentId && a.addon_product_id) {
      addonOverrideMap.set(`${parentId}:${a.addon_product_id}`, a.price_override);
    }
  }

  const legacyCustMap = new Map((legacyCusts || []).map((c) => [c.id, c]));
  const legacyAssetsMap = new Map<string, string[]>();
  for (const asset of legacyAssets || []) {
    const legacyAsset = asset as Record<string, unknown>;
    const url = (legacyAsset.storage_path as string) || (legacyAsset.asset_url as string) || '';
    if (!legacyAssetsMap.has(asset.customization_id)) {
      legacyAssetsMap.set(asset.customization_id, []);
    }
    legacyAssetsMap.get(asset.customization_id)!.push(url);
  }

  // Fetch bundle components for any bundle items in cart
  const bundleProductIds = (products || []).filter((p) => p.product_type === 'bundle').map((p) => p.id);
  const bundleComponentsMap = new Map<string, { componentProductId: string; name: string; quantity: number }[]>();

  if (bundleProductIds.length > 0) {
    const { data: bItems } = await supabase
      .from('bundle_items')
      .select('*')
      .in('bundle_product_id', bundleProductIds);

    const compProductIds = (bItems || []).map((bi) => bi.component_product_id);
    if (compProductIds.length > 0) {
      const { data: compProducts } = await supabase
        .from('products')
        .select('id, name')
        .in('id', compProductIds);

      const compNameMap = new Map((compProducts || []).map((p) => [p.id, p.name]));

      for (const bi of bItems || []) {
        if (!bundleComponentsMap.has(bi.bundle_product_id)) {
          bundleComponentsMap.set(bi.bundle_product_id, []);
        }
        bundleComponentsMap.get(bi.bundle_product_id)!.push({
          componentProductId: bi.component_product_id,
          name: compNameMap.get(bi.component_product_id) || 'Component Product',
          quantity: bi.quantity,
        });
      }
    }
  }

  // Collect referenced theme IDs for cart items
  const allThemeIds = new Set<string>();
  for (const item of parentItems) {
    const cd = item.customization_data && typeof item.customization_data === 'object' ? (item.customization_data as Record<string, unknown>) : null;
    const tc = cd?.themeCustomization as { selectedThemeIds?: string[] } | undefined;
    if (tc && Array.isArray(tc.selectedThemeIds)) {
      tc.selectedThemeIds.forEach((id) => allThemeIds.add(id));
    }
  }

  const themeNameMap = new Map<string, { id: string; name: string; sortOrder: number }>();
  if (allThemeIds.size > 0) {
    const { data: themeRecords } = await supabase
      .from('themes')
      .select('id, name, sort_order')
      .in('id', Array.from(allThemeIds));

    for (const tr of themeRecords || []) {
      themeNameMap.set(tr.id, { id: tr.id, name: tr.name, sortOrder: tr.sort_order });
    }
  }

  let subtotal = 0;
  let totalCount = 0;

  const itemDetails: CartItemDetail[] = parentItems.map((parent) => {
    const product = productMap.get(parent.product_id);
    const legacyProd = product as Record<string, unknown> | undefined;
    const isAvailable = Boolean(
      product &&
      (product.status ? product.status === 'published' : legacyProd?.is_active !== false)
    );
    const unitPrice =
      product?.selling_price !== undefined && product.selling_price !== null
        ? product.selling_price
        : ((product as Record<string, unknown>)?.price as number) || 0;
    const parentTotal = unitPrice * parent.quantity;

    subtotal += parentTotal;
    totalCount += parent.quantity;

    // Parse customization data from JSON column or fallback to legacy join
    const custData =
      parent.customization_data && typeof parent.customization_data === 'object'
        ? (parent.customization_data as {
            notes?: string;
            assetUrls?: string[];
            addons?: CartAddonInput[];
            themeCustomization?: { selectedThemeIds?: string[]; coverName?: string };
          })
        : null;

    const legacyCustId = (parent as Record<string, unknown>).customization_id as string | undefined;
    const legacyCust = legacyCustId ? legacyCustMap.get(legacyCustId) : null;
    const legacyAssets = legacyCust ? legacyAssetsMap.get(legacyCust.id) || [] : [];

    let customization: CartItemDetail['customization'] = null;
    if (custData && (custData.notes || (custData.assetUrls && custData.assetUrls.length > 0))) {
      customization = {
        id: `cust_${parent.id}`,
        notes: custData.notes || null,
        status: 'draft',
        assets: custData.assetUrls || [],
      };
    } else if (legacyCust) {
      customization = {
        id: legacyCust.id,
        notes: ((legacyCust as Record<string, unknown>).notes as string) || null,
        status: legacyCust.status,
        assets: legacyAssets,
      };
    }

    // Format theme customization if present
    let themeCustomization: CartItemDetail['themeCustomization'] = null;
    const tcData = custData?.themeCustomization as { selectedThemeIds?: string[]; coverName?: string } | undefined;
    if (tcData && Array.isArray(tcData.selectedThemeIds) && tcData.selectedThemeIds.length > 0) {
      themeCustomization = {
        selectedThemeIds: tcData.selectedThemeIds,
        coverName: tcData.coverName || null,
        themes: tcData.selectedThemeIds
          .map((tid) => themeNameMap.get(tid))
          .filter((t): t is { id: string; name: string; sortOrder: number } => Boolean(t)),
      };
    }

    // Format add-ons (from customization_data JSON or legacy child rows)
    const formattedAddons: CartItemDetail['addons'] = [];

    if (custData?.addons && Array.isArray(custData.addons)) {
      for (const addon of custData.addons) {
        const addonProd = productMap.get(addon.addonProductId);
        const overrideKey = `${parent.product_id}:${addon.addonProductId}`;
        const priceOverride = addonOverrideMap.get(overrideKey);
        const rawAddonPrice =
          addonProd?.selling_price !== undefined && addonProd.selling_price !== null
            ? addonProd.selling_price
            : ((addonProd as Record<string, unknown>)?.price as number) || 0;
        const addonUnitPrice =
          priceOverride !== null && priceOverride !== undefined
            ? priceOverride
            : rawAddonPrice;
        const addonTotal = addonUnitPrice * addon.quantity;

        subtotal += addonTotal;
        totalCount += addon.quantity;

        formattedAddons.push({
          id: `addon_${parent.id}_${addon.addonProductId}`,
          addonProductId: addon.addonProductId,
          addonName: addonProd?.name || 'Add-on Product',
          quantity: addon.quantity,
          unitPrice: addonUnitPrice,
          totalPrice: addonTotal,
          primaryImage: imageMap.get(addon.addonProductId) || null,
        });
      }
    } else {
      // Legacy child items mapping
      const children = childAddonsByParent.get(parent.id) || [];
      for (const child of children) {
        const addonProd = productMap.get(child.product_id);
        const overrideKey = `${parent.product_id}:${child.product_id}`;
        const priceOverride = addonOverrideMap.get(overrideKey);
        const rawAddonPrice =
          addonProd?.selling_price !== undefined && addonProd.selling_price !== null
            ? addonProd.selling_price
            : ((addonProd as Record<string, unknown>)?.price as number) || 0;
        const addonUnitPrice =
          priceOverride !== null && priceOverride !== undefined
            ? priceOverride
            : rawAddonPrice;
        const addonTotal = addonUnitPrice * child.quantity;

        subtotal += addonTotal;
        totalCount += child.quantity;

        formattedAddons.push({
          id: child.id,
          addonProductId: child.product_id,
          addonName: addonProd?.name || 'Add-on Product',
          quantity: child.quantity,
          unitPrice: addonUnitPrice,
          totalPrice: addonTotal,
          primaryImage: imageMap.get(child.product_id) || null,
        });
      }
    }

    return {
      id: parent.id,
      productId: parent.product_id,
      productName: product?.name || 'Product',
      slug: product?.slug || '',
      sku: product?.sku || '',
      quantity: parent.quantity,
      unitPrice,
      totalPrice: parentTotal,
      primaryImage: imageMap.get(parent.product_id) || null,
      requiresCustomization: product?.requires_customization ?? false,
      supportsThemeCustomization: Boolean((product as Record<string, unknown>)?.supports_theme_customization),
      isAvailable,
      productType: product?.product_type || 'physical',
      bundleComponents: bundleComponentsMap.get(parent.product_id) || [],
      customization,
      themeCustomization,
      addons: formattedAddons,
    };
  });

  return {
    cartId: cart.id,
    sessionId: cart.session_id || sessionId,
    items: itemDetails,
    totalItemCount: totalCount,
    subtotal,
    currency: 'NGN',
  };
}

/**
 * Helper to check if two cart item customization/addon configurations are identical.
 */
function areCustomizationsEqual(
  aData: unknown,
  bData: Record<string, unknown>
): boolean {
  const a = aData && typeof aData === 'object' ? (aData as Record<string, unknown>) : {};
  const b = bData && typeof bData === 'object' ? bData : {};

  // Compare notes (normalize trimmed string)
  const aNotes = ((a.notes as string) || '').trim();
  const bNotes = ((b.notes as string) || '').trim();
  if (aNotes !== bNotes) return false;

  // Compare assetUrls
  const aAssets = Array.isArray(a.assetUrls) ? a.assetUrls.filter(Boolean) : [];
  const bAssets = Array.isArray(b.assetUrls) ? b.assetUrls.filter(Boolean) : [];
  if (aAssets.length !== bAssets.length) return false;
  if (JSON.stringify([...aAssets].sort()) !== JSON.stringify([...bAssets].sort())) return false;

  // Compare themeCustomization
  const aTheme = (a.themeCustomization || a.theme_customization) as { selectedThemeIds?: string[]; coverName?: string } | undefined;
  const bTheme = (b.themeCustomization || b.theme_customization) as { selectedThemeIds?: string[]; coverName?: string } | undefined;

  const aThemeIds = Array.isArray(aTheme?.selectedThemeIds) ? aTheme!.selectedThemeIds.filter(Boolean) : [];
  const bThemeIds = Array.isArray(bTheme?.selectedThemeIds) ? bTheme!.selectedThemeIds.filter(Boolean) : [];
  if (aThemeIds.length !== bThemeIds.length) return false;
  if (JSON.stringify([...aThemeIds].sort()) !== JSON.stringify([...bThemeIds].sort())) return false;

  const aCover = ((aTheme?.coverName as string) || '').trim();
  const bCover = ((bTheme?.coverName as string) || '').trim();
  if (aCover !== bCover) return false;

  // Compare addons
  const aAddons = Array.isArray(a.addons) ? (a.addons as Record<string, unknown>[]) : [];
  const bAddons = Array.isArray(b.addons) ? (b.addons as Record<string, unknown>[]) : [];
  const validAAddons = aAddons.filter((ad) => ((ad.quantity as number) || 0) > 0);
  const validBAddons = bAddons.filter((ad) => ((ad.quantity as number) || 0) > 0);
  if (validAAddons.length !== validBAddons.length) return false;

  const normalizeAddons = (addons: Record<string, unknown>[]) =>
    addons
      .map((ad) => ({ id: (ad.addonProductId || ad.id) as string, qty: (ad.quantity || 1) as number }))
      .sort((x, y) => (x.id || '').localeCompare(y.id || ''));

  return JSON.stringify(normalizeAddons(validAAddons)) === JSON.stringify(normalizeAddons(validBAddons));
}

/**
 * Adds a product and optional add-ons/customizations to the cart.
 * If the exact same product & configuration is already in the cart, increments quantity instead of adding a duplicate row.
 */
export async function addItemToCart(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  input: AddToCartInput,
  customerId?: string | null
): Promise<CartResponse> {
  const cart = await getOrCreateCart(supabase, sessionId, customerId);

  // 1. Prepare customization_data JSON payload
  const customizationData: Record<string, unknown> = {};
  if (input.customization) {
    if (input.customization.notes) customizationData.notes = input.customization.notes;
    if (input.customization.assetUrls && input.customization.assetUrls.length > 0) {
      customizationData.assetUrls = input.customization.assetUrls;
    }
  }
  if (input.themeCustomization && input.themeCustomization.selectedThemeIds.length > 0) {
    customizationData.themeCustomization = {
      selectedThemeIds: input.themeCustomization.selectedThemeIds,
      coverName: input.themeCustomization.coverName ? input.themeCustomization.coverName.trim() : undefined,
    };
  }
  if (input.addons && input.addons.length > 0) {
    const validAddons = input.addons.filter((a) => a.quantity > 0);
    if (validAddons.length > 0) {
      customizationData.addons = validAddons;
    }
  }

  // 2. Check for existing cart item with same product_id and identical customizations/addons
  const { data: existingItems } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .eq('product_id', input.productId);

  const matchingItem = (existingItems || []).find((item) =>
    areCustomizationsEqual(item.customization_data, customizationData)
  );

  if (matchingItem) {
    // Increment existing item quantity
    const newQuantity = (matchingItem.quantity || 1) + input.quantity;
    const { error: updateErr } = await supabase
      .from('cart_items')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchingItem.id)
      .eq('cart_id', cart.id);

    if (updateErr) {
      throw new Error(`Failed to update cart item quantity: ${updateErr.message}`);
    }
  } else {
    // Insert new cart item
    const { data: item, error: itemErr } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        product_id: input.productId,
        quantity: input.quantity,
        customization_data:
          Object.keys(customizationData).length > 0
            ? (customizationData as unknown as Database['public']['Tables']['cart_items']['Insert']['customization_data'])
            : null,
      })
      .select('id')
      .single();

    if (itemErr || !item) {
      throw new Error(`Failed to add item to cart: ${itemErr?.message}`);
    }
  }

  return getCartDetails(supabase, sessionId, customerId);
}

/**
 * Modifies quantity of a cart item. If quantity is 0 or less, removes the item and associated add-ons.
 */
export async function updateCartItemQuantity(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  cartItemId: string,
  quantity: number,
  customerId?: string | null
): Promise<CartResponse> {
  const cart = await getOrCreateCart(supabase, sessionId, customerId);

  if (quantity <= 0) {
    return removeCartItem(supabase, sessionId, cartItemId, customerId);
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('id', cartItemId)
    .eq('cart_id', cart.id);

  if (error) {
    throw new Error(`Failed to update cart item quantity: ${error.message}`);
  }

  return getCartDetails(supabase, sessionId, customerId);
}

/**
 * Updates customization (photos and notes) of an existing cart item.
 */
export async function updateCartItemCustomization(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  cartItemId: string,
  customization: CartCustomizationInput,
  customerId?: string | null
): Promise<CartResponse> {
  const cart = await getOrCreateCart(supabase, sessionId, customerId);

  const { data: existingItem, error: fetchErr } = await supabase
    .from('cart_items')
    .select('customization_data')
    .eq('id', cartItemId)
    .eq('cart_id', cart.id)
    .single();

  if (fetchErr || !existingItem) {
    throw new Error('Cart item not found');
  }

  const currentData =
    existingItem.customization_data && typeof existingItem.customization_data === 'object'
      ? (existingItem.customization_data as Record<string, unknown>)
      : {};

  const updatedData: Record<string, unknown> = {
    ...currentData,
  };

  if (customization.notes !== undefined) {
    updatedData.notes = customization.notes;
  }
  if (customization.assetUrls !== undefined) {
    updatedData.assetUrls = customization.assetUrls;
  }
  if (customization.themeCustomization) {
    updatedData.themeCustomization = {
      selectedThemeIds: customization.themeCustomization.selectedThemeIds,
      coverName: customization.themeCustomization.coverName
        ? customization.themeCustomization.coverName.trim()
        : undefined,
    };
  }

  const { error: updateErr } = await supabase
    .from('cart_items')
    .update({
      customization_data: updatedData as unknown as Database['public']['Tables']['cart_items']['Insert']['customization_data'],
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartItemId)
    .eq('cart_id', cart.id);

  if (updateErr) {
    throw new Error(`Failed to update cart item customization: ${updateErr.message}`);
  }

  return getCartDetails(supabase, sessionId, customerId);
}

/**
 * Removes an item and all child add-ons from the cart.
 */
export async function removeCartItem(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  cartItemId: string,
  customerId?: string | null
): Promise<CartResponse> {
  const cart = await getOrCreateCart(supabase, sessionId, customerId);

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('cart_id', cart.id);

  if (error) {
    throw new Error(`Failed to remove cart item: ${error.message}`);
  }

  return getCartDetails(supabase, sessionId, customerId);
}

/**
 * Clears all items from the current cart session.
 */
export async function clearCart(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  customerId?: string | null
): Promise<CartResponse> {
  const cart = await getOrCreateCart(supabase, sessionId, customerId);

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cart.id);

  if (error) {
    throw new Error(`Failed to clear cart: ${error.message}`);
  }

  return getCartDetails(supabase, sessionId, customerId);
}
